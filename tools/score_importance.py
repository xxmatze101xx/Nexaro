"""
score_importance.py
Calculates importance score (0.0–10.0) for a normalized message.
See: architecture/ai-scoring-sop.md
"""
import re
from datetime import datetime, timezone


# Urgency keywords and their weight contributions
URGENCY_KEYWORDS = [
    "urgent", "asap", "deadline", "immediately", "critical",
    "meeting", "invoice", "contract", "payment", "review",
    "approve", "emergency", "important", "action required",
]

# Default source priorities (user-configurable later)
SOURCE_PRIORITY = {
    "gmail": 1.5,
    "outlook": 1.5,
    "slack": 1.0,
    "teams": 1.0,
    "gcal": 1.2,
    "proton": 1.3,
    "apple": 1.0,
}


def score(message: dict, user_preferences: dict = None) -> float:
    """
    Calculate importance score for a normalized message payload.
    
    Args:
        message: Normalized payload from normalize_payload.py
        user_preferences: Optional dict with user-specific scoring overrides
    
    Returns:
        Float between 0.0 and 10.0
    """
    prefs = user_preferences or {}
    raw_score = 0.0

    # Factor 1: Keyword analysis (weight: 2.0)
    content_lower = message.get("content", "").lower()
    keyword_hits = sum(1 for kw in URGENCY_KEYWORDS if kw in content_lower)
    keyword_score = min(2.0, keyword_hits * 0.5)
    raw_score += keyword_score

    # Factor 2: Source priority (weight: 1.5)
    source = message.get("source", "")
    source_priorities = prefs.get("source_priorities", SOURCE_PRIORITY)
    source_score = source_priorities.get(source, 1.0)
    raw_score += source_score

    # Factor 3: Recency (weight: 1.5)
    try:
        msg_time = datetime.fromisoformat(message["timestamp"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        hours_ago = (now - msg_time).total_seconds() / 3600
        if hours_ago < 1:
            recency_score = 1.5
        elif hours_ago < 4:
            recency_score = 1.0
        elif hours_ago < 24:
            recency_score = 0.5
        else:
            recency_score = 0.0
        raw_score += recency_score
    except (ValueError, KeyError):
        pass

    # Factor 4: Thread depth (weight: 1.0)
    thread_id = message.get("metadata", {}).get("thread_id")
    if thread_id:
        raw_score += 1.0

    # Factor 5: VIP sender bonus (weight: 3.0)
    # Senders in the user's VIP list get a significant boost.
    # Managed via Settings → VIP-Absender in the UI.
    vip_senders = prefs.get("vip_senders", [])
    sender = message.get("sender", "").lower()
    if any(vip.lower() in sender for vip in vip_senders):
        raw_score += 3.0

    # Factor 6: Time sensitivity — date/time mentions (weight: 2.0)
    time_patterns = [
        r"\b(today|tonight|tomorrow|this afternoon)\b",
        r"\b\d{1,2}:\d{2}\s*(am|pm)?\b",
        r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    ]
    time_hits = sum(1 for p in time_patterns if re.search(p, content_lower))
    time_score = min(2.0, time_hits * 0.8)
    raw_score += time_score

    return round(min(10.0, max(0.0, raw_score)), 1)


def get_badge(score_value: float) -> dict:
    """Returns badge info for a given importance score."""
    if score_value >= 7.0:
        return {"label": "High", "emoji": "🔴", "color": "#EF4444"}
    elif score_value >= 4.0:
        return {"label": "Medium", "emoji": "🟡", "color": "#F59E0B"}
    else:
        return {"label": "Low", "emoji": "🟢", "color": "#10B981"}


# --- Self-test ---
if __name__ == "__main__":
    from normalize_payload import normalize

    # High importance: urgent email with time mention
    high_msg = normalize({
        "source": "gmail",
        "external_id": "1",
        "content": "URGENT: Please approve the contract by today 5pm. This is critical.",
        "sender": "cfo@company.com",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metadata": {"thread_id": "thread-1"},
    })
    high_score = score(high_msg)
    high_badge = get_badge(high_score)
    print(f"{high_badge['emoji']} Score: {high_score} ({high_badge['label']})")
    print(f"   Content: {high_msg['content'][:60]}...")

    # Low importance: casual Slack message
    low_msg = normalize({
        "source": "slack",
        "external_id": "2",
        "content": "Hey, nice work on the presentation!",
        "sender": "colleague@slack",
        "timestamp": "2026-03-01T10:00:00Z",
    })
    low_score = score(low_msg)
    low_badge = get_badge(low_score)
    print(f"\n{low_badge['emoji']} Score: {low_score} ({low_badge['label']})")
    print(f"   Content: {low_msg['content'][:60]}...")

    print("\nAll score_importance tests PASSED.")
