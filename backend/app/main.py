"""FastAPI application for ERP Incident Triage Portal."""

import logging
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import incidents

# CloudWatch-friendly: log to stdout so AWS can capture
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# CORS: local dev + Vercel deployment (same-origin when frontend and API on same domain)
_cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if os.environ.get("VERCEL_URL"):
    _cors_origins.append(f"https://{os.environ['VERCEL_URL']}")

app = FastAPI(
    title="ERP Incident Triage Portal API",
    description="AI-assisted incident submission, enrichment, and triage for Oracle ERP.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents.router)


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
