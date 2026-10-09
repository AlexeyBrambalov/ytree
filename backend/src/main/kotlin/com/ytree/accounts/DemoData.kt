package com.ytree.accounts

import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDate

/**
 * On startup, gives the client four providers that show every status: two current statements,
 * one missing and one outdated. Dates are relative to today, so the demo looks the same any day.
 */
@Component
class DemoData(private val accounts: AccountService, private val clock: Clock) : ApplicationRunner {

    override fun run(args: ApplicationArguments) {
        val today = LocalDate.now(clock)
        val added = accounts.addProviders(listOf("barclays", "hsbc", "vanguard", "fidelity"))
        val idOf = added.associate { it.provider.id to it.id }

        fun upload(providerId: String, fileName: String, date: LocalDate) {
            val provider = KNOWN_PROVIDERS.first { it.id == providerId }
            val pdf = samplePdf("Sample statement", provider.name, "Statement date: $date")
            accounts.uploadStatement(idOf.getValue(providerId), fileName, pdf, date)
        }
        upload("barclays", "statement_jan.pdf", today.minusDays(12))
        upload("vanguard", "old_statement.pdf", today.minusMonths(5))
        upload("fidelity", "q4_2025.pdf", today.minusDays(30))
    }
}

/**
 * A minimal one-page PDF with a few lines of text, so seeded statements open like real ones.
 * ASCII only: the cross-reference table needs byte offsets, which then equal string offsets.
 */
fun samplePdf(vararg lines: String): ByteArray {
    fun escape(s: String) = s.replace(Regex("""[\\()]""")) { "\\" + it.value }
    val text = lines.mapIndexed { i, line -> (if (i == 0) "" else "0 -28 Td ") + "(${escape(line)}) Tj" }
    val content = "BT\n/F1 18 Tf\n72 720 Td\n${text.joinToString("\n")}\nET"

    val objects = listOf(
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R " +
            "/Resources << /Font << /F1 5 0 R >> >> >>",
        "<< /Length ${content.length} >>\nstream\n$content\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    )
    val pdf = StringBuilder("%PDF-1.4\n")
    val offsets = objects.mapIndexed { i, body ->
        val offset = pdf.length
        pdf.append("${i + 1} 0 obj\n$body\nendobj\n")
        offset
    }
    val xref = pdf.length
    pdf.append("xref\n0 ${objects.size + 1}\n0000000000 65535 f \n")
    offsets.forEach { pdf.append("%010d 00000 n \n".format(it)) }
    pdf.append("trailer\n<< /Size ${objects.size + 1} /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n")
    return pdf.toString().toByteArray(Charsets.US_ASCII)
}
