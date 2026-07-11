package life.status.android

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import life.status.android.data.*
import life.status.android.network.ChatMessage
import life.status.android.network.OpenAiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

data class UiState(val data: AppData = AppData(), val loading: Boolean = true, val busy: Boolean = false, val error: String? = null)

class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = LocalRepository(application)
    private val api = OpenAiClient()
    private val json = Json { ignoreUnknownKeys = true }
    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init { viewModelScope.launch { _state.value = UiState(repository.load(), loading = false) } }

    fun clearError() { _state.value = _state.value.copy(error = null) }
    fun savedApiKey(): String = repository.apiKey()
    private fun mutate(block: (AppData) -> AppData) {
        val changed = block(_state.value.data)
        _state.value = _state.value.copy(data = changed, error = null)
        viewModelScope.launch { runCatching { repository.save(changed) }.onFailure { fail(it) } }
    }
    private fun updateWorld(id: String, block: (World) -> World) = mutate { data -> data.copy(worlds = data.worlds.map { if (it.id == id) block(it) else it }) }
    private fun fail(error: Throwable) { _state.value = _state.value.copy(busy = false, error = error.message ?: "Неизвестная ошибка") }

    fun saveGlobal(profile: Profile, settings: ApiSettings, key: String) {
        runCatching { repository.saveApiKey(key) }
            .onSuccess { mutate { it.copy(userProfile = profile, apiConfig = settings) } }
            .onFailure(::fail)
    }
    fun createWorld(title: String, description: String) = mutate { data ->
        val profile = data.userProfile.copy(followers = 0, reposts = emptyList())
        data.copy(worlds = data.worlds + World(title = title.trim(), description = description.trim(), playerProfile = profile, crowdAccounts = makeCrowd()))
    }
    fun editWorld(world: World) = mutate { data -> data.copy(worlds = data.worlds.map { if (it.id == world.id) world else it }) }
    fun deleteWorld(id: String) = mutate { it.copy(worlds = it.worlds.filterNot { world -> world.id == id }) }
    fun saveWorldProfile(id: String, profile: Profile) = updateWorld(id) { it.copy(playerProfile = profile) }
    fun addCharacter(worldId: String, name: String, persona: String, avatar: String?) = updateWorld(worldId) { world ->
        val character = Character(name = name.trim(), persona = persona.trim(), avatar = avatar)
        world.copy(characters = world.characters + character, dms = world.dms + (character.id to emptyList()))
    }
    fun editCharacter(worldId: String, character: Character) = updateWorld(worldId) { world -> world.copy(characters = world.characters.map { if (it.id == character.id) character else it }) }
    fun deleteCharacter(worldId: String, characterId: String) = updateWorld(worldId) { world -> world.copy(characters = world.characters.filterNot { it.id == characterId }, dms = world.dms - characterId) }
    fun updateCrowd(worldId: String, enabled: Boolean, intensity: String) = updateWorld(worldId) { it.copy(crowdEnabled = enabled, crowdIntensity = intensity, crowdAccounts = if (it.crowdAccounts.isEmpty()) makeCrowd() else it.crowdAccounts) }

    fun addPost(worldId: String, text: String) {
        val world = _state.value.data.worlds.first { it.id == worldId }
        val post = Post(author = world.playerProfile.name, avatar = world.playerProfile.avatar, text = text.trim(), isUser = true)
        updateWorld(worldId) { it.copy(feed = listOf(post) + it.feed) }
        generatePostReactions(worldId, post.id)
    }
    fun addComment(worldId: String, postId: String, text: String) {
        val world = _state.value.data.worlds.first { it.id == worldId }
        val comment = Comment(author = world.playerProfile.name, avatar = world.playerProfile.avatar, text = text.trim(), isUser = true)
        updateWorld(worldId) { w -> w.copy(feed = w.feed.map { if (it.id == postId) it.copy(comments = it.comments + comment) else it }) }
        generateCommentReactions(worldId, postId, comment.text)
    }
    fun togglePostLike(worldId: String, postId: String) = updateWorld(worldId) { w -> w.copy(feed = w.feed.map { post -> if (post.id != postId) post else post.copy(isLikedByPlayer = !post.isLikedByPlayer, likes = (post.likes + if (post.isLikedByPlayer) -1 else 1).coerceAtLeast(0)) }) }
    fun toggleCommentLike(worldId: String, postId: String, commentId: String) = updateWorld(worldId) { w -> w.copy(feed = w.feed.map { post -> if (post.id != postId) post else post.copy(comments = post.comments.map { c -> if (c.id != commentId) c else c.copy(isLikedByPlayer = !c.isLikedByPlayer, likes = (c.likes + if (c.isLikedByPlayer) -1 else 1).coerceAtLeast(0)) }) }) }
    fun repost(worldId: String, sourceId: String, type: String, author: String, text: String) = updateWorld(worldId) { world ->
        if (world.playerProfile.reposts.any { it.sourceId == sourceId }) world else world.copy(playerProfile = world.playerProfile.copy(reposts = world.playerProfile.reposts + Repost(sourceId = sourceId, type = type, author = author, text = text)))
    }
    fun deleteRepost(worldId: String, id: String) = updateWorld(worldId) { it.copy(playerProfile = it.playerProfile.copy(reposts = it.playerProfile.reposts.filterNot { repost -> repost.id == id })) }

    fun sendDm(worldId: String, characterId: String, text: String) {
        updateWorld(worldId) { world -> world.copy(dms = world.dms + (characterId to (world.dms[characterId].orEmpty() + DirectMessage(text = text.trim())))) }
        viewModelScope.launch {
            _state.value = _state.value.copy(busy = true)
            runCatching {
                val world = _state.value.data.worlds.first { it.id == worldId }
                val character = world.characters.first { it.id == characterId }
                val system = "Ты ведёшь приватную переписку как ${character.name}. Мир: ${world.title}. Характер: ${character.persona}. Собеседник: ${world.playerProfile.name}. Отвечай естественно, без служебных пояснений."
                val history = world.dms[characterId].orEmpty().takeLast(16).map { ChatMessage(if (it.isUser) "user" else "assistant", it.text) }
                api.chat(_state.value.data.apiConfig, repository.apiKey(), listOf(ChatMessage("system", system)) + history)
            }.onSuccess { reply ->
                updateWorld(worldId) { world -> world.copy(dms = world.dms + (characterId to (world.dms[characterId].orEmpty() + DirectMessage(text = reply, isUser = false)))) }
                _state.value = _state.value.copy(busy = false)
            }.onFailure(::fail)
        }
    }

    fun testApi() = viewModelScope.launch {
        _state.value = _state.value.copy(busy = true, error = null)
        runCatching { api.chat(_state.value.data.apiConfig, repository.apiKey(), listOf(ChatMessage("user", "Ответь одним словом: работает")), 10) }
            .onSuccess { _state.value = _state.value.copy(busy = false, error = "Ответ API: $it") }.onFailure(::fail)
    }

    fun importAvatar(uri: Uri, done: (String?) -> Unit) = viewModelScope.launch { done(repository.importAvatar(uri)) }

    private fun generatePostReactions(worldId: String, postId: String) = generateReactions(worldId, postId, null)
    private fun generateCommentReactions(worldId: String, postId: String, trigger: String) = generateReactions(worldId, postId, trigger)
    private fun generateReactions(worldId: String, postId: String, triggerComment: String?) = viewModelScope.launch {
        if (repository.apiKey().isBlank()) return@launch
        _state.value = _state.value.copy(busy = true)
        runCatching {
            val world = _state.value.data.worlds.first { it.id == worldId }
            val post = world.feed.first { it.id == postId }
            val candidates = world.characters.shuffled().take(3)
            val generated = mutableListOf<Comment>()
            for (character in candidates) {
                val system = "Ты ${character.name}, участник ролевой соцсети мира ${world.title}. Характер: ${character.persona}. Пиши только от лица персонажа."
                val prompt = "Пост ${post.author}: ${post.text}\n${triggerComment?.let { "Новый комментарий игрока: $it\n" }.orEmpty()}Напиши короткий комментарий до 180 символов. Верни только текст."
                val reply = api.chat(_state.value.data.apiConfig, repository.apiKey(), listOf(ChatMessage("system", system), ChatMessage("user", prompt)), 120)
                if (reply.isNotBlank()) generated += Comment(author = character.name, authorId = character.id, avatar = character.avatar, text = reply.take(180))
            }
            val crowd = if (world.crowdEnabled) generateCrowd(world, post, triggerComment) else emptyList()
            generated + crowd
        }.onSuccess { comments ->
            updateWorld(worldId) { world -> world.copy(feed = world.feed.map { if (it.id == postId) it.copy(comments = it.comments + comments) else it }) }
            _state.value = _state.value.copy(busy = false)
        }.onFailure(::fail)
    }

    private suspend fun generateCrowd(world: World, post: Post, trigger: String?): List<Comment> {
        val limit = when (world.crowdIntensity) { "Низкая" -> 1; "Высокая" -> 4; else -> 2 }
        val accounts = world.crowdAccounts.shuffled().take(limit)
        if (accounts.isEmpty()) return emptyList()
        val prompt = "Пост: ${post.author}: ${post.text}\n${trigger.orEmpty()}\nАккаунты:\n${accounts.joinToString("\n") { "${it.id}|${it.name}|${it.persona}" }}\nВерни JSON-массив объектов account_id,text. Только комментарии до 180 символов."
        val raw = api.chat(_state.value.data.apiConfig, repository.apiKey(), listOf(ChatMessage("user", prompt)), 500)
        val array = runCatching { json.parseToJsonElement(raw.removePrefix("```json").removeSuffix("```").trim()).jsonArray }.getOrNull() ?: return emptyList()
        return array.take(limit).mapNotNull { element ->
            val objectValue = element.jsonObject
            val account = accounts.firstOrNull { it.id == objectValue["account_id"]?.jsonPrimitive?.content } ?: return@mapNotNull null
            val text = objectValue["text"]?.jsonPrimitive?.content?.take(180)?.trim().orEmpty()
            if (text.isBlank()) null else Comment(author = account.name, authorId = account.id, avatar = account.avatar, text = text, isCrowd = true)
        }
    }

    private fun makeCrowd(): List<CrowdAccount> {
        val names = listOf("Алекс", "Рин", "Мика", "Саша", "Лео", "Ника", "Тори", "Кай", "Эли", "Макс", "Рэй", "Дана")
        val suffixes = listOf("online", "daily", "observer", "local", "archive", "notes")
        val personas = listOf("Любопытный пользователь.", "Скептичный наблюдатель.", "Эмоциональный фанат.", "Спокойный местный пользователь.", "Любитель шуток и иронии.", "Внимательный читатель.")
        return names.mapIndexed { index, name -> CrowdAccount(name = "${name}_${suffixes[index % suffixes.size]}", persona = personas[index % personas.size]) }
    }
}
