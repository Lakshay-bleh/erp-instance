"""
Re-export the root app so /api/* requests use the same FastAPI app.
Vercel may invoke this file for /api/*; we delegate to app.py so routing is consistent.
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from app import app
