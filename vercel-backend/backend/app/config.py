"""Application configuration from environment."""

from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import model_validator
from functools import lru_cache

_BASE = Path(__file__).resolve().parent.parent  # backend/
_ENV_FILES = [str(_BASE / ".env"), str(_BASE.parent / ".env")]  # backend/.env, project root .env


class Settings(BaseSettings):
    # CORS: when backend is deployed separately, set to your frontend URL(s), comma-separated
    cors_origins_extra: str = ""

    # AWS
    aws_region: str = "us-east-1"
    dynamodb_table: str = "erp-incidents"
    s3_bucket: str = "erp-incidents-payloads"
    lambda_function_name: str = "erp-incident-enrichment"
    use_local_aws: bool = True  # Use in-memory/local file when True
    use_memory_store: Optional[bool] = None  # If False, use real AWS (overrides use_local_aws)
    use_lambda_enrichment: bool = False  # If True and AWS, invoke Lambda for enrichment

    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    model_config = {
        "env_file": _ENV_FILES,
        "extra": "ignore",
    }

    @model_validator(mode="after")
    def apply_memory_store(self):
        if self.use_memory_store is not None:
            self.use_local_aws = self.use_memory_store
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
