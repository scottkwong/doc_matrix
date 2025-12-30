"""Storage utilities for Doc Matrix.

Handles the .doc_matrix folder structure creation and management.
All persistent data is stored in this hidden folder within the target directory.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

from ..config import config


class StorageManager:
    """Manages the .doc_matrix folder structure and file operations.
    
    The storage structure is:
        target_folder/
        └── .doc_matrix/
            ├── text_cache/       # Extracted text from documents
            │   └── *.json        # One file per source document
            └── projects/         # Named project subfolders
                └── <project>/    # Each project has its own folder
                    ├── config.json
                    ├── results.json
                    └── chat.json
    
    Attributes:
        root: The root directory being analyzed.
    """
    
    def __init__(self, root: Path) -> None:
        """Initialize storage manager for a given root directory.
        
        Args:
            root: The root directory containing documents to analyze.
        """
        self.root = root
        self._ensure_structure()
    
    @property
    def doc_matrix_path(self) -> Path:
        """Get path to the .doc_matrix folder."""
        return self.root / config.doc_matrix_folder
    
    @property
    def text_cache_path(self) -> Path:
        """Get path to the text cache folder."""
        return self.doc_matrix_path / config.text_cache_folder
    
    @property
    def projects_path(self) -> Path:
        """Get path to the projects folder."""
        return self.doc_matrix_path / config.projects_folder
    
    def _ensure_structure(self) -> None:
        """Create the .doc_matrix folder structure if it doesn't exist."""
        self.doc_matrix_path.mkdir(exist_ok=True)
        self.text_cache_path.mkdir(exist_ok=True)
        self.projects_path.mkdir(exist_ok=True)
        
        # Create .gitignore to prevent committing cache data
        gitignore_path = self.doc_matrix_path / ".gitignore"
        if not gitignore_path.exists():
            gitignore_path.write_text("# Ignore all doc_matrix data\n*\n")
    
    def get_cache_path(self, filename: str) -> Path:
        """Get the cache file path for a source document.
        
        Args:
            filename: Name of the source document.
            
        Returns:
            Path to the cache JSON file.
        """
        return self.text_cache_path / f"{filename}.json"
    
    def get_project_path(self, project_name: str) -> Path:
        """Get the folder path for a project.
        
        Args:
            project_name: Name of the project.
            
        Returns:
            Path to the project folder.
        """
        return self.projects_path / project_name
    
    def project_exists(self, project_name: str) -> bool:
        """Check if a project exists.
        
        Args:
            project_name: Name of the project.
            
        Returns:
            True if the project folder exists.
        """
        return self.get_project_path(project_name).is_dir()
    
    def list_projects(self) -> list[str]:
        """List all project names in the storage.
        
        Returns:
            List of project folder names.
        """
        if not self.projects_path.exists():
            return []
        return sorted([
            p.name for p in self.projects_path.iterdir()
            if p.is_dir() and not p.name.startswith(".")
        ])
    
    def create_project(self, project_name: str) -> Path:
        """Create a new project folder.
        
        Args:
            project_name: Name of the project.
            
        Returns:
            Path to the created project folder.
            
        Raises:
            ValueError: If project already exists.
        """
        project_path = self.get_project_path(project_name)
        if project_path.exists():
            raise ValueError(f"Project '{project_name}' already exists")
        project_path.mkdir(parents=True)
        return project_path
    
    def delete_project(self, project_name: str) -> None:
        """Delete a project and all its data.
        
        Args:
            project_name: Name of the project.
            
        Raises:
            ValueError: If project doesn't exist.
        """
        project_path = self.get_project_path(project_name)
        if not project_path.exists():
            raise ValueError(f"Project '{project_name}' does not exist")
        
        # Remove all files in the project folder
        for item in project_path.iterdir():
            if item.is_file():
                item.unlink()
        project_path.rmdir()
    
    def read_json(self, path: Path) -> Optional[Dict[str, Any]]:
        """Read a JSON file.
        
        Args:
            path: Path to the JSON file.
            
        Returns:
            Parsed JSON data or None if file doesn't exist.
        """
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            return None
    
    def write_json(self, path: Path, data: Dict[str, Any]) -> None:
        """Write data to a JSON file.
        
        Args:
            path: Path to the JSON file.
            data: Data to write.
        """
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
    
    def get_file_mtime(self, filepath: Path) -> float:
        """Get the modification time of a file.
        
        Args:
            filepath: Path to the file.
            
        Returns:
            Modification time as Unix timestamp.
        """
        return filepath.stat().st_mtime if filepath.exists() else 0.0
    
    def list_documents(self) -> list[Dict[str, Any]]:
        """List all documents in the root folder (non-recursive).
        
        Returns:
            List of document info dictionaries with name, path, extension,
            and metadata.
        """
        supported_extensions = {".txt", ".md", ".csv", ".json", ".pdf",
                               ".docx", ".xlsx"}
        documents = []
        
        for item in self.root.iterdir():
            if item.is_file() and not item.name.startswith("."):
                ext = item.suffix.lower()
                if ext in supported_extensions:
                    doc_info = {
                        "name": item.name,
                        "path": str(item),
                        "extension": ext,
                        "size": item.stat().st_size,
                        "mtime": item.stat().st_mtime,
                    }
                    
                    # Try to get token count from cache
                    cache_path = self.get_cache_path(item.name)
                    if cache_path.exists():
                        cached_data = self.read_json(cache_path)
                        if cached_data:
                            # Use actual token count from cache if available
                            doc_info["token_count"] = cached_data.get("token_count", 0)
                    
                    documents.append(doc_info)
        
        return sorted(documents, key=lambda d: d["name"].lower())

