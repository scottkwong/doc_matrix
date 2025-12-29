# Testing & Verification Guide

This document provides comprehensive testing procedures for the LocalWebApp template.

## Quick Verification Checklist

After implementing the refactoring, verify these key features:

### ✅ Development Workflow

- [ ] `./scripts/dev.sh` starts without errors
- [ ] Backend starts on http://127.0.0.1:5001
- [ ] Frontend starts on http://127.0.0.1:5173
- [ ] Browser opens automatically to frontend
- [ ] Backend logs visible at `/tmp/localwebapp_backend.log`
- [ ] Frontend logs visible at `/tmp/localwebapp_frontend.log`
- [ ] Ctrl+C stops both servers cleanly

### ✅ Hot Reload

- [ ] Edit `frontend/src/App.jsx` → Browser updates instantly
- [ ] Edit `backend/app/api.py` → Flask restarts automatically
- [ ] Edit `backend/app/state.py` → Changes take effect on reload

### ✅ Debug Configuration

- [ ] Open project in Cursor/VSCode
- [ ] Press F5, see debug configurations listed
- [ ] "Python: Flask Backend" - can set breakpoints in backend
- [ ] "Chrome: Frontend" - can debug in browser
- [ ] "Full Stack: Backend + Frontend" - both work simultaneously

### ✅ Application Functionality

- [ ] Time display updates every second
- [ ] "Open Folder" button works
- [ ] Can navigate directories in file browser
- [ ] Double-click folder → navigates into it
- [ ] Double-click file → opens with default app
- [ ] "Up" button navigates to parent directory
- [ ] State persists (last folder remembered on restart)

### ✅ Build Process

- [ ] `./scripts/build_app.sh` completes without errors
- [ ] `.app` created at `backend/dist/LocalWebApp.app`
- [ ] Double-click `.app` launches the application
- [ ] Built app functions identically to dev mode
- [ ] App works on another Mac without Python/Node installed

### ✅ Clean Script

- [ ] `./scripts/clean.sh` removes build artifacts
- [ ] `./scripts/clean.sh --all` removes deps too
- [ ] After clean, `./scripts/dev.sh` still works

### ✅ DMG Creation

- [ ] `./scripts/make_dmg.sh` creates DMG (if create-dmg installed)
- [ ] DMG file created at `backend/dist/LocalWebApp.dmg`
- [ ] Opening DMG shows install window
- [ ] Can drag app to Applications

---

## Detailed Testing Procedures

### 1. Development Environment Setup

#### First-Time Setup
```bash
cd local_webapp

# Test dev script
./scripts/dev.sh
```

**Expected:**
- Script creates `.venv` if missing
- Installs Python dependencies
- Installs npm dependencies
- Starts both servers
- Shows URLs in terminal
- Browser opens to http://127.0.0.1:5173

**Verify:**
```bash
# Check backend is running
curl http://127.0.0.1:5001/api/time

# Check frontend is running
curl http://127.0.0.1:5173
```

#### Subsequent Runs
```bash
./scripts/dev.sh
```

**Expected:**
- Faster startup (deps already installed)
- Both servers start immediately

### 2. Code Structure Verification

#### Backend Structure
```bash
ls -la backend/app/
# Should see: __init__.py, api.py, config.py, state.py

ls -la backend/localwebapp/
# Should see: __init__.py, desktop.py, flask_app.py, platform.py, server.py, state.py
```

#### Frontend Structure
```bash
ls -la frontend/src/app/
# Should see: FileBrowser.jsx

ls -la frontend/src/shell/
# Should see: useApi.js, useNative.js
```

### 3. API Endpoint Testing

Test each API endpoint manually:

```bash
# Time endpoint
curl http://127.0.0.1:5001/api/time

# Root directory
curl http://127.0.0.1:5001/api/root

# Set root directory
curl -X POST http://127.0.0.1:5001/api/root \
  -H "Content-Type: application/json" \
  -d '{"root": "/Users/YOUR_USER/Documents"}'

# List directory
curl http://127.0.0.1:5001/api/list

# List subdirectory
curl "http://127.0.0.1:5001/api/list?path=some/subdir"
```

