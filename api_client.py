import os

import requests
import streamlit as st


def call_api(messages, max_tokens=180):
    """Выполняет тихий вызов OpenAI-совместимого API."""
    config = st.session_state["api_config"]
    api_key = config.get("api_key") or os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        st.session_state["last_api_error"] = "API-ключ не задан."
        return None

    proxy_url = config.get("proxy_url", "").rstrip("/")
    model_name = config.get("model_name", "").strip()
    if not proxy_url or not model_name:
        st.session_state["last_api_error"] = "Не заданы URL API или модель."
        return None

    try:
        response = requests.post(
            f"{proxy_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_name,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.9,
            },
            timeout=(5, 30),
        )
        response.raise_for_status()
        result = response.json()
        text = result["choices"][0]["message"]["content"]
        if not isinstance(text, str):
            st.session_state["last_api_error"] = "API вернул текст в неизвестном формате."
            return None
        st.session_state.pop("last_api_error", None)
        return text.strip()
    except requests.Timeout:
        st.session_state["last_api_error"] = "API не ответил вовремя."
    except requests.HTTPError as error:
        status = error.response.status_code if error.response is not None else "?"
        st.session_state["last_api_error"] = f"Ошибка API HTTP {status}."
    except requests.RequestException:
        st.session_state["last_api_error"] = "Ошибка подключения к API."
    except (KeyError, IndexError, TypeError, ValueError):
        st.session_state["last_api_error"] = "API вернул неожиданный ответ."
    return None
