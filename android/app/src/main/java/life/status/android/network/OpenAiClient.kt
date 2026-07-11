package life.status.android.network

import life.status.android.data.ApiSettings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

@Serializable data class ChatMessage(val role: String, val content: String)
@Serializable private data class ChatRequest(val model: String, val messages: List<ChatMessage>, val max_tokens: Int, val temperature: Double = 0.9)
@Serializable private data class ChatResponse(val choices: List<Choice> = emptyList())
@Serializable private data class Choice(val message: ChatMessage)

class OpenAiClient {
    private val json = Json { ignoreUnknownKeys = true }
    private val client = OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(45, TimeUnit.SECONDS).build()

    private fun endpointCandidates(proxyUrl: String): List<String> {
        val baseUrl = proxyUrl.trim().trimEnd('/')
        if (baseUrl.endsWith("/chat/completions")) return listOf(baseUrl)

        return buildList {
            add("$baseUrl/chat/completions")
            if (!baseUrl.endsWith("/v1")) {
                add("$baseUrl/v1/chat/completions")
            }
        }.distinct()
    }

    suspend fun chat(settings: ApiSettings, key: String, messages: List<ChatMessage>, maxTokens: Int = 300): String = withContext(Dispatchers.IO) {
        require(key.isNotBlank()) { "API-ключ не задан" }
        require(settings.proxyUrl.startsWith("https://") || settings.proxyUrl.startsWith("http://")) { "Некорректный URL API" }
        val body = json.encodeToString(ChatRequest.serializer(), ChatRequest(settings.modelName, messages, maxTokens))

        val endpoints = endpointCandidates(settings.proxyUrl)
        var lastNotFound: String? = null

        for (endpoint in endpoints) {
            val request = Request.Builder()
                .url(endpoint)
                .header("Authorization", "Bearer $key")
                .header("Content-Type", "application/json")
                .post(body.toRequestBody("application/json".toMediaType()))
                .build()

            client.newCall(request).execute().use { response ->
                val result = response.body?.string().orEmpty()

                if (response.code == 404) {
                    lastNotFound = endpoint
                    return@use
                }

                if (!response.isSuccessful) {
                    val details = result.replace(Regex("\\s+"), " ").trim().take(300)
                    throw IOException(
                        "Ошибка API HTTP ${response.code} ($endpoint)" +
                            if (details.isBlank()) "" else ": $details"
                    )
                }

                if (result.isBlank()) error("Пустой ответ API ($endpoint)")
                return@withContext json.decodeFromString<ChatResponse>(result)
                    .choices.firstOrNull()?.message?.content?.trim()
                    ?: error("Неожиданный ответ API ($endpoint)")
            }
        }

        throw IOException(
            "API вернул HTTP 404. Проверены адреса: ${endpoints.joinToString()}. " +
                "Укажите базовый URL вида https://host/v1 либо полный адрес /chat/completions. " +
                "Последний адрес: ${lastNotFound.orEmpty()}"
        )
    }
}