**Expected Responses:**
- All return valid JSON
- No 500 errors
- Proper error messages for invalid requests

### 4. Platform Abstraction Testing

#### Test File Opening
```python
# In Python REPL with venv activated
from pathlib import Path
from localwebapp.platform import open_file, get_platform

print(f"Platform: {get_platform()}")  # Should print 'darwin' on macOS

# Test opening a file
test_file = Path.home() / "Desktop" / "test.txt"
test_file.write_text("Hello")
result = open_file(test_file)
print(f"Open file result: {result}")  # Should be True
```

#### Test App Data Directory
```python
from localwebapp.platform import get_app_data_dir

app_dir = get_app_data_dir("LocalWebApp")
print(f"App data dir: {app_dir}")
# macOS: ~/Library/Application Support/LocalWebApp
assert app_dir.exists()
```

### 5. Frontend Component Testing

#### Manual UI Testing
1. Open http://127.0.0.1:5173
2. Verify time updates every second
3. Click "Open Folder" → select a folder
4. Verify folder path updates
5. Double-click a folder → navigates in
6. Click "Up" → goes to parent
7. Double-click a file → opens in default app

#### Browser Console Testing
```javascript
// In browser console
// Test native API detection
console.log('Is native:', window.pywebview !== undefined)

// Test API hook (when running in dev mode)
fetch('/api/time').then(r => r.json()).then(console.log)
```

### 6. Build Testing

#### Build .app Bundle
```bash
./scripts/build_app.sh
```

**Expected:**
- 6 steps complete successfully
- No Python errors
- No npm errors
- `.app` file created
- Success message with next steps

**Common Issues:**
- Icon build fails → Check `assets/icon.png` exists
- PyInstaller fails → Check all imports work
- Frontend missing → Run without `--skip-frontend` first

#### Test Built Application
```bash
# Open the app
open backend/dist/LocalWebApp.app

# Or run from terminal to see logs
./backend/dist/LocalWebApp.app/Contents/MacOS/LocalWebApp
```

**Verify:**
- Window opens
- No console errors
- Same functionality as dev mode
- File browser works
- Menus appear (if supported)

#### Test on Clean System
Copy `LocalWebApp.app` to a Mac without Python/Node:
- [ ] App launches successfully
- [ ] No "Python not found" errors
- [ ] All features work
- [ ] State persists after quit

### 7. Debug Configuration Testing

#### Backend Debugging
1. Open `backend/app/api.py` in Cursor
2. Set breakpoint in `api_time()` function
3. Press F5 → Select "Python: Flask Backend"
4. Navigate to http://127.0.0.1:5001/api/time
5. Breakpoint should hit
6. Inspect variables
7. Step through code

#### Frontend Debugging
1. Press F5 → Select "Chrome: Frontend"
2. Browser opens with DevTools attached
3. Set breakpoint in React code
4. Breakpoint should hit when code executes
5. Can inspect React state

#### Full Stack Debugging
1. Press F5 → Select "Full Stack: Backend + Frontend"
2. Both debuggers attach
3. Can debug API call from frontend to backend
4. Breakpoints work in both simultaneously

### 8. Modular Structure Testing

#### Test Shell vs App Separation
```bash
# Framework files (don't modify for new apps)
ls backend/localwebapp/*.py
ls frontend/src/shell/*.js

# App files (modify for new apps)
ls backend/app/*.py
ls frontend/src/app/*.jsx
```

#### Create Test App from Template
```bash
# Copy template
cp -r local_webapp test_app
cd test_app

# Modify only app files
# Edit backend/app/config.py
# Edit backend/app/api.py
# Edit frontend/src/App.jsx

# Should work without modifying framework
./scripts/dev.sh
```

### 9. Cross-Platform Code Review

Review platform-specific code is abstracted:

