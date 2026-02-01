"""
Vercel catch-all for /api/* — runs the FastAPI backend.
Mounts backend at /api so routes are /api/incidents, /api/health, /api/config.
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI
from backend.app.main import app as backend_app

app = FastAPI()
app.mount("/api", backend_app)
