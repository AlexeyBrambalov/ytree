package com.ytree.accounts

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException

/** Every error body has a `message` the client can show as is. */
data class ErrorResponse(val message: String)

data class SubmissionRejectedResponse(val message: String, val problems: List<SubmissionProblem>)

/** Turns exceptions thrown while handling a request into the JSON error bodies the frontend expects. */
@RestControllerAdvice
class ApiErrorHandler {

    @ExceptionHandler
    fun handle(e: SubmissionRejectedException) =
        ResponseEntity.status(e.status).body(SubmissionRejectedResponse(e.message, e.problems))

    @ExceptionHandler
    fun handle(e: ApiException) = ResponseEntity.status(e.status).body(ErrorResponse(e.message))

    /** The JSON body is missing, malformed or the wrong shape. */
    @ExceptionHandler
    fun handle(e: HttpMessageNotReadableException) = badRequest("The request body is not valid.")

    /** Spring refuses an oversized upload before it reaches the controller (limits in application.properties). */
    @ExceptionHandler
    fun handle(e: MaxUploadSizeExceededException) = badRequest("The file must be $MAX_STATEMENT_FILE_MB MB or smaller")

    private fun badRequest(message: String) = ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse(message))
}