```bash
# Check for hardcoded platform calls
grep -r "subprocess.run.*open" backend/app/  # Should be none
grep -r "os.path" backend/app/               # Should be none

# Verify platform abstraction usage
grep -r "from localwebapp.platform import" backend/app/  # Should exist
```

### 10. Documentation Verification

- [ ] README.md is clear and accurate
- [ ] TEMPLATE.md has step-by-step instructions
- [ ] All scripts have help text (`--help`)
- [ ] Code has docstrings (Python) and comments (JS)
- [ ] File paths in docs match actual structure

---

## Performance Testing

### Development Server Performance
```bash
# Time to start dev server
time ./scripts/dev.sh
# Should be < 10 seconds on first run
# Should be < 5 seconds on subsequent runs
```

### Build Performance
```bash
# Time to build .app
time ./scripts/build_app.sh
# Full build: 30-60 seconds
# With --skip-frontend: 15-30 seconds
```

### Application Performance
- [ ] App launches in < 3 seconds
- [ ] UI is responsive (no lag)
- [ ] Directory listing is fast (< 1s for 1000 files)
- [ ] File opening is immediate

---

## Security Testing

### Localhost Binding
```bash
# Verify server only binds to localhost
lsof -i :5001 | grep LISTEN
# Should show 127.0.0.1:5001, NOT *:5001
```

### Path Traversal Protection
```bash
# Try to access parent of root
curl "http://127.0.0.1:5001/api/list?path=../../etc"
# Should return error, not allow access

# Try to open file outside root
curl -X POST http://127.0.0.1:5001/api/open \
  -H "Content-Type: application/json" \
  -d '{"rel_path": "../../etc/passwd"}'
# Should return error
```

### Input Validation
Test API with invalid inputs:
```bash
# Invalid JSON
curl -X POST http://127.0.0.1:5001/api/root \
  -H "Content-Type: application/json" \
  -d 'not valid json'

# Missing fields
curl -X POST http://127.0.0.1:5001/api/open \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Regression Testing

After making changes, re-run:

1. **Quick smoke test:**
   ```bash
   ./scripts/dev.sh
   # Open browser, verify basic functionality
   ```

2. **Build test:**
   ```bash
   ./scripts/build_app.sh
   open backend/dist/LocalWebApp.app
   ```

3. **Run through checklist:**
   - [ ] Development workflow
   - [ ] API endpoints
   - [ ] UI functionality
   - [ ] Build process

---

## Known Issues & Limitations

### macOS Specific
- pywebview menus may not work on all macOS/Python combos
- Some macOS security settings may block unsigned .app
- Gatekeeper may require right-click → Open for first launch

### Not Yet Implemented
- Windows build process (structure is ready)
- Linux testing (platform code exists)
- Automated tests (pytest/vitest setup)
- Code signing for distribution

---

## Reporting Issues

If you find issues:

1. Check Console.app (macOS) for error messages
2. Check log files: `/tmp/localwebapp_*.log`
3. Run with verbose output: `FLASK_DEBUG=1 ./scripts/dev.sh`
4. Test in both dev mode and built app
5. Note macOS version and Python/Node versions

---

## Test Results Template

Use this to track your testing:

```markdown
## Test Date: YYYY-MM-DD
## Tester: [Name]
## Platform: macOS [Version]
## Python: [Version]
## Node: [Version]

### Development Workflow
- [ ] dev.sh starts: PASS/FAIL
- [ ] Hot reload works: PASS/FAIL
- [ ] Debug config: PASS/FAIL

### Application
- [ ] File browser: PASS/FAIL
- [ ] State persistence: PASS/FAIL
- [ ] Native features: PASS/FAIL

### Build
- [ ] .app builds: PASS/FAIL
- [ ] .app runs: PASS/FAIL
- [ ] DMG creates: PASS/FAIL

### Notes:
[Any issues or observations]
```

---

**✅ All tests passing?** You're ready to use this template for your own apps!

See [TEMPLATE.md](TEMPLATE.md) for how to customize this for your specific application.

