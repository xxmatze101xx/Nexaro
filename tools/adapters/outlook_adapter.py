"""
outlook_adapter.py
Fetches Outlook emails via Microsoft Graph API.
Requires: MICROSOFT_ACCESS_TOKEN (or refresh via MICROSOFT_REFRESH_TOKEN + credentials) in environment.
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


def _get_valid_token(credentials: dict) -> str | None:
    """Returns a valid Microsoft access token, refreshing if necessary."""
    access_token = credentials.get("access_token", "")
    token_acquired_at = credentials.get("token_acquired_at", 0)
    expires_in = credentials.get("expires_in", 3600)

    # Refresh if token is within 5 minutes of expiry
    if access_token and time.time() < token_acquired_at / 1000 + expires_in - 300:
        return access_token

    refresh_token = credentials.get("refresh_token", "")
    if not refresh_token:
        logger.error("No valid Microsoft token and no refresh_token available")
        return None

    client_id = os.getenv("MICROSOFT_CLIENT_ID", "")
    client_secret = os.getenv("MICROSOFT_CLIENT_SECRET", "")
    redirect_uri = os.getenv("MICROSOFT_REDIRECT_URI", "")

    if not all([client_id, client_secret, redirect_uri]):
        logger.error("Missing MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET / MICROSOFT_REDIRECT_URI")
        return None

    try:
        data = urllib.parse.urlencode({
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "redirect_uri": redirect_uri,
            "grant_type": "refresh_token",
            "scope": "offline_access User.Read Mail.Read Mail.Send Calendars.Read",
        }).encode()
        req = urllib.request.Request(
            "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            data=data,
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            token_data = json.loads(resp.read().decode())
        return token_data.get("access_token")
    except Exception as exc:
        logger.error(f"Failed to refresh Microsoft token: {exc}")
        return None


def _graph_get(token: str, path: str, params: dict | None = None) -> dict:
    """Makes a GET request to the Microsoft Graph API."""
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
                logger.warning(f"Rate-limited by Graph API, backing off {delay}s")
                time.sleep(min(delay, 60))
                delay *= 2
                continue
            logger.error(f"Graph API error {e.code}: {path}")
            return {}
        except Exception as exc:
            logger.error(f"Graph request failed: {exc}")
            return {}
    return {}


def fetch_messages(credentials: dict, since: str) -> list[dict]:
    """
    Fetches Outlook inbox messages newer than `since`.

    Args:
        credentials: dict with access_token (and optionally refresh_token, expires_in, token_acquired_at)
        since: ISO8601 timestamp string

    Returns:
        List of normalized raw payloads.
    """
    token = _get_valid_token(credentials)
    if not token:
        logger.error("Could not obtain a valid Microsoft access token")
        return []

    # Microsoft Graph OData filter for messages after `since`
    filter_str = f"receivedDateTime ge {since.rstrip('Z') + 'Z'}"
    data = _graph_get(token, "/me/mailFolders/inbox/messages", {
        "$filter": filter_str,
        "$top": "50",
        "$select": "id,subject,from,receivedDateTime,bodyPreview,conversationId,isRead",
        "$orderby": "receivedDateTime desc",
    })

    messages: list[dict] = []
    for msg in data.get("value", []):
        from_name = msg.get("from", {}).get("emailAddress", {}).get("name", "Unknown")
        from_email = msg.get("from", {}).get("emailAddress", {}).get("address", "")
        sender = f"{from_name} <{from_email}>".strip() if from_email else from_name
        body = msg.get("bodyPreview", "").strip()
        if not body:
            continue

        try:
            recv_dt = datetime.fromisoformat(
                msg.get("receivedDateTime", "").replace("Z", "+00:00")
            ).isoformat()
        except ValueError:
            recv_dt = datetime.now(timezone.utc).isoformat()

        messages.append({
            "source": "outlook",
            "external_id": f"outlook_{msg.get('id', '')}",
            "content": body,
            "sender": sender,
            "recipient": "",
            "timestamp": recv_dt,
            "metadata": {
                "thread_id": msg.get("conversationId", ""),
                "message_id": msg.get("id", ""),
                "is_read": msg.get("isRead", False),
                "subject": msg.get("subject", ""),
                "attachments": [],
            },
        })

    logger.info(f"Fetched {len(messages)} Outlook messages newer than {since}")
    return messages


def main() -> None:
    """Standalone run: fetch and push latest Outlook messages to Firestore."""
    from dotenv import load_dotenv
    load_dotenv()

    access_token = os.getenv("MICROSOFT_ACCESS_TOKEN", "")
    refresh_token = os.getenv("MICROSOFT_REFRESH_TOKEN", "")

    if not access_token and not refresh_token:
        logger.error("Set MICROSOFT_ACCESS_TOKEN or MICROSOFT_REFRESH_TOKEN in .env")
        sys.exit(1)

    credentials = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": 3600,
        "token_acquired_at": 0,  # Force refresh if only refresh_token is set
    }

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
                logger.info(f"Wrote Outlook message from '{normalized['sender']}' (score={importance:.1f})")
            else:
                logger.error(f"Failed to write message from '{raw.get('sender')}'")
        except Exception as exc:
            logger.warning(f"Skipped malformed message: {exc}")
            skipped += 1

    logger.info(f"Done. {len(raw_messages) - skipped} written, {skipped} skipped.")


if __name__ == "__main__":
    main()
