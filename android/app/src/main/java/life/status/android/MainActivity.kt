package life.status.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.rememberAsyncImagePainter
import life.status.android.data.*
import java.io.File

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { StatUsTheme { StatUsApp() } }
    }
}

private enum class Screen { Worlds, GlobalProfile, Feed, WorldProfile, Characters, Messages, Settings }

@Composable private fun StatUsTheme(content: @Composable () -> Unit) {
    val dark = androidx.compose.foundation.isSystemInDarkTheme()
    val colors = if (dark) darkColorScheme(primary = Color(0xFF4EABE0), background = Color(0xFF0E1621), surface = Color(0xFF17212B)) else lightColorScheme(primary = Color(0xFF229ED9), background = Color(0xFFF7F9FB), surface = Color.White)
    MaterialTheme(colorScheme = colors, shapes = Shapes(medium = RoundedCornerShape(16.dp)), content = content)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun StatUsApp(vm: AppViewModel = viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    var screen by remember { mutableStateOf(Screen.Worlds) }
    var worldId by remember { mutableStateOf<String?>(null) }
    val world = state.data.worlds.firstOrNull { it.id == worldId }
    val tablet = androidx.compose.ui.platform.LocalConfiguration.current.screenWidthDp >= 720
    if (state.loading) { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }; return }

    state.error?.let { message -> AlertDialog(onDismissRequest = vm::clearError, confirmButton = { TextButton(onClick = vm::clearError) { Text("Закрыть") } }, title = { Text("stat_us life") }, text = { Text(message) }) }

    val destinations = if (world == null) listOf(Screen.Worlds, Screen.GlobalProfile) else listOf(Screen.Feed, Screen.WorldProfile, Screen.Characters, Screen.Messages, Screen.Settings)
    Row(Modifier.fillMaxSize()) {
        if (tablet) NavigationRail {
            destinations.forEach { item -> NavigationRailItem(selected = screen == item, onClick = { screen = item }, icon = { Icon(screenIcon(item), null) }, label = { Text(screenLabel(item)) }) }
            if (world != null) NavigationRailItem(false, onClick = { worldId = null; screen = Screen.Worlds }, icon = { Icon(Icons.Default.ExitToApp, null) }, label = { Text("Выйти") })
        }
        Scaffold(
            modifier = Modifier.weight(1f),
            topBar = { TopAppBar(title = { Column { Text(world?.title ?: "stat_us life", fontWeight = FontWeight.Bold); if (world != null) Text(screenLabel(screen), style = MaterialTheme.typography.labelSmall) } }, navigationIcon = { if (world != null && !tablet) IconButton(onClick = { worldId = null; screen = Screen.Worlds }) { Icon(Icons.Default.ArrowBack, "Выйти из мира") } }, actions = { if (state.busy) CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp) }) },
            bottomBar = { if (!tablet) NavigationBar { destinations.forEach { item -> NavigationBarItem(selected = screen == item, onClick = { screen = item }, icon = { Icon(screenIcon(item), null) }, label = { Text(screenLabel(item), maxLines = 1) }) } } }
        ) { padding ->
            Box(Modifier.padding(padding).fillMaxSize()) {
                when {
                    world == null && screen == Screen.GlobalProfile -> GlobalProfileScreen(state.data, vm)
                    world == null -> WorldsScreen(state.data.worlds, onEnter = { worldId = it; screen = Screen.Feed }, vm)
                    screen == Screen.Feed -> FeedScreen(world, vm)
                    screen == Screen.WorldProfile -> ProfileScreen(world, vm)
                    screen == Screen.Characters -> CharactersScreen(world, vm)
                    screen == Screen.Messages -> MessagesScreen(world, vm)
                    screen == Screen.Settings -> WorldSettingsScreen(world, vm) { worldId = null; screen = Screen.Worlds }
                }
            }
        }
    }
}

