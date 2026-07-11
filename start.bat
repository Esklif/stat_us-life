@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo The application is not installed yet. Starting setup...
    if not exist "setting.bat" (
        echo setting.bat was not found.
        pause
        exit /b 1
    )

    call "setting.bat"
    if errorlevel 1 (
        echo.
        echo Setup failed. Fix the error above and run start.bat again.
        pause
        exit /b 1
    )

    if not exist ".venv\Scripts\python.exe" (
        echo.
        echo Python was installed, but setup is not complete.
        echo Run start.bat again to finish installation.
        pause
        exit /b 1
    )
)

if not exist "app.py" (
    echo app.py was not found.
    pause
    exit /b 1
)

echo Starting Fandom Social Network...
".venv\Scripts\python.exe" -m streamlit run app.py

if errorlevel 1 (
    echo.
    echo The application stopped with an error.
    pause
    exit /b 1
)

exit /b 0
