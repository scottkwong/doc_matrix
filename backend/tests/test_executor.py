"""Tests for executor row execution without key errors."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

BACKEND_PATH = Path(__file__).resolve().parents[1]
if str(BACKEND_PATH) not in sys.path:
    sys.path.append(str(BACKEND_PATH))

from app.services.executor import Executor  # noqa: E402
from app.services.project import CellResult, Column, ProjectConfig  # noqa: E402

PROJECT_NAME = "sample-project"
DOC_NAME = "example.pdf"
MODEL_NAME = "gpt-test"
TIMESTAMP = "2024-01-01T00:00:00Z"
ANSWER_ONE = "Answer one"
ANSWER_TWO = "Answer two"
ERROR_TEXT = "boom"
COL_ONE = "col-1"
COL_TWO = "col-2"


class DummyStorage:
    """No-op storage stub for executor construction."""


class DummyDocumentProcessor:
    """No-op document processor stub for executor construction."""


class DummyCitationParser:
    """No-op citation parser stub for executor construction."""


class DummyLLMService:
    """No-op LLM service stub for executor construction."""


class DummyProjectManager:
    """Project manager stub that captures saved results."""

    def __init__(self, config: ProjectConfig) -> None:
        """Initialize with a config."""
        self._config = config
        self._documents = [{"name": DOC_NAME}]
        self.saved_results: List[Tuple[str, str, str, CellResult]] = []

    def get_project(self, project_name: str) -> Dict[str, Any]:
        """Return a minimal project description."""
        return {
            "config": self._config.to_dict(),
            "documents": self._documents,
        }

    def save_cell_result(
        self, project_name: str, filename: str, column_id: str, result: CellResult
    ) -> None:
        """Record the saved cell result."""
        self.saved_results.append((project_name, filename, column_id, result))


def _build_executor(config: ProjectConfig) -> Tuple[Executor, DummyProjectManager]:
    """Create an executor with stubbed dependencies."""
    manager = DummyProjectManager(config)
    executor = Executor(
        storage=DummyStorage(),
        doc_processor=DummyDocumentProcessor(),
        citation_parser=DummyCitationParser(),
        llm_service=DummyLLMService(),
        project_manager=manager,
    )
    return executor, manager


async def _noop_generate_summary(
    project_name: str, filename: str, model: str
) -> None:
    """Return immediately to skip summary generation."""
    return None


def test_execute_row_parallel_maps_results_to_columns() -> None:
    """Ensure parallel row execution returns all column results."""
    config = ProjectConfig(
        name=PROJECT_NAME,
        created_at=TIMESTAMP,
        updated_at=TIMESTAMP,
        execution_mode="parallel",
        model=MODEL_NAME,
        columns=[
            Column(id=COL_ONE, question="First question"),
            Column(id=COL_TWO, question="Second question"),
        ],
    )
    executor, manager = _build_executor(config)

    async def fake_process_cell(
        project_name: str, filename: str, column: Column, model: str
    ) -> CellResult:
        """Return a deterministic result for each column."""
        answers = {COL_ONE: ANSWER_ONE, COL_TWO: ANSWER_TWO}
        result = CellResult(
            answer=answers[column.id],
            citations=[],
            model=model,
            timestamp=TIMESTAMP,
            status="completed",
        )
        manager.save_cell_result(project_name, filename, column.id, result)
        return result

    executor._process_cell = fake_process_cell
    executor._generate_row_summary = _noop_generate_summary

    results = asyncio.run(executor.execute_row(PROJECT_NAME, DOC_NAME, MODEL_NAME))

    assert set(results.keys()) == {COL_ONE, COL_TWO}
    saved_columns = {entry[2] for entry in manager.saved_results}
    assert saved_columns == {COL_ONE, COL_TWO}
    assert results[COL_ONE].answer == ANSWER_ONE
    assert results[COL_TWO].answer == ANSWER_TWO


def test_execute_row_parallel_handles_task_errors() -> None:
    """Ensure parallel row execution records errors per column."""
    config = ProjectConfig(
        name=PROJECT_NAME,
        created_at=TIMESTAMP,
        updated_at=TIMESTAMP,
        execution_mode="parallel",
        model=MODEL_NAME,
        columns=[
            Column(id=COL_ONE, question="First question"),
            Column(id=COL_TWO, question="Second question"),
        ],
    )
    executor, manager = _build_executor(config)

    async def sometimes_failing_process_cell(
        project_name: str, filename: str, column: Column, model: str
    ) -> CellResult:
        """Raise for one column and succeed for the other."""
        if column.id == COL_TWO:
            raise RuntimeError(ERROR_TEXT)
        result = CellResult(
            answer=ANSWER_ONE,
            citations=[],
            model=model,
            timestamp=TIMESTAMP,
            status="completed",
        )
        manager.save_cell_result(project_name, filename, column.id, result)
        return result

    executor._process_cell = sometimes_failing_process_cell
    executor._generate_row_summary = _noop_generate_summary

    results = asyncio.run(executor.execute_row(PROJECT_NAME, DOC_NAME, MODEL_NAME))

    assert results[COL_ONE].status == "completed"
    assert results[COL_TWO].status == "error"
    assert ERROR_TEXT in (results[COL_TWO].error or "")
    saved_columns = {entry[2] for entry in manager.saved_results}
    assert saved_columns == {COL_ONE}