@Composable private fun WorldsScreen(worlds: List<World>, onEnter: (String) -> Unit, vm: AppViewModel) {
    var editing by remember { mutableStateOf<World?>(null) }
    var creating by remember { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("Мои миры", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold); Text("Отдельные истории, персонажи и переписки", color = MaterialTheme.colorScheme.onSurfaceVariant); Button(onClick = { creating = true }, Modifier.padding(top = 12.dp)) { Icon(Icons.Default.Add, null); Text("Создать мир") } }
        if (worlds.isEmpty()) item { EmptyCard("У тебя пока нет миров") }
        items(worlds, key = { it.id }) { world -> Card(Modifier.fillMaxWidth().clickable { onEnter(world.id) }) { Column(Modifier.padding(16.dp)) { Text(world.title, style = MaterialTheme.typography.titleLarge); Text(world.description.ifBlank { "Описание не добавлено" }); Text("Персонажей: ${world.characters.size} · Постов: ${world.feed.size}", color = MaterialTheme.colorScheme.onSurfaceVariant); Row { TextButton(onClick = { onEnter(world.id) }) { Text("Войти") }; TextButton(onClick = { editing = world }) { Text("Изменить") }; TextButton(onClick = { vm.deleteWorld(world.id) }) { Text("Удалить", color = MaterialTheme.colorScheme.error) } } } } }
    }
    if (creating) WorldDialog(null, onDismiss = { creating = false }) { title, description -> vm.createWorld(title, description); creating = false }
    editing?.let { value -> WorldDialog(value, onDismiss = { editing = null }) { title, description -> vm.editWorld(value.copy(title = title, description = description)); editing = null } }
}

@Composable private fun WorldDialog(world: World?, onDismiss: () -> Unit, save: (String, String) -> Unit) {
    var title by remember { mutableStateOf(world?.title.orEmpty()) }; var description by remember { mutableStateOf(world?.description.orEmpty()) }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(if (world == null) "Новый мир" else "Изменить мир") }, text = { Column { OutlinedTextField(title, { title = it }, label = { Text("Название") }); OutlinedTextField(description, { description = it }, label = { Text("Описание") }, minLines = 4) } }, confirmButton = { Button(onClick = { if (title.isNotBlank()) save(title.trim(), description.trim()) }, enabled = title.isNotBlank()) { Text("Сохранить") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Отмена") } })
}

@Composable private fun GlobalProfileScreen(data: AppData, vm: AppViewModel) {
    var profile by remember(data.userProfile) { mutableStateOf(data.userProfile) }; var url by remember(data.apiConfig) { mutableStateOf(data.apiConfig.proxyUrl) }; var model by remember(data.apiConfig) { mutableStateOf(data.apiConfig.modelName) }; var key by remember { mutableStateOf("") }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { item { Text("Глобальный профиль", style = MaterialTheme.typography.headlineMedium); AvatarEditor(profile.avatar, vm) { profile = profile.copy(avatar = it) }; OutlinedTextField(profile.name, { profile = profile.copy(name = it) }, label = { Text("Имя") }, modifier = Modifier.fillMaxWidth()); OutlinedTextField(profile.bio, { profile = profile.copy(bio = it) }, label = { Text("Описание") }, modifier = Modifier.fillMaxWidth(), minLines = 3); HorizontalDivider(Modifier.padding(vertical = 12.dp)); Text("Подключение API", style = MaterialTheme.typography.titleLarge); OutlinedTextField(url, { url = it }, label = { Text("OpenAI-совместимый URL") }, modifier = Modifier.fillMaxWidth()); OutlinedTextField(model, { model = it }, label = { Text("Модель") }, modifier = Modifier.fillMaxWidth()); OutlinedTextField(key, { key = it }, label = { Text("Новый API-ключ") }, modifier = Modifier.fillMaxWidth()); Text("Ключ хранится отдельно в зашифрованном хранилище Android и не попадает в JSON.", color = MaterialTheme.colorScheme.onSurfaceVariant); if (url.startsWith("http://")) Text("Незашифрованный HTTP раскрывает ключ и содержимое запросов сети.", color = MaterialTheme.colorScheme.error); Row { Button(onClick = { vm.saveGlobal(profile, ApiSettings(url.trim(), model.trim()), key) }, enabled = profile.name.isNotBlank() && url.isNotBlank() && model.isNotBlank()) { Text("Сохранить") }; TextButton(onClick = vm::testApi) { Text("Проверить API") } } } }
}

@Composable private fun ProfileScreen(world: World, vm: AppViewModel) {
    var profile by remember(world.playerProfile) { mutableStateOf(world.playerProfile) }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { item { Text("Профиль в этом мире", style = MaterialTheme.typography.headlineMedium); AvatarEditor(profile.avatar, vm) { profile = profile.copy(avatar = it) }; OutlinedTextField(profile.name, { profile = profile.copy(name = it) }, label = { Text("Имя") }, modifier = Modifier.fillMaxWidth()); OutlinedTextField(profile.bio, { profile = profile.copy(bio = it) }, label = { Text("Описание") }, minLines = 3, modifier = Modifier.fillMaxWidth()); Button(onClick = { vm.saveWorldProfile(world.id, profile) }, enabled = profile.name.isNotBlank()) { Text("Сохранить профиль") }; Text("Подписчики: ${profile.followers} · Репосты: ${profile.reposts.size}", color = MaterialTheme.colorScheme.onSurfaceVariant) }; items(world.playerProfile.reposts, key = { it.id }) { repost -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(repost.type, color = MaterialTheme.colorScheme.primary); Text(repost.author, fontWeight = FontWeight.Bold); MentionText(repost.text); TextButton(onClick = { vm.deleteRepost(world.id, repost.id) }) { Text("Удалить со стены") } } } } }
}

