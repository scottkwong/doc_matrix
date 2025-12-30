"""Application API routes for Doc Matrix.

Provides REST API endpoints for project management, document processing,
LLM execution, and chat functionality. All endpoints use the services
layer for business logic.
"""

from __future__ import annotations

import asyncio
import logging
import threading
from pathlib import Path
from typing import Any, Dict, Set

from flask import Blueprint, jsonify, request

from localwebapp.platform import open_file

from .config import AVAILABLE_MODELS, config
from .services import (
    CitationParser,
    DocumentProcessor,
    Executor,
    LLMService,
    ProjectManager,
    StorageManager,
)
from .state import AppState

logger = logging.getLogger(__name__)

# Track active background executions
active_executions: Set[str] = set()
execution_lock = threading.Lock()

# Create a Blueprint for app-specific routes
api = Blueprint("api", __name__, url_prefix="/api")


def run_async(coro):
    """Run an async coroutine synchronously for Flask routes.
    
    Args:
        coro: Coroutine to execute.
        
    Returns:
        Result of the coroutine.
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


def create_api_routes(state: AppState) -> Blueprint:
    """Create and configure API routes with app state.
    
    Args:
        state: Application state instance.
        
    Returns:
        Blueprint: Configured Flask blueprint with API routes.
    """
    
    # Initialize services (lazily created per request based on root)
    def get_services() -> Dict[str, Any]:
        """Get or create service instances for current root.
        
        Checks for custom API key in X-OpenRouter-API-Key header.
        If present, uses it instead of environment key.
        """
        # Check for custom API key in request headers
        custom_api_key = request.headers.get('X-OpenRouter-API-Key')
        
        storage = StorageManager(state.root)
        doc_processor = DocumentProcessor(storage)
        citation_parser = CitationParser(doc_processor)
        llm_service = LLMService(api_key=custom_api_key) if custom_api_key else LLMService()
        project_manager = ProjectManager(storage)
        executor = Executor(
            storage=storage,
            doc_processor=doc_processor,
            citation_parser=citation_parser,
            llm_service=llm_service,
            project_manager=project_manager,
        )
        return {
            "storage": storage,
            "doc_processor": doc_processor,
            "citation_parser": citation_parser,
            "llm_service": llm_service,
            "project_manager": project_manager,
            "executor": executor,
        }
    
    # ---------- API Key Validation Routes ----------
    
    @api.post("/validate-api-key")
    def api_validate_api_key():
        """Validate an OpenRouter API key.
        
        Request body:
            api_key: The OpenRouter API key to validate
            
        Returns:
            valid: True if the key is valid, False otherwise
            error: Error message if validation failed
        """
        data = request.get_json(force=True) or {}
        api_key = data.get("api_key", "").strip()
        
        if not api_key:
            return jsonify({
                "valid": False,
                "error": "API key is required"
            }), 400
        
        # Try to validate the key by making a simple API call
        async def validate_key():
            """Validate key by checking key info endpoint."""
            import httpx
            try:
                async with httpx.AsyncClient() as client:
                    # Use /api/v1/key endpoint which requires valid auth
                    response = await client.get(
                        "https://openrouter.ai/api/v1/key",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        timeout=10.0,
                    )
                    
                    if response.status_code == 200:
                        # Key is valid - response contains key details
                        return {"valid": True}
                    elif response.status_code == 401:
                        return {
                            "valid": False,
                            "error": "Invalid API key"
                        }
                    elif response.status_code == 403:
                        return {
                            "valid": False,
                            "error": "API key does not have permission"
                        }
                    else:
                        return {
                            "valid": False,
                            "error": f"Validation failed: HTTP {response.status_code}"
                        }
            except httpx.TimeoutException:
                return {
                    "valid": False,
                    "error": "Request timed out"
                }
            except Exception as e:
                return {
                    "valid": False,
                    "error": f"Validation error: {str(e)}"
                }
        
        try:
            result = run_async(validate_key())
            status_code = 200 if result.get("valid") else 400
            return jsonify(result), status_code
        except Exception as e:
            logger.exception(f"Error validating API key: {e}")
            return jsonify({
                "valid": False,
                "error": f"Unexpected error: {str(e)}"
            }), 500
    
    # ---------- Root/Folder Routes ----------
    
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

    @api.get("/files")
    def api_list_files():
        """List supported document files in the root folder."""
        services = get_services()
        documents = services["storage"].list_documents()
        return jsonify({
            "root": str(state.root),
            "documents": documents,
        })
    
    @api.post("/browse")
    def api_browse_directory():
        """Browse a directory and detect Doc Matrix projects.
        
        Request body:
            path: Directory path to browse (optional, defaults to current root)
        
        Returns:
            parent: Parent directory path
            current: Current directory path
            directories: List of subdirectories with project info
            can_go_up: Whether user can navigate to parent
        """
        data = request.get_json(force=True) or {}
        path_str = data.get("path")
        
        if not path_str:
            # Start from current root or home
            target_path = state.root if state.root else Path.home()
        else:
            target_path = Path(path_str).expanduser().resolve()
        
        # Security check: ensure path exists and is a directory
        if not target_path.exists():
            return jsonify({"error": "Directory does not exist"}), 400
        if not target_path.is_dir():
            return jsonify({"error": "Not a directory"}), 400
        
        try:
            # Get parent directory
            parent = target_path.parent if target_path != target_path.parent else None
            can_go_up = parent is not None
            
            # Check current directory for projects
            current_doc_matrix = target_path / '.doc_matrix'
            current_projects = []
            if current_doc_matrix.exists() and current_doc_matrix.is_dir():
                try:
                    for project_dir in current_doc_matrix.iterdir():
                        if project_dir.is_dir() and not project_dir.name.startswith('.'):
                            current_projects.append(project_dir.name)
                except (PermissionError, OSError):
                    pass
            
            # List subdirectories
            directories = []
            try:
                for item in sorted(target_path.iterdir()):
                    if item.is_dir() and not item.name.startswith('.'):
                        # Check for Doc Matrix projects
                        doc_matrix_dir = item / '.doc_matrix'
                        projects = []
                        if doc_matrix_dir.exists() and doc_matrix_dir.is_dir():
                            try:
                                for project_dir in doc_matrix_dir.iterdir():
                                    if project_dir.is_dir() and not project_dir.name.startswith('.'):
                                        projects.append(project_dir.name)
                            except (PermissionError, OSError):
                                pass
                        
                        directories.append({
                            "name": item.name,
                            "path": str(item),
                            "has_projects": len(projects) > 0,
                            "projects": sorted(projects),
                        })
            except (PermissionError, OSError) as e:
                logger.warning(f"Permission denied browsing {target_path}: {e}")
            
            return jsonify({
                "parent": str(parent) if parent else None,
                "current": str(target_path),
                "current_has_projects": len(current_projects) > 0,
                "current_projects": sorted(current_projects),
                "directories": directories,
                "can_go_up": can_go_up,
            })
        except Exception as e:
            logger.exception(f"Error browsing directory: {e}")
            return jsonify({"error": str(e)}), 500

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

        success = open_file(target)
        if not success:
            return jsonify({"error": "Failed to open file"}), 500
        return jsonify({"ok": True})
    
    # ---------- Settings Routes ----------
    
    @api.get("/settings")
    def api_get_settings():
        """Get global settings."""
        return jsonify({
            "default_model": state.default_model,
            "available_models": [
                {"name": name, "id": model_id}
                for name, model_id in AVAILABLE_MODELS.items()
            ],
            "has_api_key": bool(config.openrouter_api_key),
        })
    
    @api.post("/settings")
    def api_update_settings():
        """Update global settings."""
        data = request.get_json(force=True) or {}
        
        if "default_model" in data:
            state.default_model = data["default_model"]
        
        state.save()
        return jsonify({"ok": True})
    
    # ---------- Project Routes ----------
    
    @api.get("/projects")
    def api_list_projects():
        """List all projects in the current folder."""
        services = get_services()
        projects = services["project_manager"].list_projects()
        return jsonify({"projects": projects})
    
    @api.post("/projects")
    def api_create_project():
        """Create a new project."""
        data = request.get_json(force=True) or {}
        name = data.get("name", "").strip()
        
        if not name:
            return jsonify({"error": "Project name is required"}), 400
        
        # Validate name (no special filesystem characters)
        invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        if any(c in name for c in invalid_chars):
            return jsonify({"error": "Invalid characters in project name"}), 400
        
        services = get_services()
        try:
            model = data.get("model", state.default_model)
            project_config = services["project_manager"].create_project(name, model)
            return jsonify({
                "ok": True,
                "project": project_config.to_dict(),
            })
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
    
    @api.get("/projects/<name>")
    def api_get_project(name: str):
        """Get full project state."""
        services = get_services()
        project = services["project_manager"].get_project(name)
        
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        return jsonify(project)
    
    @api.put("/projects/<name>")
    def api_update_project(name: str):
        """Update project settings."""
        data = request.get_json(force=True) or {}
        services = get_services()
        
        try:
            config = services["project_manager"].update_project(name, data)
            return jsonify({"ok": True, "config": config.to_dict()})
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
    
    @api.delete("/projects/<name>")
    def api_delete_project(name: str):
        """Delete a project."""
        services = get_services()
        
        try:
            services["project_manager"].delete_project(name)
            return jsonify({"ok": True})
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
    
    # ---------- Column Routes ----------
    
    @api.post("/projects/<name>/columns")
    def api_add_column(name: str):
        """Add a new question column to a project."""
        logger.info(f"🆕 API: Add column - project={name}")
        try:
            data = request.get_json(force=True) or {}
            question = data.get("question", "")
            
            services = get_services()
            column = services["project_manager"].add_column(name, question)
            return jsonify({"ok": True, "column": column.to_dict()})
        except ValueError as e:
            logger.error(f"❌ API: Add column failed (ValueError) - {e}")
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            logger.exception(f"💥 API: Add column error - {e}")
            return jsonify({"error": str(e)}), 400
    
    @api.put("/projects/<name>/columns/<column_id>")
    def api_update_column(name: str, column_id: str):
        """Update a column's question."""
        data = request.get_json(force=True) or {}
        question = data.get("question", "")
        
        services = get_services()
        try:
            column = services["project_manager"].update_column(
                name, column_id, question
            )
            return jsonify({"ok": True, "column": column.to_dict()})
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
    
    @api.delete("/projects/<name>/columns/<column_id>")
    def api_delete_column(name: str, column_id: str):
        """Delete a column from a project."""
        services = get_services()
        try:
            services["project_manager"].delete_column(name, column_id)
            return jsonify({"ok": True})
        except ValueError as e:
            return jsonify({"error": str(e)}), 404

    @api.put("/projects/<name>/columns/reorder")
    def api_reorder_columns(name: str):
        """Reorder question columns."""
        data = request.get_json(force=True) or {}
        column_ids = data.get("column_ids", [])
        
        if not column_ids:
            return jsonify({"error": "List of column_ids is required"}), 400
            
        services = get_services()
        try:
            columns = services["project_manager"].reorder_columns(name, column_ids)
            return jsonify({"ok": True, "columns": [c.to_dict() for c in columns]})
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
    
    # ---------- Execution Routes ----------
    
    def start_background_execution(name: str, coro):
        """Helper to start a background execution task.
        
        Args:
            name: Project name.
            coro: Coroutine to execute.
        """
        logger.info(f"🧵 Background launcher: request accepted for project={name}")
        with execution_lock:
            if name in active_executions:
                return jsonify({"error": "Execution already in progress"}), 409
            active_executions.add(name)
            
        def run_execution():
            try:
                run_async(coro)
                logger.info(f"✅ Background: Execution complete - project={name}")
            except Exception as e:
                logger.exception(f"💥 Background: Execution error - project={name}: {e}")
            finally:
                with execution_lock:
                    if name in active_executions:
                        active_executions.remove(name)
        
        # Start in background thread
        thread = threading.Thread(target=run_execution)
        thread.daemon = True
        thread.start()
        
        logger.info(f"🚀 Background: thread started for project={name}")
        return jsonify({
            "ok": True,
            "status": "started",
            "message": "Execution started in background"
        })

    @api.post("/projects/<name>/execute")
    def api_execute_all(name: str):
        """Execute all cells in a project."""
        data = request.get_json(force=True) or {}
        model = data.get("model")
        
        logger.info(f"🎬 API: Execute all cells - project={name}, model={model}")
        services = get_services()
        return start_background_execution(name, services["executor"].execute_all(name, model=model))

    @api.get("/projects/<name>/status")
    def api_get_status(name: str):
        """Check if execution is in progress."""
        with execution_lock:
            is_running = name in active_executions
        return jsonify({
            "is_running": is_running
        })
    
    @api.post("/projects/<name>/execute/cell")
    def api_execute_cell(name: str):
        """Execute a single cell."""
        data = request.get_json(force=True) or {}
        filename = data.get("filename")
        column_id = data.get("column_id")
        model = data.get("model")
        
        if not filename or not column_id:
            return jsonify({"error": "filename and column_id are required"}), 400
        
        logger.info(
            f"🔹 API: Execute cell - project={name}, "
            f"file={filename}, column={column_id}"
        )
        
        services = get_services()
        # For a single cell, we can still run it synchronously or background it.
        # User wants streaming/async/parallel for Run Row, so cell can probably be backgrounded too.
        return start_background_execution(name, services["executor"].execute_cell(name, filename, column_id, model=model))
    
    @api.post("/projects/<name>/execute/row/<path:filename>")
    def api_execute_row(name: str, filename: str):
        """Execute all cells for a single row (document)."""
        data = request.get_json(force=True) or {}
        model = data.get("model")
        
        logger.info(f"📄 API: Execute row - project={name}, file={filename}, model={model}")
        services = get_services()
        return start_background_execution(name, services["executor"].execute_row(name, filename, model=model))
    
    @api.post("/projects/<name>/execute/column/<column_id>")
    def api_execute_column(name: str, column_id: str):
        """Execute all cells for a single column (question)."""
        data = request.get_json(force=True) or {}
        model = data.get("model")
        
        logger.info(f"📊 API: Execute column - project={name}, column={column_id}")
        services = get_services()
        return start_background_execution(name, services["executor"].execute_column(name, column_id, model=model))
    
    # ---------- Chat Routes ----------
    
    @api.post("/projects/<name>/chat")
    def api_chat(name: str):
        """Send a chat message and get a response."""
        data = request.get_json(force=True) or {}
        message = data.get("message", "").strip()
        model = data.get("model")
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        logger.info(f"💬 API: Chat query - project={name}, message={message[:50]}...")
        
        services = get_services()
        try:
            response = run_async(
                services["executor"].chat_query(name, message, model=model)
            )
            logger.info(f"✅ API: Chat response sent - project={name}")

            return jsonify({
                "ok": True,
                "response": response,
            })
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @api.get("/projects/<name>/chat/history")
    def api_get_chat_history(name: str):
        """Get chat history for a project."""
        services = get_services()
        history = services["project_manager"].get_chat_history(name)
        return jsonify({"messages": history})
    
    @api.delete("/projects/<name>/chat/history")
    def api_clear_chat_history(name: str):
        """Clear chat history for a project."""
        services = get_services()
        services["project_manager"].clear_chat_history(name)
        return jsonify({"ok": True})
    
    # ---------- Document Routes ----------
    
    @api.get("/documents/<path:filename>/text")
    def api_get_document_text(filename: str):
        """Get extracted text for a document."""
        services = get_services()
        try:
            doc_data = services["doc_processor"].get_document_text(filename)
            return jsonify(doc_data)
        except FileNotFoundError:
            return jsonify({"error": "Document not found"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @api.post("/documents/<path:filename>/refresh")
    def api_refresh_document(filename: str):
        """Force refresh document text extraction."""
        services = get_services()
        try:
            doc_data = services["doc_processor"].get_document_text(
                filename, force_refresh=True
            )
            return jsonify({"ok": True, "document": doc_data})
        except FileNotFoundError:
            return jsonify({"error": "Document not found"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @api.get("/models")
    def api_list_models():
        """List available LLM models."""
        services = get_services()
        models = services["llm_service"].list_models()
        return jsonify({
            "models": models,
            "default": state.default_model,
        })
    
    return api
