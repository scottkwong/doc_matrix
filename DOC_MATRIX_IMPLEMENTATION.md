# Doc Matrix - Implementation Complete

## Overview
Doc Matrix is a document analysis application that allows users to create question matrices where:
- **Rows** = Documents in a folder
- **Columns** = Questions to ask
- **Cells** = LLM-generated answers with citations
- **Summaries** = Row, column, and overall summaries
- **Chat** = Q&A interface over all documents

## Architecture

### Backend (Flask + Python)
- **Services Layer**:
  - `llm.py` - OpenRouter integration with multiple models
  - `documents.py` - Text extraction (TXT, PDF, DOCX, XLSX)
  - `project.py` - Project CRUD and persistence
  - `citations.py` - Citation parsing and resolution
  - `executor.py` - Parallel and row-wise execution modes
  - `storage.py` - File system operations

- **API Endpoints**: Full REST API for projects, execution, and chat
- **Storage**: `.doc_matrix/` folder structure with JSON files

### Frontend (React + Vite)
- **Components**:
  - `Header.jsx` - Top bar with project selector, model picker, execution controls
  - `ProjectSelector.jsx` - Project dropdown with create/delete
  - `MatrixView.jsx` - Main grid with virtualization
  - `MatrixCell.jsx` - Individual cell with citations and refresh
  - `ChatPanel.jsx` - Right sidebar Q&A
  - `CitationIndicator.jsx` & `CitationPopover.jsx` - Citation UI

- **Theme**: Dark blue aesthetic with modern design system

## Features Implemented

### ✅ Project Management
- Multiple projects per folder
- Create, select, delete projects
- Projects stored in `.doc_matrix/projects/[name]/`

### ✅ Document Processing
- Supported: TXT, MD, CSV, JSON, PDF, DOCX, XLSX
- Text extraction with caching
- File modification tracking
- Automatic cache invalidation

### ✅ LLM Integration (OpenRouter)
- Models: GPT-5.2, Claude 3.5 Haiku/Sonnet, Claude Opus 4.5, Gemini 3 Pro/Flash
- Configurable model selection per project
- API key via .env file

### ✅ Execution Modes
1. **Parallel** (default): Each cell independently, batched
2. **Row-wise**: All questions for a document in one LLM call

### ✅ Citations
- First-class citizen throughout the app
- Appears in: cells, row summaries, column summaries, overall summary, chat
- UI: Superscript numbers with hover popovers
- Shows source file, page/location, quoted text
- Clickable to open document

### ✅ Matrix Operations
- Add/edit/delete columns (questions)
- Refresh individual cells
- Refresh entire rows
- Refresh entire columns
- Execute all cells + summaries

### ✅ Chat Interface
- Q&A over all documents in folder
- Citations in responses
- Chat history persisted to disk
- Clear history option

## Storage Structure

```
target_folder/
├── document1.pdf
├── document2.docx
└── .doc_matrix/
    ├── text_cache/
    │   ├── document1.pdf.json
    │   └── document2.docx.json
    └── projects/
        └── [project-name]/
            ├── config.json     # Questions, settings
            ├── results.json    # Cell answers, summaries
            └── chat.json       # Chat history
```

## Dependencies

### Backend
- flask, pywebview, pyinstaller (framework)
- python-dotenv, httpx (API)
- PyPDF2, python-docx, openpyxl (document processing)

### Frontend
- react, react-dom (framework)
- @tanstack/react-virtual (grid virtualization)
- @floating-ui/react (citation popovers)

## Configuration

### Environment Variables (.env)
```
OPENROUTER_API_KEY=your_key_here
```

### Config (backend/app/config.py)
- Available models and their OpenRouter IDs
- Default model selection
- Window size and app metadata

## Usage

### Development
```bash
./scripts/dev.sh
```
Opens browser to http://localhost:5173

### Production Build
```bash
./scripts/build_app.sh
```
Creates `backend/dist/DocMatrix.app`

## Key Design Decisions

1. **Local-first**: All data stored in filesystem, no database
2. **Citations everywhere**: Structured citation system with UI indicators
3. **Configurable execution**: User choice between parallel/row-wise modes
4. **Project isolation**: Multiple projects per folder, fully independent
5. **Modern UI**: Dark blue theme, responsive, professional design

## Next Steps / Future Enhancements

- [ ] Vector index for semantic search in chat
- [ ] Map-reduce style chat queries
- [ ] Image OCR support
- [ ] Export results to CSV/Excel
- [ ] Batch document upload
- [ ] Custom prompts per column
- [ ] Streaming responses with SSE
- [ ] Windows build and distribution

