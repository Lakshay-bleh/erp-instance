"""S3 service for raw incident payload storage. Supports real AWS and local file storage."""

import json
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

_local_payloads_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "payloads")


def _ensure_payload_dir():
    if not os.path.isdir(_local_payloads_dir):
        os.makedirs(_local_payloads_dir, exist_ok=True)


def get_s3_client():
    """Return boto3 S3 client if AWS is configured; else None for local."""
    memory = os.getenv("USE_MEMORY_STORE", "").lower()
    if memory == "false":
        use_local = False
    else:
        use_local = os.getenv("USE_LOCAL_AWS", "true").lower() in ("true", "1", "yes")
    if use_local:
        return None
    try:
        import boto3
        return boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))
    except Exception as e:
        logger.warning("S3 not available, using local storage: %s", e)
        return None


def put_raw_payload(bucket: str, incident_id: str, payload: Any) -> None:
    """Store raw incident payload in S3 or local file."""
    client = get_s3_client()
    key = f"incidents/{incident_id}/payload.json"
    body = json.dumps(payload) if isinstance(payload, dict) else str(payload)
    if client:
        try:
            client.put_object(Bucket=bucket, Key=key, Body=body, ContentType="application/json")
            logger.info("S3 put_raw_payload key=%s", key)
        except Exception as e:
            logger.exception("S3 put failed: %s", e)
        return
    _ensure_payload_dir()
    path = os.path.join(_local_payloads_dir, f"{incident_id}.json")
    try:
        with open(path, "w") as f:
            f.write(body if isinstance(body, str) else json.dumps(body))
        logger.info("Local put_raw_payload id=%s", incident_id)
    except Exception as e:
        logger.warning("Local payload save failed: %s", e)
