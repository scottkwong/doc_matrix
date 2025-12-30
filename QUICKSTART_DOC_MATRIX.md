# Doc Matrix - Quick Start Guide

## Setup (First Time)

### 1. Get Your OpenRouter API Key
1. Go to https://openrouter.ai/keys
2. Sign up or log in
3. Create a new API key
4. Copy the key

### 2. Configure the Application
```bash
cd backend
nano .env  # or use your preferred editor
```

Add your API key:
```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### 3. Install Dependencies

**Backend:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

## Running the Application

### Development Mode
From the project root:
```bash
./scripts/dev.sh
```

This will:
- Start the Flask backend on http://localhost:5001
- Start the Vite frontend on http://localhost:5173
- Open your browser automatically

### First Use Workflow

1. **Select a Folder**
   - Click "Select Folder" when the app opens
   - Choose a folder containing documents (PDF, DOCX, XLSX, TXT, etc.)

2. **Create a Project**
   - Click "+ New Project" in the header
   - Give it a meaningful name (e.g., "Q4 Analysis")

3. **Add Questions (Columns)**
   - Click "+ Add Column" above the matrix
   - Type your question (e.g., "What is the main topic?")
   - Add as many columns as you need

4. **Execute**
   - Click "Execute All" in the header
   - Watch as cells fill with AI-generated answers
   - Each answer includes citations

5. **Explore Results**
   - Hover over citation numbers to see sources
   - Click citations to open the document
   - View row/column summaries
   - Check the overall executive summary

6. **Use Chat**
   - Type questions in the right sidebar
   - Ask about anything in your documents
   - Responses include citations to sources

## Available Models

- **GPT-5.2** (default) - Best for general use
- **Claude 3.5 Haiku** - Fast, cost-effective
- **Claude 3.5 Sonnet** - Balanced performance
- **Claude Opus 4.5** - Highest quality
- **Gemini 3 Pro** - Google's advanced model
- **Gemini 3 Flash** - Fast responses

Switch models using the dropdown in the header.

## Execution Modes

### Parallel (Default)
- Each question asked independently per document
- Fastest for many short questions
- Maximum parallelism (10 concurrent requests)

### Row-wise
- All questions sent together for each document
- Document context processed once
- Better for related questions
- More coherent answers

Toggle in the header settings.

## File Organization

Your documents folder will have a hidden `.doc_matrix/` folder:

```
your-folder/
├── document1.pdf
├── document2.docx
└── .doc_matrix/           # Hidden - created automatically
    ├── text_cache/        # Extracted document text
    └── projects/
        └── your-project/
            ├── config.json    # Questions and settings
            ├── results.json   # All answers and summaries
            └── chat.json      # Chat history
```

**Don't delete this folder** - it contains all your work!

## Tips & Tricks

### Efficient Workflows
- Use row-wise mode for related questions about the same topic
- Use parallel mode for independent questions
- Refresh individual cells if you want to re-run specific questions

### Managing Citations
- Citations show the exact text from the source document
- Hover to preview the source
- Click to open the document at that location

### Project Management
- Create multiple projects for different analyses
- Projects are completely independent
- Delete old projects you no longer need

### Document Updates
- If you modify a source document, its cache is automatically refreshed
- Re-run cells to get updated answers

## Troubleshooting

### "Failed to load" errors
- Check that your OPENROUTER_API_KEY is set correctly in `.env`
- Ensure you have internet connection (API calls need network)

### Documents not appearing
- Ensure files are directly in the selected folder (not subfolders)
- Supported formats: PDF, DOCX, XLSX, TXT, MD, CSV, JSON

### Slow execution
- OpenRouter API calls take time (5-30s per cell depending on model)
- Use row-wise mode to reduce redundant processing
- Consider using faster models (Haiku, Flash) for quick tests

### Port conflicts
If ports 5001 or 5173 are in use:
```bash
# Kill processes on these ports
lsof -ti:5001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

## Building for Production

To create a standalone `.app` bundle:

```bash
./scripts/build_app.sh
```

Output: `backend/dist/DocMatrix.app`

Double-click to run (no Python/Node needed!)

## Getting Help

- Check `DOC_MATRIX_IMPLEMENTATION.md` for architecture details
- Review `TEMPLATE.md` for framework documentation
- Examine example code in the `backend/app/services/` directory

---

**Ready to analyze your documents!** 🚀

