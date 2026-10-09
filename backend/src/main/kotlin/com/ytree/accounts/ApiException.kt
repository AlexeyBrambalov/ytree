package com.ytree.accounts

import org.springframework.http.HttpStatus

/** Something the client asked for that we refuse, with the HTTP status that explains why. */
open class ApiException(val status: HttpStatus, override val message: String) : RuntimeException(message)

/** The submission is incomplete. Carries every problem, so the client can show what's still wrong. */
class SubmissionRejectedException(val problems: List<SubmissionProblem>) :
    ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "Some providers still need a current statement.")
