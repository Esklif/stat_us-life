package life.status.android.data

import android.content.Context
import android.net.Uri
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.io.File

class LocalRepository(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true; coerceInputValues = true }
    private val dataFile = File(context.filesDir, "stat_us_data.json")
    private val backupFile = File(context.filesDir, "stat_us_data.json.bak")
    private val secrets by lazy {
        val key = MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
        EncryptedSharedPreferences.create(
            context, "secure_api_settings", key,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    suspend fun load(): AppData = withContext(Dispatchers.IO) {
        val loaded = runCatching { json.decodeFromString<AppData>(dataFile.readText()) }.getOrNull()
            ?: runCatching { json.decodeFromString<AppData>(backupFile.readText()) }.getOrNull()
            ?: AppData()
        migrate(loaded)
    }

    suspend fun save(data: AppData) = withContext(Dispatchers.IO) {
        val normalized = migrate(data).copy(version = 3)
        val temp = File(context.filesDir, "stat_us_data.json.tmp")
        temp.writeText(json.encodeToString(AppData.serializer(), normalized))
        if (dataFile.exists()) dataFile.copyTo(backupFile, overwrite = true)
        if (!temp.renameTo(dataFile)) {
            temp.copyTo(dataFile, overwrite = true)
            temp.delete()
        }
    }

    fun apiKey(): String = secrets.getString("api_key", "").orEmpty()
    fun saveApiKey(value: String) {
        val editor = secrets.edit()
        if (value.isBlank()) editor.remove("api_key") else editor.putString("api_key", value.trim())
        check(editor.commit()) { "Не удалось сохранить API-ключ" }
    }

    suspend fun importAvatar(uri: Uri): String? = withContext(Dispatchers.IO) {
        runCatching {
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@runCatching null
            require(bytes.size <= 8 * 1024 * 1024)
            val directory = File(context.filesDir, "avatars").apply { mkdirs() }
            File(directory, "${newId("avatar")}.img").apply { writeBytes(bytes) }.absolutePath
        }.getOrNull()
    }

    private fun migrate(data: AppData): AppData = data.copy(
        userProfile = data.userProfile.copy(name = data.userProfile.name.ifBlank { "Твой Никнейм" }),
        worlds = data.worlds.map { world ->
            val profile = world.playerProfile.copy(name = world.playerProfile.name.ifBlank { data.userProfile.name })
            val dms = world.characters.associate { character -> character.id to world.dms[character.id].orEmpty() }
            world.copy(
                title = world.title.ifBlank { "Безымянный мир" },
                playerProfile = profile,
                dms = dms,
                feed = world.feed.map { post -> post.copy(comments = post.comments) }
            )
        }
    )
}
