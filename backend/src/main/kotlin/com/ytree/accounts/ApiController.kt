package com.ytree.accounts

import org.springframework.http.CacheControl
import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeParseException

// ---- What goes over the wire (the frontend parses these with the Zod schemas in api/schemas.ts) ----

data class AccountResponse(
    val id: String,
    val provider: Provider,
    val statement: StatementResponse?,
    val status: StatementStatus,
)

data class StatementResponse(val fileName: String, val statementDate: LocalDate, val fileUrl: String)

data class AddProvidersRequest(val providerIds: List<String>)

data class SubmissionResponse(val submittedAt: Instant)

/**
 * The HTTP API. It only translates between HTTP and [AccountService], where the rules live.
 * Every change returns the whole account list, so the client never has to work out a status itself.
 */
@RestController
@RequestMapping("/api")
class ApiController(private val accounts: AccountService) {

    @GetMapping("/providers")
    fun knownProviders(): List<Provider> = accounts.knownProviders()

    @GetMapping("/accounts")
    fun listAccounts(): List<AccountResponse> = accounts.listAccounts().toResponse()

    @PostMapping("/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    fun addProviders(@RequestBody request: AddProvidersRequest): List<AccountResponse> =
        accounts.addProviders(request.providerIds).toResponse()

    @DeleteMapping("/accounts/{id}")
    fun removeAccount(@PathVariable id: String): List<AccountResponse> = accounts.removeAccount(id).toResponse()

    /** Multipart form: `file` and `statementDate` (YYYY-MM-DD). */
    @PutMapping("/accounts/{id}/statement", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun uploadStatement(
        @PathVariable id: String,
        @RequestParam file: MultipartFile?,
        @RequestParam statementDate: String?,
    ): List<AccountResponse> {
        if (file == null) throw ApiException(HttpStatus.BAD_REQUEST, "Choose a statement file")
        val date = parseDate(statementDate) ?: throw ApiException(HttpStatus.BAD_REQUEST, "Expected a YYYY-MM-DD date")
        val fileName = file.originalFilename?.takeIf { it.isNotBlank() } ?: "statement"
        return accounts.uploadStatement(id, fileName, file.bytes, date).toResponse()
    }

    /** The uploaded file, shown inline. The `?v=` in `fileUrl` is only there to change the URL per upload. */
    @GetMapping("/accounts/{id}/statement/file")
    fun statementFile(@PathVariable id: String): ResponseEntity<ByteArray> {
        val statement = accounts.statementFile(id)
        val disposition = ContentDisposition.inline().filename(statement.fileName, Charsets.UTF_8).build()
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(statement.contentType))
            .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
            .cacheControl(CacheControl.noStore())
            .body(statement.bytes)
    }

    /** 200 with the time it was accepted, or 422 listing every problem (see [ApiErrorHandler]). */
    @PostMapping("/submission")
    fun submit(): SubmissionResponse = SubmissionResponse(accounts.submit())

    private fun List<Account>.toResponse() = map { account ->
        AccountResponse(
            id = account.id,
            provider = account.provider,
            statement = account.statement?.let {
                StatementResponse(it.fileName, it.statementDate, "/api/accounts/${account.id}/statement/file?v=${it.version}")
            },
            status = accounts.statusOf(account),
        )
    }

    private fun parseDate(value: String?): LocalDate? =
        try {
            value?.let(LocalDate::parse)
        } catch (_: DateTimeParseException) {
            null
        }
}
