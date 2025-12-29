"""Main entry point for the desktop application.

This file glues together the framework (localwebapp/) and your app logic
(app/). When creating a new app, you'll mainly modify the imports from
the app/ package.
"""

from pathlib import Path

import webview
from webview.menu import Menu, MenuAction, MenuSeparator

from app.api import create_api_routes
from app.config import config
from app.state import AppState
from localwebapp.desktop import JsApi, run_app
from localwebapp.platform import get_resource_path
from localwebapp.server import create_flask_app


def create_js_api(state: AppState) -> JsApi:
    """Create the JavaScript API with app-specific callbacks.
    
    Args:
        state: Application state instance.
        
    Returns:
        JsApi: Configured JavaScript API instance.
    """
    def on_folder_selected(folder: Path) -> dict:
        """Handle folder selection from native dialog."""
        state.root = folder
        state.save()
        # Trigger frontend refresh
        try:
            js = "window.__refreshRoot && window.__refreshRoot()"
            webview.windows[0].evaluate_js(js)
        except Exception:
            pass
        return {"cancelled": False, "root": str(folder)}
    
    return JsApi(on_folder_selected=on_folder_selected)


def create_menu(js_api: JsApi) -> list:
    """Create application menu structure.
    
    Args:
        js_api: JavaScript API instance for menu callbacks.
        
    Returns:
        list: Menu structure for pywebview.
    """
    def open_folder():
        """Menu action: Open folder dialog."""
        js_api.choose_folder()

    def reload():
        """Menu action: Reload the application window."""
        try:
            webview.windows[0].evaluate_js("window.location.reload()")
        except Exception:
            pass

    # macOS app menu items: use special title '__app__'
    return [
        Menu('__app__', [
            MenuAction('Open Folder…', open_folder),
            MenuSeparator(),
            MenuAction('Reload', reload),
            MenuSeparator(),
            MenuAction('Quit', lambda: webview.destroy_window()),
        ]),
        Menu('File', [
            MenuAction('Open Folder…', open_folder),
        ]),
        Menu('View', [
            MenuAction('Reload', reload),
        ]),
    ]


def main():
    """Initialize and launch the application."""
    # Load application state
    state = AppState.load(default_root=Path.home())
    
    # Create API routes with state
    api_blueprint = create_api_routes(state)
    
    # Get the frontend static files path
    static_root = get_resource_path("frontend_dist")
    
    # Create Flask app
    flask_app = create_flask_app(static_root, api_blueprint)
    
    # Create JavaScript API
    js_api = create_js_api(state)
    
    # Launch the desktop application
    run_app(
        app=flask_app,
        window_title=config.window_title,
        width=config.window_width,
        height=config.window_height,
        js_api=js_api,
        create_menu=create_menu
    )


if __name__ == "__main__":
    main()
