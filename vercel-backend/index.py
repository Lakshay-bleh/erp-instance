"""
Vercel FastAPI entrypoint (root-level).
Vercel looks for app.py, index.py, or server.py at project root.
Backend is mounted at /api so routes are /api/health, /api/incidents, etc.
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI
from backend.app.main import app as backend_app

app = FastAPI()
app.mount("/api", backend_app)
    