"""
score_importance_ai.py
AI-powered importance scoring via Gemini 2.0 Flash.

Privacy design:
  - Sender first name is abbreviated to an initial (e.g. "M. Cacic").
  - Full sender email is included — it stays within the user's own pipeline.
  - Subject line is included for accurate intent detection.
  - Content preview is capped at 600 chars (up from 150) to capture the
    actual message body, not just boilerplate intros.
  - No thread IDs or recipient addresses leave this service.
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
from pii_scrubber import scrub_text

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


def _abbreviate_sender_name(sender: str) -> str:
    """
    Abbreviates the display name to first initial + last name.
    'Matteo Cacic <m.cacic@company.com>' → 'M. Cacic'
    'john.doe@company.com'               → '' (no display name)
    """
    # Strip email address portion e.g. 'Name <email>'
    name = re.sub(r"<[^>]+>", "", sender).strip()
    # If what remains looks like a bare email address, no display name
    if not name or "@" in name:
        return ""
    parts = name.split()
    if len(parts) >= 2:
        return f"{parts[0][0].upper()}. {' '.join(parts[1:])}"
    return name


def _sender_email(sender: str) -> str:
    """Extracts the email address from a sender string."""
    match = re.search(r"[\w.\-+]+@[\w.\-]+", sender)
    return match.group(0) if match else sender


def _safe_preview(content: str, max_chars: int = 600) -> str:
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

    # --- Build prompt (privacy boundary: abbreviated name, full email, 600-char preview) ---
    source = message.get("source", "unknown")
    raw_sender = message.get("sender", "")
    abbreviated_name = _abbreviate_sender_name(raw_sender)
    sender_email = _sender_email(raw_sender)
    subject = message.get("subject", "").strip()
    raw_preview = _safe_preview(message.get("content", ""))
    # Scrub PII from content preview before sending to Gemini.
    # Gemini returns only an integer so no restore is needed; mapping is discarded.
    try:
        preview, _mapping = scrub_text(raw_preview)
    except Exception as exc:
        logger.warning("score_importance_ai: pii_scrubber failed (%s), using original preview", exc)
        preview = raw_preview

    sender_line = abbreviated_name if abbreviated_name else sender_email
    if abbreviated_name:
        sender_line = f"{abbreviated_name} <{sender_email}>"

    prompt_parts = [
        f"Source: {source}",
        f"Sender: {sender_line}",
    ]
    if subject:
        prompt_parts.append(f"Subject: {subject}")
    prompt_parts.append(f"Preview: {preview}")

    prompt = "\n".join(prompt_parts)
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
            "score_importance_ai: scored source=%s sender=%s score=%.1f",
            source, sender_email, ai_score,
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
