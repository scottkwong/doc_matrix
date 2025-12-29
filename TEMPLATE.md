# Using This as a Template

This project is designed to be a **reusable shell** for creating desktop applications with a Python Flask backend, React frontend, and native desktop wrapper using pywebview.

## Quick Start: Creating Your Own App

### 1. Copy This Repository

```bash
# Clone or copy this repository
cp -r local_webapp my_new_app
cd my_new_app

# Optional: Initialize new git repo
rm -rf .git
git init
```

### 2. Customize App Configuration

Edit `backend/app/config.py`:

```python
@dataclass
class AppConfig:
    app_name: str = "MyAwesomeApp"  # ← Change this
    app_identifier: str = "com.mycompany.myapp"  # ← And this
    version: str = "1.0.0"
    
    window_title: str = "My Awesome App"
    window_width: int = 1200
    window_height: int = 800
```

Edit `build.config.json`:

```json
{
  "app": {
    "name": "MyAwesomeApp",
    "displayName": "My Awesome App",
    "version": "1.0.0",
    "identifier": "com.mycompany.myapp"
  }
}
```

### 3. Replace the App Logic

The files you should modify for your app:

#### Backend (Python)
- **`backend/app/api.py`** - Your API endpoints
- **`backend/app/state.py`** - Your app's persistent state
- **`backend/app/config.py`** - App configuration (already done in step 2)

#### Frontend (React)
- **`frontend/src/App.jsx`** - Main application UI
- **`frontend/src/app/`** - Your app components (replace FileBrowser.jsx)

#### Optional Customization
- **`backend/main.py`** - Menu structure and app initialization
- **`assets/icon.png`** - Your app icon (1024x1024 PNG recommended)

### 4. Start Development

```bash
# Single command to start everything
./scripts/dev.sh
```

Open browser to `http://127.0.0.1:5173` and start coding!

---

## Project Structure

### What to Modify vs. What to Leave Alone

```
├── backend/
│   ├── app/                    ← YOUR APP - MODIFY THIS
│   │   ├── api.py             # Your API routes
│   │   ├── state.py           # Your app state
│   │   └── config.py          # Your app config
│   │
│   ├── localwebapp/           ← FRAMEWORK - DON'T MODIFY
│   │   ├── desktop.py         # Native window wrapper
│   │   ├── platform.py        # OS abstraction
│   │   └── server.py          # Flask setup
│   │
│   ├── main.py                ← GLUE CODE - MODIFY IF NEEDED
│   ├── requirements.txt       # Python dependencies
│   └── requirements-dev.txt   # Dev dependencies
│
├── frontend/
│   └── src/
│       ├── app/               ← YOUR APP - MODIFY THIS
│       │   └── *.jsx          # Your components
│       │
│       ├── shell/             ← FRAMEWORK - DON'T MODIFY
│       │   ├── useApi.js      # API hooks
│       │   └── useNative.js   # Native integration
│       │
│       └── App.jsx            ← YOUR APP - MODIFY THIS
│
├── scripts/                   ← BUILD TOOLS - USE AS-IS
│   ├── dev.sh                # Development server
│   ├── build_app.sh          # Build .app bundle
│   ├── clean.sh              # Clean build artifacts
│   └── make_dmg.sh           # Create DMG installer
│
├── build.config.json          ← YOUR APP - MODIFY THIS
└── assets/                    ← YOUR APP - MODIFY THIS
    └── icon.png              # Your app icon
```

---

## Common Customization Patterns

### Adding New API Endpoints

Edit `backend/app/api.py`:

```python
@api.post("/my-endpoint")
def my_endpoint():
    data = request.get_json()
    # Your logic here
    return jsonify({"result": "success"})
```

### Calling Your API from Frontend

In your React components:

```javascript
import { useApi } from '../shell/useApi'

function MyComponent() {
  const { get, post } = useApi()
  
  async function doSomething() {
    const result = await post('/my-endpoint', { foo: 'bar' })
    console.log(result)
  }
  
  return <button onClick={doSomething}>Click Me</button>
}
```

### Adding Native OS Features

1. Add method to `JsApi` class in `backend/localwebapp/desktop.py`
2. Call from frontend using `window.pywebview.api.yourMethod()`

Example - adding a save file dialog:

```python
# In desktop.py JsApi class
def save_file(self, content: str) -> dict:
    w = webview.windows[0]
    path = w.create_file_dialog(webview.SAVE_DIALOG)
    if path:
        Path(path[0]).write_text(content)
        return {"ok": True, "path": path[0]}
    return {"ok": False}
```

```javascript
// In React
const result = await window.pywebview.api.save_file("Hello world")
```

### Changing App State Structure

Edit `backend/app/state.py`:

