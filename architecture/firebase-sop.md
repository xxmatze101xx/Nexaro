# Firebase SOP

## Project
- **Project ID:** `nexaro-app-2026`
- **Database:** Firestore Native, region `nam5`
- **Auth:** Firebase Authentication (Email/Password + Google Sign-In)

## Collections

### `messages`
Each document represents one normalized message from any integration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | ✅ | Unique Nexaro message ID |
| `source` | string | ✅ | One of: `slack`, `gmail`, `gcal`, `outlook`, `teams`, `proton`, `apple` |
| `external_id` | string | ✅ | Original ID from the source system |
| `content` | string | ✅ | Message body (plain text) |
| `sender` | string | ✅ | Sender name or email |
| `timestamp` | timestamp | ✅ | Original send time (ISO8601) |
| `importance_score` | number | ✅ | 0.0–10.0, calculated by `score_importance.py` |
| `ai_draft_response` | string | ❌ | AI-generated draft reply (null if not generated) |
| `status` | string | ✅ | One of: `unread`, `read`, `replied`, `archived` |
| `user_id` | string | ✅ | Owner of this message (Firebase Auth UID) |

### `users`
| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Firebase Auth UID |
| `email` | string | User email |
| `display_name` | string | User display name |
| `connected_integrations` | array | List of connected source strings |
| `preferences` | map | AI tone, auto-draft settings |

## Security Rules
- Users can only read/write their own documents (`user_id == request.auth.uid`).
- `system_tests` collection is admin-only.

## Indexing
- Composite index on `messages`: `user_id` ASC + `importance_score` DESC + `timestamp` DESC.
