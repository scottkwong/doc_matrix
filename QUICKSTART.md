# Quick Start Guide

## For First-Time Use

### Prerequisites
Make sure you have:
- **Python 3.10+** (`python3 --version`)
- **Node 18+** (`node --version`)
- **npm** (comes with Node)

### Start Development
```bash
./scripts/dev.sh
```

That's it! The script will:
- Create Python virtual environment (if needed)
- Install all dependencies automatically
- Start backend on http://127.0.0.1:5001
- Start frontend on http://127.0.0.1:5173
- Open browser automatically

**First run takes ~30 seconds** (installing dependencies).  
**Subsequent runs are ~5 seconds.**

Press `Ctrl+C` to stop both servers.

### Debug in Cursor
1. Press `F5`
2. Select "Full Stack: Backend + Frontend"
3. Set breakpoints anywhere

### Build for Distribution
```bash
./scripts/build_app.sh
open backend/dist/DocMatrix.app
```

---

## For Creating Your Own App

### 1. Copy Template
```bash
cp -r doc_matrix my_awesome_app
cd my_awesome_app
```

### 2. Configure Your App
Edit `backend/app/config.py`:
```python
app_name = "MyAwesomeApp"
window_title = "My Awesome App"
```

Edit `build.config.json`:
```json
{
  "app": {
    "name": "MyAwesomeApp",
    "version": "1.0.0"
  }
}
```

### 3. Build Your App Logic

**Modify These Files:**
- `backend/app/api.py` - Your API endpoints
- `backend/app/state.py` - Your app state
- `frontend/src/App.jsx` - Your UI
- `frontend/src/app/` - Your components

**Don't Touch These:**
- `backend/localwebapp/` - Framework code
- `frontend/src/shell/` - Framework hooks

### 4. Develop
```bash
./scripts/dev.sh
# Edit code, see changes instantly!
```

### 5. Build & Distribute
```bash
./scripts/build_app.sh
./scripts/make_dmg.sh
# Share the .dmg with users!
```

---

## Common Commands

```bash
# Development
./scripts/dev.sh              # Start dev servers
./scripts/clean.sh            # Clean build artifacts
./scripts/clean.sh --all      # Clean everything

# Building
./scripts/build_app.sh                    # Full build
./scripts/build_app.sh --skip-frontend   # Skip frontend (faster)
./scripts/make_dmg.sh                    # Create DMG installer

# Debugging
# Press F5 in Cursor/VSCode
```

---

## Directory Structure

```
✅ MODIFY THESE (Your App):
├── backend/app/              # Your backend logic
├── frontend/src/App.jsx      # Your UI
└── frontend/src/app/         # Your components

❌ DON'T MODIFY (Framework):
├── backend/localwebapp/      # Framework code
└── frontend/src/shell/       # Framework hooks

🔧 CONFIGURE:
├── backend/app/config.py     # App settings
└── build.config.json         # Build settings
```

---

## More Information

- **[README.md](README.md)** - Overview and features
- **[TEMPLATE.md](TEMPLATE.md)** - Detailed template guide
- **[TESTING.md](TESTING.md)** - Testing procedures
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - What changed

---

## Troubleshooting

### Dev server won't start
```bash
./scripts/clean.sh --all
./scripts/dev.sh
```

### Build fails
```bash
# Check you have dependencies
python3 --version  # Need 3.10+
node --version     # Need 18+

# Reinstall
cd backend && pip install -r requirements.txt
cd frontend && npm install
```

### Port already in use
```bash
lsof -ti:5001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

---

**Ready to build?** → Run `./scripts/dev.sh` and start coding! 🚀

