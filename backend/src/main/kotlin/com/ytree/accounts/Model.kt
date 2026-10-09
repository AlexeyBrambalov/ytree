package com.ytree.accounts

import java.time.LocalDate

enum class ProviderCategory { BANK, PENSION, INVESTMENT }

/** A provider a client could hold money with (a bank, pension or investment platform). */
data class Provider(val id: String, val name: String, val category: ProviderCategory)

/** One provider the client has added, with the statement they uploaded for it, if any. */
data class Account(val id: String, val provider: Provider, val statement: Statement?)

/**
 * An uploaded statement. `version` changes with every upload, so a replaced file gets a new URL
 * and the browser never shows a cached copy of the old one.
 */
class Statement(
    val fileName: String,
    val statementDate: LocalDate,
    val contentType: String,
    val bytes: ByteArray,
    val version: Int,
)

enum class StatementStatus { MISSING, UPLOADED, OUTDATED }

/** A statement older than this no longer counts. */
const val MAX_STATEMENT_AGE_MONTHS = 3L

/**
 * The status rule. A statement dated before "today minus 3 calendar months" is outdated; exactly
 * 3 months old still counts. `minusMonths` clamps to the end of shorter months (31 May minus
 * 3 months is 28 or 29 Feb), which is also what the frontend's copy of this rule does.
 */
fun statementStatus(statementDate: LocalDate?, today: LocalDate): StatementStatus = when {
    statementDate == null -> StatementStatus.MISSING
    statementDate < today.minusMonths(MAX_STATEMENT_AGE_MONTHS) -> StatementStatus.OUTDATED
    else -> StatementStatus.UPLOADED
}

enum class ProblemReason { MISSING, OUTDATED, NO_ACCOUNTS }

/** Why a submission was refused. `accountId` and `providerName` are null for NO_ACCOUNTS. */
data class SubmissionProblem(val accountId: String?, val providerName: String?, val reason: ProblemReason)
