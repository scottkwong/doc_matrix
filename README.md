# Doc Matrix - Desktop Application

A cross-platform desktop application built with:
- **Backend**: Python Flask (localhost-only API)
- **Frontend**: React with Vite (fast hot reload)
- **Desktop**: Native window via pywebview + PyInstaller
- **Template**: Modular structure for easy app creation

## Features

✅ Single-command development workflow  
✅ Full debug support in Cursor/VSCode  
✅ Clear separation: framework vs. app logic  
✅ Platform abstraction (macOS ready, Windows-compatible)  
✅ Build to standalone `.app` (no Python/Node required for users)  
✅ DMG installer creation  

## Quick Start

### Prerequisites

- **macOS**: Python 3.10+, Node 18+, npm
- **Windows**: (Coming soon - structure is ready)

Optional:
- `create-dmg` for DMG: `brew install create-dmg`

### Development (One Command!)

```bash
# Clone and setup
git clone <repo>
cd doc_matrix

# Start development servers (backend + frontend)
./scripts/dev.sh
```

That's it! The script:
- Creates Python venv if needed
- Installs all dependencies
- Starts Flask on http://127.0.0.1:5001
- Starts Vite on http://127.0.0.1:5173
- Opens browser automatically

Open http://127.0.0.1:5173 and start coding with hot reload!

Press `Ctrl+C` to stop both servers.

### Debugging in Cursor

1. Open the project in Cursor
2. Set breakpoints in Python or JavaScript code
3. Press `F5` and select:
   - **"Full Stack: Backend + Frontend"** - Debug both simultaneously
   - **"Python: Flask Backend"** - Backend only
   - **"Python: Desktop App"** - Debug the packaged desktop app
   - **"Chrome: Frontend"** - Frontend only

### Build for Distribution

```bash
# Build standalone .app (users don't need Python/Node!)
./scripts/build_app.sh

# Output: backend/dist/DocMatrix.app
# Double-click to run!

# Optional: Create DMG installer
./scripts/make_dmg.sh
# Output: backend/dist/DocMatrix.dmg
```

Share the `.app` or `.dmg` with users - it just works!

## Project Structure

```
local_webapp/
├── backend/
│   ├── app/                   # ← YOUR APP LOGIC (modify this)
│   │   ├── api.py            # API routes
│   │   ├── state.py          # App state
│   │   └── config.py         # Configuration
│   │
│   ├── localwebapp/          # ← FRAMEWORK (don't modify)
│   │   ├── desktop.py        # Window wrapper
│   │   ├── platform.py       # OS abstraction
│   │   └── server.py         # Flask setup
│   │
│   └── main.py               # Entry point
│
├── frontend/
│   └── src/
│       ├── app/              # ← YOUR APP UI (modify this)
│       │   └── *.jsx         # Your components
│       │
│       ├── shell/            # ← FRAMEWORK (don't modify)
│       │   ├── useApi.js     # API hooks
│       │   └── useNative.js  # Native integration
│       │
│       └── App.jsx           # ← YOUR APP (modify this)
│
├── scripts/
│   ├── dev.sh               # Development server
│   ├── build_app.sh         # Build .app
│   ├── clean.sh             # Clean artifacts
│   └── make_dmg.sh          # Create DMG
│
└── build.config.json        # Build configuration
```

## Using as a Template

This repo is designed to be copied and customized for your own apps!

**See [TEMPLATE.md](TEMPLATE.md) for detailed instructions** on:
- Creating your own app from this template
- What files to modify vs. what to leave alone
- Common customization patterns
- Adding API endpoints and native features
- Platform support and testing

### Quick Template Usage

1. Copy this repo: `cp -r doc_matrix my_awesome_app`
2. Edit `backend/app/config.py` - change app name, version, etc.
3. Edit `build.config.json` - update app metadata
4. Replace `backend/app/api.py` with your API logic
5. Replace `frontend/src/App.jsx` and `frontend/src/app/` with your UI
6. Run `./scripts/dev.sh` and build with `./scripts/build_app.sh`

## Example: The File Browser App

The template includes a working example - a simple file browser:
- Browse directories on your computer
- Open files with default applications
- Native folder picker dialog
- Persistent state (remembers last folder)

This demonstrates:
- API routes (`/api/list`, `/api/open`, etc.)
- React components with hooks
- Native OS integration (file dialogs, open files)
- State persistence

Replace it with your own app logic!

## Development Tips

### Hot Reload Workflow

1. Run `./scripts/dev.sh`
2. Edit frontend code → Browser updates instantly
3. Edit backend code → Flask restarts automatically
4. Set breakpoints and debug with `F5`

### Clean Build Artifacts

```bash
./scripts/clean.sh
```

### View Logs

```bash
# Backend logs
tail -f /tmp/localwebapp_backend.log

# Frontend logs
tail -f /tmp/localwebapp_frontend.log
```

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS    | ✅ Ready | Fully tested, builds .app and .dmg |
| Windows  | 🔨 Structure Ready | Code structured for Windows, needs testing |
| Linux    | 🔨 Partial | Basic platform support, needs testing |

The codebase uses a platform abstraction layer (`localwebapp/platform.py`) that handles OS-specific operations. Windows support is mostly implemented but needs testing and PyInstaller configuration.

## What Makes This Different?

1. **True Template**: Clear boundaries between framework and app code
2. **Developer Experience**: One command to start, full debug support
3. **Distribution Ready**: Users don't need Python/Node installed
4. **Modular**: Easy to understand, modify, and extend
5. **Production Ready**: Used for real applications

## Tech Stack Details

- **Backend**: Flask 3.0+ (Python web framework)
- **Frontend**: React 18+ with Vite 5+ (fast builds)
- **Desktop**: pywebview 5+ (native window wrapper)
- **Packaging**: PyInstaller 6+ (standalone executables)
- **Platform**: Works on macOS, ready for Windows

## Configuration

Customize your app in two places:

1. **`backend/app/config.py`** - App settings
```python
app_name = "MyApp"
window_title = "My Awesome App"
window_width = 1200
```

2. **`build.config.json`** - Build metadata
```json
{
  "app": {
    "name": "MyApp",
    "version": "1.0.0",
    "identifier": "com.example.myapp"
  }
}
```

## Troubleshooting

### Port Already in Use
```bash
lsof -ti:5001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

### Dependencies Not Installing
```bash
cd backend && pip install -r requirements.txt
cd frontend && npm install
```

### Built App Won't Launch
- Check Console.app for error messages
- Try running from terminal: `./backend/dist/DocMatrix.app/Contents/MacOS/DocMatrix`
- Ensure all dependencies are in requirements.txt

### Frontend Not Updating
```bash
rm -rf frontend/dist backend/frontend_dist
./scripts/build_app.sh
```

## Documentation

- **[TEMPLATE.md](TEMPLATE.md)** - Using this as a template for your apps
- **[Flask Docs](https://flask.palletsprojects.com/)** - Backend framework
- **[React Docs](https://react.dev/)** - Frontend framework
- **[pywebview Docs](https://pywebview.flowrl.com/)** - Desktop wrapper

## Contributing

This is a template project. Feel free to:
- Fork and customize for your needs
- Submit improvements to the framework layer
- Share your apps built with this template

## License

MIT License - use freely for personal or commercial projects.

---

**Ready to build?** → See [TEMPLATE.md](TEMPLATE.md) for step-by-step guide!
