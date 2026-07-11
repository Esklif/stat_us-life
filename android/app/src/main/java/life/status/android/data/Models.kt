package life.status.android.data

import kotlinx.serialization.Serializable
import java.util.UUID

fun newId(prefix: String) = "${prefix}_${UUID.randomUUID().toString().replace("-", "")}"

@Serializable data class Profile(
    val name: String = "Твой Никнейм",
    val avatar: String? = null,
    val bio: String = "",
    val followers: Int = 142,
    val reposts: List<Repost> = emptyList()
)

@Serializable data class ApiSettings(
    val proxyUrl: String = "https://api.openai.com/v1",
    val modelName: String = "gpt-4o-mini"
)

@Serializable data class Repost(
    val id: String = newId("repost"),
    val sourceId: String = "",
    val type: String = "Пост",
    val author: String = "",
    val text: String = ""
)

@Serializable data class Character(
    val id: String = newId("char"),
    val name: String = "Безымянный персонаж",
    val persona: String = "",
    val avatar: String? = null
)

@Serializable data class CrowdAccount(
    val id: String = newId("crowd"),
    val name: String = "случайный_пользователь",
    val persona: String = "Любопытный пользователь социальной сети.",
    val avatar: String? = null
)

@Serializable data class Comment(
    val id: String = newId("comment"),
    val author: String = "Неизвестный автор",
    val authorId: String? = null,
    val avatar: String? = null,
    val text: String = "",
    val isUser: Boolean = false,
    val isCrowd: Boolean = false,
    val likes: Int = 0,
    val isLikedByPlayer: Boolean = false
)

@Serializable data class Post(
    val id: String = newId("post"),
    val author: String = "Неизвестный автор",
    val authorId: String? = null,
    val avatar: String? = null,
    val text: String = "",
    val isUser: Boolean = false,
    val likes: Int = 0,
    val isLikedByPlayer: Boolean = false,
    val comments: List<Comment> = emptyList()
)

@Serializable data class DirectMessage(
    val id: String = newId("dm"),
    val text: String = "",
    val isUser: Boolean = true
)

@Serializable data class World(
    val id: String = newId("world"),
    val title: String = "Безымянный мир",
    val description: String = "",
    val playerProfile: Profile = Profile(followers = 0),
    val characters: List<Character> = emptyList(),
    val feed: List<Post> = emptyList(),
    val dms: Map<String, List<DirectMessage>> = emptyMap(),
    val crowdAccounts: List<CrowdAccount> = emptyList(),
    val crowdEnabled: Boolean = true,
    val crowdIntensity: String = "Средняя"
)

@Serializable data class AppData(
    val version: Int = 3,
    val userProfile: Profile = Profile(),
    val worlds: List<World> = emptyList(),
    val apiConfig: ApiSettings = ApiSettings()
)
