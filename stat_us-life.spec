from PyInstaller.utils.hooks import collect_all, collect_submodules


streamlit_datas, streamlit_binaries, streamlit_hidden = collect_all("streamlit")
webview_datas, webview_binaries, webview_hidden = collect_all("webview")
keyring_datas, keyring_binaries, keyring_hidden = collect_all("keyring")

hidden_imports = list(dict.fromkeys(
    streamlit_hidden
    + webview_hidden
    + keyring_hidden
    + collect_submodules("altair")
    + collect_submodules("pyarrow")
    + [
        "api_client",
        "config",
        "crowd",
        "generation",
        "images",
        "state",
        "storage",
        "ui.application",
        "ui.styles",
    ]
))

a = Analysis(
    ["desktop.py"],
    pathex=["."],
    binaries=streamlit_binaries + webview_binaries + keyring_binaries,
    datas=streamlit_datas + webview_datas + keyring_datas + [("app.py", ".")],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="stat_us-life",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="stat_us-life",
)
