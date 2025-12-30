# Doc Matrix - Logging Guide

## Overview

Comprehensive logging has been added to both frontend and backend to track LLM operations, API calls, and execution progress. This helps identify when the system is waiting on LLM responses vs. experiencing errors.

## Backend Logging

### Configuration

Logging is configured in `backend/app/logging_config.py`:
- **Console output**: Real-time logs to terminal
- **File output**: Persistent logs in `backend/logs/doc_matrix.log`
- **Default level**: INFO (can be changed to DEBUG for more detail)

### Log Locations

**File**: `backend/logs/doc_matrix.log`
- All application logs are written here
- Rotates automatically when large
- Survives application restarts

### Backend Log Messages

#### Startup
```
🚀 Doc Matrix starting...
📁 Current root: /path/to/folder
✅ Flask app initialized
```

#### LLM Requests (`llm.py`)
```
🚀 Starting LLM request: model=gpt-5.2, max_tokens=4096, temp=0.3
  📡 Attempt 1/3 - Sending request to OpenRouter...
✅ LLM response received: model=gpt-5.2, tokens=1234, time=5.23s
```

With errors:
```
  ❌ HTTP error 429: Rate limit exceeded
  ⏳ Rate limited! Waiting 2.0s before retry...
  🔄 Retrying in 2.0s...
💥 All 3 attempts failed after 8.45s: <error details>
```

#### Execution (`executor.py`)
```
▶️  Starting full execution for project: Q4 Analysis
📊 Execution plan: 5 documents × 3 questions = 15 cells, mode=parallel, model=gpt-5.2
🔄 Processing batch 1/2: 10 cells (10/15 total)
✓ Cell completed: document1.pdf × col_1
❌ Cell failed (document2.pdf × What is...): Connection timeout
🎯 Generating summaries...
✅ Execution complete for Q4 Analysis: 15/15 cells, 1 errors
```

For individual cells:
```
🔹 Executing cell: document1.pdf × col_abc123
✅ Cell complete: document1.pdf × col_abc123
```

For rows:
```
📄 Executing row: document1.pdf
  Processing 3 questions for document1.pdf
```

For columns:
```
📊 Executing column: col_abc123
  Processing 5 documents for column col_abc123
```

#### API Endpoints (`api.py`)
```
🎬 API: Execute all cells - project=Q4 Analysis, model=gpt-5.2
✅ API: Execute all complete - project=Q4 Analysis
❌ API: Execute all failed - Project not found
💥 API: Execute all error - <exception details>
```

```
🔹 API: Execute cell - project=Q4 Analysis, file=doc1.pdf, column=col_1
✅ API: Cell complete - doc1.pdf × col_1
```

```
💬 API: Chat query - project=Q4 Analysis, message=What are the key...
✅ API: Chat response sent - project=Q4 Analysis
```

### Viewing Backend Logs

**Terminal**: Logs appear in real-time where you started the server

**Log File**:
```bash
tail -f backend/logs/doc_matrix.log
```

**Filter specific operations**:
```bash
# Show only LLM requests
grep "🚀 Starting LLM" backend/logs/doc_matrix.log

# Show only errors
grep "❌\|💥" backend/logs/doc_matrix.log

# Show execution progress
grep "🔄 Processing batch" backend/logs/doc_matrix.log
```

## Frontend Logging

### Browser Console

All frontend logs appear in the browser's Developer Console:
- **Chrome/Edge**: F12 → Console tab
- **Firefox**: F12 → Console tab
- **Safari**: Cmd+Option+C

### Frontend Log Messages

#### API Calls (`useApi.js`)
```
📤 API Request: POST /api/projects/Q4%20Analysis/execute
📥 API Response: /api/projects/Q4%20Analysis/execute (5234ms)
💥 API Failed: /api/projects/... (1523ms) Error: ...
```

#### Full Execution (`App.jsx`)
```
🎬 Execute All Started
  Project: Q4 Analysis
  Model: gpt-5.2
  Mode: parallel
📡 Sending execute request to API...
✅ Execution complete: {ok: true, ...}
📊 Cells completed: 15
Total Execution Time: 45234.52ms
```

#### Cell Refresh
```
🔄 Refreshing cell: document1.pdf:col_1
📡 Sending API request for cell document1.pdf:col_1...
✅ Cell document1.pdf:col_1 complete
Cell document1.pdf:col_1: 5234.12ms
```

#### Chat Messages
```
💬 Chat Message
  Question: What are the key findings?
📡 Sending chat request...
✅ Chat response received: The key findings include...
Chat Response Time: 8234.45ms
```

### Performance Timers

