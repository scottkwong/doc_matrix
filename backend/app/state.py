"""Application state management.

Handles persisting and loading application-specific state data.
Stores user preferences and session state for Doc Matrix.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from localwebapp.platform import get_app_data_dir

from .config import DEFAULT_MODEL, config


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
        root: Current root directory for document analysis.
        default_model: Default LLM model to use for queries.
        last_project: Name of the last opened project.
    """
    
    root: Path
    default_model: str = DEFAULT_MODEL
    last_project: str = ""

    def save(self) -> None:
        """Save the current state to disk."""
        p = config_path()
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps({
            "root": str(self.root),
            "default_model": self.default_model,
            "last_project": self.last_project,
        }, indent=2))

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
                    return AppState(
                        root=root.resolve(),
                        default_model=data.get("default_model", DEFAULT_MODEL),
                        last_project=data.get("last_project", ""),
                    )
            except Exception:
                pass
        return AppState(root=default_root.resolve())