@Composable private fun CharactersScreen(world: World, vm: AppViewModel) {
    var dialog by remember { mutableStateOf<Character?>(null) }; var creating by remember { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { item { Button(onClick = { creating = true }) { Icon(Icons.Default.PersonAdd, null); Text("Добавить персонажа") } }; if (world.characters.isEmpty()) item { EmptyCard("В этом мире пока нет персонажей") }; items(world.characters, key = { it.id }) { character -> Card(Modifier.fillMaxWidth()) { Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) { Avatar(character.avatar, 56); Column(Modifier.weight(1f).padding(horizontal = 12.dp)) { Text(character.name, style = MaterialTheme.typography.titleMedium); Text(character.persona.ifBlank { "Характер не описан" }, maxLines = 4) }; IconButton(onClick = { dialog = character }) { Icon(Icons.Default.Edit, "Изменить") }; IconButton(onClick = { vm.deleteCharacter(world.id, character.id) }) { Icon(Icons.Default.Delete, "Удалить", tint = MaterialTheme.colorScheme.error) } } } } }
    if (creating) CharacterDialog(null, vm, { creating = false }) { name, persona, avatar -> vm.addCharacter(world.id, name, persona, avatar); creating = false }
    dialog?.let { character -> CharacterDialog(character, vm, { dialog = null }) { name, persona, avatar -> vm.editCharacter(world.id, character.copy(name = name, persona = persona, avatar = avatar)); dialog = null } }
}

@Composable private fun CharacterDialog(character: Character?, vm: AppViewModel, dismiss: () -> Unit, save: (String, String, String?) -> Unit) {
    var name by remember { mutableStateOf(character?.name.orEmpty()) }; var persona by remember { mutableStateOf(character?.persona.orEmpty()) }; var avatar by remember { mutableStateOf(character?.avatar) }
    AlertDialog(onDismissRequest = dismiss, title = { Text(if (character == null) "Новый персонаж" else "Изменить персонажа") }, text = { Column { AvatarEditor(avatar, vm) { avatar = it }; OutlinedTextField(name, { name = it }, label = { Text("Имя") }); OutlinedTextField(persona, { persona = it }, label = { Text("Характер и предыстория") }, minLines = 5) } }, confirmButton = { Button(onClick = { save(name.trim(), persona.trim(), avatar) }, enabled = name.isNotBlank()) { Text("Сохранить") } }, dismissButton = { TextButton(onClick = dismiss) { Text("Отмена") } })
}

@Composable private fun FeedScreen(world: World, vm: AppViewModel) {
    var postText by remember { mutableStateOf("") }
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(12.dp)) { item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) { OutlinedTextField(postText, { postText = it.take(1000) }, placeholder = { Text("Что публикует ${world.playerProfile.name}?") }, modifier = Modifier.fillMaxWidth()); Button(onClick = { vm.addPost(world.id, postText); postText = "" }, enabled = postText.isNotBlank(), modifier = Modifier.align(Alignment.End).padding(top = 8.dp)) { Text("Опубликовать") } } } }; if (world.feed.isEmpty()) item { EmptyCard("Лента этого мира пока пуста") }; items(world.feed, key = { it.id }) { post -> PostCard(world, post, vm) } }
}

