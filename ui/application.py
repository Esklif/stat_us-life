import streamlit as st

from api_client import call_api
from crowd import add_crowd_activity, ensure_crowd_accounts
from generation import (
    generate_dm_reply,
    generate_reactions_to_user_comment,
    generate_reactions_to_user_post,
)
from images import avatar_html, get_chat_avatar, image_to_base64, render_text_with_mentions
from state import get_active_world, get_character, initialize_state
from storage import new_id, save_api_key, save_data
from ui.styles import apply_styles


st.set_page_config(
    page_title="Fandom Social Network",
    page_icon="📱",
    layout="wide",
)


# =========================================================
# ОБЩИЕ КОМПОНЕНТЫ ИНТЕРФЕЙСА
# =========================================================

def render_avatar_upload(
    current_avatar,
    key,
    label="Загрузить аватар",
    fallback="👤"
):

    with st.container():
        # Маркер нужен, чтобы CSS применялся только к этому загрузчику
        st.markdown(
            '<span class="avatar-upload-marker"></span>',
            unsafe_allow_html=True
        )

        st.markdown(
            (
                '<div class="avatar-upload-preview">'
                f'{avatar_html(current_avatar, size=110, fallback=fallback)}'
                '</div>'
            ),
            unsafe_allow_html=True
        )

        uploaded_file = st.file_uploader(
            label,
            type=["png", "jpg", "jpeg", "webp"],
            key=key,
            label_visibility="collapsed"
        )

    if uploaded_file is None:
        return None

    return image_to_base64(uploaded_file)


def render_profile_editor(
    profile,
    key_prefix,
    title,
    allow_followers=True
):
    st.subheader(title)

    avatar_state_key = f"{key_prefix}_processed_avatar"

    new_avatar = render_avatar_upload(
        current_avatar=profile.get("avatar"),
        key=f"{key_prefix}_avatar",
        label="Нажмите на аватар, чтобы выбрать изображение",
        fallback="👑"
    )

    # Сохраняем аватар сразу после выбора, но только один раз
    if new_avatar and new_avatar != st.session_state.get(avatar_state_key):
        profile["avatar"] = new_avatar
        st.session_state[avatar_state_key] = new_avatar

        save_data()
        st.rerun()

    st.caption("Нажми на круглую рамку, чтобы сменить аватар.")

    with st.form(f"{key_prefix}_profile_form"):
        name = st.text_input(
            "Имя",
            value=profile.get("name", "")
        )

        bio = st.text_area(
            "Описание профиля",
            value=profile.get("bio", ""),
            height=140,
            max_chars=3000
        )

        submitted = st.form_submit_button(
            "💾 Сохранить профиль",
            use_container_width=True,
            type="primary"
        )

    if submitted:
        if not name.strip():
            st.error("Имя не может быть пустым.")
            return

        profile["name"] = name.strip()
        profile["bio"] = bio.strip()

        if allow_followers:
            profile.setdefault("followers", 0)

        save_data()
        st.success("Профиль сохранён.")
        st.rerun()


# =========================================================
# ГЛОБАЛЬНАЯ ЧАСТЬ
# =========================================================

def render_global_sidebar():
    with st.sidebar:
        st.header("stat_us life")
        st.caption("Твои истории и персонажи")

        if st.button(
            "Мои миры",
            type="primary" if st.session_state["global_page"] == "Миры" else "secondary",
            use_container_width=True
        ):
            st.session_state["global_page"] = "Миры"
            st.rerun()

        if st.button(
            "Глобальный профиль",
            type="primary" if st.session_state["global_page"] == "Профиль" else "secondary",
            use_container_width=True
        ):
            st.session_state["global_page"] = "Профиль"
            st.rerun()

