"""Application configuration.

Customize these settings for your specific application. This is the main
file to modify when creating a new app from this template.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(Path(__file__).parent.parent / ".env")


# Available LLM models via OpenRouter
AVAILABLE_MODELS: Dict[str, str] = {
    "gpt-5.2": "openai/gpt-5.2",
    "claude-haiku-4.5": "anthropic/claude-haiku-4.5",
    "claude-sonnet-4.5": "anthropic/claude-sonnet-4.5",
    "claude-opus-4.5": "anthropic/claude-opus-4.5",
    "gemini-3-pro": "google/gemini-3-pro-preview",
    "gemini-3-flash": "google/gemini-3-flash-preview",
}

DEFAULT_MODEL = "gpt-5.2"


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
        openrouter_api_key: API key for OpenRouter service.
        default_model: Default LLM model to use.
        available_models: Dictionary of available model display names to IDs.
    """
    
    app_name: str = "DocMatrix"
    app_identifier: str = "com.example.docmatrix"
    version: str = "0.1.0"
    
    # Window configuration
    window_title: str = "Doc Matrix"
    window_width: int = 1400
    window_height: int = 900
    
    # Development settings
    enable_dev_tools: bool = False
    
    # LLM Configuration
    openrouter_api_key: str = field(
        default_factory=lambda: os.getenv("OPENROUTER_API_KEY", "")
    )
    default_model: str = DEFAULT_MODEL
    available_models: Dict[str, str] = field(
        default_factory=lambda: AVAILABLE_MODELS.copy()
    )
    
    # Storage configuration
    doc_matrix_folder: str = ".doc_matrix"
    text_cache_folder: str = "text_cache"
    projects_folder: str = "projects"


# Default configuration instance
config = AppConfig()

