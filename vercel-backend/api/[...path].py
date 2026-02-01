"""
Vercel serverless catch-all for FastAPI backend (backend-only deploy).
CORS is applied by wrapping the app in ASGI middleware that injects headers into every response.
"""
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI
from backend.app.main import app as backend_app

# CORS headers (bytes for ASGI)
CORS_HEADERS = [
    (b"access-control-allow-origin", b"*"),
    (b"access-control-allow-methods", b"GET, POST, PATCH, PUT, DELETE, OPTIONS"),
    (b"access-control-allow-headers", b"*"),
    (b"access-control-max-age", b"86400"),
    (b"access-control-expose-headers", b"*"),
]

# Root app: mount backend at /api
root_app = FastAPI()
root_app.mount("/api", backend_app)


def add_cors_middleware(asgi_app):
    """Wrap ASGI app to add CORS headers to every http.response.start."""

    async def wrapped(scope, receive, send):
        if scope["type"] != "http":
            await asgi_app(scope, receive, send)
            return

        async def send_with_cors(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(CORS_HEADERS)
                message = {
                    "type": "http.response.start",
                    "status": message["status"],
                    "headers": headers,
                }
            await send(message)

        await asgi_app(scope, receive, send_with_cors)

    return wrapped


# Export app with CORS applied to every response
app = add_cors_middleware(root_app)