@Composable private fun PostCard(world: World, post: Post, vm: AppViewModel) {
    var expanded by remember { mutableStateOf(false) }; var comment by remember { mutableStateOf("") }
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp)) { Row(verticalAlignment = Alignment.CenterVertically) { Avatar(post.avatar, 44); Column(Modifier.padding(start = 10.dp)) { Text(post.author, fontWeight = FontWeight.Bold); if (post.isUser) Text("вы", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary) } }; MentionText(post.text, Modifier.padding(vertical = 10.dp)); Row { TextButton(onClick = { vm.togglePostLike(world.id, post.id) }) { Icon(if (post.isLikedByPlayer) Icons.Default.Favorite else Icons.Default.FavoriteBorder, null); Text(" ${post.likes}") }; TextButton(onClick = { expanded = !expanded }) { Icon(Icons.Default.ChatBubbleOutline, null); Text(" ${post.comments.size}") }; TextButton(onClick = { vm.repost(world.id, post.id, "Пост", post.author, post.text) }) { Icon(Icons.Default.Repeat, null); Text(" Репост") } }; if (expanded) { HorizontalDivider(); post.comments.forEach { value -> Row(Modifier.padding(vertical = 8.dp), verticalAlignment = Alignment.Top) { Avatar(value.avatar, 34); Column(Modifier.weight(1f).padding(start = 8.dp)) { Text(value.author, fontWeight = FontWeight.Bold); MentionText(value.text); Row { TextButton(onClick = { vm.toggleCommentLike(world.id, post.id, value.id) }) { Icon(if (value.isLikedByPlayer) Icons.Default.Favorite else Icons.Default.FavoriteBorder, null); Text(" ${value.likes}") }; TextButton(onClick = { comment = "@${value.author} " }) { Text("Ответить") }; TextButton(onClick = { vm.repost(world.id, value.id, "Комментарий", value.author, value.text) }) { Text("Репост") } } } } }; Row(verticalAlignment = Alignment.CenterVertically) { OutlinedTextField(comment, { comment = it }, placeholder = { Text("Комментарий") }, modifier = Modifier.weight(1f)); IconButton(onClick = { vm.addComment(world.id, post.id, comment); comment = "" }, enabled = comment.isNotBlank()) { Icon(Icons.Default.Send, "Отправить") } } } } }
}

@Composable private fun MessagesScreen(world: World, vm: AppViewModel) {
    var selected by remember { mutableStateOf<String?>(null) }; val character = world.characters.firstOrNull { it.id == selected }
    if (character == null) LazyColumn(Modifier.fillMaxSize().padding(16.dp)) { if (world.characters.isEmpty()) item { EmptyCard("Добавь персонажа, чтобы начать переписку") }; items(world.characters, key = { it.id }) { value -> ListItem(headlineContent = { Text(value.name) }, supportingContent = { Text(world.dms[value.id]?.lastOrNull()?.text ?: "Сообщений пока нет", maxLines = 1) }, leadingContent = { Avatar(value.avatar, 44) }, modifier = Modifier.clickable { selected = value.id }) } } else ChatScreen(world, character, vm) { selected = null }
}