def render_world_list():
    st.title("🌍 Мои миры")
    st.caption(
        "Каждый мир — отдельная ролевая среда со своим профилем, "
        "лентой, персонажами, репостами и переписками."
    )

    if not st.session_state["creating_world"]:
        if st.button(
            "✨ Создать новый мир",
            type="primary",
            use_container_width=True
        ):
            st.session_state["creating_world"] = True
            st.rerun()

    else:
        with st.container(border=True):
            st.subheader("Создание нового мира")

            with st.form("create_world_form"):
                title = st.text_input(
                    "Название мира",
                    placeholder="Например: Академия магии"
                )

                description = st.text_area(
                    "Описание мира",
                    placeholder=(
                        "Опиши место, эпоху, правила, конфликты "
                        "и важные события мира..."
                    ),
                    height=180
                )

                col1, col2 = st.columns(2)

                with col1:
                    create_submitted = st.form_submit_button(
                        "✅ Создать",
                        use_container_width=True,
                        type="primary"
                    )

                with col2:
                    cancel_submitted = st.form_submit_button(
                        "❌ Отмена",
                        use_container_width=True
                    )

            if create_submitted:
                if not title.strip():
                    st.error("Название мира обязательно.")
                else:
                    global_profile = st.session_state["user_profile"]

                    world = {
                        "id": new_id("world"),
                        "title": title.strip(),
                        "description": description.strip(),
                        "player_profile": {
                            "name": global_profile.get(
                                "name",
                                "Игрок"
                            ),
                            "avatar": global_profile.get("avatar"),
                            "bio": global_profile.get("bio", ""),
                            "followers": 0,
                            "reposts": []
                        },
                        "characters": [],
                        "feed": [],
                        "dms": {},
                        "crowd_accounts": [],
                        "crowd_enabled": True,
                        "crowd_intensity": "Средняя"
                    }

                    ensure_crowd_accounts(world)

                    st.session_state["worlds"].append(world)
                    st.session_state["creating_world"] = False

                    save_data()
                    st.rerun()

            if cancel_submitted:
                st.session_state["creating_world"] = False
                st.rerun()

    st.write("---")

    if not st.session_state["worlds"]:
        st.info("У тебя пока нет миров.")
        return

    for world in st.session_state["worlds"]:
        with st.container(border=True):
            col_info, col_button = st.columns([5, 1.5])

            with col_info:
                st.subheader(f"🌌 {world['title']}")
                st.write(
                    world.get("description")
                    or "Описание мира пока не добавлено."
                )

                st.caption(
                    f"Персонажей: {len(world.get('characters', []))} · "
                    f"Постов: {len(world.get('feed', []))}"
                )

            with col_button:
                st.write("")

                if st.button(
                    "Войти",
                    key=f"enter_{world['id']}",
                    type="primary",
                    use_container_width=True
                ):
                    st.session_state["active_world_id"] = world["id"]
                    st.session_state["world_page"] = "Лента"
                    st.session_state["active_dm_character_id"] = None
                    st.rerun()

                if st.button(
                    "✏️ Редактировать",
                    key=f"edit_world_{world['id']}",
                    use_container_width=True
                ):
                    current_id = st.session_state.get("editing_world_id")
                    st.session_state["editing_world_id"] = (
                        None if current_id == world["id"] else world["id"]
                    )
                    st.rerun()

                if st.button(
                    "🗑️ Удалить",
                    key=f"delete_world_from_list_{world['id']}",
                    use_container_width=True
                ):
                    current_id = st.session_state.get("deleting_world_id")
                    st.session_state["deleting_world_id"] = (
                        None if current_id == world["id"] else world["id"]
                    )
                    st.rerun()

            if st.session_state.get("editing_world_id") == world["id"]:
                with st.form(f"edit_world_form_{world['id']}"):
                    edited_title = st.text_input(
                        "Название мира",
                        value=world.get("title", "")
                    )
                    edited_description = st.text_area(
                        "Описание мира",
                        value=world.get("description", ""),
                        height=180,
                        max_chars=10000
                    )
                    save_edit, cancel_edit = st.columns(2)
                    with save_edit:
                        save_world = st.form_submit_button(
                            "💾 Сохранить",
                            type="primary",
                            use_container_width=True
                        )
                    with cancel_edit:
                        cancel_world = st.form_submit_button(
                            "Отмена",
                            use_container_width=True
                        )

                if save_world:
                    if not edited_title.strip():
                        st.error("Название мира не может быть пустым.")
                    else:
                        world["title"] = edited_title.strip()
                        world["description"] = edited_description.strip()
                        st.session_state["editing_world_id"] = None
                        save_data()
                        st.rerun()

                if cancel_world:
                    st.session_state["editing_world_id"] = None
                    st.rerun()

            if st.session_state.get("deleting_world_id") == world["id"]:
                st.warning(
                    "Мир, его персонажи, лента и переписки будут удалены навсегда."
                )
                with st.form(f"delete_world_form_{world['id']}"):
                    confirm_title = st.text_input(
                        "Для подтверждения введи название мира"
                    )
                    confirm_column, cancel_column = st.columns(2)
                    with confirm_column:
                        confirm_delete = st.form_submit_button(
                            "Удалить навсегда",
                            use_container_width=True
                        )
                    with cancel_column:
                        cancel_delete = st.form_submit_button(
                            "Отмена",
                            use_container_width=True
                        )

                if confirm_delete:
                    if confirm_title.strip() != world["title"]:
                        st.error("Название введено неверно.")
                    else:
                        st.session_state["worlds"] = [
                            current_world
                            for current_world in st.session_state["worlds"]
                            if current_world["id"] != world["id"]
                        ]
                        st.session_state["editing_world_id"] = None
                        st.session_state["deleting_world_id"] = None
                        save_data()
                        st.rerun()

                if cancel_delete:
                    st.session_state["deleting_world_id"] = None
                    st.rerun()


