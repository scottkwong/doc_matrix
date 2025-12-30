"""Project management service.

Handles CRUD operations for Doc Matrix projects, including questions (columns),
results (cells), and summaries. All data is persisted to the local filesystem.
"""

from __future__ import annotations

import datetime as dt
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from .storage import StorageManager


@dataclass
class Column:
    """A question column in the matrix.
    
    Attributes:
        id: Unique identifier.
        question: The question text to ask against documents.
        created_at: When the column was created.
    """
    
    id: str
    question: str
    created_at: str = field(
        default_factory=lambda: dt.datetime.utcnow().isoformat() + "Z"
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "question": self.question,
            "created_at": self.created_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Column":
        """Create from dictionary."""
        return cls(
            id=data["id"],
            question=data["question"],
            created_at=data.get("created_at", dt.datetime.utcnow().isoformat() + "Z"),
        )


@dataclass
class CellResult:
    """Result for a single cell (document + question).
    
    Attributes:
        answer: The LLM's answer text.
        citations: List of citation objects.
        model: Model that generated the answer.
        timestamp: When the answer was generated.
        status: Current status (pending, running, completed, error).
        error: Error message if status is 'error'.
    """
    
    answer: str
    citations: List[Dict[str, Any]]
    model: str
    timestamp: str
    status: str = "completed"
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "answer": self.answer,
            "citations": self.citations,
            "model": self.model,
            "timestamp": self.timestamp,
            "status": self.status,
            "error": self.error,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CellResult":
        """Create from dictionary."""
        return cls(
            answer=data.get("answer", ""),
            citations=data.get("citations", []),
            model=data.get("model", ""),
            timestamp=data.get("timestamp", ""),
            status=data.get("status", "completed"),
            error=data.get("error"),
        )


@dataclass
class ProjectConfig:
    """Configuration for a Doc Matrix project.
    
    Attributes:
        name: Project display name.
        created_at: Creation timestamp.
        updated_at: Last update timestamp.
        execution_mode: 'parallel' or 'row_wise'.
        model: Default LLM model for this project.
        columns: List of question columns.
        total_input_tokens: Total input tokens used across all requests.
        total_output_tokens: Total output tokens used across all requests.
    """
    
    name: str
    created_at: str
    updated_at: str
    execution_mode: str = "parallel"
    model: str = "gpt-5.2"
    columns: List[Column] = field(default_factory=list)
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "execution_mode": self.execution_mode,
            "model": self.model,
            "columns": [c.to_dict() for c in self.columns],
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProjectConfig":
        """Create from dictionary."""
        return cls(
            name=data["name"],
            created_at=data["created_at"],
            updated_at=data["updated_at"],
            execution_mode=data.get("execution_mode", "parallel"),
            model=data.get("model", "gpt-5.2"),
            columns=[Column.from_dict(c) for c in data.get("columns", [])],
            total_input_tokens=data.get("total_input_tokens", 0),
            total_output_tokens=data.get("total_output_tokens", 0),
        )


@dataclass
class ProjectResults:
    """Results storage for a project.
    
    Attributes:
        cells: Dict mapping 'filename:column_id' to CellResult.
        row_summaries: Dict mapping filename to summary CellResult.
        column_summaries: Dict mapping column_id to summary CellResult.
        overall_summary: Overall executive summary.
    """
    
    cells: Dict[str, CellResult] = field(default_factory=dict)
    row_summaries: Dict[str, CellResult] = field(default_factory=dict)
    column_summaries: Dict[str, CellResult] = field(default_factory=dict)
    overall_summary: Optional[CellResult] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "cells": {k: v.to_dict() for k, v in self.cells.items()},
            "row_summaries": {k: v.to_dict() for k, v in self.row_summaries.items()},
            "column_summaries": {k: v.to_dict() for k, v in self.column_summaries.items()},
            "overall_summary": self.overall_summary.to_dict() if self.overall_summary else None,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProjectResults":
        """Create from dictionary."""
        return cls(
            cells={k: CellResult.from_dict(v) for k, v in data.get("cells", {}).items()},
            row_summaries={k: CellResult.from_dict(v) for k, v in data.get("row_summaries", {}).items()},
            column_summaries={k: CellResult.from_dict(v) for k, v in data.get("column_summaries", {}).items()},
            overall_summary=CellResult.from_dict(data["overall_summary"]) if data.get("overall_summary") else None,
        )
    
    def get_cell(self, filename: str, column_id: str) -> Optional[CellResult]:
        """Get result for a specific cell."""
        key = f"{filename}:{column_id}"
        return self.cells.get(key)
    
    def set_cell(self, filename: str, column_id: str, result: CellResult) -> None:
        """Set result for a specific cell."""
        key = f"{filename}:{column_id}"
        self.cells[key] = result


class ProjectManager:
    """Manages Doc Matrix projects within a folder.
    
    Handles project lifecycle including creation, loading, saving,
    and deletion. All project data is stored in .doc_matrix/projects/.
    
    Attributes:
        storage: Storage manager for file operations.
    """
    
    def __init__(self, storage: StorageManager) -> None:
        """Initialize project manager.
        
        Args:
            storage: Storage manager instance.
        """
        self.storage = storage
    
    def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects in the storage.
        
        Returns:
            List of project info dicts with name and metadata.
        """
        projects = []
        for name in self.storage.list_projects():
            config = self._load_config(name)
            if config:
                projects.append({
                    "name": name,
                    "created_at": config.created_at,
                    "updated_at": config.updated_at,
                    "column_count": len(config.columns),
                    "model": config.model,
                    "execution_mode": config.execution_mode,
                })
        return projects
    
    def create_project(self, name: str, model: str = "gpt-5.2") -> ProjectConfig:
        """Create a new project.
        
        Args:
            name: Project name (also used as folder name).
            model: Default LLM model for the project.
            
        Returns:
            The created project configuration.
            
        Raises:
            ValueError: If project already exists.
        """
        self.storage.create_project(name)
        
        now = dt.datetime.utcnow().isoformat() + "Z"
        config = ProjectConfig(
            name=name,
            created_at=now,
            updated_at=now,
            model=model,
        )
        
        self._save_config(name, config)
        self._save_results(name, ProjectResults())
        
        return config
    
    def get_project(self, name: str) -> Optional[Dict[str, Any]]:
        """Get full project state including config and results.
        
        Args:
            name: Project name.
            
        Returns:
            Dict with config, results, and documents, or None if not found.
        """
        if not self.storage.project_exists(name):
            return None
        
        config = self._load_config(name)
        results = self._load_results(name)
        
        if not config:
            return None
        
        # Get list of documents in the folder
        documents = self.storage.list_documents()
        
        return {
            "config": config.to_dict(),
            "results": results.to_dict() if results else ProjectResults().to_dict(),
            "documents": documents,
        }
    
    def update_project(
        self, 
        name: str, 
        updates: Dict[str, Any]
    ) -> ProjectConfig:
        """Update project configuration.
        
        Args:
            name: Project name.
            updates: Dict of fields to update.
            
        Returns:
            Updated project configuration.
            
        Raises:
            ValueError: If project doesn't exist.
        """
        config = self._load_config(name)
        if not config:
            raise ValueError(f"Project '{name}' not found")
        
        # Apply updates
        if "execution_mode" in updates:
            config.execution_mode = updates["execution_mode"]
        if "model" in updates:
            config.model = updates["model"]
        
        config.updated_at = dt.datetime.utcnow().isoformat() + "Z"
        self._save_config(name, config)
        
        return config
    
    def add_token_usage(
        self,
        name: str,
        input_tokens: int,
        output_tokens: int,
    ) -> None:
        """Add token usage to project totals.
        
        Args:
            name: Project name.
            input_tokens: Number of input tokens used.
            output_tokens: Number of output tokens used.
        """
        config = self._load_config(name)
        if not config:
            raise ValueError(f"Project '{name}' not found")
        
        config.total_input_tokens += input_tokens
        config.total_output_tokens += output_tokens
        config.updated_at = dt.datetime.utcnow().isoformat() + "Z"
        self._save_config(name, config)
    
    def delete_project(self, name: str) -> None:
        """Delete a project and all its data.
        
        Args:
            name: Project name.
        """
        self.storage.delete_project(name)
    
    def add_column(
        self, 
        project_name: str, 
        question: str
    ) -> Column:
        """Add a new question column to a project.
        
        Args:
            project_name: Name of the project.
            question: The question text.
            
        Returns:
            The created column.
        """
        config = self._load_config(project_name)
        if not config:
            raise ValueError(f"Project '{project_name}' not found")
        
        column = Column(
            id=f"col_{uuid.uuid4().hex[:8]}",
            question=question,
        )
        
        config.columns.append(column)
        config.updated_at = dt.datetime.utcnow().isoformat() + "Z"
        self._save_config(project_name, config)
        
        return column
    
    def update_column(
        self, 
        project_name: str, 
        column_id: str,
        question: str
    ) -> Column:
        """Update a column's question.
        
        Args:
            project_name: Name of the project.
            column_id: ID of the column to update.
            question: New question text.
            
        Returns:
            The updated column.
        """
        config = self._load_config(project_name)
        if not config:
            raise ValueError(f"Project '{project_name}' not found")
        
        for col in config.columns:
            if col.id == column_id:
                col.question = question
                break
        else:
            raise ValueError(f"Column '{column_id}' not found")
        
        config.updated_at = dt.datetime.utcnow().isoformat() + "Z"
        self._save_config(project_name, config)
        
        # Find and return the updated column
        for col in config.columns:
            if col.id == column_id:
                return col
        raise ValueError(f"Column '{column_id}' not found")
    
    def delete_column(self, project_name: str, column_id: str) -> None:
        """Delete a column from a project.
        
        Args:
            project_name: Name of the project.
            column_id: ID of the column to delete.
        """
        config = self._load_config(project_name)
        if not config:
            raise ValueError(f"Project '{project_name}' not found")
        
        config.columns = [c for c in config.columns if c.id != column_id]
        config.updated_at = dt.datetime.utcnow().isoformat() + "Z"
        self._save_config(project_name, config)
        
        # Also remove related results
        results = self._load_results(project_name)
        if results:
            # Remove cells for this column
            results.cells = {
                k: v for k, v in results.cells.items()
                if not k.endswith(f":{column_id}")
            }
            # Remove column summary
            results.column_summaries.pop(column_id, None)
            self._save_results(project_name, results)

    def reorder_columns(self, project_name: str, column_ids: List[str]) -> List[Column]:
        """Change the order of question columns.
        
        Args:
            project_name: Name of the project.
            column_ids: List of column IDs in the new desired order.
            
        Returns:
            The reordered list of columns.
        """
        config = self._load_config(project_name)
        if not config:
            raise ValueError(f"Project '{project_name}' not found")
        
        # Create map for quick lookup
        col_map = {c.id: c for c in config.columns}
        
        # Reconstruct columns list in new order
        new_columns = []
        for cid in column_ids:
            if cid in col_map:
                new_columns.append(col_map[cid])
        
        # Add any columns that might have been missing from the input list
        for cid, col in col_map.items():
            if cid not in column_ids:
                new_columns.append(col)
                
        config.columns = new_columns
        config.updated_at = dt.datetime.utcnow().isoformat() + "Z"
        self._save_config(project_name, config)
        
        return config.columns
    
    def save_cell_result(
        self,
        project_name: str,
        filename: str,
        column_id: str,
        result: CellResult,
    ) -> None:
        """Save a cell result.
        
        Args:
            project_name: Name of the project.
            filename: Document filename.
            column_id: Column ID.
            result: The cell result to save.
        """
        results = self._load_results(project_name) or ProjectResults()
        results.set_cell(filename, column_id, result)
        self._save_results(project_name, results)
    
    def save_row_summary(
        self,
        project_name: str,
        filename: str,
        result: CellResult,
    ) -> None:
        """Save a row summary.
        
        Args:
            project_name: Name of the project.
            filename: Document filename.
            result: The summary result.
        """
        results = self._load_results(project_name) or ProjectResults()
        results.row_summaries[filename] = result
        self._save_results(project_name, results)
    
    def save_column_summary(
        self,
        project_name: str,
        column_id: str,
        result: CellResult,
    ) -> None:
        """Save a column summary.
        
        Args:
            project_name: Name of the project.
            column_id: Column ID.
            result: The summary result.
        """
        results = self._load_results(project_name) or ProjectResults()
        results.column_summaries[column_id] = result
        self._save_results(project_name, results)
    
    def save_overall_summary(
        self,
        project_name: str,
        result: CellResult,
    ) -> None:
        """Save the overall executive summary.
        
        Args:
            project_name: Name of the project.
            result: The summary result.
        """
        results = self._load_results(project_name) or ProjectResults()
        results.overall_summary = result
        self._save_results(project_name, results)
    
    def get_chat_history(self, project_name: str) -> List[Dict[str, Any]]:
        """Get chat history for a project.
        
        Args:
            project_name: Name of the project.
            
        Returns:
            List of chat message dicts.
        """
        chat_path = self.storage.get_project_path(project_name) / "chat.json"
        data = self.storage.read_json(chat_path)
        return data.get("messages", []) if data else []
    
    def save_chat_message(
        self,
        project_name: str,
        role: str,
        content: str,
        citations: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Save a chat message.
        
        Args:
            project_name: Name of the project.
            role: Message role ('user' or 'assistant').
            content: Message content.
            citations: Optional list of citations.
            
        Returns:
            The saved message dict.
        """
        chat_path = self.storage.get_project_path(project_name) / "chat.json"
        data = self.storage.read_json(chat_path) or {"messages": []}
        
        message = {
            "id": str(uuid.uuid4())[:8],
            "role": role,
            "content": content,
            "citations": citations or [],
            "timestamp": dt.datetime.utcnow().isoformat() + "Z",
        }
        
        data["messages"].append(message)
        self.storage.write_json(chat_path, data)
        
        return message
    
    def clear_chat_history(self, project_name: str) -> None:
        """Clear chat history for a project.
        
        Args:
            project_name: Name of the project.
        """
        chat_path = self.storage.get_project_path(project_name) / "chat.json"
        self.storage.write_json(chat_path, {"messages": []})
    
    def _load_config(self, name: str) -> Optional[ProjectConfig]:
        """Load project configuration from disk."""
        config_path = self.storage.get_project_path(name) / "config.json"
        data = self.storage.read_json(config_path)
        return ProjectConfig.from_dict(data) if data else None
    
    def _save_config(self, name: str, config: ProjectConfig) -> None:
        """Save project configuration to disk."""
        config_path = self.storage.get_project_path(name) / "config.json"
        self.storage.write_json(config_path, config.to_dict())
    
    def _load_results(self, name: str) -> Optional[ProjectResults]:
        """Load project results from disk."""
        results_path = self.storage.get_project_path(name) / "results.json"
        data = self.storage.read_json(results_path)
        return ProjectResults.from_dict(data) if data else None
    
    def _save_results(self, name: str, results: ProjectResults) -> None:
        """Save project results to disk."""
        results_path = self.storage.get_project_path(name) / "results.json"
        self.storage.write_json(results_path, results.to_dict())

