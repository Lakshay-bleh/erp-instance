"""
Vercel serverless catch-all for FastAPI backend (backend-only deploy).
When Root Directory is vercel-backend/, backend lives at vercel-backend/backend/.
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
