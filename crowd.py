import json
import random
import re

from api_client import call_api
from config import (
    CROWD_FIRST_NAMES,
    CROWD_NAME_SUFFIXES,
    CROWD_PERSONAS,
    DEFAULT_CROWD_SIZE,
    MAX_CROWD_COMMENTS_PER_EVENT,
)
from storage import new_id


def ensure_crowd_accounts(world, count=DEFAULT_CROWD_SIZE):
    """Создаёт постоянный набор фоновых аккаунтов для конкретного мира."""
    accounts = world.setdefault("crowd_accounts", [])
    existing_names = {
        str(account.get("name", "")).casefold()
        for account in accounts
        if isinstance(account, dict)
    }
    attempts = 0
    while len(accounts) < count and attempts < count * 10:
        attempts += 1
        display_name = random.choice(CROWD_FIRST_NAMES)
        username = f"{display_name}_{random.choice(CROWD_NAME_SUFFIXES)}"
        if username.casefold() in existing_names:
            continue
        accounts.append(
            {
                "id": new_id("crowd"),
                "name": username,
                "persona": random.choice(CROWD_PERSONAS),
                "avatar": None,
                "is_crowd": True,
            }
        )
        existing_names.add(username.casefold())
    return accounts


def parse_json_response(text):
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, TypeError):
        return None


def generate_crowd_activity(world, trigger, include_posts=False):
    """Одним API-запросом создаёт комментарии фоновых аккаунтов."""
    if not world.get("crowd_enabled", True):
        return {"posts": [], "comments": []}
    accounts = ensure_crowd_accounts(world)
    if not accounts:
        return {"posts": [], "comments": []}

    comment_limits = {
        "Низкая": 2,
        "Средняя": 3,
        "Высокая": MAX_CROWD_COMMENTS_PER_EVENT,
    }
    comment_limit = comment_limits.get(
        world.get("crowd_intensity", "Средняя"),
        comment_limits["Средняя"],
    )

    selected_accounts = random.sample(accounts, min(len(accounts), 8))
    account_context = "\n".join(
        f"- {account['id']} | @{account['name']} | {account['persona']}"
        for account in selected_accounts
    )
    recent_context = "\n".join(
        f"{item.get('author', 'Неизвестно')}: {item.get('text', '')}"
        for item in world.get("feed", [])[:6]
    )
    prompt = (
        "Ты моделируешь обычных второстепенных пользователей ролевой социальной сети. "
        "Они не являются главными персонажами и не должны перетягивать внимание на себя. "
        "Пиши живые, разные по тону реакции: согласие, сомнение, вопрос, шутку, наблюдение. "
        "Не повторяй одну мысль разными словами и не сообщай, что текст создан ИИ.\n\n"
        f"Мир: {world.get('title', 'Безымянный мир')}\n"
        f"Описание мира: {world.get('description', 'Описание отсутствует')}\n\n"
        f"Событие, на которое реагирует массовка:\n{trigger}\n\n"
        f"Последние записи:\n{recent_context or 'Лента пока пуста.'}\n\n"
        f"Доступные аккаунты:\n{account_context}\n\n"
        f"Создай до {comment_limit} комментариев непосредственно под указанной публикацией. "
        "Не создавай самостоятельные посты и не имитируй новую запись в ленте. "
        "Каждый текст должен быть именно короткой реакцией на исходную публикацию "
        "или продолжением обсуждения под ней. Комментарии должны быть не длиннее 180 символов. "
        "Для каждого элемента используй только account_id из списка. "
        "Не каждый аккаунт обязан реагировать.\n\n"
        "Верни строго JSON без markdown в формате:\n"
        '{"comments":[{"account_id":"crowd_...","text":"..."}]}'
    )
    parsed = parse_json_response(
        call_api([{"role": "user", "content": prompt}], max_tokens=700)
    )
    if not isinstance(parsed, dict):
        return {"posts": [], "comments": []}

    account_by_id = {account["id"]: account for account in selected_accounts}

    def normalize_items(items, limit, max_length):
        normalized = []
        if not isinstance(items, list):
            return normalized
        for item in items[:limit]:
            if not isinstance(item, dict):
                continue
            account = account_by_id.get(item.get("account_id"))
            text = item.get("text")
            if not account or not isinstance(text, str) or not text.strip():
                continue
            normalized.append({"account": account, "text": text.strip()[:max_length]})
        return normalized

    return {
        "posts": [],
        "comments": normalize_items(parsed.get("comments"), comment_limit, 180),
    }


def add_crowd_activity(
    world,
    target_post,
    include_posts=False,
    trigger_text=None,
    on_comment=None,
    on_post=None,
):
    trigger = trigger_text or (
        f"Автор: {target_post.get('author', 'Неизвестно')}\n"
        f"Текст: {target_post.get('text', '')}"
    )
    activity = generate_crowd_activity(world, trigger, include_posts=include_posts)
    for generated in activity["comments"]:
        account = generated["account"]
        comment = {
            "id": new_id("comment"),
            "author": account["name"],
            "author_id": account["id"],
            "avatar": account.get("avatar"),
            "text": generated["text"],
            "is_user": False,
            "is_crowd": True,
            "likes": random.randint(0, 4),
            "is_liked_by_player": False,
        }
        target_post.setdefault("comments", []).append(comment)
        if on_comment:
            on_comment(comment)

    return len(activity["comments"])
