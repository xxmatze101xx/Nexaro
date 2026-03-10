# Nexaro — Integration Expansion Roadmap

> Canonical reference for adding new communication channels to Nexaro.
> Every integration follows the same architecture pattern — read this before starting any new one.

---

## Priority Order

| Priority | Service | Status | Reason |
|----------|---------|--------|--------|
| 1 | **Slack** | ✅ Code done — needs credentials + SLACK-B1 fix | Already coded |
| 2 | **Microsoft Outlook + Teams** | ✅ Code done — needs credentials | Already coded |
| 3 | **WhatsApp Business** | 🔲 Not started | Most-used messaging globally; critical for exec comms |
| 4 | **Linear / Jira** | 🔲 Not started | Execs track engineering progress here; high-signal |
| 5 | **LinkedIn Messages** | 🔲 Not started | B2B executives receive key outreach and DMs here |
| 6 | **Notion** | 🔲 Not started | Many CEOs use it as a second brain; surface @mentions |
| 7 | **Telegram** | 🔲 Not started | Preferred by European/Asian exec communities |
| 8 | **Twitter/X DMs** | 🔲 Not started | Investor, partner, and press DMs happen here |
| 9 | **Discord** | 🔲 Not started | Web3, gaming, and tech communities |
| 10 | **Zoom / Google Meet** | 🔲 Not started | Surface upcoming meetings and post-call summaries |

---

## Standard Implementation Checklist (Pull-based integrations)

Every pull-based integration (Gmail-style, fetched on demand) must complete all of these:

- [ ] **Python adapter** — `tools/adapters/{service}_adapter.py`
  - Fetches messages from the service API
  - Passes every message through `normalize_payload.py`
  - Writes normalized payload to Firestore via `write_to_firestore.py`
  - Handles pagination and rate limits

- [ ] **OAuth connect route** — `src/app/api/{service}/connect/route.ts`
  - Redirects user to the service's OAuth consent screen
  - Passes `state={uid}` for user identification after redirect

- [ ] **OAuth callback route** — `src/app/api/{service}/callback/route.ts`
  - Exchanges `code` for access + refresh tokens
  - Writes tokens to Firestore: `users/{uid}/tokens/{service}`
  - **Always include `?key=${NEXT_PUBLIC_FIREBASE_API_KEY}` in the Firestore REST URL** — required for unauthenticated server-side writes
  - Redirects to `/settings?{service}_connected=true`

- [ ] **Token stored in Firestore** — `users/{uid}/tokens/{service}`
  - Fields: `access_token`, `refresh_token`, `user_id`, `email`, `connected_at`

- [ ] **Sidebar entry** — appears in `ACCOUNTS` computed array in `src/app/page.tsx`
  - Same pattern as `slackConnected` check
  - Shows service logo + account name when connected

- [ ] **Settings "Connect" button** — `src/app/settings/page.tsx`
  - Integrations tab
  - Shows connection status, connect/disconnect button

- [ ] **Source filter** — `src/components/source-filter.tsx`
  - Add new source key and display label

- [ ] **Dashboard refresh after OAuth** — `src/app/page.tsx`
  - Add `{service}_connected` param check in the post-OAuth `useEffect`

---

## WhatsApp Business — Special Notes (Push-based)

WhatsApp is push-based (Meta sends webhooks), not pull-based. Implementation differs:

- Requires a verified Meta Business account and a WhatsApp Business API app
- **No Python adapter needed** — messages arrive via webhook, not polling
- Routes needed:
  - `src/app/api/whatsapp/webhook/route.ts` — verifies Meta's webhook challenge, receives message events
  - `src/app/api/whatsapp/connect/route.ts` — stores the phone number ID and API token
- Token storage: `users/{uid}/tokens/whatsapp` — fields: `phone_number_id`, `api_token`, `connected_at`
- Normalize incoming webhook payload using `normalize_payload.py` before writing to Firestore
- Meta requires HTTPS and a publicly accessible webhook URL (use Vercel deployment URL)

---

## Linear / Jira — Special Notes

- Use webhook subscription for real-time issue assignments and @mentions
- Only surface: assigned issues, @mentions, and status changes (not all activity)
- Normalize to message schema: `source: "linear"` or `source: "jira"`, `subject` = issue title, `body` = description/comment

---

## LinkedIn — Special Notes

- LinkedIn's API has strict restrictions — messaging API only available to approved partners
- Alternative: use LinkedIn's real-time notifications via their partner API
- Start with basic profile + connection data, escalate to messaging if approved

---

## Architecture Invariants (apply to all integrations)

1. Every message must pass through `normalize_payload.py` before hitting Firestore
2. Tokens always stored at `users/{uid}/tokens/{service}` — never elsewhere
3. Server-side Firestore REST writes always include `?key=${NEXT_PUBLIC_FIREBASE_API_KEY}`
4. OAuth state parameter always carries the Firebase `uid` for post-redirect identification
5. After OAuth callback, redirect to `/settings?{service}_connected=true`
6. Dashboard detects `{service}_connected` param and re-fetches connection state without full reload

---

*Last updated: March 2026*
