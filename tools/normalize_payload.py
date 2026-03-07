"""
normalize_payload.py
Transforms raw integration data into the standard Nexaro Input Payload.
See: architecture/integration-sop.md and gemini.md
"""
import uuid
from datetime import datetime


VALID_SOURCES = {"slack", "gmail", "gcal", "outlook", "teams", "proton", "apple", "microsoft"}


def normalize(raw: dict) -> dict:
    """
    Converts raw API data from any integration into the standard Input Payload.
    
    Args:
        raw: Raw message dict from an integration adapter.
             Must contain at minimum: source, content, sender, timestamp.
    
    Returns:
        Normalized Input Payload dict conforming to gemini.md schema.
    
    Raises:
        ValueError: If required fields are missing or source is invalid.
    """
    # Validate required fields
    required = ["source", "content", "sender", "timestamp"]
    missing = [f for f in required if f not in raw or not raw[f]]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")

    source = raw["source"].lower().strip()
    if source not in VALID_SOURCES:
        raise ValueError(f"Invalid source '{source}'. Must be one of: {VALID_SOURCES}")

    # Normalize timestamp to ISO8601
    ts = raw["timestamp"]
    if isinstance(ts, datetime):
        ts = ts.isoformat()

    return {
        "id": str(uuid.uuid4()),
        "source": source,
        "external_id": raw.get("external_id", ""),
        "content": str(raw["content"]).strip(),
        "sender": str(raw["sender"]).strip(),
        "recipient": str(raw.get("recipient", "")).strip(),
        "timestamp": ts,
        "metadata": {
            "thread_id": raw.get("metadata", {}).get("thread_id"),
            "attachments": raw.get("metadata", {}).get("attachments", []),
        },
    }


# --- Self-test ---
if __name__ == "__main__":
    sample_raw = {
        "source": "gmail",
        "external_id": "msg-abc-123",
        "content": "Hey, can we reschedule the meeting to 3pm?",
        "sender": "john@example.com",
        "recipient": "ceo@nexaro.com",
        "timestamp": "2026-03-03T14:30:00Z",
        "metadata": {
            "thread_id": "thread-xyz",
            "attachments": [],
        },
    }

    result = normalize(sample_raw)
    print("✅ Normalized payload:")
    for k, v in result.items():
        print(f"   {k}: {v}")

    # Test validation
    try:
        normalize({"source": "invalid"})
    except ValueError as e:
        print(f"\n✅ Validation caught: {e}")

    print("\nAll normalize_payload tests PASSED.")
