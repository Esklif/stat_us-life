import base64
import html
import re
from io import BytesIO

import streamlit as st
from PIL import Image, ImageOps, UnidentifiedImageError

from config import MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS


def image_to_base64(uploaded_file):
    if uploaded_file is None:
        return None
    try:
        if getattr(uploaded_file, "size", 0) > MAX_IMAGE_BYTES:
            return None
        image = Image.open(uploaded_file)
        if image.width * image.height > MAX_IMAGE_PIXELS:
            return None
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((512, 512))
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=88)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        return None


def validated_avatar_data(avatar_data):
    if not isinstance(avatar_data, str) or not avatar_data:
        return None
    try:
        decoded = base64.b64decode(avatar_data, validate=True)
        with Image.open(BytesIO(decoded)) as image:
            image.verify()
        return avatar_data
    except (ValueError, UnidentifiedImageError, OSError):
        return None


def get_chat_avatar(avatar_data, fallback="👤"):
    if not avatar_data or not isinstance(avatar_data, str):
        return fallback
    if len(avatar_data) <= 10:
        return avatar_data
    try:
        decoded = base64.b64decode(avatar_data, validate=True)
        return Image.open(BytesIO(decoded))
    except (ValueError, UnidentifiedImageError, OSError):
        return fallback


def avatar_html(avatar_data, size=100, fallback="👤"):
    avatar_data = validated_avatar_data(avatar_data)
    safe_fallback = html.escape(str(fallback))
    size = max(16, min(int(size), 512))
    if avatar_data:
        return f"""
        <div class="avatar-image"
             style="width:{size}px;height:{size}px;
                    background-image:url('data:image/jpeg;base64,{avatar_data}');">
        </div>
        """
    font_size = int(size * 0.5)
    return f"""
    <div class="avatar-default"
         style="width:{size}px;height:{size}px;font-size:{font_size}px;">
        {safe_fallback}
    </div>
    """


def render_text_with_mentions(text):
    """Безопасно отображает текст и выделяет упоминания вида @имя."""
    escaped_text = html.escape(str(text or ""))
    highlighted_text = re.sub(
        r"(?<![\w@])(@[\w.-]+)",
        r'<span class="mention">\1</span>',
        escaped_text,
        flags=re.UNICODE,
    )
    st.markdown(
        f'<div class="social-text">{highlighted_text}</div>',
        unsafe_allow_html=True,
    )
