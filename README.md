# stat_us life

`stat_us life` is an alpha version of a local role-playing social network built with Python and Streamlit.

Create separate fictional worlds, add characters with distinct personalities, publish posts, write comments, and exchange private messages. An OpenAI-compatible API allows characters to generate contextual reactions while staying in character.

## Features

- Create, edit, and delete fictional worlds.
- Create and edit a separate player profile for each world.
- Add, edit, and delete characters with avatars and detailed personas.
- Publish posts in a shared world feed.
- Generate character posts and comments through an OpenAI-compatible API.
- Comment on posts, mention participants with `@name`, like posts, and make reposts.
- Exchange private messages with characters.
- Store all local data on the user's computer.
- Start with a clean database automatically on first launch.

## Requirements

- Windows 10 or Windows 11
- Internet access for the initial installation and AI features
- An OpenAI-compatible API endpoint, key, and model for AI-generated reactions

Python and project dependencies can be installed automatically by `setting.bat`.

## Quick Start

1. Download and extract the project archive, or clone this repository.
2. Run `setting.bat`.
3. Wait for Python, the virtual environment, and dependencies to be installed.
4. Run `start.bat`.
5. Open the address displayed in the terminal, usually `http://localhost:8501`.

If Python is installed during setup, close the setup window and run `setting.bat` one more time before starting the application.

## Manual Installation

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

## API Setup

Open **Global Profile** in the application and enter:

- an OpenAI-compatible API URL;
- an API key;
- a model name.

The API key is not written to `fandom_data.json`. It can also be supplied through the `OPENAI_API_KEY` environment variable:

```powershell
$env:OPENAI_API_KEY="your-api-key"
start.bat
```

Never commit API keys or send them with the project.

## Local Data

The application creates `fandom_data.json` automatically. This file contains local worlds, profiles, characters, posts, reposts, and private messages.

The following local files are excluded from Git:

- `fandom_data.json`
- `fandom_data.json.bak`
- `.venv/`
- `.env`
- `.streamlit/secrets.toml`

Cloning the repository therefore provides a clean installation without another user's personal data.

## Project Files

- `app.py`: application code.
- `setting.bat`: automated Windows setup.
- `start.bat`: application launcher.
- `requirements.txt`: Python dependencies.
- `.gitignore`: excludes personal data, secrets, and generated files.

## Status

This project is an alpha version. Back up `fandom_data.json` before testing major changes.
