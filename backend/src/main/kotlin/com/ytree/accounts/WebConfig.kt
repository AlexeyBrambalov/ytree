package com.ytree.accounts

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

/** Lets the frontend's dev server (another origin, e.g. http://localhost:5173) call the API. */
@Configuration
class WebConfig(@Value("\${app.cors.allowed-origins}") private val allowedOrigins: List<String>) : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOrigins(*allowedOrigins.toTypedArray())
            .allowedMethods("GET", "POST", "PUT", "DELETE")
    }
}
