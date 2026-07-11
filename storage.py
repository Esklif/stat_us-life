import copy
import json
import os
import random
import shutil
import uuid

import streamlit as st
import keyring
from keyring.errors import KeyringError

from config import (
    BACKUP_FILE,
    CROWD_PERSONAS,
    DATA_FILE,
    DATA_VERSION,
    DEFAULT_API_CONFIG,
    DEFAULT_USER_PROFILE,
)


KEYRING_SERVICE = "stat_us life"
KEYRING_USERNAME = "openai-compatible-api-key"


def new_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex}"


def load_data():
    if not DATA_FILE.exists():
        return None

    try:
        with open(DATA_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, OSError):
        return None


def load_api_key():
    """Loads the API key from the operating system credential storage."""
    try:
        return keyring.get_password(KEYRING_SERVICE, KEYRING_USERNAME) or ""
    except KeyringError:
        return ""


def save_api_key(value):
    """Stores the API key outside the application JSON."""
    try:
        if value.strip():
            keyring.set_password(KEYRING_SERVICE, KEYRING_USERNAME, value.strip())
        else:
            try:
                keyring.delete_password(KEYRING_SERVICE, KEYRING_USERNAME)
            except KeyringError:
                pass
    except KeyringError as error:
        raise RuntimeError(
            "Не удалось сохранить API-ключ в защищённом хранилище Windows."
        ) from error


def save_data():
    api_config = dict(st.session_state["api_config"])
    api_config.pop("api_key", None)
    data_to_save = {
        "version": DATA_VERSION,
        "user_profile": st.session_state["user_profile"],
        "worlds": st.session_state["worlds"],
        "api_config": api_config,
    }
    temp_file = DATA_FILE.with_suffix(".json.tmp")

    try:
        with open(temp_file, "w", encoding="utf-8") as file:
            json.dump(data_to_save, file, ensure_ascii=False, indent=2)
            file.flush()
            os.fsync(file.fileno())
        if DATA_FILE.exists():
            shutil.copy2(DATA_FILE, BACKUP_FILE)
        os.replace(temp_file, DATA_FILE)
    finally:
        if temp_file.exists():
            temp_file.unlink()


def normalize_loaded_data(data):
    if not isinstance(data, dict):
        return None

    profile = data.get("user_profile")
    worlds = data.get("worlds")
    api_config = data.get("api_config")
    if not isinstance(profile, dict):
        profile = copy.deepcopy(DEFAULT_USER_PROFILE)
    if not isinstance(worlds, list):
        worlds = []
    if not isinstance(api_config, dict):
        api_config = copy.deepcopy(DEFAULT_API_CONFIG)

    data["user_profile"] = profile
    data["worlds"] = [world for world in worlds if isinstance(world, dict)]
    data["api_config"] = api_config
    return data


def migrate_data():
    """Добавляет недостающие поля, не удаляя данные старых сохранений."""
    global_profile = st.session_state["user_profile"]
    global_profile.setdefault("name", "Твой Никнейм")
    global_profile.setdefault("avatar", None)
    global_profile.setdefault("bio", "")
    global_profile.setdefault("followers", 142)
    global_profile.setdefault("reposts", [])

    for world in st.session_state["worlds"]:
        world.setdefault("id", new_id("world"))
        world.setdefault("title", "Безымянный мир")
        world.setdefault("description", "")
        world.setdefault("characters", [])
        world.setdefault("feed", [])
        world.setdefault("dms", {})
        world.setdefault("crowd_accounts", [])
        world.setdefault("crowd_enabled", True)
        world.setdefault("crowd_intensity", "Средняя")

        if not isinstance(world["characters"], list):
            world["characters"] = []
        if not isinstance(world["feed"], list):
            world["feed"] = []
        if not isinstance(world["dms"], dict):
            world["dms"] = {}
        if not isinstance(world["crowd_accounts"], list):
            world["crowd_accounts"] = []

        world["characters"] = [item for item in world["characters"] if isinstance(item, dict)]
        world["feed"] = [item for item in world["feed"] if isinstance(item, dict)]
        world["crowd_accounts"] = [
            item for item in world["crowd_accounts"] if isinstance(item, dict)
        ]

        if not isinstance(world.get("player_profile"), dict):
            world["player_profile"] = {
                "name": global_profile.get("name", "Игрок"),
                "avatar": global_profile.get("avatar"),
                "bio": global_profile.get("bio", ""),
                "followers": 0,
                "reposts": [],
            }

        player_profile = world["player_profile"]
        player_profile.setdefault("name", global_profile.get("name", "Игрок"))
        player_profile.setdefault("avatar", global_profile.get("avatar"))
        player_profile.setdefault("bio", "")
        player_profile.setdefault("followers", 0)
        player_profile.setdefault("reposts", [])

        for character in world["characters"]:
            character.setdefault("id", new_id("char"))
            character.setdefault("name", "Безымянный персонаж")
            character.setdefault("persona", "")
            character.setdefault("avatar", None)

        for account in world["crowd_accounts"]:
            account.setdefault("id", new_id("crowd"))
            account.setdefault("name", "случайный пользователь")
            account.setdefault("persona", random.choice(CROWD_PERSONAS))
            account.setdefault("avatar", None)
            account["is_crowd"] = True

        old_dms = world.get("dms", {})
        migrated_dms = {}
        for character in world["characters"]:
            character_id = character["id"]
            character_name = character["name"]
            if character_id in old_dms:
                migrated_dms[character_id] = old_dms[character_id]
            elif character_name in old_dms:
                migrated_dms[character_id] = old_dms[character_name]
            else:
                migrated_dms[character_id] = []
        world["dms"] = migrated_dms

        for post in world["feed"]:
            post.setdefault("id", new_id("post"))
            post.setdefault("author", "Неизвестный автор")
            post.setdefault("avatar", None)
            post.setdefault("text", "")
            post.setdefault("is_user", False)
            post.setdefault("likes", 0)
            post.setdefault("is_liked_by_player", False)
            post.setdefault("comments", [])
            if not isinstance(post["comments"], list):
                post["comments"] = []
            post["comments"] = [
                item for item in post["comments"] if isinstance(item, dict)
            ]
            for comment in post["comments"]:
                comment.setdefault("id", new_id("comment"))
                comment.setdefault("author", "Неизвестный автор")
                comment.setdefault("avatar", None)
                comment.setdefault("text", "")
                comment.setdefault("is_user", False)
                comment.setdefault("likes", 0)
                comment.setdefault("is_liked_by_player", False)
