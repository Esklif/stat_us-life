@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo The application is not installed yet. Starting setup...
    call "setting.bat"
    if errorlevel 1 exit /b 1
)

echo ========================================
echo stat_us life - phone access
echo ========================================
echo.
echo The phone and this computer must use the same Wi-Fi network.
echo Windows Firewall may ask for permission. Allow private networks only.
echo.
echo Open the Network URL shown below on the phone.
echo Keep this window open while using the application.
echo.

".venv\Scripts\python.exe" -m streamlit run app.py --server.address 0.0.0.0 --server.port 8501 --browser.gatherUsageStats false

if errorlevel 1 (
    echo.
    echo The mobile server stopped with an error.
    pause
    exit /b 1
)

exit /b 0
