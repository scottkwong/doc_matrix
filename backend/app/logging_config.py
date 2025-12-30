"""Logging configuration for Doc Matrix.

Sets up structured logging for tracking LLM operations, API calls, and
execution progress. Logs are written to both console and file.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path


def setup_logging(log_level: str = "INFO") -> None:
    """Configure application logging.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR).
    """
    # Create logs directory if it doesn't exist
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            # Console handler with color-coded output
            logging.StreamHandler(sys.stdout),
            # File handler for persistent logs
            logging.FileHandler(log_dir / "doc_matrix.log"),
        ]
    )
    
    # Set specific log levels for noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

