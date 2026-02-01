"""Lambda invocation for enrichment. Locally runs enrichment in-process."""

import json
import logging
from typing import Any, Dict, List, Optional

from ..enrichment import compute_severity, compute_category_fallback, merge_severity
from .groq_client import get_groq_enrichment

logger = logging.getLogger(__name__)


def run_enrichment_in_process(
    incident_id: str,
    title: str,
    description: str,
    erp_module: str,
    environment: str,
    business_unit: str,
    groq_api_key: str,
    groq_model: str,
) -> Dict[str, Any]:
    """
    Run enrichment in-process. Returns dict with severity, category, auto_summary, suggested_action, tags.
    Severity: keyword-based (P1/P2/P3) merged with Groq AI severity (take higher).
    Category from Groq or keyword fallback. Tags from Groq.
    """
    keyword_severity = compute_severity(environment, title or "", description or "")
    category_groq, auto_summary, suggested_action, tags, groq_severity = get_groq_enrichment(
        groq_api_key, groq_model, title, description, erp_module, environment
    )
    severity = merge_severity(keyword_severity, groq_severity)
    category = category_groq if category_groq else compute_category_fallback(description)
    tag_list: List[str] = list(tags) if tags else []
    return {
        "severity": severity.value,
        "category": category,
        "auto_summary": auto_summary,
        "suggested_action": suggested_action,
        "tags": tag_list,
    }


def invoke_enrichment_lambda(
    function_name: str,
    region: str,
    payload: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """Invoke AWS Lambda enrichment function. Returns payload from Lambda or None."""
    try:
        import boto3
        client = boto3.client("lambda", region_name=region)
        resp = client.invoke(
            FunctionName=function_name,
            InvocationType="RequestResponse",
            Payload=json.dumps(payload),
        )
        if resp.get("StatusCode") != 200:
            logger.warning("Lambda returned status %s", resp.get("StatusCode"))
            return None
        body = resp.get("Payload").read()
        return json.loads(body) if body else None
    except Exception as e:
        logger.exception("Lambda invoke failed: %s", e)
        return None
