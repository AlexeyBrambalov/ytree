package com.ytree.accounts

import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * Only exists with the `e2e` profile (the Playwright tests in ../frontend/e2e start the app with it),
 * so the reset can never be called on a normal run.
 */
@Profile("e2e")
@RestController
class E2eController(private val accounts: AccountService, private val demoData: DemoData) {

    /** Puts the demo data back, so each e2e test starts from the same four accounts. */
    @PostMapping("/api/e2e/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun reset() {
        accounts.reset()
        demoData.seed()
    }
}
