"""
AWS Lambda handler for incident enrichment.
Severity (deterministic), category + summary + suggested_action + tags via Groq.
"""

import json
import logging
import os

try:
    from groq import Groq
except ImportError:
    Groq = None

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# P1 = most urgent: Prod + any of these in title or description
P1_KEYWORDS = [
    "stuck", "failed", "down", "error", "blocked", "blocking",
    "critical", "outage", "urgent", "immediate", "unavailable",
    "cannot process", "production down", "system down", "data loss",
    "security breach", "failure", "broken",
]
# P2 in Test: serious wording
P2_KEYWORDS = [
    "blocking", "critical", "failed", "failure", "error", "stuck",
    "urgent", "cannot process", "unavailable",
]
CATEGORY_CHOICES = [
    "Configuration Issue",
    "Data Issue",
    "Integration Failure",
    "Security / Access",
    "Unknown",
]
SEVERITY_CHOICES = ("P1", "P2", "P3")


def compute_severity(environment: str, title: str, description: str) -> str:
    """P1 = most urgent (Prod + P1 keywords). P2 = Prod else or Test + P2 keywords. P3 = least."""
    text = f"{title or ''} {description or ''}".lower()
    if environment == "Prod":
        if any(kw in text for kw in P1_KEYWORDS):
            return "P1"
        return "P2"
    if any(kw in text for kw in P2_KEYWORDS):
        return "P2"
    return "P3"


def merge_severity(keyword_severity: str, groq_severity: str) -> str:
    """Take the higher severity: P1 > P2 > P3."""
    order = {"P1": 3, "P2": 2, "P3": 1}
    kw = keyword_severity.strip().upper() if keyword_severity else "P3"
    groq = (groq_severity or "").strip().upper() if groq_severity else None
    if groq not in SEVERITY_CHOICES:
        return kw
    return kw if order.get(kw, 0) >= order.get(groq, 0) else groq


def groq_enrichment(api_key: str, model: str, title: str, description: str, erp_module: str, environment: str):
    """Returns (category, summary, suggested_action, tags, groq_severity) or (None,)*5."""
    if not api_key or not Groq:
        return None, None, None, None, None
    try:
        client = Groq(api_key=api_key)
        choices_str = ", ".join(f'"{c}"' for c in CATEGORY_CHOICES)
        severity_str = ", ".join(SEVERITY_CHOICES)
        prompt = f"""You are an ERP incident triage assistant. Given this incident, classify it and provide outputs.

INCIDENT:
Title: {title}
Description: {description}
ERP Module: {erp_module}
Environment: {environment}

SEVERITY (choose exactly one; most urgent first):
- P1: Critical/urgent — outage, blocking business, data loss, security issue, production down, cannot process.
- P2: Important — real impact in Prod or serious issue in Test; needs prompt attention but not critical.
- P3: Low — minor, cosmetic, or clearly non-blocking.

Respond with valid JSON only (no other text), with exactly these keys:
- "severity": Exactly one of: {severity_str}. Choose based on impact and urgency.
- "category": Exactly one of these: {choices_str}. Choose the best fit.
- "summary": A professional 2-3 sentence summary for an enterprise triage dashboard.
- "suggested_action": One clear, human-readable suggested next step for the support team.
- "tags": An array of 3-8 short lowercase tags (single words or hyphenated, e.g. ["api-error", "payables", "urgent"]).

Example: {{"severity": "P1", "category": "Integration Failure", "summary": "...", "suggested_action": "...", "tags": ["integration", "api", "sync-failed"]}}"""
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=450,
        )
        content = (response.choices[0].message.content or "").strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        data = json.loads(content)
        severity_raw = (data.get("severity") or "").strip().upper()
        groq_severity = severity_raw if severity_raw in SEVERITY_CHOICES else None
        category_raw = (data.get("category") or "").strip()
        category = category_raw if category_raw in CATEGORY_CHOICES else "Unknown"
        summary = (data.get("summary") or "").strip() or None
        action = (data.get("suggested_action") or "").strip() or None
        raw_tags = data.get("tags")
        tags = [str(t).strip().lower() for t in raw_tags] if isinstance(raw_tags, list) else []
        tags = tags[:20]
        return category, summary, action, tags, groq_severity
    except Exception as e:
        logger.exception("Groq failed: %s", e)
        return None, None, None, None, None


def lambda_handler(event, context):
    """
    Event: { incident_id, title, description, erp_module, environment }
    Returns: { severity, category, auto_summary, suggested_action, tags }
    """
    logger.info("Enrichment Lambda invoked: %s", json.dumps(event))
    body = event if isinstance(event, dict) else json.loads(event) if isinstance(event, str) else {}
    title = body.get("title", "")
    description = body.get("description", "")
    erp_module = body.get("erp_module", "")
    environment = body.get("environment", "Test")

    keyword_severity = compute_severity(environment, title, description)
    api_key = os.environ.get("GROQ_API_KEY", "")
    model = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
    category, auto_summary, suggested_action, tags, groq_severity = groq_enrichment(
        api_key, model, title, description, erp_module, environment
    )
    if not category:
        category = "Unknown"
    severity = merge_severity(keyword_severity, groq_severity)

    result = {
        "severity": severity,
        "category": category,
        "auto_summary": auto_summary,
        "suggested_action": suggested_action,
        "tags": tags or [],
    }
    logger.info("Enrichment result: %s", json.dumps(result))
    return result
