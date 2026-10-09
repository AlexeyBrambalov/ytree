package com.ytree.accounts

import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotEquals

class AccountServiceTest {
    private val now = Instant.parse("2026-10-08T10:00:00Z")
    private val today = LocalDate.parse("2026-10-08")
    private val service = AccountService(Clock.fixed(now, ZoneOffset.UTC))
    private val pdf = "%PDF-1.4 test".toByteArray()

    private fun idOf(providerId: String) = service.listAccounts().first { it.provider.id == providerId }.id
    private fun statuses() = service.listAccounts().associate { it.provider.id to service.statusOf(it) }

    @Test
    fun `new accounts start MISSING and a current upload makes them UPLOADED`() {
        service.addProviders(listOf("barclays", "hsbc"))
        service.uploadStatement(idOf("barclays"), "jan.pdf", pdf, today.minusDays(5))

        assertEquals(mapOf("barclays" to StatementStatus.UPLOADED, "hsbc" to StatementStatus.MISSING), statuses())
    }

    @Test
    fun `refuses to add a provider that is already added, and adds none of the batch`() {
        service.addProviders(listOf("hsbc"))

        val error = assertFailsWith<ApiException> { service.addProviders(listOf("lloyds", "hsbc")) }

        assertEquals(HttpStatus.CONFLICT, error.status)
        assertEquals("Already added: HSBC", error.message)
        assertEquals(listOf("hsbc"), service.listAccounts().map { it.provider.id })
    }

    @Test
    fun `refuses an unknown provider`() {
        val error = assertFailsWith<ApiException> { service.addProviders(listOf("not-a-bank")) }
        assertEquals(HttpStatus.BAD_REQUEST, error.status)
    }

    @Test
    fun `refuses a submission with no accounts`() {
        val error = assertFailsWith<SubmissionRejectedException> { service.submit() }
        assertEquals(listOf(SubmissionProblem(null, null, ProblemReason.NO_ACCOUNTS)), error.problems)
    }

    @Test
    fun `refuses an incomplete submission and lists every problem`() {
        service.addProviders(listOf("barclays", "hsbc", "vanguard"))
        service.uploadStatement(idOf("barclays"), "new.pdf", pdf, today)
        service.uploadStatement(idOf("vanguard"), "old.pdf", pdf, today.minusMonths(5))

        val error = assertFailsWith<SubmissionRejectedException> { service.submit() }

        assertEquals(
            listOf(
                SubmissionProblem(idOf("hsbc"), "HSBC", ProblemReason.MISSING),
                SubmissionProblem(idOf("vanguard"), "Vanguard", ProblemReason.OUTDATED),
            ),
            error.problems,
        )
    }

    @Test
    fun `accepts a submission once every statement is current`() {
        service.addProviders(listOf("barclays", "hsbc"))
        service.uploadStatement(idOf("barclays"), "a.pdf", pdf, today)
        service.uploadStatement(idOf("hsbc"), "b.png", pdf, today.minusMonths(3))

        assertEquals(now, service.submit())
    }

    @Test
    fun `refuses files that are not a PDF, PNG or JPEG`() {
        service.addProviders(listOf("hsbc"))
        val error = assertFailsWith<ApiException> { service.uploadStatement(idOf("hsbc"), "notes.docx", pdf, today) }
        assertEquals("Upload a PDF, PNG or JPEG file", error.message)
    }

    @Test
    fun `refuses a statement dated in the future`() {
        service.addProviders(listOf("hsbc"))
        val error = assertFailsWith<ApiException> {
            service.uploadStatement(idOf("hsbc"), "a.pdf", pdf, today.plusDays(2))
        }
        assertEquals("Statement date cannot be in the future", error.message)
    }

    @Test
    fun `a new upload replaces the file and gets a new version`() {
        service.addProviders(listOf("hsbc"))
        val id = idOf("hsbc")
        service.uploadStatement(id, "first.pdf", "first".toByteArray(), today)
        val firstVersion = service.statementFile(id).version

        service.uploadStatement(id, "second.jpg", "second".toByteArray(), today)

        val statement = service.statementFile(id)
        assertEquals("second.jpg", statement.fileName)
        assertEquals("image/jpeg", statement.contentType)
        assertEquals("second", statement.bytes.decodeToString())
        assertNotEquals(firstVersion, statement.version)
    }

    @Test
    fun `an unknown account is a 404`() {
        val error = assertFailsWith<ApiException> { service.removeAccount("acc-404") }
        assertEquals(HttpStatus.NOT_FOUND, error.status)
    }
}
