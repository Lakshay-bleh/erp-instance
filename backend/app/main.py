"""FastAPI application for ERP Incident Triage Portal."""

import logging
import os
import sys
import traceback

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from .config import get_settings
from .routers import incidents

# CloudWatch-friendly: log to stdout so AWS can capture
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# CORS: local dev + optional frontend URL when deployed separately
_cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if os.environ.get("VERCEL_URL"):
    _cors_origins.append(f"https://{os.environ['VERCEL_URL']}")
_settings = get_settings()
_cors_extra = (_settings.cors_origins_extra or "").strip()
if _cors_extra == "*":
    _cors_origins = ["*"]
    _cors_credentials = False
elif _cors_extra:
    for origin in _cors_extra.split(","):
        origin = origin.strip()
        if origin and origin not in _cors_origins:
            _cors_origins.append(origin)
    _cors_credentials = True
else:
    _cors_credentials = True

# Allow any origin when on Vercel so all frontend URLs work (override list with * for responses)
_cors_allow_any = _cors_extra == "*" or os.environ.get("VERCEL")

app = FastAPI(
    title="ERP Incident Triage Portal API",
    description="AI-assisted incident submission, enrichment, and triage for Oracle ERP.",
    version="1.0.0",
)


class AddCorsHeadersMiddleware(BaseHTTPMiddleware):
    """Inject CORS headers into every response so they are never missing (e.g. on Vercel)."""

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return JSONResponse(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Max-Age": "86400",
                },
            )
        response = await call_next(request)
        origin = request.headers.get("origin") or "*"
        if _cors_allow_any:
            response.headers["Access-Control-Allow-Origin"] = "*"
        elif origin in _cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response


app.add_middleware(AddCorsHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(incidents.router)


@app.exception_handler(Exception)
def global_exception_handler(request, exc):
    """Return error detail as JSON so we can debug 500s (e.g. on Vercel)."""
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "error_type": type(exc).__name__,
            "traceback": traceback.format_exc() if os.environ.get("VERCEL") else None,
        },
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/config")
def config():
    """Returns whether the app is using real AWS or local storage. No secrets."""
    settings = get_settings()
    use_aws = not settings.use_local_aws
    return {
        "use_aws": use_aws,
        "storage_mode": "AWS (DynamoDB + S3)" if use_aws else "local (in-memory / backend/data/)",
        "use_lambda_enrichment": getattr(settings, "use_lambda_enrichment", False),
        "enrichment_mode": "Lambda" if (use_aws and getattr(settings, "use_lambda_enrichment", False)) else "in-process (FastAPI)",
        "aws_region": settings.aws_region if use_aws else None,
        "dynamodb_table": settings.dynamodb_table if use_aws else None,
        "s3_bucket": settings.s3_bucket if use_aws else None,
    }


@app.on_event("startup")
def startup():
    settings = get_settings()
    mode = "AWS (DynamoDB + S3)" if not settings.use_local_aws else "local storage"
    groq_ok = bool((settings.groq_api_key or "").strip())
    logger.info("ERP Incident Triage API started; storage=%s; Groq API key=%s", mode, "set" if groq_ok else "NOT SET (add GROQ_API_KEY to .env for AI summary)")
