# Gemini - Project Law

## Data Schema (Input/Output shapes)

### Input Payload (from Integrations to System)
```json
{
  "source": "slack|gmail|gcal|outlook|teams|proton|apple",
  "external_id": "string",
  "content": "string",
  "sender": "string",
  "recipient": "string",
  "timestamp": "ISO8601",
  "metadata": {
    "thread_id": "string?",
    "attachments": "array?"
  }
}
```

### Output Payload / Source of Truth (Firebase Document)
```json
{
  "id": "uuid",
  "source": "slack|gmail|gcal|outlook|teams|proton|apple",
  "external_id": "string",
  "content": "string",
  "sender": "string",
  "timestamp": "ISO8601",
  "importance_score": 0.0,
  "ai_draft_response": "string?",
  "status": "unread|read|replied|archived"
}
```

## Behavioral Rules
*(To be defined)*

## Architecture Specs
*(To be defined)*

## Maintenance Log
**[2026-03-16]**: "Summarize Thread" failed with "input.messages array is required" because `processThreadSummary` expected `input.messages[]` but `ai-actions-panel.tsx` enqueues jobs with `{ sender, body }` (single-message fields). → **Action:** When a job processor accepts multi-message input, always implement a single-message fallback: if `messages` is missing, build `[{ from: sender, body }]` so single-email summarization works without changing the UI layer.

**[2026-03-15]**: Calendar token refresh caused an infinite loop: `calendarEmails` in `page.tsx` was not memoized, so it was a new array reference every render, causing `useMeetingPrep`'s `useEffect` to fire on every render → each call hit `getCalendarAccessToken` → expired refresh token returned 400 → no backoff was set → immediate retry on next render. → **Action:** (1) Always `useMemo` any array/object passed as a hook dependency in `page.tsx`. (2) In `getCalendarAccessToken`, always write a localStorage backoff key on 400 so the next call skips the API entirely. (3) Use an in-flight deduplication map to prevent N concurrent refreshes for the same email.

**[2026-03-07]**: The "Reply" button inside the email detail view (`ai-draft-panel.tsx`) had an empty click handler, which made it feel broken. -> **Action:** Whenever adding functional UI buttons like "Reply", ensure they have immediate interactive feedback (e.g., revealing and focusing a textarea) so the feature feels complete and functional.

**[2026-03-07]**: Loading events from all calendars (including hidden ones) in Google Calendar API caused severe performance issues. -> **Action:** When fetching from Google Calendar, always filter by `cal.selected` to only load events from active calendars.

**[2026-03-07]**: Calendar events created through Google Calendar API were not appearing in the UI immediately after creation because Next.js aggressively cached the `fetch` API response. -> **Action:** When making custom fetch requests to external APIs that mutate data (like Google Calendar `GET` after a `POST`), ensure `cache: 'no-store'` is added to the fetch options to bypass the Next.js cache.

**[2026-03-07]**: Google Calendar event creation/editing returned `403 Insufficient Permission` because the OAuth scope only had `calendar.readonly` but not `calendar.events`. -> **Action:** When integrating Google Calendar, always request all three scopes: `calendar.readonly` (list calendars), `calendar.events` (create/edit/delete events), and `userinfo.email` (identify account). After changing scopes, users must disconnect and reconnect the integration to get a fresh token with the updated scopes.

**[2026-03-07]**: Gmail replies were not threading correctly because `In-Reply-To`/`References` headers were set to the Gmail message ID (e.g. `18abc123`) instead of the RFC `Message-ID` header (e.g. `<xxxx@mail.gmail.com>`), and `threadId` was missing from the send request body. -> **Action:** For Gmail replies, always extract the `Message-ID` RFC header from the original email's headers (stored as `rfcMessageId` on the `Message` type) and pass it as `In-Reply-To`/`References`. Always include `threadId` in the Gmail API send request body.

**[2026-03-07]**: Archive and mark-as-read buttons in `message-card.tsx` and `ai-draft-panel.tsx` were wired to `alert()` stubs. -> **Action:** When adding interactive UI buttons for Gmail actions (archive, mark, reply), always wire them to the corresponding `gmail.ts` functions immediately. Use `archiveEmail` (removes `INBOX` label) and `markEmailStatus` (toggles `UNREAD` label). Update the local IndexedDB cache after each API call to keep the UI in sync without a full reload.
