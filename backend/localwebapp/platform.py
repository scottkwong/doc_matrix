"""Platform-specific utilities for cross-platform desktop app support.

This module provides abstractions for OS-specific operations like file
opening, folder selection, and app data directory management. It enables
the application to run on macOS and Windows without modifying business
logic.
"""

from __future__ import annotations

import os
import platform
import subprocess
import sys
from pathlib import Path
from typing import Optional


def get_platform() -> str:
    """Get the current platform name.
    
    Returns:
        str: Platform identifier ('darwin', 'windows', 'linux', or 
            'unknown').
    """
    system = platform.system().lower()
    if system == "darwin":
        return "darwin"
    elif system == "windows":
        return "windows"
    elif system == "linux":
        return "linux"
    return "unknown"


def get_app_data_dir(app_name: str) -> Path:
    """Get the platform-appropriate application data directory.
    
    Creates the directory if it doesn't exist.
    
    Args:
        app_name: Name of the application (used in path).
        
    Returns:
        Path: Absolute path to the app data directory.
        
    Examples:
        macOS: ~/Library/Application Support/AppName
        Windows: %APPDATA%/AppName
        Linux: ~/.local/share/AppName
    """
    home = Path.home()
    system = get_platform()
    
    if system == "darwin":
        # macOS: ~/Library/Application Support/AppName
        app_dir = home / "Library" / "Application Support" / app_name
    elif system == "windows":
        # Windows: %APPDATA%/AppName
        appdata = os.getenv("APPDATA")
        if appdata:
            app_dir = Path(appdata) / app_name
        else:
            # Fallback if APPDATA not set
            app_dir = home / "AppData" / "Roaming" / app_name
    else:
        # Linux/Unix: ~/.local/share/AppName
        app_dir = home / ".local" / "share" / app_name
    
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir


def open_file(file_path: Path) -> bool:
    """Open a file with the system's default application.
    
    Args:
        file_path: Path to the file to open.
        
    Returns:
        bool: True if successful, False otherwise.
    """
    if not file_path.exists() or not file_path.is_file():
        return False
    
    system = get_platform()
    
    try:
        if system == "darwin":
            # macOS: use 'open' command
            subprocess.run(["open", str(file_path)], check=False)
            return True
        elif system == "windows":
            # Windows: use 'start' command via os.startfile
            os.startfile(str(file_path))
            return True
        else:
            # Linux: try xdg-open
            subprocess.run(["xdg-open", str(file_path)], check=False)
            return True
    except Exception:
        return False


def reveal_in_file_manager(file_path: Path) -> bool:
    """Reveal/highlight a file or folder in the system file manager.
    
    Args:
        file_path: Path to the file or folder to reveal.
        
    Returns:
        bool: True if successful, False otherwise.
    """
    if not file_path.exists():
        return False
    
    system = get_platform()
    
    try:
        if system == "darwin":
            # macOS: use 'open -R' to reveal in Finder
            subprocess.run(["open", "-R", str(file_path)], check=False)
            return True
        elif system == "windows":
            # Windows: use explorer /select
            subprocess.run(
                ["explorer", "/select,", str(file_path)], 
                check=False
            )
            return True
        else:
            # Linux: open parent directory (most file managers don't 
            # support selection)
            parent = file_path.parent
            subprocess.run(["xdg-open", str(parent)], check=False)
            return True
    except Exception:
        return False


def get_resource_path(relative_path: str) -> Path:
    """Get absolute path to resource, works for dev and PyInstaller.
    
    When running in a PyInstaller bundle, resources are extracted to a
    temporary folder referenced by sys._MEIPASS. In development, resources
    are relative to the package directory.
    
    Args:
        relative_path: Relative path to the resource from the package root.
        
    Returns:
        Path: Absolute path to the resource.
    """
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        # Running in PyInstaller bundle
        base = Path(sys._MEIPASS)
    else:
        # Running in development
        # Assumes this file is in localwebapp/ package
        base = Path(__file__).resolve().parents[1]
    
    return (base / relative_path).resolve()


def is_bundled() -> bool:
    """Check if the application is running as a bundled executable.
    
    Returns:
        bool: True if running in PyInstaller bundle, False otherwise.
    """
    return getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS")


# Platform-specific helpers for future use

def get_executable_extensions() -> list[str]:
    """Get list of executable file extensions for the current platform.
    
    Returns:
        list[str]: List of extensions (e.g., ['.exe', '.bat'] on Windows).
    """
    system = get_platform()
    
    if system == "windows":
        return [".exe", ".bat", ".cmd", ".com"]
    else:
        # Unix-like systems use permissions, not extensions
        return []


def get_path_separator() -> str:
    """Get the path separator for the current platform.
    
    Returns:
        str: Path separator character (';' on Windows, ':' on Unix).
    """
    return ";" if get_platform() == "windows" else ":"

