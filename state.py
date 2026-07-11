import copy

import streamlit as st

from config import DEFAULT_API_CONFIG, DEFAULT_STATE, DEFAULT_USER_PROFILE
from storage import load_api_key, load_data, migrate_data, normalize_loaded_data, save_data


def initialize_state():
    if "data_loaded" not in st.session_state:
        saved_data = normalize_loaded_data(load_data())
        if saved_data:
            st.session_state["user_profile"] = saved_data.get(
                "user_profile", copy.deepcopy(DEFAULT_USER_PROFILE)
            )
            st.session_state["worlds"] = saved_data.get("worlds", [])
            st.session_state["api_config"] = saved_data.get(
                "api_config", copy.deepcopy(DEFAULT_API_CONFIG)
            )
        else:
            st.session_state["user_profile"] = copy.deepcopy(DEFAULT_USER_PROFILE)
            st.session_state["worlds"] = []
            st.session_state["api_config"] = copy.deepcopy(DEFAULT_API_CONFIG)
        st.session_state["api_config"]["api_key"] = load_api_key()
        migrate_data()
        save_data()
        st.session_state["data_loaded"] = True

    for state_key, default_value in DEFAULT_STATE.items():
        if state_key not in st.session_state:
            st.session_state[state_key] = copy.deepcopy(default_value)


def get_active_world():
    active_world_id = st.session_state.get("active_world_id")
    if not active_world_id:
        return None
    return next(
        (world for world in st.session_state["worlds"] if world["id"] == active_world_id),
        None,
    )


def get_character(world, character_id):
    return next(
        (
            character
            for character in world.get("characters", [])
            if character["id"] == character_id
        ),
        None,
    )
