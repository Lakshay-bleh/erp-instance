"""DynamoDB service for incident storage. Supports real AWS and local in-memory store."""

import json
import logging
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import uuid4

logger = logging.getLogger(__name__)

# In-memory store for local development when boto3 DynamoDB is not used
_local_store: Dict[str, Dict[str, Any]] = {}
# Use absolute path so it works on Vercel/serverless (CWD may differ)
_base_dir = Path(__file__).resolve().parent.parent.parent  # backend/
_local_store_path = str(_base_dir / "data" / "incidents.json")


def _ensure_data_dir():
    try:
        d = os.path.dirname(_local_store_path)
        if d and not os.path.isdir(d):
            os.makedirs(d, exist_ok=True)
    except Exception as e:
        logger.warning("Could not create data dir: %s", e)


def _load_local_store():
    global _local_store
    if _local_store:
        return
    try:
        _ensure_data_dir()
        if os.path.isfile(_local_store_path):
            with open(_local_store_path, "r") as f:
                data = json.load(f)
                _local_store = data if isinstance(data, dict) else {}
        else:
            _local_store = {}
    except Exception as e:
        logger.warning("Could not load local store: %s", e)
        _local_store = {}


def _save_local_store():
    try:
        _ensure_data_dir()
        with open(_local_store_path, "w") as f:
            json.dump(_local_store, f, indent=2)
    except Exception as e:
        logger.warning("Could not persist local store: %s", e)


def get_dynamodb_client():
    """Return boto3 DynamoDB resource if AWS is configured; else None for local."""
    # USE_MEMORY_STORE=false means use real AWS
    memory = os.getenv("USE_MEMORY_STORE", "").lower()
    if memory == "false":
        use_local = False
    else:
        use_local = os.getenv("USE_LOCAL_AWS", "true").lower() in ("true", "1", "yes")
    if use_local:
        return None
    try:
        import boto3
        return boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "us-east-1"))
    except Exception as e:
        logger.warning("DynamoDB not available, using local store: %s", e)
        return None


def put_incident(table_name: str, item: Dict[str, Any]) -> None:
    """Write incident to DynamoDB or local store."""
    client = get_dynamodb_client()
    if client:
        table = client.Table(table_name)
        table.put_item(Item=item)
        logger.info("DynamoDB put_incident id=%s", item.get("id"))
        return
    _load_local_store()
    _local_store[item["id"]] = item
    _save_local_store()
    logger.info("Local store put_incident id=%s", item.get("id"))


def get_incident(table_name: str, incident_id: str) -> Optional[Dict[str, Any]]:
    """Get single incident by id."""
    client = get_dynamodb_client()
    if client:
        table = client.Table(table_name)
        resp = table.get_item(Key={"id": incident_id})
        return resp.get("Item")
    _load_local_store()
    return _local_store.get(incident_id)


def update_incident(table_name: str, incident_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update incident attributes. Returns updated item or None."""
    client = get_dynamodb_client()
    if client:
        table = client.Table(table_name)
        # Build update expression
        expr_names = {f"#k{i}": k for i, k in enumerate(updates)}
        expr_vals = {f":v{i}": v for i, v in enumerate(updates.values())}
        keys = list(updates.keys())
        set_expr = ", ".join(f"#k{i} = :v{i}" for i in range(len(keys)))
        result = table.update_item(
            Key={"id": incident_id},
            UpdateExpression=f"SET {set_expr}",
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_vals,
            ReturnValues="ALL_NEW",
        )
        return result.get("Attributes")
    _load_local_store()
    if incident_id not in _local_store:
        return None
    _local_store[incident_id].update(updates)
    _save_local_store()
    return _local_store[incident_id]


def scan_incidents(table_name: str) -> List[Dict[str, Any]]:
    """Scan all incidents (for list endpoint)."""
    client = get_dynamodb_client()
    if client:
        table = client.Table(table_name)
        items = []
        resp = table.scan()
        items.extend(resp.get("Items", []))
        while "LastEvaluatedKey" in resp:
            resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
            items.extend(resp.get("Items", []))
        return items
    _load_local_store()
    return list(_local_store.values())


def delete_incident(table_name: str, incident_id: str) -> bool:
    """Delete incident by id. Returns True if deleted, False if not found."""
    existing = get_incident(table_name, incident_id)
    if not existing:
        return False
    client = get_dynamodb_client()
    if client:
        table = client.Table(table_name)
        table.delete_item(Key={"id": incident_id})
        logger.info("DynamoDB delete_incident id=%s", incident_id)
        return True
    _load_local_store()
    if incident_id not in _local_store:
        return False
    del _local_store[incident_id]
    _save_local_store()
    logger.info("Local store delete_incident id=%s", incident_id)
    return True
