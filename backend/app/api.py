"""Application API routes.

Define your application's REST API endpoints here. This is where your
app's business logic lives. When creating a new app, replace these
example routes with your own.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path

from flask import Blueprint, jsonify, request

from localwebapp.platform import open_file

from .state import AppState

# Create a Blueprint for app-specific routes
api = Blueprint("api", __name__, url_prefix="/api")


def create_api_routes(state: AppState) -> Blueprint:
    """Create and configure API routes with app state.
    
    Args:
        state: Application state instance.
        
    Returns:
        Blueprint: Configured Flask blueprint with API routes.
    """
    
    # ---------- Example API Routes ----------
    # Replace these with your own application logic
    
    @api.get("/time")
    def api_time():
        """Get current server time (example endpoint)."""
        now = dt.datetime.now().isoformat(timespec="seconds")
        return jsonify({"now": now})

    @api.get("/root")
    def api_root():
        """Get current root directory."""
        return jsonify({"root": str(state.root)})

    @api.post("/root")
    def api_set_root():
        """Set new root directory."""
        data = request.get_json(force=True) or {}
        new_root = Path(data.get("root", "")).expanduser().resolve()

        if not new_root.exists() or not new_root.is_dir():
            return jsonify({"error": "Not a directory"}), 400

        state.root = new_root
        state.save()
        return jsonify({"ok": True, "root": str(state.root)})

    @api.get("/list")
    def api_list():
        """List files and directories in a path."""
        rel = request.args.get("path", "")
        target = (state.root / rel).resolve()

        # Restrict browsing under the selected root.
        if not str(target).startswith(str(state.root.resolve())):
            return jsonify({"error": "Path not allowed"}), 400
        if not target.exists() or not target.is_dir():
            return jsonify({"error": "Not a directory"}), 400

        entries = []
        for p in sorted(
            target.iterdir(), 
            key=lambda x: (not x.is_dir(), x.name.lower())
        ):
            entries.append({
                "name": p.name,
                "is_dir": p.is_dir(),
                "rel_path": str(p.relative_to(state.root)),
            })

        cwd = str(target.relative_to(state.root)) if target != state.root else ""
        
        return jsonify({
            "cwd": cwd,
            "root": str(state.root),
            "entries": entries,
        })

    @api.post("/open")
    def api_open():
        """Open a file with the system's default application."""
        data = request.get_json(force=True) or {}
        rel_path = data.get("rel_path", "")
        target = (state.root / rel_path).resolve()

        if not str(target).startswith(str(state.root.resolve())):
            return jsonify({"error": "Path not allowed"}), 400
        if not target.exists() or not target.is_file():
            return jsonify({"error": "Not a file"}), 400

        # Open file with platform-appropriate default app
        success = open_file(target)
        if not success:
            return jsonify({"error": "Failed to open file"}), 500
        return jsonify({"ok": True})
    
    return api

