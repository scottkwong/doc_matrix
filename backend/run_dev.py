"""Development entry point with safe reloader support.

This module starts the Flask dev server with debug/reload enabled, without
using `python -c`. It configures logging, loads app state, mounts the API
blueprint, and serves the frontend build output for convenience.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.api import create_api_routes
from app.logging_config import setup_logging
from app.state import AppState
from localwebapp.server import create_flask_app


def main() -> None:
    """Run the Flask development server with reloader enabled."""
    setup_logging(log_level="INFO")
    logger = logging.getLogger(__name__)

    logger.info("🚀 Doc Matrix development server starting...")

    state = AppState.load(default_root=Path.home())
    logger.info("📁 Current root: %s", state.root)

    api_blueprint = create_api_routes(state)
    static_root = Path("../frontend/dist").resolve()
    app = create_flask_app(static_root, api_blueprint)
    logger.info("✅ Flask app initialized")

    # Enable Werkzeug reloader safely (no python -c).
    app.run(host="127.0.0.1", port=5001, debug=True, use_reloader=True)


if __name__ == "__main__":
    main()

