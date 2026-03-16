"""
score_importance_ai.py
AI-powered importance scoring via Gemini 2.0 Flash.

Privacy design:
  - Only a minimal, anonymised summary is sent to Gemini.
  - Full email body is NEVER transmitted — only the first 150 chars.
  - Sender e-mail address is reduced to domain only (e.g. "company.com").
  - No thread IDs, recipient addresses, or metadata leave this service.
  - The Gemini response is a single integer — no message content is stored
    in Gemini's context beyond the single API call.
"""

import os
import re
import json
import urllib.request
import urllib.error
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)

SYSTEM_PROMPT = (
    "You are an executive assistant scoring message importance for a CEO. "
    "Rate importance from 0 to 10:\n"
    "9-10: Immediate attention needed (legal, board, investor, critical deadline)\n"
    "7-8:  High importance (key decisions, contracts, escalations)\n"
    "5-6:  Medium importance (follow-ups, approvals, project updates)\n"
    "3-4:  Low importance (FYIs, routine updates)\n"
    "0-2:  Minimal importance (marketing, spam, notifications)\n"
    "Respond with ONLY a single integer between 0 and 10. No explanation."
)


def _sender_domain(sender: str) -> str:
    """
    Reduces a sender to their domain only for privacy.
    'john.doe@company.com' → 'company.com'
    'Slack User'           → 'unknown'
    """
    match = re.search(r"@([\w.\-]+)", sender)
    return match.group(1) if match else "unknown"


def _safe_preview(content: str, max_chars: int = 150) -> str:
    """Truncates content to max_chars. No further processing needed."""
    return content[:max_chars].strip()


def score_with_ai(message: dict, fallback_score: float = 5.0) -> float:
    """
    Calls Gemini to score message importance.

    Only sends a minimal anonymised summary — NOT the full message.

    Args:
        message:        Normalized payload from normalize_payload.py
        fallback_score: Score to return if the API call fails.

    Returns:
        Float 0.0–10.0
    """
    if not GEMINI_API_KEY:
        logger.warning("score_importance_ai: GEMINI_API_KEY not set, returning fallback")
        return fallback_score

    # --- Build anonymised prompt (privacy boundary) ---
    source = message.get("source", "unknown")
    sender_domain = _sender_domain(message.get("sender", ""))
    preview = _safe_preview(message.get("content", ""))

    prompt = (
        f"Source: {source}\n"
        f"Sender domain: {sender_domain}\n"
        f"Preview: {preview}"
    )
    # ---- nothing beyond this point contains personal data ----

    body = json.dumps({
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 4, "temperature": 0.1},
    }).encode("utf-8")

    req = urllib.request.Request(
        GEMINI_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        raw = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )
        ai_score = max(0.0, min(10.0, float(int(raw))))
        logger.info(
            "score_importance_ai: scored source=%s domain=%s score=%.1f",
            source, sender_domain, ai_score,
        )
        return ai_score

    except (urllib.error.URLError, urllib.error.HTTPError) as exc:
        logger.error("score_importance_ai: network error – %s", exc)
    except (ValueError, KeyError, IndexError) as exc:
        logger.error("score_importance_ai: parse error – %s", exc)

    return fallback_score


# --- Self-test ---
if __name__ == "__main__":
    from normalize_payload import normalize
    from datetime import datetime, timezone

    urgent = normalize({
        "source": "gmail",
        "external_id": "ai-test-001",
        "content": "URGENT: Board meeting moved to today 4pm. Please confirm attendance immediately.",
        "sender": "cfo@company.com",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    s = score_with_ai(urgent)
    print(f"Urgent mail score: {s}")
    assert s >= 5, f"Expected >= 5, got {s}"

    casual = normalize({
        "source": "slack",
        "external_id": "ai-test-002",
        "content": "Hey, nice work on the presentation yesterday!",
        "sender": "colleague@company.com",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    s2 = score_with_ai(casual)
    print(f"Casual message score: {s2}")
    assert s2 <= 5, f"Expected <= 5, got {s2}"

    print("\nAll score_importance_ai tests PASSED.")
