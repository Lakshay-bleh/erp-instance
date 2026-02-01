"""Incident REST API endpoints."""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends

from ..config import get_settings
from ..models import (
    IncidentCreate,
    IncidentResponse,
    IncidentUpdateStatus,
    IncidentUpdateTags,
    Status,
)
from ..services.dynamodb import put_incident, get_incident, update_incident, scan_incidents
from ..services.s3 import put_raw_payload
from ..services.lambda_client import run_enrichment_in_process, invoke_enrichment_lambda
from ..enrichment import compute_severity, merge_severity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _item_to_response(item: dict) -> IncidentResponse:
    tags = item.get("tags")
    if not isinstance(tags, list):
        tags = []
    return IncidentResponse(
        id=item["id"],
        title=item["title"],
        description=item["description"],
        erp_module=item["erp_module"],
        environment=item["environment"],
        business_unit=item["business_unit"],
        severity=item.get("severity", "P3"),
        category=item.get("category", "Unknown"),
        status=item.get("status", "Open"),
        tags=tags,
        auto_summary=item.get("auto_summary"),
        suggested_action=item.get("suggested_action"),
        created_at=item["created_at"],
        updated_at=item["updated_at"],
    )


@router.post("", response_model=IncidentResponse)
def create_incident(body: IncidentCreate):
    """
    1. Store raw payload in S3 (or local)
    2. Write base record to DynamoDB
    3. Invoke Lambda (or run enrichment in-process)
    4. Save enriched data back to DynamoDB
    """
    settings = get_settings()
    incident_id = str(uuid4())
    now = _now_iso()

    raw_payload = body.model_dump(mode="json")
    put_raw_payload(settings.s3_bucket, incident_id, raw_payload)

    base_item = {
        "id": incident_id,
        "title": body.title,
        "description": body.description,
        "erp_module": body.erp_module.value,
        "environment": body.environment.value,
        "business_unit": body.business_unit,
        "severity": "P3",
        "category": "Unknown",
        "status": Status.Open.value,
        "tags": [],
        "auto_summary": None,
        "suggested_action": None,
        "created_at": now,
        "updated_at": now,
    }
    put_incident(settings.dynamodb_table, base_item)

    use_local = getattr(settings, "use_local_aws", True)
    use_lambda = getattr(settings, "use_lambda_enrichment", False)
    enriched = None
    if use_local or not use_lambda:
        enriched = run_enrichment_in_process(
            incident_id=incident_id,
            title=body.title,
            description=body.description,
            erp_module=body.erp_module.value,
            environment=body.environment.value,
            business_unit=body.business_unit,
            groq_api_key=settings.groq_api_key,
            groq_model=settings.groq_model,
        )
    else:
        payload = {
            "incident_id": incident_id,
            "title": body.title,
            "description": body.description,
            "erp_module": body.erp_module.value,
            "environment": body.environment.value,
        }
        enriched = invoke_enrichment_lambda(
            settings.lambda_function_name,
            settings.aws_region,
            payload,
        )
        if not enriched:
            logger.info("Lambda unavailable or failed; falling back to in-process enrichment")
            enriched = run_enrichment_in_process(
                incident_id=incident_id,
                title=body.title,
                description=body.description,
                erp_module=body.erp_module.value,
                environment=body.environment.value,
                business_unit=body.business_unit,
                groq_api_key=settings.groq_api_key,
                groq_model=settings.groq_model,
            )

    if enriched:
        updates = {
            "severity": enriched.get("severity", base_item["severity"]),
            "category": enriched.get("category", base_item["category"]),
            "auto_summary": enriched.get("auto_summary"),
            "suggested_action": enriched.get("suggested_action"),
            "updated_at": _now_iso(),
        }
        if "tags" in enriched and enriched["tags"]:
            updates["tags"] = enriched["tags"]
        update_incident(settings.dynamodb_table, incident_id, updates)
        base_item.update(updates)

    logger.info("Incident created id=%s", incident_id)
    return _item_to_response(base_item)


@router.get("", response_model=list[IncidentResponse])
def list_incidents(severity: str | None = None, erp_module: str | None = None):
    """List all incidents with optional filters."""
    settings = get_settings()
    items = scan_incidents(settings.dynamodb_table)
    if severity:
        items = [i for i in items if i.get("severity") == severity]
    if erp_module:
        items = [i for i in items if i.get("erp_module") == erp_module]
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return [_item_to_response(i) for i in items]


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_by_id(incident_id: str):
    """Get single incident by id."""
    settings = get_settings()
    item = get_incident(settings.dynamodb_table, incident_id)
    if not item:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _item_to_response(item)


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(incident_id: str, body: IncidentUpdateStatus):
    """Update incident status (Open | In Progress | Resolved)."""
    settings = get_settings()
    existing = get_incident(settings.dynamodb_table, incident_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Incident not found")
    updates = {"status": body.status.value, "updated_at": _now_iso()}
    updated = update_incident(settings.dynamodb_table, incident_id, updates)
    return _item_to_response(updated)


@router.patch("/{incident_id}/tags", response_model=IncidentResponse)
def update_incident_tags(incident_id: str, body: IncidentUpdateTags):
    """Add or replace incident tags (max 50)."""
    settings = get_settings()
    existing = get_incident(settings.dynamodb_table, incident_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Incident not found")
    tags = [str(t).strip() for t in body.tags if t][:50]
    updates = {"tags": tags, "updated_at": _now_iso()}
    updated = update_incident(settings.dynamodb_table, incident_id, updates)
    return _item_to_response(updated)


@router.post("/{incident_id}/enrich", response_model=IncidentResponse)
def enrich_incident(incident_id: str):
    """
    Run Groq AI enrichment for this incident: auto_summary, suggested_action, category, tags.
    Uses GROQ_API_KEY from backend .env. Updates the incident and returns it.
    """
    settings = get_settings()
    existing = get_incident(settings.dynamodb_table, incident_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Incident not found")
    if not (settings.groq_api_key or "").strip():
        raise HTTPException(
            status_code=400,
            detail="GROQ_API_KEY not set in backend .env. Add it to enable AI summary and suggested action.",
        )
    from ..services.groq_client import get_groq_enrichment
    category, summary, action, tags, groq_severity = get_groq_enrichment(
        groq_api_key=settings.groq_api_key,
        groq_model=settings.groq_model,
        title=existing["title"],
        description=existing["description"],
        erp_module=existing["erp_module"],
        environment=existing["environment"],
    )
    keyword_severity = compute_severity(
        existing["environment"], existing.get("title", ""), existing.get("description", "")
    )
    severity = merge_severity(keyword_severity, groq_severity)
    updates = {
        "severity": severity.value,
        "category": category or existing.get("category", "Unknown"),
        "auto_summary": summary,
        "suggested_action": action,
        "updated_at": _now_iso(),
    }
    if tags:
        updates["tags"] = tags
    updated = update_incident(settings.dynamodb_table, incident_id, updates)
    logger.info("Enriched incident %s with Groq (summary=%s)", incident_id, bool(summary))
    return _item_to_response(updated)
