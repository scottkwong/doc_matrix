"""Desktop application window and native integration.

This module handles creating the native desktop window using pywebview and
integrating with the operating system. Part of the framework layer.
"""

from __future__ import annotations

import socket
import threading
from pathlib import Path
from typing import Callable

from flask import Flask
import webview
from werkzeug.serving import make_server

from .platform import get_resource_path, reveal_in_file_manager


def _free_port() -> int:
    """Find an available port on localhost.
    
    Returns:
        int: Available port number.
    """
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port

class JsApi:
    """JavaScript API bridge for pywebview.
    
    Provides methods callable from the frontend JavaScript to interact
    with native OS features. This class can be extended in your app code
    to add app-specific native features.
    """
    
    def __init__(self, on_folder_selected: Callable[[Path], dict] | None = None):
        """Initialize the JS API bridge.
        
        Args:
            on_folder_selected: Optional callback when folder is selected.
        """
        self._on_folder_selected = on_folder_selected

    def choose_folder(self, start_dir: str = "") -> dict:
        """Open native folder selection dialog.
        
        Args:
            start_dir: Starting directory for the dialog.
            
        Returns:
            dict: Result with 'cancelled' bool and optional 'root' path.
        """
        w = webview.windows[0]
        selected = w.create_file_dialog(
            webview.FOLDER_DIALOG, 
            directory=start_dir or str(Path.home())
        )
        if not selected:
            return {"cancelled": True}

        folder = Path(selected[0]).expanduser().resolve()
        if folder.exists() and folder.is_dir():
            if self._on_folder_selected:
                return self._on_folder_selected(folder)
            return {"cancelled": False, "path": str(folder)}
        return {"cancelled": True}

    def reveal_in_file_manager(self, file_path: str) -> dict:
        """Reveal a file or folder in the system file manager.
        
        Args:
            file_path: Absolute path to file or folder.
            
        Returns:
            dict: Result with 'ok' bool indicating success.
        """
        target = Path(file_path)
        if not target.exists():
            return {"ok": False, "error": "Path does not exist"}
            
        success = reveal_in_file_manager(target)
        return {"ok": success}

def run_app(
    app: Flask,
    window_title: str = "Desktop App",
    width: int = 1000,
    height: int = 700,
    js_api: JsApi | None = None,
    create_menu: Callable[[JsApi], list] | None = None
) -> None:
    """Launch the desktop application with native window.
    
    Sets up Flask server, creates native window with pywebview, and
    starts the application event loop.
    
    Args:
        app: Configured Flask application instance.
        window_title: Title for the application window.
        width: Window width in pixels.
        height: Window height in pixels.
        js_api: JavaScript API instance for native integration.
        create_menu: Optional function to create custom menu structure.
    """
    # The React build output is bundled into the app at: frontend_dist/
    port = _free_port()
    server = make_server("127.0.0.1", port, app)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()

    url = f"http://127.0.0.1:{port}/"

    # Create menus if provided
    menu = None
    if create_menu and js_api:
        menu = create_menu(js_api)

    # Create the window
    webview.create_window(
        window_title,
        url,
        width=width,
        height=height,
        js_api=js_api,
    )

    webview.start(menu=menu)
    server.shutdown()

if __name__ == "__main__":
    run()
