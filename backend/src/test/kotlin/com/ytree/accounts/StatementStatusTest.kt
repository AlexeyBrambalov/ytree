package com.ytree.accounts

import org.junit.jupiter.api.Test
import java.time.LocalDate
import kotlin.test.assertEquals

class StatementStatusTest {
    private val today = LocalDate.parse("2026-10-08")

    @Test
    fun `no statement is MISSING`() {
        assertEquals(StatementStatus.MISSING, statementStatus(null, today))
    }

    @Test
    fun `a statement from today is UPLOADED`() {
        assertEquals(StatementStatus.UPLOADED, statementStatus(today, today))
    }

    @Test
    fun `exactly 3 months old still counts`() {
        assertEquals(StatementStatus.UPLOADED, statementStatus(LocalDate.parse("2026-07-08"), today))
    }

    @Test
    fun `one day older than 3 months is OUTDATED`() {
        assertEquals(StatementStatus.OUTDATED, statementStatus(LocalDate.parse("2026-07-07"), today))
    }

    @Test
    fun `3 months before the 31st is the last day of the shorter month`() {
        val endOfMay = LocalDate.parse("2026-05-31")
        assertEquals(StatementStatus.UPLOADED, statementStatus(LocalDate.parse("2026-02-28"), endOfMay))
        assertEquals(StatementStatus.OUTDATED, statementStatus(LocalDate.parse("2026-02-27"), endOfMay))
    }
}
