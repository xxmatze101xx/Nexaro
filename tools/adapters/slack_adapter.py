"""
slack_adapter.py
Fetches Slack DMs and @mentions for the authenticated user.
Requires: SLACK_BOT_TOKEN in environment.
See: architecture/integration-sop.md
"""
import os
import sys
import time
import logging
from datetime import datetime, timezone

# Allow importing from parent tools/ directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from normalize_payload import normalize
from score_importance import score
from write_to_firestore import write_message

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

SLACK_API_BASE = "https://slack.com/api"


def _slack_get(token: str, method: str, params: dict | None = None) -> dict:
    """Makes a GET request to the Slack Web API with exponential back-off on rate limits."""
    import urllib.request
    import urllib.parse
    import json

    if params is None:
        params = {}
    url = f"{SLACK_API_BASE}/{method}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

    delay = 1
    for attempt in range(5):
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())

        if data.get("ok"):
            return data

        error = data.get("error", "unknown")
        if error == "ratelimited":
            logger.warning(f"Rate-limited by Slack, backing off {delay}s (attempt {attempt+1})")
            time.sleep(min(delay, 60))
            delay *= 2
            continue

        logger.error(f"Slack API error ({method}): {error}")
        return {}

    return {}


def _resolve_user_name(token: str, user_id: str, _cache: dict = {}) -> str:
    """Resolves a Slack user ID to a display name. Results are cached in-process."""
    if user_id in _cache:
        return _cache[user_id]
    data = _slack_get(token, "users.info", {"user": user_id})
    profile = data.get("user", {}).get("profile", {})
    name = profile.get("real_name") or profile.get("display_name") or user_id
    _cache[user_id] = name
    return name


def fetch_messages(credentials: dict, since: str) -> list[dict]:
    """
    Fetches Slack DMs and @mentions newer than `since`.

    Args:
        credentials: {"bot_token": "<xoxb-...>"}
        since: ISO8601 timestamp string

    Returns:
        List of raw payloads conforming to the integration-sop.md contract.
    """
    token = credentials.get("bot_token", "")
    if not token:
        logger.error("No Slack bot_token provided — skipping fetch")
        return []

    # Convert `since` ISO8601 → Slack's oldest parameter (Unix timestamp string)
    try:
        since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
    except ValueError:
        since_dt = datetime.now(timezone.utc)
    oldest = str(since_dt.timestamp())

    # Fetch the authed user's ID
    auth_data = _slack_get(token, "auth.test")
    bot_user_id = auth_data.get("user_id", "")

    messages: list[dict] = []

    # ── 1. Direct Messages (IM channels) ──────────────────────────────────
    convs = _slack_get(token, "conversations.list", {
        "types": "im",
        "limit": 200,
        "exclude_archived": "true",
    })
    for channel in convs.get("channels", []):
        channel_id = channel.get("id", "")
        peer_user_id = channel.get("user", "")
        peer_name = _resolve_user_name(token, peer_user_id) if peer_user_id else "Unknown"

        history = _slack_get(token, "conversations.history", {
            "channel": channel_id,
            "oldest": oldest,
            "limit": 50,
        })
        for msg in history.get("messages", []):
            # Skip bot messages and messages from self
            if msg.get("subtype") or msg.get("user") == bot_user_id:
                continue
            text = msg.get("text", "").strip()
            if not text:
                continue

            ts = msg.get("ts", "")
            thread_ts = msg.get("thread_ts", ts)

            try:
                msg_dt = datetime.fromtimestamp(float(ts), tz=timezone.utc).isoformat()
            except (ValueError, TypeError):
                msg_dt = datetime.now(timezone.utc).isoformat()

            messages.append({
                "source": "slack",
                "external_id": f"slack_{channel_id}_{ts}",
                "content": text,
                "sender": peer_name,
                "recipient": "",
                "timestamp": msg_dt,
                "metadata": {
                    "thread_id": thread_ts,
                    "channel_id": channel_id,
                    "channel_name": "DM",
                    "attachments": [],
                },
            })

    # Note: search:read (paid scope) was removed. @mentions arriving as DMs
    # are already captured above via conversations.history.

    logger.info(f"Fetched {len(messages)} Slack messages newer than {since}")
    return messages


def main() -> None:
    """Standalone run: fetch and push latest Slack messages to Firestore."""
    from dotenv import load_dotenv
    load_dotenv()

    bot_token = os.getenv("SLACK_BOT_TOKEN", "")
    if not bot_token:
        logger.error("SLACK_BOT_TOKEN is not set — add it to .env")
        sys.exit(1)

    credentials = {"bot_token": bot_token}
    # Fetch messages from the last 24 hours
    from datetime import timedelta
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    raw_messages = fetch_messages(credentials, since)
    logger.info(f"Processing {len(raw_messages)} messages...")

    skipped = 0
    for raw in raw_messages:
        try:
            normalized = normalize(raw)
            importance = score(normalized)
            doc_id = write_message(normalized, importance)
            if doc_id:
                logger.info(f"Wrote Slack message from '{normalized['sender']}' (score={importance:.1f})")
            else:
                logger.error(f"Failed to write message from '{raw.get('sender')}'")
        except Exception as exc:
            logger.warning(f"Skipped malformed message: {exc}")
            skipped += 1

    logger.info(f"Done. {len(raw_messages) - skipped} written, {skipped} skipped.")


if __name__ == "__main__":
    main()
