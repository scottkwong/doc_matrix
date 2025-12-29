"""Application state management.

Handles persisting and loading application-specific state data.
Modify this for your app's specific state requirements.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from localwebapp.platform import get_app_data_dir

from .config import config


def config_path() -> Path:
    """Get the path to the application configuration file.
    
    Returns:
        Path: Absolute path to config.json in the app data directory.
    """
    return get_app_data_dir(config.app_name) / "config.json"


@dataclass
class AppState:
    """Application state that persists across sessions.
    
    Attributes:
        root: Current root directory for file browser.
    """
    
    root: Path

    def save(self) -> None:
        """Save the current state to disk."""
        p = config_path()
        p.write_text(json.dumps({"root": str(self.root)}, indent=2))

    @staticmethod
    def load(default_root: Path) -> AppState:
        """Load state from disk, or create default state.
        
        Args:
            default_root: Default root directory if no saved state exists.
            
        Returns:
            AppState: Loaded or default application state.
        """
        p = config_path()
        if p.exists():
            try:
                data = json.loads(p.read_text())
                root = Path(data.get("root", str(default_root))).expanduser()
                if root.exists() and root.is_dir():
                    return AppState(root=root.resolve())
            except Exception:
                pass
        return AppState(root=default_root.resolve())

