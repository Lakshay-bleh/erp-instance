"""
Vercel serverless catch-all for FastAPI backend (backend-only deploy).
CORS is applied here at the entry point so every response has CORS headers.
"""
import os
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from backend.app.main import app as backend_app

CORS_METHODS_HEADERS = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
CORS_ALL_HEADERS = "*"
CORS_MAX_AGE = "86400"


def cors_headers(origin: str | None) -> dict:
    """Allow request origin (reflect) or * so browser accepts the response."""
    return {
        "Access-Control-Allow-Origin": origin or "*",
        "Access-Control-Allow-Methods": CORS_METHODS_HEADERS,
        "Access-Control-Allow-Headers": CORS_ALL_HEADERS,
        "Access-Control-Max-Age": CORS_MAX_AGE,
        "Access-Control-Expose-Headers": "*",
    }


class CorsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        if request.method == "OPTIONS":
            return JSONResponse(status_code=200, headers=cors_headers(origin or "*"))
        response = await call_next(request)
        for key, value in cors_headers(origin).items():
            response.headers[key] = value
        return response


app = FastAPI()
app.add_middleware(CorsMiddleware)
app.mount("/api", backend_app)
