"""
Vercel serverless catch-all for FastAPI backend (backend-only deploy).
CORS is applied via raw ASGI middleware so headers are always sent.
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from backend.app.main import app as backend_app

# CORS headers to inject into every response (raw ASGI)
CORS_HEADERS = [
    (b"access-control-allow-origin", b"*"),
    (b"access-control-allow-methods", b"GET, POST, PATCH, PUT, DELETE, OPTIONS"),
    (b"access-control-allow-headers", b"*"),
    (b"access-control-max-age", b"86400"),
    (b"access-control-expose-headers", b"*"),
]


async def app_with_mount(scope, receive, send):
    if scope["type"] != "http":
        await backend_app(scope, receive, send)
        return
    path = scope.get("path", "")
    if path.startswith("/api"):
        # Rewrite path for backend: /api/incidents -> /incidents
        scope = dict(scope)
        scope["path"] = path[4:] or "/"
        scope["raw_path"] = (path[4:] or "/").encode("utf-8")
        await cors_wrapper(scope, receive, send)
    else:
        await send({"type": "http.response.start", "status": 404, "headers": CORS_HEADERS})
        await send({"type": "http.response.body", "body": b"Not Found", "more_body": False})


async def cors_wrapper(scope, receive, send):
    async def send_with_cors(message):
        if message["type"] == "http.response.start":
            headers = list(message.get("headers", []))
            headers.extend(CORS_HEADERS)
            message = {"type": "http.response.start", "status": message["status"], "headers": headers}
        await send(message)
    if scope.get("method") == "OPTIONS":
        await send_with_cors({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"", "more_body": False})
        return
    await backend_app(scope, receive, send_with_cors)


app = app_with_mount