def render_global_profile():
    profile = st.session_state["user_profile"]

    st.title("👤 Глобальный профиль")
    st.caption(
        "Позже этот профиль можно использовать как персону по умолчанию "
        "и основу для новых миров."
    )

    render_profile_editor(
        profile=profile,
        key_prefix="global",
        title="Основная персона",
        allow_followers=True
    )

    st.write("---")
    render_api_connection()


def render_api_connection():
    config = st.session_state["api_config"]

    with st.container(border=True):
        st.subheader("🔌 Подключение API")

        with st.form("api_settings_form"):
            proxy_url = st.text_input(
                "OpenAI-совместимый URL",
                value=config.get(
                    "proxy_url",
                    "https://api.openai.com/v1"
                )
            )

            api_key = st.text_input(
                "API-ключ",
                type="password",
                value=config.get("api_key", "")
            )

            model_name = st.text_input(
                "Название модели",
                value=config.get("model_name", "gpt-4o-mini")
            )

            save_api = st.form_submit_button(
                "💾 Сохранить настройки",
                use_container_width=True,
                type="primary"
            )

        if save_api:
            config["proxy_url"] = proxy_url.strip()
            config["api_key"] = api_key.strip()
            config["model_name"] = model_name.strip()

            try:
                save_api_key(api_key)
                save_data()
                st.success("Настройки и API-ключ сохранены.")
            except RuntimeError as error:
                st.error(str(error))

    with st.container(border=True):
        st.subheader("🧪 Проверка соединения")

        if st.button(
            "Проверить API",
            use_container_width=True
        ):
            result = call_api(
                [
                    {
                        "role": "user",
                        "content": "Ответь одним словом: работает"
                    }
                ],
                max_tokens=10
            )

            if result:
                st.success(f"Соединение работает. Ответ: {result}")
            else:
                st.error(st.session_state.get(
                    "last_api_error",
                    "Не удалось получить ответ. Проверь URL, ключ и модель."
                ))


def render_global_app():
    render_global_sidebar()

    page = st.session_state["global_page"]

    if page == "Профиль":
        render_global_profile()
    else:
        render_world_list()


# =========================================================
# НАВИГАЦИЯ МИРА
# =========================================================

def render_world_sidebar(world):
    with st.sidebar:
        st.header(world["title"])

        st.caption(
            world.get("description")
            or "Описание мира отсутствует."
        )

        st.write("---")

        pages = [
            ("📰 Лента", "Лента"),
            ("👤 Мой профиль", "Профиль"),
            ("👥 Персонажи", "Персонажи"),
            ("💌 Личные сообщения", "Сообщения"),
            ("⚙️ Настройки мира", "Настройки")
        ]

        for button_label, page_name in pages:
            if st.button(
                button_label,
                key=f"world_nav_{page_name}",
                type="primary" if st.session_state["world_page"] == page_name else "secondary",
                use_container_width=True
            ):
                st.session_state["world_page"] = page_name
                st.rerun()

        st.write("---")

        if st.button(
            "🚪 Выйти из мира",
            use_container_width=True
        ):
            st.session_state["active_world_id"] = None
            st.session_state["active_dm_character_id"] = None
            st.session_state["world_page"] = "Лента"
            st.rerun()


# =========================================================
# ПРОФИЛЬ МИРА
# =========================================================

