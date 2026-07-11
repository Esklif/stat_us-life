import random

import streamlit as st

from api_client import call_api
from config import MAX_POST_REACTIONS, MAX_REACTION_CANDIDATES
from storage import new_id


def build_social_system_prompt(character, world):
    player_profile = world["player_profile"]
    return (
        "Ты являешься пользователем ролевой социальной сети, похожей на Twitter. "
        "Ты ведёшь собственный публичный аккаунт и пишешь сообщения в общую ленту. "
        "Ты понимаешь разницу между публичным постом, комментарием и личным сообщением. "
        "В публичной ленте ты не описываешь себя как искусственный интеллект и "
        "не объясняешь, что выполняешь инструкции.\n\n"
        f"Название мира: {world.get('title', 'Безымянный мир')}.\n"
        f"Описание мира: {world.get('description', 'Описание отсутствует')}.\n\n"
        f"Твоё имя: {character.get('name', 'Неизвестно')}.\n"
        "Твоя личность, характер и предыстория: "
        f"{character.get('persona', 'Не указаны')}.\n\n"
        f"Профиль игрока в этом мире: {player_profile.get('name', 'Игрок')}.\n"
        f"Описание игрока: {player_profile.get('bio', 'Не указано')}.\n\n"
        "Всегда действуй строго от лица своего персонажа. "
        "Сохраняй его характер, знания, отношение к окружающим и стиль речи. "
        "Не пиши служебные пояснения, кавычки вокруг ответа или подпись автора."
    )


def build_dm_system_prompt(character, world):
    player_profile = world["player_profile"]
    return (
        "Ты ведёшь приватную личную переписку в мессенджере. "
        "Эти сообщения видны только тебе и собеседнику. "
        "Это не публичный пост и не комментарий. "
        "Отвечай естественно, как живой собеседник в личном чате.\n\n"
        f"Мир: {world.get('title', 'Безымянный мир')}.\n"
        f"Описание мира: {world.get('description', 'Описание отсутствует')}.\n\n"
        f"Ты — {character.get('name', 'Неизвестный персонаж')}.\n"
        "Твой характер и предыстория: "
        f"{character.get('persona', 'Не указаны')}.\n\n"
        f"Твой собеседник: {player_profile.get('name', 'Игрок')}.\n"
        f"Описание собеседника: {player_profile.get('bio', 'Не указано')}.\n\n"
        "Отвечай только от лица персонажа. "
        "Обычно используй 1–4 предложения, но при необходимости можешь писать подробнее. "
        "Не добавляй имя перед ответом и не используй служебные пояснения."
    )


def is_interested(character, world, content, content_type="пост"):
    prompt = (
        f"В социальной сети появилась новая публикация типа «{content_type}»:\n"
        f"{content}\n\n"
        "Реши, стал бы твой персонаж реагировать на это по собственной инициативе. "
        "Учитывай характер, отношения, интересы, текущий мир, важность события "
        "и склонность персонажа участвовать в публичных обсуждениях.\n\n"
        "Не каждый персонаж обязан отвечать. "
        "Если публикация неинтересна, неуместна или персонаж предпочёл бы промолчать — "
        "ответь НЕТ.\n\n"
        "Ответь строго одним словом: ДА или НЕТ."
    )
    result = call_api(
        [
            {"role": "system", "content": build_social_system_prompt(character, world)},
            {"role": "user", "content": prompt},
        ],
        max_tokens=5,
    )
    return bool(result and result.strip().upper().startswith("ДА"))


def generate_character_post(character, world, trigger_post):
    recent_posts = list(reversed(world.get("feed", [])[:8]))
    feed_context = "\n".join(
        f"{post.get('author', 'Неизвестно')}: {post.get('text', '')}"
        for post in recent_posts
    )
    prompt = (
        "Ты решил отреагировать на публикацию в общей социальной ленте.\n\n"
        "Публикация, вызвавшая реакцию:\n"
        f"{trigger_post.get('author', 'Неизвестно')}: {trigger_post.get('text', '')}\n\n"
        f"Последние публикации в ленте:\n{feed_context or 'Лента пуста.'}\n\n"
        "Напиши новый самостоятельный публичный пост от своего лица. "
        "Он может прямо или косвенно реагировать на увиденное. "
        "Не обязательно обращаться к автору напрямую. "
        "Длина — не более 280 символов.\n\n"
        "Верни только текст публикации."
    )
    result = call_api(
        [
            {"role": "system", "content": build_social_system_prompt(character, world)},
            {"role": "user", "content": prompt},
        ]
    )
    return result[:280].strip() if result else None


