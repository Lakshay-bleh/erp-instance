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

# CORS headers to add to every response (Vercel entry point)
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400",
}


class CorsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return JSONResponse(status_code=200, headers=CORS_HEADERS)
        response = await call_next(request)
        for key, value in CORS_HEADERS.items():
            response.headers[key] = value
        return response


app = FastAPI()
app.add_middleware(CorsMiddleware)
app.mount("/api", backend_app)
