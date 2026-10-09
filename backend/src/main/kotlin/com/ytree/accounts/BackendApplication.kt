package com.ytree.accounts

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean
import java.time.Clock

@SpringBootApplication
class BackendApplication {
    /** "Now" comes from this clock, so tests can pin the date the 3-month rule is measured from. */
    @Bean
    fun clock(): Clock = Clock.systemUTC()
}

fun main(args: Array<String>) {
    runApplication<BackendApplication>(*args)
}
