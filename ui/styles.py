import streamlit as st


STYLES = """
<style>
    :root {
        --app-bg: #f7f9fb;
        --surface: #ffffff;
        --surface-soft: #f2f5f8;
        --surface-hover: #eaf3fb;
        --text: #17212b;
        --text-soft: #657786;
        --border: #dfe6ec;
        --accent: #229ed9;
        --accent-hover: #168ac1;
        --accent-soft: rgba(34, 158, 217, 0.12);
        --danger: #e5484d;
        --danger-soft: rgba(229, 72, 77, 0.1);
        --shadow: 0 8px 30px rgba(23, 33, 43, 0.06);
        --radius: 16px;
        --radius-small: 11px;
    }

    @media (prefers-color-scheme: dark) {
        :root {
            --app-bg: #0e1621;
            --surface: #17212b;
            --surface-soft: #202b36;
            --surface-hover: #20394b;
            --text: #f2f5f7;
            --text-soft: #91a3b3;
            --border: #2b3a46;
            --accent: #4eabe0;
            --accent-hover: #69b9e7;
            --accent-soft: rgba(78, 171, 224, 0.15);
            --danger: #ff6b70;
            --danger-soft: rgba(255, 107, 112, 0.12);
            --shadow: 0 10px 34px rgba(0, 0, 0, 0.2);
        }
    }

    html, body, [class*="css"] {
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .stApp {
        background: var(--app-bg);
        color: var(--text);
    }

    .block-container {
        max-width: 860px;
        padding: 1.35rem 1.5rem 4rem;
    }

    h1, h2, h3, p, label, .stMarkdown {
        color: var(--text);
    }

    h1 {
        font-size: clamp(1.65rem, 3vw, 2.15rem) !important;
        letter-spacing: -0.035em;
        line-height: 1.12 !important;
        margin-bottom: 0.35rem !important;
    }

    h2, h3 {
        letter-spacing: -0.02em;
    }

    hr {
        border-color: var(--border) !important;
        margin: 1.3rem 0 !important;
    }

    [data-testid="stCaptionContainer"], .small-muted {
        color: var(--text-soft) !important;
    }

    [data-testid="stSidebar"] {
        background: var(--surface);
        border-right: 1px solid var(--border);
    }

    [data-testid="stSidebar"] > div:first-child {
        padding-top: 1.25rem;
    }

    [data-testid="stSidebar"] h2 {
        font-size: 1.15rem;
        margin-bottom: 0.25rem;
    }

    [data-testid="stSidebar"] div.stButton > button {
        width: 100%;
        min-height: 42px;
        justify-content: flex-start;
        text-align: left;
        padding-inline: 0.85rem;
        border-color: transparent !important;
        background: transparent !important;
        box-shadow: none !important;
    }

    [data-testid="stSidebar"] div.stButton > button:hover {
        color: var(--accent) !important;
        background: var(--accent-soft) !important;
    }

    [data-testid="stSidebar"] div.stButton > button[kind="primary"] {
        color: var(--accent) !important;
        background: var(--accent-soft) !important;
        font-weight: 700;
    }

    div[data-testid="stVerticalBlockBorderWrapper"] {
        background: var(--surface);
        border-color: var(--border) !important;
        border-radius: var(--radius) !important;
        box-shadow: none;
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
    }

    div[data-testid="stVerticalBlockBorderWrapper"]:hover {
        border-color: color-mix(in srgb, var(--border) 55%, var(--accent)) !important;
        box-shadow: var(--shadow);
    }

    div.stButton > button,
    div[data-testid="stFormSubmitButton"] button {
        min-height: 40px;
        border: 1px solid var(--border) !important;
        border-radius: 999px !important;
        background: var(--surface) !important;
        color: var(--text) !important;
        font-weight: 600;
        box-shadow: none !important;
        transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
    }

    div.stButton > button:hover,
    div[data-testid="stFormSubmitButton"] button:hover {
        border-color: var(--accent) !important;
        background: var(--accent-soft) !important;
        color: var(--accent) !important;
    }

    div.stButton > button[kind="primary"],
    button[data-testid="stBaseButton-primary"],
    div[data-testid="stFormSubmitButton"] button[kind="primary"],
    div[data-testid="stFormSubmitButton"] button[kind="primaryFormSubmit"] {
        border-color: var(--accent) !important;
        background: var(--accent) !important;
        color: #ffffff !important;
    }

    div.stButton > button[kind="primary"]:hover,
    button[data-testid="stBaseButton-primary"]:hover,
    div[data-testid="stFormSubmitButton"] button[kind="primary"]:hover,
    div[data-testid="stFormSubmitButton"] button[kind="primaryFormSubmit"]:hover {
        border-color: var(--accent-hover) !important;
        background: var(--accent-hover) !important;
        color: #ffffff !important;
    }

    .danger-marker + div div.stButton > button,
    div[data-testid="stVerticalBlock"]:has(.danger-marker) div.stButton > button {
        color: var(--danger) !important;
        border-color: var(--danger) !important;
        background: var(--danger-soft) !important;
    }

    div[data-baseweb="input"] > div,
    div[data-baseweb="textarea"] > div,
    div[data-baseweb="select"] > div,
    div[data-testid="stFileUploaderDropzone"] {
        color: var(--text) !important;
        background: var(--surface) !important;
        border-color: var(--border) !important;
        border-radius: var(--radius-small) !important;
        box-shadow: none !important;
    }

    input, textarea {
        color: var(--text) !important;
        caret-color: var(--accent) !important;
    }

    div[data-baseweb="input"]:focus-within > div,
    div[data-baseweb="textarea"]:focus-within > div,
    div[data-baseweb="select"] > div:focus-within,
    div[data-testid="stFileUploaderDropzone"]:hover {
        border-color: var(--accent) !important;
        box-shadow: 0 0 0 2px var(--accent-soft) !important;
    }

    [data-testid="stAlert"] {
        border-radius: var(--radius-small);
        border: 1px solid var(--border);
    }

    [data-testid="stMetric"] {
        padding: 0.9rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-small);
        background: var(--surface);
    }

    [data-testid="stChatMessage"] {
        padding: 0.65rem 0.75rem;
        border-radius: 14px;
        background: transparent;
    }

    [data-testid="stChatMessage"]:hover {
        background: var(--surface-soft);
    }

    .avatar-image, .avatar-default {
        border-radius: 50%;
        border: 2px solid var(--surface);
        outline: 1px solid var(--border);
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
        flex-shrink: 0;
        cursor: pointer;
        transition: filter 0.18s ease, transform 0.18s ease, outline-color 0.18s ease;
    }

    .avatar-default {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--surface-soft);
    }

    .avatar-upload-marker, .right-sidebar-marker, .danger-marker,
    .feed-marker, .composer-marker, .comment-marker, .dm-marker {
        display: none;
    }

    .avatar-upload-preview {
        display: flex;
        width: 116px;
        height: 116px;
        margin: 0 auto;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 1;
        pointer-events: none;
    }

    div[data-testid="stVerticalBlock"]:has(.avatar-upload-marker) div[data-testid="stFileUploader"] {
        width: 116px !important;
        height: 116px !important;
        margin: -116px auto 1.25rem !important;
        padding: 0 !important;
        opacity: 0;
        position: relative;
        z-index: 20;
        cursor: pointer;
    }

    div[data-testid="stVerticalBlock"]:has(.avatar-upload-marker) div[data-testid="stFileUploader"] section {
        width: 116px !important;
        min-width: 116px !important;
        height: 116px !important;
        min-height: 116px !important;
        padding: 0 !important;
    }

    div[data-testid="stVerticalBlock"]:has(.avatar-upload-marker) div[data-testid="stFileUploader"] section > div,
    div[data-testid="stVerticalBlock"]:has(.avatar-upload-marker) div[data-testid="stFileUploader"] button {
        display: none !important;
    }

    div[data-testid="stVerticalBlock"]:has(.avatar-upload-marker):hover .avatar-image,
    div[data-testid="stVerticalBlock"]:has(.avatar-upload-marker):hover .avatar-default {
        filter: brightness(0.82);
        transform: scale(1.02);
        outline-color: var(--accent);
    }

    .mention {
        color: var(--accent);
        font-weight: 650;
    }

    .social-text {
        color: var(--text);
        font-size: 0.98rem;
        line-height: 1.52;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    div[data-testid="stVerticalBlock"]:has(.composer-marker) {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.85rem;
    }

    div[data-testid="stVerticalBlock"]:has(.comment-marker) div[data-testid="stVerticalBlockBorderWrapper"] {
        background: var(--surface-soft);
        border-color: transparent !important;
        box-shadow: none;
    }

    div[data-testid="stColumn"]:has(.right-sidebar-marker) {
        padding-left: 1rem;
        border-left: 1px solid var(--border);
    }

    [data-testid="stStatusWidget"], [data-testid="stAppRunningMan"],
    .stAppDeployButton, #MainMenu, footer {
        display: none !important;
    }

    @media (max-width: 760px) {
        .block-container {
            width: 100%;
            padding: 0.85rem 0.75rem 5rem;
        }

        h1 {
            font-size: 1.55rem !important;
        }

        div[data-testid="stHorizontalBlock"] {
            gap: 0.45rem;
        }

        div.stButton > button,
        div[data-testid="stFormSubmitButton"] button {
            min-height: 42px;
            padding-inline: 0.75rem;
        }

        div[data-testid="stColumn"]:has(.right-sidebar-marker) {
            padding-left: 0;
            border-left: 0;
        }

        [data-testid="stMetric"] {
            padding: 0.7rem;
        }
    }
</style>
"""


def apply_styles():
    st.markdown(STYLES, unsafe_allow_html=True)
