# Prompts and LLM Configuration Guide

This document explains how prompts and LLM configurations are organized in the Doc Matrix application, and how to customize them.

## Overview

All LLM prompts and configuration parameters have been extracted into dedicated files for easy management and potential UI exposure:

- **`backend/app/prompts.py`**: All system prompts used throughout the application
- **`backend/app/llm_config.py`**: LLM configuration parameters (temperature, max tokens, retry logic, etc.)

## Files Structure

### `prompts.py` - System Prompts

This file contains all the system prompts organized into classes by functionality:

#### `DocumentAnalysisPrompts`
- `get_single_question_prompt(filename)` - For answering a single question about a document
- `get_row_wise_prompt(filename)` - For answering multiple questions in one call (JSON format)

#### `SummaryPrompts`
- `get_row_summary_prompt()` - For creating document summaries (across all questions)
- `get_column_summary_prompt()` - For creating question summaries (across all documents)
- `get_overall_summary_prompt()` - For creating overall executive summaries

#### `ChatPrompts`
- `get_chat_prompt(documents_context)` - For chat conversations with document context

#### `PROMPT_REGISTRY`
A dictionary mapping prompt types to their functions for programmatic access.

### `llm_config.py` - LLM Configuration

This file contains configuration classes and presets for controlling LLM behavior:

#### Configuration Classes

**`LLMRequestConfig`** - Base configuration
- `temperature`: Controls randomness (0.0-1.0, default: 0.3)
- `max_tokens`: Maximum response tokens (default: 4096)
- `retry_count`: Number of retry attempts (default: 3)
- `retry_delay`: Base delay between retries in seconds (default: 1.0)
- `timeout`: Request timeout in seconds (default: 120.0)

**Specialized Configs:**
- `DocumentAnalysisConfig` - For document Q&A (temperature: 0.3, max_tokens: 4096)
- `RowWiseAnalysisConfig` - For multiple questions (temperature: 0.3, max_tokens: 6144)
- `SummaryConfig` - For summaries (temperature: 0.4, max_tokens: 4096)
- `ChatConfig` - For chat interactions (temperature: 0.5, max_tokens: 3072)

**`ContextLimits`** - Controls document context limits
- `chat_max_documents`: Max documents in chat context (default: 10)
- `chat_max_text_per_doc`: Max characters per document (default: 10,000)
- `summary_max_answers`: Max answers in summaries (default: None/unlimited)

#### Configuration Presets

The `ConfigPresets` class provides presets for common scenarios:

- `get_config_for_large_documents()` - 8192 tokens for large documents
- `get_config_for_quick_analysis()` - 2048 tokens, lower temperature for quick responses
- `get_config_for_creative_summary()` - Higher temperature (0.6) for engaging summaries
- `get_config_for_technical_analysis()` - Very low temperature (0.1) for precise technical content

## How to Customize

### Modifying Prompts

1. Open `backend/app/prompts.py`
2. Find the relevant prompt method in the appropriate class
3. Modify the prompt text as needed
4. Changes take effect immediately on next LLM call

**Example:** To change the document analysis behavior:

```python
@staticmethod
def get_single_question_prompt(filename: str) -> str:
    return f'''You are a document analyst. Answer questions about 
the provided document accurately and concisely.

[Your custom instructions here]

- Source document: {filename}'''
```

### Modifying LLM Parameters

#### Option 1: Change Default Configs

Open `backend/app/llm_config.py` and modify the configuration classes:

```python
@dataclass
class DocumentAnalysisConfig(LLMRequestConfig):
    temperature: float = 0.5  # Changed from 0.3
    max_tokens: int = 8192     # Changed from 4096
```

#### Option 2: Use Configuration Presets

In your code, import and use a preset:

```python
from app.llm_config import ConfigPresets

# Use the large documents preset
config = ConfigPresets.get_config_for_large_documents()
response = await llm_service.complete(messages, config=config)
```

#### Option 3: Create Custom Config

```python
from app.llm_config import LLMRequestConfig

# Create a custom configuration
custom_config = LLMRequestConfig(
    temperature=0.7,
    max_tokens=8192,
    retry_count=5,
    retry_delay=2.0,
)

response = await llm_service.complete(messages, config=custom_config)
```

### Adjusting Context Limits

To change how much document text is included in chat or summaries:

```python
from app.llm_config import CONTEXT_LIMITS

# Modify the limits
CONTEXT_LIMITS.chat_max_documents = 20      # Include more documents
CONTEXT_LIMITS.chat_max_text_per_doc = 15000  # More text per document
```

## Usage in Code

### Using Prompts

```python
from app.prompts import DocumentAnalysisPrompts, SummaryPrompts

# Get a document analysis prompt
prompt = DocumentAnalysisPrompts.get_single_question_prompt("report.pdf")

# Get a summary prompt
summary_prompt = SummaryPrompts.get_row_summary_prompt()
```

### Using Configurations

```python
from app.llm_config import (
    DOCUMENT_ANALYSIS_CONFIG,
    SUMMARY_CONFIG,
    ConfigPresets,
)
from app.services.llm import LLMService

llm = LLMService()

# Use default config for document analysis
response = await llm.complete(messages, config=DOCUMENT_ANALYSIS_CONFIG)

# Use summary config
response = await llm.generate_summary(
    answers, "row", context, config=SUMMARY_CONFIG
)

# Use a preset for large documents
large_doc_config = ConfigPresets.get_config_for_large_documents()
response = await llm.complete(messages, config=large_doc_config)
```

## Default Configurations by Operation

| Operation | Temperature | Max Tokens | Rationale |
|-----------|------------|------------|-----------|
| Document Q&A | 0.3 | 4096 | Factual accuracy |
| Row-wise Analysis | 0.3 | 6144 | Multiple answers need more space |
| Summaries | 0.4 | 4096 | Slightly more natural prose |
| Chat | 0.5 | 3072 | Conversational tone |
| Large Documents | 0.3 | 8192 | Need space for lengthy responses |
| Quick Analysis | 0.2 | 2048 | Fast, deterministic responses |
| Creative Summary | 0.6 | 5120 | More engaging writing |
| Technical Analysis | 0.1 | 6144 | Maximum precision |

## Future: Exposing to UI

These configurations are structured to be easily exposed in the application UI. Potential features:

1. **Settings Panel**: Allow users to adjust default temperatures and token limits
2. **Prompt Editor**: UI for viewing and customizing system prompts
3. **Configuration Profiles**: Save and load different configuration presets
4. **Per-Project Settings**: Override defaults on a per-project basis

To prepare for UI exposure, all configs have:
- Clear documentation
- Reasonable defaults
- `.to_dict()` methods for serialization
- Named presets for common scenarios

## Migration Notes

The refactoring maintains backward compatibility. All existing code works without changes because:

1. The `complete()` method still accepts individual parameters
2. Default configs are used when no config is specified
3. Individual parameters override config values when provided

## Testing

All imports and configurations have been tested. To verify:

```bash
cd /path/to/doc_matrix
python -c "from backend.app.prompts import *; from backend.app.llm_config import *; print('OK')"
```

## Key Benefits

1. **Centralized Management**: All prompts and configs in dedicated files
2. **Easy Customization**: Change behavior without digging through code
3. **Consistency**: Standardized configurations across the application
4. **Flexibility**: Multiple presets for different scenarios
5. **UI-Ready**: Structured for future UI exposure
6. **Type Safety**: Full type hints and documentation
7. **Testable**: Isolated components easy to test

