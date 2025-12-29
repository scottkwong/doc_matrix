"""Flask server setup and configuration.

This module handles the creation and configuration of the Flask application.
It's part of the framework layer and should not need modification for new
apps.
"""

from __future__ import annotations

from pathlib import Path

from flask import Blueprint, Flask, send_from_directory


def create_flask_app(
    static_root: Path,
    api_blueprint: Blueprint
) -> Flask:
    """Create and configure the Flask application.
    
    Args:
        static_root: Path to the frontend static files directory.
        api_blueprint: Flask blueprint containing API routes.
        
    Returns:
        Flask: Configured Flask application instance.
    """
    app = Flask(__name__, static_folder=None)
    
    # Register API routes
    app.register_blueprint(api_blueprint)
    
    # ---------- Frontend (React build) ----------
    @app.get("/")
    def index():
        """Serve the main index.html file."""
        return send_from_directory(static_root, "index.html")

    @app.get("/<path:path>")
    def assets(path: str):
        """Serve static assets (JS, CSS, images, etc.)."""
        return send_from_directory(static_root, path)
    
    return app