Frontend uses `console.time()` / `console.timeEnd()` for precise timing:
- **Total Execution Time**: Full matrix execution
- **Cell [key]**: Individual cell execution
- **Chat Response Time**: Chat query roundtrip

## Troubleshooting with Logs

### "Is it stuck or still processing?"

**Backend**: Look for these patterns:
```
🚀 Starting LLM request...    ← Request sent
  📡 Attempt 1/3...            ← Waiting on OpenRouter
✅ LLM response received...    ← Complete
```

If you see the 🚀 but no ✅ after 30+ seconds, likely waiting on LLM.

**Frontend**: Check the console.time entries:
```
Total Execution Time: <timer running>  ← Still in progress
```

### Detecting Errors vs. Slow Responses

**Errors** show:
- Backend: `❌` or `💥` symbols
- Frontend: `💥 API Failed` messages
- HTTP status codes (400, 500, etc.)

**Slow but working** shows:
- Steady `📡 Attempt N/3` messages
- No error symbols
- Timer still running

### Rate Limiting

Look for:
```
  ❌ HTTP error 429: ...
  ⏳ Rate limited! Waiting 2.0s before retry...
```

This is normal - the system will retry automatically.

### Finding What's Taking Long

**Backend** - grep for timing:
```bash
grep "time=" backend/logs/doc_matrix.log | sort -t= -k2 -n
```

**Frontend** - Console shows timing for each operation automatically.

## Adjusting Log Levels

### Backend

Edit `backend/main.py`:
```python
setup_logging(log_level="DEBUG")  # More verbose
setup_logging(log_level="INFO")   # Default
setup_logging(log_level="WARNING") # Less verbose
```

### Frontend

Frontend logs are always active. To reduce noise:
- Use browser console filters (e.g., filter by "API" or "LLM")
- Comment out specific console.log lines in `App.jsx` or `useApi.js`

## Log Symbols Reference

| Symbol | Meaning |
|--------|---------|
| 🚀 | Starting an operation |
| ✅ | Successfully completed |
| ❌ | Error occurred |
| 💥 | Critical failure |
| 📡 | Network request in progress |
| 📤 | Outgoing request |
| 📥 | Incoming response |
| 🔄 | Retrying or processing |
| ⏳ | Waiting/delayed |
| 💬 | Chat operation |
| 🎬 | Execution starting |
| 📊 | Data/statistics |
| 📁 | File/folder operation |
| 🎯 | Target/goal reached |
| 🔹 | Individual item |
| 📄 | Document/row operation |

## Examples

### Normal Execution Flow
```
Backend:
▶️  Starting full execution for project: Q4 Analysis
📊 Execution plan: 3 documents × 2 questions = 6 cells
🔄 Processing batch 1/1: 6 cells (6/6 total)
🚀 Starting LLM request: model=gpt-5.2, ...
✅ LLM response received: model=gpt-5.2, tokens=856, time=4.23s
✓ Cell completed: doc1.pdf × col_1
... (more cells) ...
🎯 Generating summaries...
✅ Execution complete for Q4 Analysis: 6/6 cells, 0 errors

Frontend:
🎬 Execute All Started
📤 API Request: POST /api/projects/...
📥 API Response: /api/projects/... (28450ms)
✅ Execution complete
📊 Cells completed: 6
Total Execution Time: 28450.23ms
```

### Error Scenario
```
Backend:
🚀 Starting LLM request: model=gpt-5.2, ...
  📡 Attempt 1/3 - Sending request...
  ❌ Request error: Connection timeout
  🔄 Retrying in 1.0s...
  📡 Attempt 2/3 - Sending request...
  ❌ Request error: Connection timeout
  🔄 Retrying in 2.0s...
  📡 Attempt 3/3 - Sending request...
  ❌ Request error: Connection timeout
💥 All 3 attempts failed after 8.12s: Connection timeout
❌ Cell failed (doc1.pdf × ...): Connection timeout

Frontend:
💥 API Failed: /api/projects/... (8500ms)
❌ Execution failed: Error: API error: 500 ...
```

## Best Practices

1. **Keep backend logs open** in a terminal while developing
2. **Keep browser console open** to see real-time frontend activity
3. **Use grep** to filter backend logs for specific operations
4. **Check timing** - if operations take >30s, likely waiting on LLM
5. **Look for patterns** - repeated errors vs one-off issues
6. **Save log files** when reporting bugs

---

**Quick Check**: When something seems slow:
1. Check backend terminal for `🚀 Starting LLM request`
2. Wait for `✅ LLM response received`
3. Note the `time=X.XXs` value
4. If >20s, it's LLM latency not a bug

