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
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from backend.app.main import app as backend_app

# CORS headers (bytes for ASGI)
CORS_HEADERS = [
    (b"access-control-allow-origin", b"*"),
    (b"access-control-allow-methods", b"GET, POST, PATCH, PUT, DELETE, OPTIONS"),
    (b"access-control-allow-headers", b"*"),
    (b"access-control-max-age", b"86400"),
    (b"access-control-expose-headers", b"*"),
]


class AddCorsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            from starlette.responses import Response
            return Response(status_code=200, headers={k.decode(): v.decode() for k, v in CORS_HEADERS})
        response = await call_next(request)
        for k, v in CORS_HEADERS:
            response.headers[k.decode()] = v.decode()
        return response


def _create_app():
    _app = FastAPI(title="ERP Incident Triage API", version="1.0.0")
    _app.add_middleware(AddCorsMiddleware)
    _app.mount("/api", backend_app)
    _app.mount("/", backend_app)
    return _app


app = _create_app()


@app.get("/")
def root():
    return {"status": "ok", "message": "ERP Incident Triage API", "docs": "/api/docs"}
