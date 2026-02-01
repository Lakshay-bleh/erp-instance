"""
Vercel serverless entry for FastAPI backend.
All /api/* requests are handled by this file (configure catch-all in project or use this as single API).
Mounts the backend FastAPI app at /api so routes are /api/incidents, /api/health, etc.
"""
import sys
from pathlib import Path

# Add repo root so we can import backend
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI
from backend.app.main import app as backend_app

# Mount backend at /api so full paths are /api/incidents, /api/health, /api/config
app = FastAPI()
app.mount("/api", backend_app)
