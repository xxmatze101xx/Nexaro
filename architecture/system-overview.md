# System Overview

## Architecture: 3-Layer A.N.T.

```
┌──────────────────────────────────────────────────────────┐
│                    LAYER 2: NAVIGATION                   │
│         (Orchestrates data flow between layers)          │
└────────────┬──────────────────────────┬──────────────────┘
             │                          │
     ┌───────▼───────┐         ┌───────▼────────┐
     │ LAYER 1: SOPs │         │ LAYER 3: TOOLS │
     │ (This folder) │         │   (tools/)     │
     └───────────────┘         └────────────────┘
```

## Data Flow

```
Integration APIs (Slack, Gmail, GCal, Outlook, Teams, Proton, Apple)
        │
        ▼
  normalize_payload.py   →  Converts raw API data to Input Payload
        │
        ▼
  score_importance.py    →  Calculates importance_score (0.0–10.0)
        │
        ▼
  write_to_firestore.py  →  Persists as Output Payload in Firestore
        │
        ▼
  Next.js Dashboard      →  Renders unified inbox, sorted by score
        │
        ▼
  AI Draft Response      →  User reviews/edits/sends via integration API
```

## Collections (Firestore)

| Collection | Purpose |
|------------|---------|
| `messages` | All normalized messages (Output Payload from gemini.md) |
| `users` | User profiles, preferences, connected integrations |
| `system_tests` | Connection verification records |

## Key Invariants
1. Every message in `messages` **must** conform to the Output Payload schema in `gemini.md`.
2. All writes go through `write_to_firestore.py` — no direct Firestore writes from the frontend.
3. Importance scores are recalculated when user behavior data changes.
