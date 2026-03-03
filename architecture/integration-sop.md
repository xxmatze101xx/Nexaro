# Integration Adapter SOP

## Contract
Every integration adapter **must** implement the following interface:

```python
def fetch_messages(credentials: dict, since: str) -> list[dict]:
    """
    Fetches new messages from the external service.
    
    Args:
        credentials: Service-specific auth tokens from .env
        since: ISO8601 timestamp — only fetch messages newer than this
    
    Returns:
        List of raw messages in the Input Payload format (gemini.md):
        {
            "source": "<service_name>",
            "external_id": "<original_id>",
            "content": "<message_body>",
            "sender": "<sender_name_or_email>",
            "recipient": "<recipient_name_or_email>",
            "timestamp": "<ISO8601>",
            "metadata": {
                "thread_id": "<optional>",
                "attachments": []
            }
        }
    """
```

## Error Handling
1. **Rate Limits:** Back off exponentially (1s, 2s, 4s, max 60s). Log to `.tmp/rate_limit.log`.
2. **Auth Failures:** Return empty list + log error. Do NOT crash the pipeline.
3. **Malformed Data:** Skip individual messages that fail validation. Log skipped count.

## Adapter Registry

| Source | Adapter File | API | Auth Method |
|--------|-------------|-----|-------------|
| `slack` | `tools/adapters/slack_adapter.py` | Slack Web API | Bot Token |
| `gmail` | `tools/adapters/gmail_adapter.py` | Gmail API v1 | OAuth2 |
| `gcal` | `tools/adapters/gcal_adapter.py` | Google Calendar API v3 | OAuth2 |
| `outlook` | `tools/adapters/outlook_adapter.py` | Microsoft Graph API | OAuth2 |
| `teams` | `tools/adapters/teams_adapter.py` | Microsoft Graph API | OAuth2 |
| `proton` | `tools/adapters/proton_adapter.py` | ProtonMail Bridge (IMAP) | IMAP credentials |
| `apple` | `tools/adapters/apple_adapter.py` | Apple Calendar (CalDAV) | App-specific password |

## Adding a New Integration
1. Create `tools/adapters/<name>_adapter.py` implementing the contract above.
2. Add credentials to `.env` and `.env.example`.
3. Register the adapter in the Adapter Registry table above.
4. Test with `python tools/adapters/<name>_adapter.py` standalone.