def render_world_profile(world):
    profile = world["player_profile"]

    st.title("👤 Мой профиль в этом мире")

    render_profile_editor(
        profile=profile,
        key_prefix=f"world_{world['id']}",
        title=f"Персона в мире «{world['title']}»",
        allow_followers=True
    )

    st.write("---")

    user_posts_count = sum(
        1
        for post in world.get("feed", [])
        if post.get("is_user")
    )

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "Подписчики",
            profile.get("followers", 0)
        )

    with col2:
        st.metric(
            "Посты",
            user_posts_count
        )

    with col3:
        st.metric(
            "Репосты",
            len(profile.get("reposts", []))
        )

    st.write("---")
    st.subheader("🔁 Моя стена репостов")

    reposts = profile.get("reposts", [])

    if not reposts:
        st.caption("В этом мире пока нет репостов.")
        return

    for repost_index, repost in enumerate(reposts):
        with st.container(border=True):
            if isinstance(repost, dict):
                st.caption(
                    repost.get("type", "Репост")
                )
                st.markdown(
                    f"**{repost.get('author', 'Неизвестный автор')}**"
                )
                render_text_with_mentions(repost.get("text", ""))
            else:
                st.write(repost)

            if st.button(
                "Удалить со стены",
                key=(
                    f"delete_repost_"
                    f"{world['id']}_{repost_index}"
                )
            ):
                reposts.pop(repost_index)
                save_data()
                st.rerun()


# =========================================================
# ПЕРСОНАЖИ МИРА
# =========================================================

def render_characters(world):
    st.title("👥 Персонажи мира")

    if not st.session_state["creating_character"]:
        if st.button(
            "➕ Добавить персонажа",
            type="primary",
            use_container_width=True
        ):
            st.session_state["creating_character"] = True
            st.rerun()

    else:
        with st.container(border=True):
            st.subheader("Новый персонаж")

            uploaded_avatar = st.file_uploader(
                "Аватар персонажа",
                type=["png", "jpg", "jpeg", "webp"],
                key=f"new_char_avatar_{world['id']}"
            )

            with st.form(
                f"create_character_form_{world['id']}"
            ):
                name = st.text_input(
                    "Имя персонажа",
                    placeholder="Например: Люк Скайуокер"
                )

                persona = st.text_area(
                    "Характер, личность и предыстория",
                    placeholder=(
                        "Опиши характер, стиль речи, цели, страхи, "
                        "отношения, знания и биографию персонажа..."
                    ),
                    height=260,
                    max_chars=8000
                )

                col1, col2 = st.columns(2)

                with col1:
                    create_character = st.form_submit_button(
                        "💾 Создать",
                        use_container_width=True,
                        type="primary"
                    )

                with col2:
                    cancel_character = st.form_submit_button(
                        "❌ Отмена",
                        use_container_width=True
                    )

            if create_character:
                if not name.strip():
                    st.error("Имя персонажа обязательно.")
                else:
                    character = {
                        "id": new_id("char"),
                        "name": name.strip(),
                        "persona": persona.strip(),
                        "avatar": image_to_base64(uploaded_avatar)
                    }

                    world["characters"].append(character)
                    world["dms"][character["id"]] = []

                    st.session_state["creating_character"] = False

                    save_data()
                    st.rerun()

            if cancel_character:
                st.session_state["creating_character"] = False
                st.rerun()

    st.write("---")

    if not world.get("characters"):
        st.info("В этом мире пока нет персонажей.")
        return

    for character in world["characters"]:
        with st.container(border=True):
            col_avatar, col_info, col_actions = st.columns(
                [1, 4, 1.4]
            )

            with col_avatar:
                st.markdown(
                    avatar_html(
                        character.get("avatar"),
                        size=74
                    ),
                    unsafe_allow_html=True
                )

            with col_info:
                st.subheader(character["name"])

                persona = character.get("persona", "")

                if persona:
                    st.write(
                        persona[:400]
                        + ("..." if len(persona) > 400 else "")
                    )
                else:
                    st.caption("Характер пока не описан.")

            with col_actions:
                if st.button(
                    "💌 Написать",
                    key=f"write_dm_{character['id']}",
                    use_container_width=True
                ):
                    st.session_state[
                        "active_dm_character_id"
                    ] = character["id"]
                    st.rerun()

                if st.button(
                    "✏️ Изменить",
                    key=f"edit_char_{character['id']}",
                    use_container_width=True
                ):
                    current_id = st.session_state.get("editing_character_id")
                    st.session_state["editing_character_id"] = (
                        None if current_id == character["id"] else character["id"]
                    )
                    st.rerun()

                if st.button(
                    "🗑️ Удалить",
                    key=f"delete_char_{character['id']}",
                    use_container_width=True
                ):
                    world["characters"] = [
                        current_character
                        for current_character in world["characters"]
                        if current_character["id"] != character["id"]
                    ]

                    world["dms"].pop(character["id"], None)

                    if (
                        st.session_state["active_dm_character_id"]
                        == character["id"]
                    ):
                        st.session_state[
                            "active_dm_character_id"
                        ] = None

                    save_data()
                    st.rerun()

            if st.session_state.get("editing_character_id") == character["id"]:
                st.write("---")
                edited_avatar_file = st.file_uploader(
                    "Новый аватар персонажа",
                    type=["png", "jpg", "jpeg", "webp"],
                    key=f"edit_char_avatar_{character['id']}"
                )

                with st.form(f"edit_character_form_{character['id']}"):
                    edited_name = st.text_input(
                        "Имя персонажа",
                        value=character.get("name", "")
                    )
                    edited_persona = st.text_area(
                        "Характер, личность и предыстория",
                        value=character.get("persona", ""),
                        height=260,
                        max_chars=8000
                    )
                    save_column, cancel_column = st.columns(2)
                    with save_column:
                        save_character = st.form_submit_button(
                            "💾 Сохранить",
                            type="primary",
                            use_container_width=True
                        )
                    with cancel_column:
                        cancel_character_edit = st.form_submit_button(
                            "Отмена",
                            use_container_width=True
                        )

                if save_character:
                    if not edited_name.strip():
                        st.error("Имя персонажа не может быть пустым.")
                    else:
                        character["name"] = edited_name.strip()
                        character["persona"] = edited_persona.strip()
                        if edited_avatar_file is not None:
                            new_avatar = image_to_base64(edited_avatar_file)
                            if new_avatar:
                                character["avatar"] = new_avatar
                            else:
                                st.error("Не удалось обработать новый аватар.")
                                return

                        st.session_state["editing_character_id"] = None
                        save_data()
                        st.rerun()

                if cancel_character_edit:
                    st.session_state["editing_character_id"] = None
                    st.rerun()