```python
@dataclass
class AppState:
    # Add your own state fields
    user_name: str = ""
    settings: dict = field(default_factory=dict)
    
    def save(self):
        # Customize serialization
        data = {
            "user_name": self.user_name,
            "settings": self.settings,
        }
        config_path().write_text(json.dumps(data, indent=2))
```

### Customizing the Window Menu

Edit `backend/main.py`, the `create_menu()` function:

```python
def create_menu(js_api: JsApi) -> list:
    return [
        Menu('File', [
            MenuAction('New', lambda: do_something()),
            MenuAction('Open...', lambda: do_something_else()),
            MenuSeparator(),
            MenuAction('Quit', lambda: webview.destroy_window()),
        ]),
        # Add more menus...
    ]
```

---

## Development Workflow

### Running in Development Mode

```bash
# Start both backend and frontend with hot reload
./scripts/dev.sh

# Or manually in separate terminals:
# Terminal 1 - Backend
cd backend
source .venv/bin/activate
FLASK_RUN_PORT=5001 python -m flask run --debug

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Debugging in Cursor

1. Set breakpoints in your Python or JavaScript code
2. Press `F5` or use Debug panel
3. Select:
   - **"Full Stack: Backend + Frontend"** - Debug both
   - **"Python: Flask Backend"** - Backend only
   - **"Chrome: Frontend"** - Frontend only

### Building for Distribution

```bash
# Build .app bundle for macOS
./scripts/build_app.sh

# Output: backend/dist/LocalWebApp.app

# Create DMG installer (optional)
./scripts/make_dmg.sh

# Output: backend/dist/LocalWebApp.dmg
```

### Cleaning Build Artifacts

```bash
./scripts/clean.sh
```

---

## Platform Support

### Current Support
- ✅ **macOS** - Fully supported, tested
- ⚠️ **Windows** - Code is structured for Windows, but not yet implemented
- ⚠️ **Linux** - Basic support in platform layer, untested

### Making it Windows-Compatible

The platform abstraction layer (`backend/localwebapp/platform.py`) already has Windows stubs. To fully support Windows:

1. Test on Windows machine
2. Update `scripts/build_app_windows.sh` 
3. Ensure PyInstaller spec works on Windows
4. Test file operations and native dialogs

---

## Testing Your App

### Manual Testing Checklist

Before distributing your app:

- [ ] Run from source: `./scripts/dev.sh`
- [ ] Build and test `.app`: `./scripts/build_app.sh`
- [ ] Test all API endpoints
- [ ] Test native features (file dialogs, menus)
- [ ] Test on a clean Mac (without Python/Node installed)
- [ ] Verify app data persists between launches

### Adding Automated Tests

Backend (pytest):

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/
```

Frontend (vitest - not yet configured):

```bash
cd frontend
npm install -D vitest
npm test
```

---

## Tips & Best Practices

### Keep Framework and App Separate

- ✅ **DO**: Keep your logic in `app/` directories
- ✅ **DO**: Use the provided hooks and utilities
- ❌ **DON'T**: Modify `localwebapp/` or `shell/` unless fixing bugs
- ❌ **DON'T**: Put business logic in `main.py`

### Use the Platform Abstraction

```python
# ✅ Good - cross-platform
from localwebapp.platform import open_file
open_file(some_path)

# ❌ Bad - macOS only
import subprocess
subprocess.run(["open", str(some_path)])
```

### Organize Complex Apps

For larger apps, expand the structure:

```
backend/app/
├── api/
│   ├── __init__.py
│   ├── users.py
│   ├── documents.py
│   └── settings.py
├── models/
│   └── database.py
├── services/
│   └── business_logic.py
└── config.py

frontend/src/app/
├── components/
│   ├── Header.jsx
│   └── Sidebar.jsx
├── pages/
│   ├── Home.jsx
│   └── Settings.jsx
└── utils/
    └── helpers.js
```

---

## Troubleshooting

### "Module not found" errors
```bash
# Reinstall dependencies
cd backend && pip install -r requirements.txt
cd frontend && npm install
```

### Build fails on macOS
```bash
# Ensure Xcode command line tools installed
xcode-select --install
```

### Frontend not updating
```bash
# Clear frontend build cache
rm -rf frontend/dist
rm -rf backend/frontend_dist
```

### Port already in use
```bash
# Kill processes on ports 5001 and 5173
lsof -ti:5001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

---

## Getting Help

1. Check the main [README.md](README.md) for basic setup
2. Review example code in `app/` directories
3. Examine the framework code in `localwebapp/` and `shell/`
4. Read Flask docs: https://flask.palletsprojects.com/
5. Read React docs: https://react.dev/
6. Read pywebview docs: https://pywebview.flowrl.com/

---

## Next Steps

1. Follow the Quick Start above
2. Replace the file browser example with your app
3. Build and test your `.app` bundle
4. Distribute to users (they don't need Python/Node!)

Happy coding! 🚀

