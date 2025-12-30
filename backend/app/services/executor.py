"""Execution service for running LLM queries against documents.

Supports two execution modes:
- Parallel: Each cell runs independently, maximum parallelism
- Row-wise: All questions for one document sent together, better efficiency
"""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

from ..llm_config import CONTEXT_LIMITS
from .citations import CitationParser, ParsedResponse
from .documents import DocumentProcessor
from .llm import LLMService, LLMResponse
from .project import CellResult, ProjectConfig, ProjectManager, ProjectResults
from .storage import StorageManager

logger = logging.getLogger(__name__)


@dataclass
class ExecutionProgress:
    """Progress tracking for execution.
    
    Attributes:
        total_cells: Total number of cells to process.
        completed_cells: Number of cells completed.
        current_phase: Current execution phase.
        errors: List of error messages.
    """
    
    total_cells: int = 0
    completed_cells: int = 0
    current_phase: str = "initializing"
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "total_cells": self.total_cells,
            "completed_cells": self.completed_cells,
            "current_phase": self.current_phase,
            "progress_pct": (
                int(self.completed_cells / self.total_cells * 100)
                if self.total_cells > 0 else 0
            ),
            "errors": self.errors,
        }


class Executor:
    """Orchestrates LLM query execution against documents.
    
    Supports parallel and row-wise execution modes, with progress
    tracking and error handling.
    
    Attributes:
        storage: Storage manager.
        doc_processor: Document processor.
        citation_parser: Citation parser.
        llm_service: LLM service.
        project_manager: Project manager.
    """
    
    BATCH_SIZE = 10  # Number of concurrent requests in parallel mode
    
    def __init__(
        self,
        storage: StorageManager,
        doc_processor: DocumentProcessor,
        citation_parser: CitationParser,
        llm_service: LLMService,
        project_manager: ProjectManager,
    ) -> None:
        """Initialize executor.
        
        Args:
            storage: Storage manager instance.
            doc_processor: Document processor instance.
            citation_parser: Citation parser instance.
            llm_service: LLM service instance.
            project_manager: Project manager instance.
        """
        self.storage = storage
        self.doc_processor = doc_processor
        self.citation_parser = citation_parser
        self.llm_service = llm_service
        self.project_manager = project_manager
        self._progress_callback: Optional[Callable[[ExecutionProgress], None]] = None
    
    def set_progress_callback(
        self, 
        callback: Callable[[ExecutionProgress], None]
    ) -> None:
        """Set callback for progress updates.
        
        Args:
            callback: Function to call with progress updates.
        """
        self._progress_callback = callback
    
    async def execute_all(
        self,
        project_name: str,
        model: Optional[str] = None,
    ) -> ExecutionProgress:
        """Execute all cells in a project.
        
        Args:
            project_name: Name of the project.
            model: Optional model override.
            
        Returns:
            Final execution progress.
        """
        logger.info(f"▶️  Starting full execution for project: {project_name}")
        
        project = self.project_manager.get_project(project_name)
        if not project:
            raise ValueError(f"Project '{project_name}' not found")
        
        config = ProjectConfig.from_dict(project["config"])
        documents = project["documents"]
        
        model = model or config.model
        
        total_cells = len(documents) * len(config.columns)
        logger.info(
            f"📊 Execution plan: {len(documents)} documents × "
            f"{len(config.columns)} questions = {total_cells} cells, "
            f"mode={config.execution_mode}, model={model}"
        )
        
        if config.execution_mode == "row_wise":
            result = await self._execute_row_wise(
                project_name, config, documents, model
            )
        else:
            result = await self._execute_parallel(
                project_name, config, documents, model
            )
        
        logger.info(
            f"✅ Execution complete for {project_name}: "
            f"{result.completed_cells}/{result.total_cells} cells, "
            f"{len(result.errors)} errors"
        )
        return result
    
    async def _execute_parallel(
        self,
        project_name: str,
        config: ProjectConfig,
        documents: List[Dict[str, Any]],
        model: str,
    ) -> ExecutionProgress:
        """Execute cells in parallel mode.
        
        Each cell is processed independently in batches.
        """
        total_cells = len(documents) * len(config.columns)
        progress = ExecutionProgress(
            total_cells=total_cells,
            current_phase="processing_cells",
        )
        self._report_progress(progress)
        
        # Build list of all cells to process
        cells_to_process = [
            (doc["name"], col)
            for doc in documents
            for col in config.columns
        ]
        
        # Process in batches
        for i in range(0, len(cells_to_process), self.BATCH_SIZE):
            batch = cells_to_process[i:i + self.BATCH_SIZE]
            batch_num = i // self.BATCH_SIZE + 1
            total_batches = (len(cells_to_process) + self.BATCH_SIZE - 1) // self.BATCH_SIZE
            
            logger.info(
                f"🔄 Processing batch {batch_num}/{total_batches}: "
                f"{len(batch)} cells ({i + len(batch)}/{len(cells_to_process)} total)"
            )
            
            tasks = [
                self._process_cell(
                    project_name, filename, column, model
                )
                for filename, column in batch
            ]
            
            # Process as they complete to report progress immediately
            for task in asyncio.as_completed(tasks):
                try:
                    await task
                    progress.completed_cells += 1
                    self._report_progress(progress)
                except Exception as e:
                    progress.completed_cells += 1
                    progress.errors.append(str(e))
                    self._report_progress(progress)
            
            logger.info(
                f"✓ Batch {batch_num} complete. "
                f"Total completed: {progress.completed_cells}/{len(cells_to_process)}"
            )
        
        # Generate summaries
        logger.info("🎯 Generating summaries...")
        await self._generate_summaries(project_name, config, documents, model)
        
        progress.current_phase = "completed"
        self._report_progress(progress)
        
        return progress
    
    async def _execute_row_wise(
        self,
        project_name: str,
        config: ProjectConfig,
        documents: List[Dict[str, Any]],
        model: str,
    ) -> ExecutionProgress:
        """Execute cells in row-wise mode.
        
        All questions for each document are sent together.
        """
        total_cells = len(documents) * len(config.columns)
        progress = ExecutionProgress(
            total_cells=total_cells,
            current_phase="processing_rows",
        )
        self._report_progress(progress)
        
        # Process each document (row)
        for doc in documents:
            filename = doc["name"]
            
            try:
                # Get document text
                doc_data = self.doc_processor.get_document_text(filename)
                doc_text = doc_data.get("text", "")
                
                # Prepare questions
                questions = [
                    {"id": col.id, "question": col.question}
                    for col in config.columns
                ]
                
                # Send all questions at once
                responses = await self.llm_service.complete_row_wise(
                    document_text=doc_text,
                    questions=questions,
                    filename=filename,
                    model=model,
                )
                
                # Process each response
                for col in config.columns:
                    response = responses.get(col.id)
                    if response:
                        parsed = self.citation_parser.parse_response(
                            response.content, filename
                        )
                        
                        result = CellResult(
                            answer=parsed.text,
                            citations=[c.to_dict() for c in parsed.citations],
                            model=model,
                            timestamp=dt.datetime.utcnow().isoformat() + "Z",
                            status="completed",
                        )
                    else:
                        result = CellResult(
                            answer="[No response]",
                            citations=[],
                            model=model,
                            timestamp=dt.datetime.utcnow().isoformat() + "Z",
                            status="error",
                            error="No response from LLM",
                        )
                    
                    self.project_manager.save_cell_result(
                        project_name, filename, col.id, result
                    )
                    progress.completed_cells += 1
                
            except Exception as e:
                progress.errors.append(f"{filename}: {str(e)}")
                progress.completed_cells += len(config.columns)
            
            self._report_progress(progress)
        
        # Generate summaries
        await self._generate_summaries(project_name, config, documents, model)
        
        progress.current_phase = "completed"
        self._report_progress(progress)
        
        return progress
    
    async def _process_cell(
        self,
        project_name: str,
        filename: str,
        column,
        model: str,
    ) -> CellResult:
        """Process a single cell.
        
        Args:
            project_name: Project name.
            filename: Document filename.
            column: Column object with question.
            model: LLM model to use.
            
        Returns:
            The cell result.
        """
        try:
            # Get document text
            doc_data = self.doc_processor.get_document_text(filename)
            doc_text = doc_data.get("text", "")
            
            # Query LLM
            response = await self.llm_service.complete_with_document(
                document_text=doc_text,
                question=column.question,
                filename=filename,
                model=model,
            )
            
            # Track token usage
            if response.usage:
                input_tokens = response.usage.get("prompt_tokens", 0)
                output_tokens = response.usage.get("completion_tokens", 0)
                self.project_manager.add_token_usage(
                    project_name, input_tokens, output_tokens
                )
            
            # Parse citations
            parsed = self.citation_parser.parse_response(
                response.content, filename
            )
            
            result = CellResult(
                answer=parsed.text,
                citations=[c.to_dict() for c in parsed.citations],
                model=model,
                timestamp=dt.datetime.utcnow().isoformat() + "Z",
                status="completed",
            )
            
        except Exception as e:
            result = CellResult(
                answer="",
                citations=[],
                model=model,
                timestamp=dt.datetime.utcnow().isoformat() + "Z",
                status="error",
                error=str(e),
            )
        
        # Save result
        self.project_manager.save_cell_result(
            project_name, filename, column.id, result
        )
        
        return result
    
    async def execute_cell(
        self,
        project_name: str,
        filename: str,
        column_id: str,
        model: Optional[str] = None,
    ) -> CellResult:
        logger.info(f"🔹 Executing cell: {filename} × {column_id}")
        """Execute a single cell.
        
        Args:
            project_name: Project name.
            filename: Document filename.
            column_id: Column ID.
            model: Optional model override.
            
        Returns:
            The cell result.
        """
        project = self.project_manager.get_project(project_name)
        if not project:
            raise ValueError(f"Project '{project_name}' not found")
        
        config = ProjectConfig.from_dict(project["config"])
        model = model or config.model
        
        # Find the column
        column = None
        for col in config.columns:
            if col.id == column_id:
                column = col
                break
        
        if not column:
            raise ValueError(f"Column '{column_id}' not found")
        
        return await self._process_cell(project_name, filename, column, model)
    
    async def execute_row(
        self,
        project_name: str,
        filename: str,
        model: Optional[str] = None,
    ) -> Dict[str, CellResult]:
        """Execute all cells for a single row (document).
        
        Args:
            project_name: Project name.
            filename: Document filename.
            model: Optional model override.
            
        Returns:
            Dict mapping column IDs to cell results.
        """
        logger.info(f"📄 Executing row: {filename}")
        
        project = self.project_manager.get_project(project_name)
        if not project:
            raise ValueError(f"Project '{project_name}' not found")
        
        config = ProjectConfig.from_dict(project["config"])
        model = model or config.model
        
        logger.info(f"  Processing {len(config.columns)} questions for {filename}")
        
        results = {}
        
        if config.execution_mode == "row_wise":
            # Use row-wise execution
            doc_data = self.doc_processor.get_document_text(filename)
            doc_text = doc_data.get("text", "")
            
            questions = [
                {"id": col.id, "question": col.question}
                for col in config.columns
            ]
            
            responses = await self.llm_service.complete_row_wise(
                document_text=doc_text,
                questions=questions,
                filename=filename,
                model=model,
            )
            
            for col in config.columns:
                response = responses.get(col.id)
                if response:
                    parsed = self.citation_parser.parse_response(
                        response.content, filename
                    )
                    result = CellResult(
                        answer=parsed.text,
                        citations=[c.to_dict() for c in parsed.citations],
                        model=model,
                        timestamp=dt.datetime.utcnow().isoformat() + "Z",
                        status="completed",
                    )
                else:
                    result = CellResult(
                        answer="[No response]",
                        citations=[],
                        model=model,
                        timestamp=dt.datetime.utcnow().isoformat() + "Z",
                        status="error",
                    )
                
                self.project_manager.save_cell_result(
                    project_name, filename, col.id, result
                )
                results[col.id] = result
        else:
            # Use parallel execution
            tasks = {
                asyncio.create_task(
                    self._process_cell(project_name, filename, col, model)
                ): col
                for col in config.columns
            }

            # Stream results as each cell finishes
            for task in asyncio.as_completed(tasks):
                col = tasks[task]
                try:
                    result = await task
                except Exception as exc:
                    result = CellResult(
                        answer="",
                        citations=[],
                        model=model,
                        timestamp=dt.datetime.utcnow().isoformat() + "Z",
                        status="error",
                        error=str(exc),
                    )
                results[col.id] = result
        
        # Generate row summary
        await self._generate_row_summary(project_name, filename, model)
        
        return results
    
    async def execute_column(
        self,
        project_name: str,
        column_id: str,
        model: Optional[str] = None,
    ) -> Dict[str, CellResult]:
        """Execute all cells for a single column (question).
        
        Args:
            project_name: Project name.
            column_id: Column ID.
            model: Optional model override.
            
        Returns:
            Dict mapping filenames to cell results.
        """
        logger.info(f"📊 Executing column: {column_id}")
        
        project = self.project_manager.get_project(project_name)
        if not project:
            raise ValueError(f"Project '{project_name}' not found")
        
        config = ProjectConfig.from_dict(project["config"])
        documents = project["documents"]
        
        logger.info(f"  Processing {len(documents)} documents for column {column_id}")
        model = model or config.model
        
        # Find the column
        column = None
        for col in config.columns:
            if col.id == column_id:
                column = col
                break
        
        if not column:
            raise ValueError(f"Column '{column_id}' not found")
        
        results = {}
        
        # Process each document for this column
        tasks = [
            self._process_cell(project_name, doc["name"], column, model)
            for doc in documents
        ]
        cell_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for doc, result in zip(documents, cell_results):
            filename = doc["name"]
            if isinstance(result, Exception):
                result = CellResult(
                    answer="",
                    citations=[],
                    model=model,
                    timestamp=dt.datetime.utcnow().isoformat() + "Z",
                    status="error",
                    error=str(result),
                )
            results[filename] = result
        
        # Generate column summary
        await self._generate_column_summary(project_name, column_id, model)
        
        return results
    
    async def _generate_summaries(
        self,
        project_name: str,
        config: ProjectConfig,
        documents: List[Dict[str, Any]],
        model: str,
    ) -> None:
        """Generate all summaries (row, column, and overall).
        
        Args:
            project_name: Project name.
            config: Project configuration.
            documents: List of documents.
            model: LLM model to use.
        """
        # Generate row summaries
        for doc in documents:
            await self._generate_row_summary(project_name, doc["name"], model)
        
        # Generate column summaries
        for col in config.columns:
            await self._generate_column_summary(project_name, col.id, model)
        
        # Generate overall summary
        await self._generate_overall_summary(project_name, model)
    
    async def _generate_row_summary(
        self,
        project_name: str,
        filename: str,
        model: str,
    ) -> CellResult:
        """Generate summary for a row (document across all questions).
        
        Args:
            project_name: Project name.
            filename: Document filename.
            model: LLM model.
            
        Returns:
            Summary cell result.
        """
        project = self.project_manager.get_project(project_name)
        results = ProjectResults.from_dict(project["results"])
        config = ProjectConfig.from_dict(project["config"])
        
        # Gather answers for this document
        answers = []
        for col in config.columns:
            cell = results.get_cell(filename, col.id)
            if cell and cell.status == "completed":
                answers.append({
                    "question": col.question,
                    "answer": cell.answer,
                    "citations": cell.citations,
                })
        
        if not answers:
            result = CellResult(
                answer="No data to summarize.",
                citations=[],
                model=model,
                timestamp=dt.datetime.utcnow().isoformat() + "Z",
                status="completed",
            )
        else:
            try:
                response = await self.llm_service.generate_summary(
                    answers=answers,
                    summary_type="row",
                    context=filename,
                    model=model,
                )
                
                # Track token usage
                if response.usage:
                    input_tokens = response.usage.get("prompt_tokens", 0)
                    output_tokens = response.usage.get("completion_tokens", 0)
                    self.project_manager.add_token_usage(
                        project_name, input_tokens, output_tokens
                    )
                
                # Parse citations from summary
                source_files = [filename]
                parsed = self.citation_parser.parse_multi_document_response(
                    response.content, source_files
                )
                
                result = CellResult(
                    answer=parsed.text,
                    citations=[c.to_dict() for c in parsed.citations],
                    model=model,
                    timestamp=dt.datetime.utcnow().isoformat() + "Z",
                    status="completed",
                )
            except Exception as e:
                result = CellResult(
                    answer="",
                    citations=[],
                    model=model,
                    timestamp=dt.datetime.utcnow().isoformat() + "Z",
                    status="error",
                    error=str(e),
                )
        
        self.project_manager.save_row_summary(project_name, filename, result)
        return result
    
    async def _generate_column_summary(
        self,
        project_name: str,
        column_id: str,
        model: str,
    ) -> CellResult:
        """Generate summary for a column (question across all documents).
        
        Args:
            project_name: Project name.
            column_id: Column ID.
            model: LLM model.
            
        Returns:
            Summary cell result.
        """
        project = self.project_manager.get_project(project_name)
        results = ProjectResults.from_dict(project["results"])
        config = ProjectConfig.from_dict(project["config"])
        documents = project["documents"]
        
        # Find the question text
        question = ""
        for col in config.columns:
            if col.id == column_id:
                question = col.question
                break
        
        # Gather answers for this question across documents
        answers = []
        source_files = []
        for doc in documents:
            filename = doc["name"]
            cell = results.get_cell(filename, column_id)
            if cell and cell.status == "completed":
                answers.append({
                    "document": filename,
                    "answer": cell.answer,
                    "citations": cell.citations,
                })
                source_files.append(filename)
        
        if not answers:
            result = CellResult(
                answer="No data to summarize.",
                citations=[],
                model=model,
                timestamp=dt.datetime.utcnow().isoformat() + "Z",
                status="completed",
            )
        else:
            try:
                response = await self.llm_service.generate_summary(
                    answers=answers,
                    summary_type="column",
                    context=question,
                    model=model,
                )
                
                # Track token usage
                if response.usage:
                    input_tokens = response.usage.get("prompt_tokens", 0)
                    output_tokens = response.usage.get("completion_tokens", 0)
                    self.project_manager.add_token_usage(
                        project_name, input_tokens, output_tokens
                    )
                
                parsed = self.citation_parser.parse_multi_document_response(
                    response.content, source_files
                )
                
                result = CellResult(
                    answer=parsed.text,
                    citations=[c.to_dict() for c in parsed.citations],
                    model=model,
                    timestamp=dt.datetime.utcnow().isoformat() + "Z",
                    status="completed",
                )
            except Exception as e:
                result = CellResult(
                    answer="",
                    citations=[],
                    model=model,
                    timestamp=dt.datetime.utcnow().isoformat() + "Z",
                    status="error",
                    error=str(e),
                )
        
        self.project_manager.save_column_summary(project_name, column_id, result)
        return result
    
    async def _generate_overall_summary(
        self,
        project_name: str,
        model: str,
    ) -> CellResult:
        """Generate overall executive summary.
        
        Args:
            project_name: Project name.
            model: LLM model.
            
        Returns:
            Summary cell result.
        """
        project = self.project_manager.get_project(project_name)
        results = ProjectResults.from_dict(project["results"])
        config = ProjectConfig.from_dict(project["config"])
        documents = project["documents"]
        
        # Gather all row and column summaries
        summaries = []
        source_files = []
        
        # Row summaries
        for doc in documents:
            filename = doc["name"]
            summary = results.row_summaries.get(filename)
            if summary and summary.status == "completed":
                summaries.append({
                    "type": "document",
                    "name": filename,
                    "answer": summary.answer,
                    "citations": summary.citations,
                })
                source_files.append(filename)
        
        # Column summaries
        for col in config.columns:
            summary = results.column_summaries.get(col.id)
            if summary and summary.status == "completed":
                summaries.append({
                    "type": "question",
                    "name": col.question,
                    "answer": summary.answer,
                    "citations": summary.citations,
                })
        
        if not summaries:
            result = CellResult(
                answer="No data to summarize.",
                citations=[],
                model=model,
                timestamp=dt.datetime.utcnow().isoformat() + "Z",
                status="completed",
            )
        else:
            try:
                response = await self.llm_service.generate_summary(
                    answers=summaries,
                    summary_type="overall",
                    context="all documents and questions",
                    model=model,
                )
                
                # Track token usage
                if response.usage:
                    input_tokens = response.usage.get("prompt_tokens", 0)
                    output_tokens = response.usage.get("completion_tokens", 0)
                    self.project_manager.add_token_usage(
                        project_name, input_tokens, output_tokens
                    )
                
                parsed = self.citation_parser.parse_multi_document_response(
                    response.content, source_files if source_files else ["unknown"]
                )
                
                result = CellResult(
                    answer=parsed.text,
                    citations=[c.to_dict() for c in parsed.citations],
                    model=model,
                    timestamp=dt.datetime.utcnow().isoformat() + "Z",
                    status="completed",
                )
            except Exception as e:
                result = CellResult(
                    answer="",
                    citations=[],
                    model=model,
                    timestamp=dt.datetime.utcnow().isoformat() + "Z",
                    status="error",
                    error=str(e),
                )
        
        self.project_manager.save_overall_summary(project_name, result)
        return result
    
    async def chat_query(
        self,
        project_name: str,
        message: str,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process a chat query against documents.
        
        Args:
            project_name: Project name.
            message: User's message.
            model: Optional model override.
            
        Returns:
            Dict with response and citations.
        """
        project = self.project_manager.get_project(project_name)
        if not project:
            raise ValueError(f"Project '{project_name}' not found")
        
        config = ProjectConfig.from_dict(project["config"])
        documents = project["documents"]
        model = model or config.model
        
        # Build document context
        doc_contexts = []
        source_files = []
        max_docs = CONTEXT_LIMITS.chat_max_documents
        max_text = CONTEXT_LIMITS.chat_max_text_per_doc
        for doc in documents[:max_docs]:  # Limit documents for context
            filename = doc["name"]
            try:
                doc_data = self.doc_processor.get_document_text(filename)
                doc_text = doc_data.get("text", "")[:max_text]  # Limit text
                doc_contexts.append(f"=== {filename} ===\n{doc_text}")
                source_files.append(filename)
            except Exception:
                continue
        
        documents_context = "\n\n".join(doc_contexts)
        
        # Get chat history
        history = self.project_manager.get_chat_history(project_name)
        
        # Build messages
        messages = []
        for msg in history[-10:]:  # Last 10 messages
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })
        messages.append({"role": "user", "content": message})
        
        # Save user message
        self.project_manager.save_chat_message(project_name, "user", message)
        
        # Query LLM
        response = await self.llm_service.chat(
            messages=messages,
            documents_context=documents_context,
            model=model,
        )
        
        # Track token usage
        if response.usage:
            input_tokens = response.usage.get("prompt_tokens", 0)
            output_tokens = response.usage.get("completion_tokens", 0)
            self.project_manager.add_token_usage(
                project_name, input_tokens, output_tokens
            )
        
        # Parse citations
        parsed = self.citation_parser.parse_multi_document_response(
            response.content, source_files
        )
        
        # Save assistant response
        self.project_manager.save_chat_message(
            project_name,
            "assistant",
            parsed.text,
            citations=[c.to_dict() for c in parsed.citations],
        )
        
        return {
            "content": parsed.text,
            "citations": [c.to_dict() for c in parsed.citations],
            "model": model,
        }
    
    def _report_progress(self, progress: ExecutionProgress) -> None:
        """Report progress to callback if set."""
        if self._progress_callback:
            self._progress_callback(progress)

