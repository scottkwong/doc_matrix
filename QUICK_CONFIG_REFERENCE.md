# Quick Configuration Reference

This is a quick reference for modifying prompts and LLM configurations.

## 🎯 Most Common Customizations

### Change Max Tokens for All Document Analysis

**File:** `backend/app/llm_config.py`

```python
@dataclass
class DocumentAnalysisConfig(LLMRequestConfig):
    temperature: float = 0.3
    max_tokens: int = 8192  # ← Change this (default: 4096)
```

### Change Temperature for Summaries

**File:** `backend/app/llm_config.py`

```python
@dataclass
class SummaryConfig(LLMRequestConfig):
    temperature: float = 0.6  # ← Change this (default: 0.4)
    max_tokens: int = 4096
```

### Modify Document Analysis Prompt

**File:** `backend/app/prompts.py`

```python
@staticmethod
def get_single_question_prompt(filename: str) -> str:
    return f'''You are a document analyst...
    
    [Your custom instructions here]
    
    - Source document: {filename}'''
```

### Change Chat Context Limits

**File:** `backend/app/llm_config.py`

```python
@dataclass
class ContextLimits:
    chat_max_documents: int = 20      # ← Change (default: 10)
    chat_max_text_per_doc: int = 15000  # ← Change (default: 10000)
```

## 📊 Current Default Settings

### Configurations by Task

| Task | Temperature | Max Tokens | File Location |
|------|-------------|------------|---------------|
| Document Q&A | 0.3 | 4096 | `llm_config.py` → `DocumentAnalysisConfig` |
| Row-wise (multi-Q) | 0.3 | 6144 | `llm_config.py` → `RowWiseAnalysisConfig` |
| Summaries | 0.4 | 4096 | `llm_config.py` → `SummaryConfig` |
| Chat | 0.5 | 3072 | `llm_config.py` → `ChatConfig` |

### All System Prompts

| Prompt Type | Function | File Location |
|-------------|----------|---------------|
| Single Question | `DocumentAnalysisPrompts.get_single_question_prompt()` | `prompts.py` |
| Multiple Questions (JSON) | `DocumentAnalysisPrompts.get_row_wise_prompt()` | `prompts.py` |
| Document Summary | `SummaryPrompts.get_row_summary_prompt()` | `prompts.py` |
| Question Summary | `SummaryPrompts.get_column_summary_prompt()` | `prompts.py` |
| Overall Summary | `SummaryPrompts.get_overall_summary_prompt()` | `prompts.py` |
| Chat | `ChatPrompts.get_chat_prompt()` | `prompts.py` |

## 🔧 Configuration Presets Available

Use these presets instead of modifying defaults:

```python
from app.llm_config import ConfigPresets

# For large documents (8192 tokens)
config = ConfigPresets.get_config_for_large_documents()

# For quick analysis (2048 tokens, temp 0.2)
config = ConfigPresets.get_config_for_quick_analysis()

# For creative summaries (temp 0.6, 5120 tokens)
config = ConfigPresets.get_config_for_creative_summary()

# For technical documents (temp 0.1, 6144 tokens)
config = ConfigPresets.get_config_for_technical_analysis()
```

## 📁 File Locations

```
backend/app/
├── prompts.py        ← All system prompts
├── llm_config.py     ← All LLM configurations
└── services/
    ├── llm.py        ← LLM service (uses prompts & configs)
    └── executor.py   ← Execution service (uses context limits)
```

## ⚡ Quick Examples

### Example 1: Increase Tokens for Large Documents

Edit `backend/app/llm_config.py`:

```python
@dataclass
class DocumentAnalysisConfig(LLMRequestConfig):
    temperature: float = 0.3
    max_tokens: int = 8192  # Changed from 4096
```

### Example 2: Make Summaries More Creative

Edit `backend/app/llm_config.py`:

```python
@dataclass
class SummaryConfig(LLMRequestConfig):
    temperature: float = 0.7  # Changed from 0.4 (higher = more creative)
    max_tokens: int = 6144    # Increased for longer summaries
```

### Example 3: Change Citation Format

Edit `backend/app/prompts.py`:

```python
@staticmethod
def get_single_question_prompt(filename: str) -> str:
    return f'''You are a document analyst...
    
When answering, cite using this format:
[Citation: "exact text" - {filename}]

[Rest of your custom prompt]
'''
```

### Example 4: Add Custom Preset

Edit `backend/app/llm_config.py`:

```python
class ConfigPresets:
    # ... existing presets ...
    
    @staticmethod
    def get_config_for_legal_documents() -> DocumentAnalysisConfig:
        """Config for precise legal document analysis."""
        return DocumentAnalysisConfig(
            temperature=0.05,  # Very precise
            max_tokens=10240,  # Long detailed responses
            retry_count=5,     # More retries for reliability
            retry_delay=2.0,
        )
```

## 🧪 Testing After Changes

After making changes, restart the application:

```bash
# Stop the app (Ctrl+C if running in terminal)
# Restart
./scripts/dev.sh
```

Changes take effect immediately on the next LLM call.

## 💡 Tips

1. **Lower temperature** (0.1-0.3) = More deterministic, factual
2. **Higher temperature** (0.6-0.9) = More creative, varied
3. **More tokens** = Longer responses but slower/more expensive
4. **Fewer tokens** = Faster responses but may cut off
5. **Row-wise execution** needs more tokens (multiple answers in JSON)
6. **Chat** benefits from higher temperature for natural conversation

## 📝 What Each Parameter Does

| Parameter | What It Controls | Typical Range |
|-----------|------------------|---------------|
| `temperature` | Randomness/creativity | 0.0 (deterministic) to 1.0 (creative) |
| `max_tokens` | Response length limit | 1024-8192+ tokens |
| `retry_count` | Failed request retries | 2-5 attempts |
| `retry_delay` | Wait between retries | 0.5-2.0 seconds |
| `timeout` | Request timeout | 60-300 seconds |

## 🚀 Future UI Integration

All these settings are structured to be exposed in a future settings UI:

- ⚙️ Settings panel for default configs
- 📝 Prompt editor for customizing system prompts
- 💾 Save/load configuration profiles
- 🎨 Per-project configuration overrides

For now, edit the Python files directly. All changes are centralized and well-documented.