# =========================================================
# НАСТРОЙКИ МИРА
# =========================================================

def render_world_settings(world):
    st.title("⚙️ Настройки мира")

    with st.form(f"world_settings_{world['id']}"):
        title = st.text_input(
            "Название мира",
            value=world.get("title", "")
        )

        description = st.text_area(
            "Описание мира",
            value=world.get("description", ""),
            height=300,
            max_chars=10000
        )

        st.subheader("👥 Массовка")
        crowd_enabled = st.checkbox(
            "Добавлять фоновые аккаунты в ленту и комментарии",
            value=world.get("crowd_enabled", True)
        )
        crowd_intensity = st.selectbox(
            "Активность массовки",
            options=["Низкая", "Средняя", "Высокая"],
            index=["Низкая", "Средняя", "Высокая"].index(
                world.get("crowd_intensity", "Средняя")
                if world.get("crowd_intensity", "Средняя")
                in ["Низкая", "Средняя", "Высокая"]
                else "Средняя"
            ),
            disabled=not crowd_enabled
        )

        st.caption(
            "Массовка состоит из постоянных случайных аккаунтов этого мира. "
            "Они реагируют на новые посты и комментарии, но не появляются "
            "в списке основных персонажей и личных сообщений."
        )

        submitted = st.form_submit_button(
            "💾 Сохранить изменения",
            type="primary",
            use_container_width=True
        )

    if submitted:
        if not title.strip():
            st.error("Название мира не может быть пустым.")
        else:
            world["title"] = title.strip()
            world["description"] = description.strip()
            world["crowd_enabled"] = crowd_enabled
            world["crowd_intensity"] = crowd_intensity

            if crowd_enabled:
                ensure_crowd_accounts(world)

            save_data()
            st.success("Настройки мира сохранены.")
            st.rerun()

    st.write("---")

    with st.expander("🗑️ Удаление мира"):
        st.warning(
            "Будут удалены профиль этого мира, лента, персонажи, "
            "репосты и личные сообщения."
        )

        confirm_title = st.text_input(
            "Для подтверждения введи название мира",
            key=f"confirm_delete_{world['id']}"
        )

        if st.button(
            "Удалить мир навсегда",
            key=f"delete_world_{world['id']}",
            type="secondary",
            use_container_width=True
        ):
            if confirm_title.strip() != world["title"]:
                st.error("Название введено неверно.")
            else:
                st.session_state["worlds"] = [
                    current_world
                    for current_world in st.session_state["worlds"]
                    if current_world["id"] != world["id"]
                ]

                st.session_state["active_world_id"] = None
                st.session_state["active_dm_character_id"] = None

                save_data()
                st.rerun()


