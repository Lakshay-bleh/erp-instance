"""Deterministic severity and category fallback for incident enrichment."""

from typing import Optional

from .models import Severity, Environment

# Display names used by Groq
CATEGORY_FALLBACK_MAP = {
    "Integration Failure": ["api", "integration", "sync", "interface"],
    "Security / Access": ["access", "permission", "role", "login"],
    "Data Issue": ["missing", "incorrect", "duplicate"],
    "Configuration Issue": ["setup", "config", "mapping"],
}


# P1 = most urgent: Prod + any of these in title or description
P1_KEYWORDS = [
    "stuck", "failed", "down", "error", "blocked", "blocking",
    "critical", "outage", "urgent", "immediate", "unavailable",
    "cannot process", "production down", "system down", "data loss",
    "security breach", "failure", "broken",
]

# P2 in Test: serious wording in title/description
P2_KEYWORDS = [
    "blocking", "critical", "failed", "failure", "error", "stuck",
    "urgent", "cannot process", "unavailable",
]


def compute_severity(environment: str, title: str, description: str) -> Severity:
    """
    Apply deterministic severity rules using title + description.
    P1 = most urgent (Prod + P1 keywords). P2 = Prod else or Test + P2 keywords. P3 = least.
    """
    text = f"{title or ''} {description or ''}".lower()
    if environment == Environment.Prod.value:
        if any(kw in text for kw in P1_KEYWORDS):
            return Severity.P1
        return Severity.P2
    # Test environment: P2 if serious keywords, else P3
    if any(kw in text for kw in P2_KEYWORDS):
        return Severity.P2
    return Severity.P3


# Order for "max" merge: P1 > P2 > P3
_SEVERITY_ORDER = {Severity.P1: 3, Severity.P2: 2, Severity.P3: 1}


def merge_severity(keyword_severity: Severity, groq_severity: Optional[str]) -> Severity:
    """
    Take the higher severity: keyword-based vs Groq. P1 wins over P2 over P3.
    If groq_severity is invalid or None, return keyword_severity.
    """
    if not groq_severity or not isinstance(groq_severity, str):
        return keyword_severity
    raw = groq_severity.strip().upper()
    if raw not in ("P1", "P2", "P3"):
        return keyword_severity
    groq_s = Severity(raw)
    return (
        keyword_severity
        if _SEVERITY_ORDER[keyword_severity] >= _SEVERITY_ORDER[groq_s]
        else groq_s
    )


def compute_category_fallback(description: str) -> str:
    """Fallback category from keywords when Groq is unavailable. Returns display name."""
    desc_lower = (description or "").lower()
    for category, keywords in CATEGORY_FALLBACK_MAP.items():
        if any(kw in desc_lower for kw in keywords):
            return category
    return "Unknown"