@Composable private fun ChatScreen(world: World, character: Character, vm: AppViewModel, back: () -> Unit) {
    var text by remember { mutableStateOf("") }; val history = world.dms[character.id].orEmpty()
    Column(Modifier.fillMaxSize()) { ListItem(headlineContent = { Text(character.name) }, leadingContent = { IconButton(onClick = back) { Icon(Icons.Default.ArrowBack, "Назад") } }); LazyColumn(Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { items(history, key = { it.id }) { message -> Row(Modifier.fillMaxWidth(), horizontalArrangement = if (message.isUser) Arrangement.End else Arrangement.Start) { Surface(color = if (message.isUser) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(16.dp), modifier = Modifier.widthIn(max = 520.dp)) { MentionText(message.text, Modifier.padding(12.dp)) } } } }; Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) { OutlinedTextField(text, { text = it }, placeholder = { Text("Написать ${character.name}...") }, modifier = Modifier.weight(1f)); IconButton(onClick = { vm.sendDm(world.id, character.id, text); text = "" }, enabled = text.isNotBlank()) { Icon(Icons.Default.Send, "Отправить") } } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun WorldSettingsScreen(world: World, vm: AppViewModel, deleted: () -> Unit) {
    var enabled by remember(world) { mutableStateOf(world.crowdEnabled) }; var intensity by remember(world) { mutableStateOf(world.crowdIntensity) }; var confirm by remember { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) { item { Text("Массовка", style = MaterialTheme.typography.headlineSmall); Row(verticalAlignment = Alignment.CenterVertically) { Switch(enabled, { enabled = it }); Text("Постоянные фоновые аккаунты", Modifier.padding(start = 10.dp)) }; SingleChoiceSegmentedButtonRow { listOf("Низкая", "Средняя", "Высокая").forEachIndexed { index, value -> SegmentedButton(selected = intensity == value, onClick = { intensity = value }, shape = SegmentedButtonDefaults.itemShape(index, 3)) { Text(value) } } }; Text("Фоновые аккаунты появляются только в комментариях и не доступны в личных сообщениях.", color = MaterialTheme.colorScheme.onSurfaceVariant); Button(onClick = { vm.updateCrowd(world.id, enabled, intensity) }) { Text("Сохранить настройки") }; HorizontalDivider(Modifier.padding(vertical = 12.dp)); OutlinedButton(onClick = { confirm = true }) { Text("Удалить мир", color = MaterialTheme.colorScheme.error) } } }
    if (confirm) AlertDialog(onDismissRequest = { confirm = false }, title = { Text("Удалить мир?") }, text = { Text("Профиль, персонажи, лента и переписки будут удалены безвозвратно.") }, confirmButton = { Button(onClick = { vm.deleteWorld(world.id); deleted() }, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)) { Text("Удалить") } }, dismissButton = { TextButton(onClick = { confirm = false }) { Text("Отмена") } })
}

@Composable private fun AvatarEditor(path: String?, vm: AppViewModel, changed: (String?) -> Unit) {
    val picker = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> if (uri != null) vm.importAvatar(uri, changed) }
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) { Box(Modifier.clickable { picker.launch("image/*") }) { Avatar(path, 88) }; TextButton(onClick = { picker.launch("image/*") }) { Text("Выбрать аватар") }; if (path != null) TextButton(onClick = { changed(null) }) { Text("Удалить аватар") } }
}

@Composable private fun Avatar(path: String?, size: Int) {
    Surface(Modifier.size(size.dp), shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) { if (path != null && File(path).exists()) Image(rememberAsyncImagePainter(File(path)), null, contentScale = ContentScale.Crop) else Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Person, null, Modifier.size((size / 2).dp)) } }
}

@Composable private fun MentionText(text: String, modifier: Modifier = Modifier) {
    val regex = Regex("(?<![\\w@])@[\\w.-]+")
    val annotated = buildAnnotatedString { var offset = 0; regex.findAll(text).forEach { match -> append(text.substring(offset, match.range.first)); withStyle(SpanStyle(color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)) { append(match.value) }; offset = match.range.last + 1 }; append(text.substring(offset)) }
    Text(annotated, modifier)
}

@Composable private fun EmptyCard(text: String) = Card(Modifier.fillMaxWidth()) { Text(text, Modifier.padding(24.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
private fun screenLabel(screen: Screen) = when (screen) { Screen.Worlds -> "Миры"; Screen.GlobalProfile -> "Профиль"; Screen.Feed -> "Лента"; Screen.WorldProfile -> "Мой профиль"; Screen.Characters -> "Персонажи"; Screen.Messages -> "Сообщения"; Screen.Settings -> "Настройки" }
private fun screenIcon(screen: Screen) = when (screen) { Screen.Worlds -> Icons.Default.Public; Screen.GlobalProfile, Screen.WorldProfile -> Icons.Default.Person; Screen.Feed -> Icons.Default.DynamicFeed; Screen.Characters -> Icons.Default.Groups; Screen.Messages -> Icons.Default.Message; Screen.Settings -> Icons.Default.Settings }