# =========================================================
# ЛЕНТА МИРА
# =========================================================

def repost_to_world_profile(world, source_id, item_type, author, text):
    repost = {
        "id": new_id("repost"),
        "source_id": source_id,
        "type": item_type,
        "author": author,
        "text": text
    }

    profile_reposts = world["player_profile"].setdefault(
        "reposts",
        []
    )

    duplicate = any(
        isinstance(existing, dict)
        and existing.get("source_id") == source_id
        for existing in profile_reposts
    )

    if not duplicate:
        profile_reposts.append(repost)
        save_data()


def render_comment(world, post, comment):
    comment_id = comment["id"]

    with st.container(border=True):
        st.markdown('<span class="comment-marker"></span>', unsafe_allow_html=True)
        with st.chat_message(
            "user",
            avatar=get_chat_avatar(
                comment.get("avatar"),
                fallback="👤"
            )
        ):
            st.markdown(f"**{comment['author']}**")
            render_text_with_mentions(comment["text"])

        col_like, col_reply, col_repost, col_space = st.columns(
            [1, 1, 1, 3]
        )

        with col_like:
            is_liked = comment.get("is_liked_by_player", False)
            if st.button(
                f"{'❤️' if is_liked else '🤍'} {comment.get('likes', 0)}",
                key=f"comment_like_{comment_id}"
            ):
                comment["is_liked_by_player"] = not is_liked
                comment["likes"] = max(
                    0,
                    comment.get("likes", 0) + (1 if not is_liked else -1)
                )
                save_data()
                st.rerun()

        with col_reply:
            if st.button(
                "↩️ Ответить",
                key=f"reply_{comment_id}"
            ):
                st.session_state["reply_targets"][
                    post["id"]
                ] = comment["author"]
                st.rerun()

        with col_repost:
            if st.button(
                "🔁",
                key=f"comment_repost_{comment_id}"
            ):
                repost_to_world_profile(
                    world=world,
                    source_id=comment_id,
                    item_type="Комментарий",
                    author=comment["author"],
                    text=comment["text"]
                )
                st.toast("Комментарий добавлен на стену.")


