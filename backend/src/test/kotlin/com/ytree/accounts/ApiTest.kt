package com.ytree.accounts

import com.jayway.jsonpath.JsonPath
import org.hamcrest.Matchers.hasKey
import org.hamcrest.Matchers.matchesPattern
import org.hamcrest.Matchers.nullValue
import org.hamcrest.Matchers.startsWith
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.multipart
import org.springframework.test.web.servlet.post
import java.time.LocalDate
import java.time.ZoneOffset

/**
 * The HTTP contract the frontend relies on (NOTES.md), run against the whole app with its demo data:
 * Barclays (acc-1, UPLOADED), HSBC (acc-2, MISSING), Vanguard (acc-3, OUTDATED), Fidelity (acc-4, UPLOADED).
 * Each test starts from a fresh app, so they can't affect each other.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class ApiTest(@Autowired private val mockMvc: MockMvc) {
    private val today = LocalDate.now(ZoneOffset.UTC).toString()

    private fun upload(accountId: String, fileName: String, date: String = today): ResultActionsDsl =
        mockMvc.multipart(HttpMethod.PUT, "/api/accounts/$accountId/statement") {
            file(MockMultipartFile("file", fileName, MediaType.APPLICATION_PDF_VALUE, "%PDF-test".toByteArray()))
            param("statementDate", date)
        }

    @Test
    fun `lists the client's accounts with a status for each`() {
        mockMvc.get("/api/accounts").andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(4) }
            jsonPath("$[0].provider.name") { value("Barclays") }
            jsonPath("$[0].provider.category") { value("BANK") }
            jsonPath("$[0].status") { value("UPLOADED") }
            jsonPath("$[0].statement.fileName") { value("statement_jan.pdf") }
            jsonPath("$[0].statement.statementDate") { value(matchesPattern("""\d{4}-\d{2}-\d{2}""")) }
            jsonPath("$[0].statement.fileUrl") { value(startsWith("/api/accounts/acc-1/statement/file?v=")) }
            jsonPath("$[1].status") { value("MISSING") }
            jsonPath("$[1]") { value(hasKey("statement")) } // present and null, not left out
            jsonPath("$[1].statement") { value(nullValue()) }
            jsonPath("$[2].status") { value("OUTDATED") }
        }
    }

    @Test
    fun `lists the known providers`() {
        mockMvc.get("/api/providers").andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(KNOWN_PROVIDERS.size) }
        }
    }

    @Test
    fun `adds several providers at once`() {
        mockMvc.post("/api/accounts") {
            contentType = MediaType.APPLICATION_JSON
            content = """{ "providerIds": ["lloyds", "aviva"] }"""
        }.andExpect {
            status { isCreated() }
            jsonPath("$.length()") { value(6) }
            jsonPath("$[5].provider.name") { value("Aviva") }
            jsonPath("$[5].status") { value("MISSING") }
        }
    }

    @Test
    fun `refuses to add a provider that is already added`() {
        mockMvc.post("/api/accounts") {
            contentType = MediaType.APPLICATION_JSON
            content = """{ "providerIds": ["lloyds", "hsbc"] }"""
        }.andExpect {
            status { isConflict() }
            jsonPath("$.message") { value("Already added: HSBC") }
        }
        mockMvc.get("/api/accounts").andExpect { jsonPath("$.length()") { value(4) } }
    }

    @Test
    fun `refuses a malformed request body`() {
        mockMvc.post("/api/accounts") {
            contentType = MediaType.APPLICATION_JSON
            content = """{ "ids": ["lloyds"] }"""
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { exists() }
        }
    }

    @Test
    fun `removes an account and 404s an unknown one`() {
        mockMvc.delete("/api/accounts/acc-2").andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(3) }
        }
        mockMvc.delete("/api/accounts/acc-2").andExpect {
            status { isNotFound() }
            jsonPath("$.message") { value("That account no longer exists.") }
        }
    }

    @Test
    fun `uploads a statement and serves the file back`() {
        val body = upload("acc-2", "hsbc.pdf").andExpect {
            status { isOk() }
            jsonPath("$[1].status") { value("UPLOADED") }
            jsonPath("$[1].statement.fileName") { value("hsbc.pdf") }
            jsonPath("$[1].statement.statementDate") { value(today) }
        }.andReturn().response.contentAsString
        val fileUrl = JsonPath.read<String>(body, "$[1].statement.fileUrl")

        mockMvc.get(fileUrl).andExpect {
            status { isOk() }
            content { contentType(MediaType.APPLICATION_PDF) }
            content { bytes("%PDF-test".toByteArray()) }
            header { string("Content-Disposition", startsWith("inline")) }
        }
    }

    @Test
    fun `refuses an upload with a bad file type or date`() {
        upload("acc-2", "notes.txt").andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("Upload a PDF, PNG or JPEG file") }
        }
        upload("acc-2", "hsbc.pdf", date = "08/10/2026").andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("Expected a YYYY-MM-DD date") }
        }
    }

    @Test
    fun `has no e2e reset endpoint outside the e2e profile`() {
        mockMvc.post("/api/e2e/reset").andExpect { status { isNotFound() } }
    }

    @Test
    fun `refuses an incomplete submission, then accepts it once every statement is current`() {
        mockMvc.post("/api/submission").andExpect {
            status { isUnprocessableContent() }
            jsonPath("$.message") { value("Some providers still need a current statement.") }
            jsonPath("$.problems.length()") { value(2) }
            jsonPath("$.problems[0].accountId") { value("acc-2") }
            jsonPath("$.problems[0].providerName") { value("HSBC") }
            jsonPath("$.problems[0].reason") { value("MISSING") }
            jsonPath("$.problems[1].providerName") { value("Vanguard") }
            jsonPath("$.problems[1].reason") { value("OUTDATED") }
        }

        upload("acc-2", "hsbc.pdf")
        upload("acc-3", "vanguard.pdf")

        mockMvc.post("/api/submission").andExpect {
            status { isOk() }
            jsonPath("$.submittedAt") { value(startsWith(today)) }
        }
    }
}
