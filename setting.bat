@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo Fandom Social Network - setup
echo ========================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON=py"
    goto :python_ready
)

where python >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON=python"
    goto :python_ready
)

echo Python is not installed.
where winget >nul 2>nul
if not %errorlevel%==0 (
    echo Install Python 3.11 or newer from https://www.python.org/downloads/
    echo During installation, enable "Add Python to PATH".
    pause
    exit /b 1
)

echo Installing Python with Windows Package Manager...
winget install --id Python.Python.3.12 -e --source winget --accept-package-agreements --accept-source-agreements
if not %errorlevel%==0 (
    echo Python installation failed.
    pause
    exit /b 1
)

echo.
echo Python was installed. Close this window and run setting.bat again.
pause
exit /b 0

:python_ready
%PYTHON% --version
if not %errorlevel%==0 (
    echo Python could not be started.
    pause
    exit /b 1
)

if not exist "requirements.txt" (
    echo requirements.txt was not found.
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    %PYTHON% -m venv .venv
    if not %errorlevel%==0 (
        echo Could not create the virtual environment.
        pause
        exit /b 1
    )
)

echo Updating pip...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if not %errorlevel%==0 (
    echo Could not update pip.
    pause
    exit /b 1
)

echo Installing project dependencies...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if not %errorlevel%==0 (
    echo Dependency installation failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation completed successfully.
echo Run start.bat to launch the application.
echo ========================================
pause
exit /b 0