def render_post(world, post):
    post_id = post["id"]
    expanded = st.session_state["expanded_comments"].get(
        post_id,
        False
    )

    with st.container(border=True):
        with st.chat_message(
            "user",
            avatar=get_chat_avatar(
                post.get("avatar"),
                fallback="👤"
            )
        ):
            st.markdown(f"**{post['author']}**")
            render_text_with_mentions(post["text"])

        comments = post.setdefault("comments", [])

        col_like, col_comments, col_repost, col_space = st.columns(
            [1, 1, 1, 3]
        )

        with col_like:
            is_liked = post.get("is_liked_by_player", False)
            if st.button(
                f"{'❤️' if is_liked else '🤍'} {post.get('likes', 0)}",
                key=f"post_like_{post_id}"
            ):
                post["is_liked_by_player"] = not is_liked
                post["likes"] = max(
                    0,
                    post.get("likes", 0) + (1 if not is_liked else -1)
                )
                save_data()
                st.rerun()

        with col_comments:
            if st.button(
                f"💬 {len(comments)}",
                key=f"post_comments_{post_id}"
            ):
                st.session_state["expanded_comments"][
                    post_id
                ] = not expanded
                st.rerun()

        with col_repost:
            if st.button(
                "🔁",
                key=f"post_repost_{post_id}"
            ):
                repost_to_world_profile(
                    world=world,
                    source_id=post_id,
                    item_type="Пост",
                    author=post["author"],
                    text=post["text"]
                )
                st.toast("Пост добавлен на стену.")

        if not expanded:
            return

        st.write("---")
        st.caption("Комментарии")

        if not comments:
            st.caption("Комментариев пока нет.")

        for comment in comments:
            render_comment(
                world=world,
                post=post,
                comment=comment
            )

        reply_target = st.session_state["reply_targets"].get(
            post_id
        )

        if reply_target:
            st.caption(
                f"Ответ пользователю @{reply_target}"
            )

        with st.form(
            f"comment_form_{post_id}",
            clear_on_submit=True
        ):
            default_prefix = (
                f"@{reply_target} "
                if reply_target
                else ""
            )

            comment_text = st.text_input(
                "Комментарий",
                value=default_prefix,
                placeholder="Напиши комментарий...",
                label_visibility="collapsed"
            )

            submitted = st.form_submit_button(
                "Отправить комментарий",
                use_container_width=True
            )

        if submitted and comment_text.strip():
            profile = world["player_profile"]

            user_comment = {
                "id": new_id("comment"),
                "author": profile["name"],
                "avatar": profile.get("avatar"),
                "text": comment_text.strip(),
                "is_user": True,
                "likes": 0
            }

            comments.append(user_comment)

            st.session_state["reply_targets"].pop(
                post_id,
                None
            )

            save_data()

            activity_container = st.container()

            def show_ready_comment(ready_comment):
                save_data()
                with activity_container:
                    render_comment(
                        world=world,
                        post=post,
                        comment=ready_comment
                    )

            generate_reactions_to_user_comment(
                world=world,
                post=post,
                user_comment=user_comment,
                on_comment=show_ready_comment
            )

            add_crowd_activity(
                world=world,
                target_post=post,
                include_posts=False,
                on_comment=show_ready_comment,
                trigger_text=(
                    f"Пост {post.get('author', 'Неизвестно')}: "
                    f"{post.get('text', '')}\n"
                    f"Новый комментарий {user_comment['author']}: "
                    f"{user_comment['text']}"
                )
            )

            save_data()
            st.rerun()


def render_feed(world):
    st.markdown('<span class="feed-marker"></span>', unsafe_allow_html=True)
    st.title(world["title"])
    st.caption("Лента мира")

    profile = world["player_profile"]

    with st.container(border=True):
        st.markdown('<span class="composer-marker"></span>', unsafe_allow_html=True)
        with st.form(
            f"new_post_form_{world['id']}",
            clear_on_submit=True
        ):
            user_text = st.text_input(
                "Новый пост",
                placeholder=(
                    f"Что публикует {profile['name']}?"
                ),
                max_chars=1000,
                label_visibility="collapsed"
            )

            submitted = st.form_submit_button(
                "Опубликовать",
                type="primary",
                use_container_width=True
            )

        if submitted and user_text.strip():
            user_post = {
                "id": new_id("post"),
                "author": profile["name"],
                "avatar": profile.get("avatar"),
                "text": user_text.strip(),
                "is_user": True,
                "likes": 0,
                "comments": []
            }

            world["feed"].insert(0, user_post)
            save_data()

            # Сразу показываем публикацию, затем добавляем готовые реакции.
            st.write("---")
            render_post(world, user_post)

            activity_container = st.container()

            def show_ready_comment(ready_comment):
                save_data()
                with activity_container:
                    render_comment(
                        world=world,
                        post=user_post,
                        comment=ready_comment
                    )

            def show_ready_post(ready_post):
                save_data()
                with activity_container:
                    render_post(world, ready_post)

            generate_reactions_to_user_post(
                world=world,
                user_post=user_post,
                on_comment=show_ready_comment
            )

            add_crowd_activity(
                world=world,
                target_post=user_post,
                include_posts=False,
                on_comment=show_ready_comment,
            )

            save_data()
            st.rerun()

    st.write("---")

    if not world.get("feed"):
        st.info("Лента этого мира пока пуста.")
        return

    for post in world["feed"]:
        render_post(world, post)


# =========================================================
# ПРАВАЯ ПАНЕЛЬ ЛИЧНЫХ СООБЩЕНИЙ
# =========================================================

def render_dm_list(world):
    st.markdown(
        '<span class="right-sidebar-marker dm-marker"></span>',
        unsafe_allow_html=True
    )

    st.subheader("💌 Сообщения")

    characters = world.get("characters", [])

    if not characters:
        st.caption("В этом мире пока нет персонажей.")
        return

    for character in characters:
        history = world["dms"].setdefault(
            character["id"],
            []
        )

        label = character["name"]

        if history:
            last_text = history[-1].get("text", "")
            preview = (
                last_text[:25]
                + ("…" if len(last_text) > 25 else "")
            )
            label = f"{character['name']}\n{preview}"

        if st.button(
            label,
            key=f"open_dm_{character['id']}",
            use_container_width=True
        ):
            st.session_state[
                "active_dm_character_id"
            ] = character["id"]
            st.rerun()


