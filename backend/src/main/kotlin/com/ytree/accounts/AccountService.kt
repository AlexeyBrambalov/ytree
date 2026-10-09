package com.ytree.accounts

import org.springframework.http.HttpStatus.BAD_REQUEST
import org.springframework.http.HttpStatus.CONFLICT
import org.springframework.http.HttpStatus.NOT_FOUND
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Instant
import java.time.LocalDate

/** Statement files we accept, by extension, and the content type we serve them back with. */
private val CONTENT_TYPES = mapOf(
    "pdf" to "application/pdf",
    "png" to "image/png",
    "jpg" to "image/jpeg",
    "jpeg" to "image/jpeg",
)
const val MAX_STATEMENT_FILE_MB = 10
private const val MAX_STATEMENT_FILE_BYTES = MAX_STATEMENT_FILE_MB * 1024 * 1024

/**
 * The client's accounts and every rule about them. The brief has one client and no database,
 * so the data lives in memory and resets on restart. Each public method is `@Synchronized`,
 * so two requests at once can't both add the same provider or read a half-made change.
 */
@Service
class AccountService(private val clock: Clock) {
    private val providersById = KNOWN_PROVIDERS.associateBy { it.id }
    private val accounts = mutableListOf<Account>() // in the order they were added
    private var nextAccountId = 1
    private var nextFileVersion = 1

    fun knownProviders(): List<Provider> = KNOWN_PROVIDERS

    @Synchronized
    fun listAccounts(): List<Account> = accounts.toList()

    /** Status is worked out on every read, so a statement becomes OUTDATED as time passes. */
    fun statusOf(account: Account): StatementStatus = statementStatus(account.statement?.statementDate, today())

    /** Adds all the providers or none: one unknown or already-added provider refuses the whole request. */
    @Synchronized
    fun addProviders(providerIds: List<String>): List<Account> {
        val ids = providerIds.distinct()
        if (ids.isEmpty()) throw ApiException(BAD_REQUEST, "Pick at least one provider")

        val unknown = ids.filter { it !in providersById }
        if (unknown.isNotEmpty()) throw ApiException(BAD_REQUEST, "Unknown provider: ${unknown.joinToString()}")

        val alreadyAdded = ids.filter { id -> accounts.any { it.provider.id == id } }
        if (alreadyAdded.isNotEmpty()) {
            val names = alreadyAdded.joinToString { providersById.getValue(it).name }
            throw ApiException(CONFLICT, "Already added: $names")
        }

        for (id in ids) accounts += Account("acc-${nextAccountId++}", providersById.getValue(id), statement = null)
        return listAccounts()
    }

    @Synchronized
    fun removeAccount(accountId: String): List<Account> {
        accounts.remove(findAccount(accountId))
        return listAccounts()
    }

    /** Saves a statement for the account, replacing any earlier one. */
    @Synchronized
    fun uploadStatement(accountId: String, fileName: String, bytes: ByteArray, statementDate: LocalDate): List<Account> {
        val account = findAccount(accountId)
        val contentType = CONTENT_TYPES[fileName.substringAfterLast('.', "").lowercase()]
            ?: throw ApiException(BAD_REQUEST, "Upload a PDF, PNG or JPEG file")
        if (bytes.isEmpty()) throw ApiException(BAD_REQUEST, "The file is empty")
        if (bytes.size > MAX_STATEMENT_FILE_BYTES) {
            throw ApiException(BAD_REQUEST, "The file must be $MAX_STATEMENT_FILE_MB MB or smaller")
        }
        // One day of slack: the client's "today" is their own calendar day, which can be ahead of UTC.
        if (statementDate > today().plusDays(1)) throw ApiException(BAD_REQUEST, "Statement date cannot be in the future")

        val statement = Statement(fileName, statementDate, contentType, bytes, version = nextFileVersion++)
        accounts[accounts.indexOf(account)] = account.copy(statement = statement)
        return listAccounts()
    }

    @Synchronized
    fun statementFile(accountId: String): Statement =
        findAccount(accountId).statement
            ?: throw ApiException(NOT_FOUND, "No statement has been uploaded for this account.")

    /**
     * Accepts the submission only if there is at least one account and every one has a current
     * statement. The screen checks this too, but only to guide the client: this is the check that
     * counts, so an incomplete set is refused even if the screen is stale or bypassed.
     */
    @Synchronized
    fun submit(): Instant {
        if (accounts.isEmpty()) {
            throw SubmissionRejectedException(listOf(SubmissionProblem(null, null, ProblemReason.NO_ACCOUNTS)))
        }
        val problems = accounts.mapNotNull { account ->
            val reason = when (statusOf(account)) {
                StatementStatus.MISSING -> ProblemReason.MISSING
                StatementStatus.OUTDATED -> ProblemReason.OUTDATED
                StatementStatus.UPLOADED -> return@mapNotNull null
            }
            SubmissionProblem(account.id, account.provider.name, reason)
        }
        if (problems.isNotEmpty()) throw SubmissionRejectedException(problems)
        return clock.instant()
    }

    private fun today(): LocalDate = LocalDate.now(clock)

    private fun findAccount(accountId: String): Account =
        accounts.find { it.id == accountId } ?: throw ApiException(NOT_FOUND, "That account no longer exists.")
}
