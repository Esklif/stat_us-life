@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo stat_us life - desktop build
echo ========================================
echo.

where py >nul 2>nul
if not errorlevel 1 (
    set "PYTHON=py"
    goto :python_ready
)

where python >nul 2>nul
if not errorlevel 1 (
    set "PYTHON=python"
    goto :python_ready
)

echo Python 3.11 or newer is required to build the application.
pause
exit /b 1

:python_ready
if not exist ".build-venv\Scripts\python.exe" (
    echo Creating isolated build environment...
    %PYTHON% -m venv .build-venv
    if errorlevel 1 goto :failed
)

echo Installing build dependencies...
".build-venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto :failed
".build-venv\Scripts\python.exe" -m pip install -r requirements.txt -r build-requirements.txt
if errorlevel 1 goto :failed

echo Building desktop application...
".build-venv\Scripts\python.exe" -m PyInstaller --noconfirm --clean stat_us-life.spec
if errorlevel 1 goto :failed

set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"

if not exist "%ISCC%" (
    where winget >nul 2>nul
    if errorlevel 1 (
        echo Inno Setup is not installed and winget is unavailable.
        echo The portable application is ready in dist\stat_us-life.
        pause
        exit /b 0
    )

    echo Installing Inno Setup...
    winget install --id JRSoftware.InnoSetup -e --source winget --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
        echo Inno Setup installation failed.
        echo The portable application is ready in dist\stat_us-life.
        pause
        exit /b 0
    )
)

set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"

echo Creating installer...
"%ISCC%" installer.iss
if errorlevel 1 goto :failed

echo.
echo ========================================
echo Build completed successfully.
echo Installer: release\StatUsLife-Setup.exe
echo ========================================
pause
exit /b 0

:failed
echo.
echo Build failed. Review the error above.
pause
exit /b 1