def render_active_dm(world, character):
    st.markdown(
        '<span class="right-sidebar-marker dm-marker"></span>',
        unsafe_allow_html=True
    )

    if st.button(
        "← Все диалоги",
        key=f"close_dm_{character['id']}",
        use_container_width=True
    ):
        st.session_state["active_dm_character_id"] = None
        st.rerun()

    st.markdown(
        avatar_html(
            character.get("avatar"),
            size=58
        ),
        unsafe_allow_html=True
    )

    st.markdown(f"### {character['name']}")
    st.caption("Приватный чат этого мира")

    history = world["dms"].setdefault(
        character["id"],
        []
    )

    st.write("---")

    if not history:
        st.caption("Сообщений пока нет.")

    for message in history[-30:]:
        if message.get("is_user"):
            avatar = get_chat_avatar(
                world["player_profile"].get("avatar"),
                fallback="👑"
            )
            role = "user"
            author = world["player_profile"]["name"]
        else:
            avatar = get_chat_avatar(
                character.get("avatar"),
                fallback="👤"
            )
            role = "assistant"
            author = character["name"]

        with st.chat_message(role, avatar=avatar):
            st.markdown(f"**{author}**")
            render_text_with_mentions(message.get("text", ""))

    with st.form(
        f"dm_form_{world['id']}_{character['id']}",
        clear_on_submit=True
    ):
        message_text = st.text_input(
            "Личное сообщение",
            placeholder=f"Написать {character['name']}...",
            label_visibility="collapsed"
        )

        submitted = st.form_submit_button(
            "Отправить",
            use_container_width=True,
            type="primary"
        )

    if submitted and message_text.strip():
        user_message = {
            "id": new_id("dm"),
            "text": message_text.strip(),
            "is_user": True
        }
        history.append(user_message)

        save_data()

        # Показываем отправленное сообщение до ожидания ответа API.
        with st.chat_message(
            "user",
            avatar=get_chat_avatar(
                world["player_profile"].get("avatar"),
                fallback="👑"
            )
        ):
            st.markdown(f"**{world['player_profile']['name']}**")
            render_text_with_mentions(user_message["text"])

        if st.session_state["api_config"].get("api_key"):
            reply = generate_dm_reply(
                character=character,
                world=world,
                history=history
            )

            if reply:
                assistant_message = {
                    "id": new_id("dm"),
                    "text": reply,
                    "is_user": False
                }
                history.append(assistant_message)

                with st.chat_message(
                    "assistant",
                    avatar=get_chat_avatar(
                        character.get("avatar"),
                        fallback="👤"
                    )
                ):
                    st.markdown(f"**{character['name']}**")
                    render_text_with_mentions(assistant_message["text"])

        save_data()
        st.rerun()


def render_right_dm_sidebar(world):
    active_character_id = st.session_state.get(
        "active_dm_character_id"
    )

    character = None

    if active_character_id:
        character = get_character(
            world,
            active_character_id
        )

    if character:
        render_active_dm(world, character)
    else:
        render_dm_list(world)


# =========================================================
# ПРИЛОЖЕНИЕ АКТИВНОГО МИРА
# =========================================================

def render_world_main_content(world):
    page = st.session_state["world_page"]

    if page == "Профиль":
        render_world_profile(world)

    elif page == "Персонажи":
        render_characters(world)

    elif page == "Настройки":
        render_world_settings(world)

    elif page == "Сообщения":
        st.title("💌 Личные сообщения")
        render_right_dm_sidebar(world)

    else:
        render_feed(world)


def render_world_app(world):
    render_world_sidebar(world)
    render_world_main_content(world)


# =========================================================
# ЗАПУСК ПРИЛОЖЕНИЯ
# =========================================================

def run():
    initialize_state()
    apply_styles()
    active_world = get_active_world()

    if active_world is None:
        # Если мир был удалён или ID стал недействительным
        st.session_state["active_world_id"] = None
        render_global_app()
    else:
        render_world_app(active_world)
