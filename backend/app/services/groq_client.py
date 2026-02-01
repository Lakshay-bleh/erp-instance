"""Groq API client: category, auto-summary, suggested action, and auto-generated tags."""

import json
import logging
from typing import Tuple, Optional, List

from groq import Groq

logger = logging.getLogger(__name__)

CATEGORY_CHOICES = [
    "Configuration Issue",
    "Data Issue",
    "Integration Failure",
    "Security / Access",
    "Unknown",
]


SEVERITY_CHOICES = ("P1", "P2", "P3")


def get_groq_enrichment(
    groq_api_key: str,
    groq_model: str,
    title: str,
    description: str,
    erp_module: str,
    environment: str,
) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[List[str]], Optional[str]]:
    """
    Call Groq API to get:
    1. category: one of Configuration Issue, Data Issue, Integration Failure, Security / Access, Unknown
    2. summary: auto-generated short professional summary (2-3 lines)
    3. suggested_action: suggested next step/action
    4. tags: list of short tags (e.g. ["api-error", "payables", "urgent"])
    5. severity: P1 (most urgent), P2, or P3 (least urgent)
    Returns (category, summary, suggested_action, tags, groq_severity). Any can be None on error.
    """
    if not groq_api_key or not groq_api_key.strip():
        logger.warning("Groq API key not set; skipping AI enrichment")
        return None, None, None, None, None

    choices_str = ", ".join(f'"{c}"' for c in CATEGORY_CHOICES)
    severity_str = ", ".join(SEVERITY_CHOICES)
    try:
        client = Groq(api_key=groq_api_key.strip())
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
- "tags": An array of 3-8 short lowercase tags (single words or hyphenated, e.g. ["api-error", "payables", "urgent"]). No quotes inside tags.

Example: {{"severity": "P1", "category": "Integration Failure", "summary": "...", "suggested_action": "...", "tags": ["integration", "api", "sync-failed"]}}"""

        response = client.chat.completions.create(
            model=groq_model,
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
        if isinstance(raw_tags, list):
            tags = [str(t).strip().lower() for t in raw_tags if t][:20]
        else:
            tags = []
        return category, summary, action, tags if tags else None, groq_severity
    except Exception as e:
        logger.exception("Groq API call failed: %s", e)
        return None, None, None, None, None


# Backward compatibility: return (summary, action) only
def get_groq_summary_and_action(
    groq_api_key: str,
    groq_model: str,
    title: str,
    description: str,
    erp_module: str,
    environment: str,
) -> Tuple[Optional[str], Optional[str]]:
    category, summary, action, _, _ = get_groq_enrichment(
        groq_api_key, groq_model, title, description, erp_module, environment
    )
    return summary, action
