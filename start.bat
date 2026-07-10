@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo The application is not installed yet.
    echo Run setting.bat first.
    pause
    exit /b 1
)

if not exist "app.py" (
    echo app.py was not found.
    pause
    exit /b 1
)

echo Starting Fandom Social Network...
".venv\Scripts\python.exe" -m streamlit run app.py

if not %errorlevel%==0 (
    echo.
    echo The application stopped with an error.
    pause
)
