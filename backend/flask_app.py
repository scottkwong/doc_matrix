"""Flask CLI entry point for development.

This file allows Flask's command-line interface to work with the new
modular structure. It's only used for development debugging.
"""

from pathlib import Path

from app.api import create_api_routes
from app.state import AppState
from localwebapp.server import create_flask_app


def create_app():
    """Create Flask app for Flask CLI (development only).
    
    This is used by Flask's command-line interface (flask run).
    For production, use main.py instead.
    """
    # Load app state
    state = AppState.load(default_root=Path.home())
    
    # Create API routes
    api_blueprint = create_api_routes(state)
    
    # Get frontend static files (use dist for dev, or frontend_dist for built)
    static_root = Path(__file__).parent.parent / "frontend" / "dist"
    if not static_root.exists():
        # Fallback to frontend_dist if dist doesn't exist
        static_root = Path(__file__).parent / "frontend_dist"
    
    # Create and return Flask app
    return create_flask_app(static_root, api_blueprint)