def generate_character_comment(character, world, post, existing_comments, trigger_comment=None):
    comments_context = "\n".join(
        f"{comment.get('author', 'Неизвестно')}: {comment.get('text', '')}"
        for comment in existing_comments[-6:]
    )
    trigger_text = ""
    if trigger_comment:
        trigger_text = (
            "\nКомментарий, который мог вызвать твою реакцию:\n"
            f"{trigger_comment.get('author', 'Неизвестно')}: "
            f"{trigger_comment.get('text', '')}\n"
        )
    prompt = (
        f"Ты комментируешь публичный пост:\n"
        f"{post.get('author', 'Неизвестно')}: {post.get('text', '')}\n\n"
        f"Уже опубликованные комментарии:\n"
        f"{comments_context or 'Комментариев пока нет.'}\n"
        f"{trigger_text}\n"
        "Напиши короткий комментарий от своего лица. "
        "Если отвечаешь конкретному участнику, начни сообщение с "
        "@имя_участника. Не используй @, если это общий комментарий. "
        "Длина — не более 180 символов.\n\n"
        "Верни только текст комментария."
    )
    result = call_api(
        [
            {"role": "system", "content": build_social_system_prompt(character, world)},
            {"role": "user", "content": prompt},
        ]
    )
    return result[:180].strip() if result else None


def generate_dm_reply(character, world, history):
    messages = [{"role": "system", "content": build_dm_system_prompt(character, world)}]
    for message in history[-16:]:
        messages.append(
            {
                "role": "user" if message.get("is_user") else "assistant",
                "content": message.get("text", ""),
            }
        )
    return call_api(messages, max_tokens=300)


def create_character_comment(character, world, post, trigger_comment=None):
    text = generate_character_comment(
        character=character,
        world=world,
        post=post,
        existing_comments=post.get("comments", []),
        trigger_comment=trigger_comment,
    )
    if not text:
        return None
    comment = {
        "id": new_id("comment"),
        "author": character["name"],
        "avatar": character.get("avatar"),
        "text": text,
        "is_user": False,
        "likes": 0,
    }
    post.setdefault("comments", []).append(comment)
    return comment


def auto_comment_on_character_post(author_character, world, post):
    candidates = [
        character
        for character in world.get("characters", [])
        if character["id"] != author_character["id"]
    ]
    random.shuffle(candidates)
    for candidate in candidates[:2]:
        interest_text = f"Автор поста: {post['author']}\nТекст поста: {post['text']}"
        if is_interested(candidate, world, interest_text, content_type="пост другого персонажа"):
            create_character_comment(candidate, world, post)
            break


def generate_reactions_to_user_post(world, user_post, on_comment=None):
    if not st.session_state["api_config"].get("api_key"):
        return
    characters = list(world.get("characters", []))
    random.shuffle(characters)
    reactions_count = 0
    for character in characters[:MAX_REACTION_CANDIDATES]:
        if not is_interested(character, world, user_post["text"], content_type="пост игрока"):
            continue
        created_comment = create_character_comment(character, world, user_post)
        if created_comment:
            reactions_count += 1
            if on_comment:
                on_comment(created_comment)
        if reactions_count >= MAX_POST_REACTIONS:
            break


def generate_reactions_to_user_comment(world, post, user_comment, on_comment=None):
    if not st.session_state["api_config"].get("api_key"):
        return
    characters = list(world.get("characters", []))
    random.shuffle(characters)
    reactions_count = 0
    for character in characters[:MAX_REACTION_CANDIDATES]:
        interest_text = (
            f"Пост: {post.get('text', '')}\n"
            f"Комментарий игрока: {user_comment.get('text', '')}"
        )
        if not is_interested(character, world, interest_text, content_type="комментарий игрока"):
            continue
        created_comment = create_character_comment(
            character=character,
            world=world,
            post=post,
            trigger_comment=user_comment,
        )
        if created_comment:
            reactions_count += 1
            if on_comment:
                on_comment(created_comment)
        if reactions_count >= 2:
            break
