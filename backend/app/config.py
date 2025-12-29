"""Application configuration.

Customize these settings for your specific application. This is the main
file to modify when creating a new app from this template.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class AppConfig:
    """Configuration for the desktop application.
    
    Attributes:
        app_name: Display name of the application.
        app_identifier: Unique identifier (reverse domain notation).
        version: Application version string.
        window_title: Title of the main application window.
        window_width: Default window width in pixels.
        window_height: Default window height in pixels.
        enable_dev_tools: Whether to enable browser dev tools in window.
    """
    
    app_name: str = "DocMatrix"
    app_identifier: str = "com.example.docmatrix"
    version: str = "0.1.0"
    
    # Window configuration
    window_title: str = "Doc Matrix"
    window_width: int = 1000
    window_height: int = 700
    
    # Development settings
    enable_dev_tools: bool = False


# Default configuration instance
config = AppConfig()

