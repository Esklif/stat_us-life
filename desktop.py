import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


APP_TITLE = "stat_us life"
HOST = "127.0.0.1"


def application_dir():
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind((HOST, 0))
        return server.getsockname()[1]


def run_streamlit_server(port):
    os.environ["STAT_US_DESKTOP"] = "1"
    os.environ["STREAMLIT_BROWSER_GATHER_USAGE_STATS"] = "false"

    from streamlit.web import cli as streamlit_cli

    app_path = application_dir() / "app.py"
    sys.argv = [
        "streamlit",
        "run",
        str(app_path),
        "--server.address",
        HOST,
        "--server.port",
        str(port),
        "--server.headless",
        "true",
        "--server.fileWatcherType",
        "none",
        "--browser.gatherUsageStats",
        "false",
    ]
    raise SystemExit(streamlit_cli.main())


def server_command(port):
    if getattr(sys, "frozen", False):
        return [sys.executable, "--streamlit-server", str(port)]
    return [sys.executable, str(Path(__file__).resolve()), "--streamlit-server", str(port)]


def wait_for_server(url, process, timeout=30):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Локальный сервер приложения завершился с ошибкой.")
        try:
            with urllib.request.urlopen(url, timeout=1):
                return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.2)
    raise RuntimeError("Приложение не успело запуститься.")


def run_desktop():
    os.environ["STAT_US_DESKTOP"] = "1"
    port = find_free_port()
    url = f"http://{HOST}:{port}"
    creation_flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    process = subprocess.Popen(
        server_command(port),
        cwd=application_dir(),
        env=os.environ.copy(),
        creationflags=creation_flags,
    )

    try:
        wait_for_server(url, process)
        import webview

        webview.create_window(
            APP_TITLE,
            url,
            width=1280,
            height=820,
            min_size=(900, 640),
            text_select=True,
        )
        webview.start()
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--streamlit-server":
        run_streamlit_server(int(sys.argv[2]))
    else:
        try:
            run_desktop()
        except Exception as error:
            if os.name == "nt":
                import ctypes

                ctypes.windll.user32.MessageBoxW(
                    0,
                    str(error),
                    f"Ошибка запуска {APP_TITLE}",
                    0x10,
                )
            else:
                raise
