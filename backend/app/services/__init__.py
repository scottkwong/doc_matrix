"""Services package for Doc Matrix application.

This package contains the core business logic services:
- storage: Storage manager for .doc_matrix folder
- documents: Document text extraction and caching
- citations: Citation parsing and resolution
- llm: OpenRouter LLM integration
- project: Project management and persistence
- executor: Cell execution orchestration
"""

from .storage import StorageManager
from .documents import DocumentProcessor
from .citations import CitationParser
from .llm import LLMService
from .project import ProjectManager
from .executor import Executor

__all__ = [
    "StorageManager",
    "DocumentProcessor",
    "CitationParser", 
    "LLMService",
    "ProjectManager",
    "Executor",
]

