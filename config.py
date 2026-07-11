import os
import sys
from pathlib import Path


APP_DIR = Path(__file__).resolve().parent


def get_data_dir():
    """Returns a writable per-user directory for desktop builds."""
    if os.getenv("STAT_US_DESKTOP") == "1" or getattr(sys, "frozen", False):
        local_app_data = os.getenv("LOCALAPPDATA")
        if local_app_data:
            return Path(local_app_data) / "stat_us life"
        return Path.home() / "AppData" / "Local" / "stat_us life"
    return APP_DIR


DATA_DIR = get_data_dir()
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATA_FILE = DATA_DIR / "fandom_data.json"
BACKUP_FILE = DATA_DIR / "fandom_data.json.bak"
DATA_VERSION = 2

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
MAX_REACTION_CANDIDATES = 6
MAX_POST_REACTIONS = 3
DEFAULT_CROWD_SIZE = 12
MAX_CROWD_POSTS_PER_EVENT = 3
MAX_CROWD_COMMENTS_PER_EVENT = 4

CROWD_FIRST_NAMES = [
    "Алекс", "Рин", "Мика", "Саша", "Лео", "Ника", "Тори", "Кай",
    "Эли", "Макс", "Рэй", "Дана", "Женя", "Эш", "Лина", "Фокс"
]

CROWD_NAME_SUFFIXES = [
    "online", "daily", "observer", "local", "archive", "notes",
    "live", "wave", "inside", "talks", "today", "view"
]

CROWD_PERSONAS = [
    "Любопытный пользователь соцсети, который любит обсуждать свежие события.",
    "Скептичный наблюдатель, который не верит слухам и задаёт неудобные вопросы.",
    "Эмоциональный фанат, активно поддерживающий интересных участников.",
    "Спокойный местный пользователь, который пишет коротко и по существу.",
    "Любитель шуток, мемов и ироничных реакций на происходящее.",
    "Внимательный читатель, замечающий детали и противоречия.",
    "Пользователь, который следит за новостями и пересказывает общий настрой.",
    "Немногословный аккаунт, реагирующий простыми живыми фразами."
]

DEFAULT_USER_PROFILE = {
    "name": "Твой Никнейм",
    "avatar": None,
    "bio": "",
    "followers": 142,
    "reposts": []
}

DEFAULT_API_CONFIG = {
    "proxy_url": "https://api.openai.com/v1",
    "api_key": "",
    "model_name": "gpt-4o-mini"
}

DEFAULT_STATE = {
    "active_world_id": None,
    "global_page": "Миры",
    "world_page": "Лента",
    "active_dm_character_id": None,
    "expanded_comments": {},
    "reply_targets": {},
    "creating_world": False,
    "creating_character": False,
    "editing_world_id": None,
    "editing_character_id": None,
    "deleting_world_id": None
}
