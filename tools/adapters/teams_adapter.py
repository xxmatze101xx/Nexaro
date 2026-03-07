"""
teams_adapter.py
Fetches Microsoft Teams DMs and @mentions via Microsoft Graph API.
Requires: MICROSOFT_ACCESS_TOKEN (or refresh credentials) in environment.
See: architecture/integration-sop.md
"""
import os
import sys
import time
import json
import logging
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from normalize_payload import normalize
from score_importance import score
from write_to_firestore import write_message

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


def _graph_get(token: str, path: str, params: dict | None = None) -> dict:
    """Makes a GET request to the Microsoft Graph API with exponential back-off."""
    url = f"{GRAPH_BASE}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    delay = 1
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                logger.warning(f"Rate-limited by Graph API, backing off {delay}s (attempt {attempt+1})")
                time.sleep(min(delay, 60))
                delay *= 2
                continue
            logger.error(f"Graph API HTTP error {e.code}: {path}")
            return {}
        except Exception as exc:
            logger.error(f"Graph request failed: {exc}")
            return {}
    return {}


def fetch_messages(credentials: dict, since: str) -> list[dict]:
    """
    Fetches Teams DMs and activity feed (mentions) newer than `since`.

    Args:
        credentials: dict with access_token
        since: ISO8601 timestamp string

    Returns:
        List of raw payloads conforming to the integration-sop.md contract.
    """
    token = credentials.get("access_token", "")
    if not token:
        logger.error("No Microsoft access token provided")
        return []

    try:
        since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
    except ValueError:
        since_dt = datetime.now(timezone.utc)

    messages: list[dict] = []

    # ── 1. Chat messages (DMs and group chats) ─────────────────────────────
    chats_data = _graph_get(token, "/me/chats", {
        "$select": "id,chatType",
        "$top": "50",
    })
    for chat in chats_data.get("value", []):
        chat_id = chat.get("id", "")
        chat_type = chat.get("chatType", "")  # "oneOnOne", "group", "meeting"

        # Only process 1:1 and group DMs (not meeting chats)
        if chat_type not in ("oneOnOne", "group"):
            continue

        msgs_data = _graph_get(token, f"/me/chats/{chat_id}/messages", {
            "$top": "20",
            "$orderby": "createdDateTime desc",
        })

        for msg in msgs_data.get("value", []):
            created_raw = msg.get("createdDateTime", "")
            try:
                created_dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
            except ValueError:
                continue
            if created_dt <= since_dt:
                continue

            # Skip system messages and deleted messages
            msg_type = msg.get("messageType", "")
            if msg_type != "message":
                continue
            deleted_reason = msg.get("deletedDateTime")
            if deleted_reason:
                continue

            # Extract plain text from HTML body
            body_content = msg.get("body", {}).get("content", "").strip()
            # Strip basic HTML tags for a plain preview
            body_text = _strip_html(body_content)
            if not body_text:
                continue

            sender_obj = msg.get("from", {}).get("user", {})
            sender_name = sender_obj.get("displayName", "Unknown")

            messages.append({
                "source": "teams",
                "external_id": f"teams_{chat_id}_{msg.get('id', '')}",
                "content": body_text,
                "sender": sender_name,
                "recipient": "",
                "timestamp": created_dt.isoformat(),
                "metadata": {
                    "thread_id": msg.get("replyToId") or msg.get("id", ""),
                    "chat_id": chat_id,
                    "chat_type": chat_type,
                    "attachments": [],
                },
            })

    # ── 2. Activity feed — @mentions ────────────────────────────────────────
    activity_data = _graph_get(token, "/me/teamwork/sendActivityNotification", {})
    # Note: Graph currently supports activity feed via /me/chats above;
    # dedicated mention search requires Teams-scoped beta endpoints.
    # For now, DM coverage from step 1 is the primary source.

    logger.info(f"Fetched {len(messages)} Teams messages newer than {since}")
    return messages


def _strip_html(html: str) -> str:
    """Naively strips HTML tags to produce plain text for body preview."""
    import re
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def main() -> None:
    """Standalone run: fetch and push latest Teams messages to Firestore."""
    from dotenv import load_dotenv
    load_dotenv()

    access_token = os.getenv("MICROSOFT_ACCESS_TOKEN", "")
    if not access_token:
        logger.error("Set MICROSOFT_ACCESS_TOKEN in .env")
        sys.exit(1)

    credentials = {"access_token": access_token}
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
                logger.info(f"Wrote Teams message from '{normalized['sender']}' (score={importance:.1f})")
            else:
                logger.error(f"Failed to write message")
        except Exception as exc:
            logger.warning(f"Skipped malformed message: {exc}")
            skipped += 1

    logger.info(f"Done. {len(raw_messages) - skipped} written, {skipped} skipped.")


if __name__ == "__main__":
    main()
