"""
Single FastAPI entrypoint for Vercel (root-level).
Vercel detects app.py, index.py, or server.py and uses it for ALL routes.
Backend is mounted at /api and / so both /api/incidents/... and /incidents/... work.
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.main import app as backend_app

app = FastAPI(title="ERP Incident Triage API", version="1.0.0")

# CORS first so preflight (OPTIONS) and all responses get correct headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

app.mount("/api", backend_app)
app.mount("/", backend_app)


@app.get("/")
def root():
    return {"status": "ok", "message": "ERP Incident Triage API", "docs": "/api/docs"}
