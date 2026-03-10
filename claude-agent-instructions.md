# Claude Code Agent Brief — Nexaro
> You are the Lead Engineer of Nexaro. Work autonomously, top to bottom.
> Do not wait for instructions. Do not ask what to do next — the answer is always in this file.
> Start with Phase 1 and work through every task. After finishing each task, pick the next one immediately.

---

## 🧠 What is Nexaro?

Nexaro aggregates communication (Gmail, Slack, MS Teams, Outlook, Calendar) on a single
AI-prioritized surface for Executives. One inbox for everything — AI decides what comes first.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), TypeScript strict, Tailwind CSS |
| Backend/DB | Firebase (Firestore, Auth, Storage) — client SDK only, no firebase-admin |
| AI Pipeline | Python (`tools/`), score_importance.py |
| Integrations | Gmail API, Google Calendar API, Slack API, Microsoft Graph |
| Auth | Firebase Auth via `src/contexts/AuthContext.tsx` + `src/components/AuthGuard.tsx` |

**Project root:** `C:\Users\matte\Desktop\Nexaro`
**Build from:** `C:\Users\matte\Desktop\Nexaro\src` — run `npm run build` here.

---

## ⚠️ Invariants — Never Break These

1. **No adapter without normalization** — every integration must pass through `normalize_payload.py`.
2. **Never change the Firestore schema unilaterally** — document schema changes in `gemini.md`.
3. **TypeScript strict** — no `any`, no suppressed TS errors. Always `catch (e: unknown)` + `e instanceof Error ? e.message : String(e)`.
4. **Interactive feedback** — every button must give immediate visual feedback (loading states, optimistic updates).
5. **After every task:** update `taskstodo.md` and `progress.md`.
6. **After every code change:** invoke your `/simplify` skill to review for reuse, quality, and efficiency — fix any issues found. Do not skip this step.

---

## 🔴 PHASE 1 — UI Bugs & Broken Features

Work this list top to bottom without stopping.

---

### UI-P1: Sidebar Account Name Overflow

- **Problem:** Long email addresses connected to the sidebar are cut off and require horizontal
  scrolling to read. This is caused by the inner flex container on the account row button
  (`src/app/page.tsx` ~line 661) missing `min-w-0`, which prevents `truncate` from working.
- **Task:**
  1. In `src/app/page.tsx`, find the account row button (inside `ACCOUNTS.map`).
  2. Add `min-w-0 overflow-hidden` to the inner `<div className="flex items-center gap-2">`.
  3. The `<span>` already has `truncate` — this change makes it actually work.
  4. The `title={account.name}` tooltip is already there, so full name is readable on hover.
- **Done when:** Long email addresses (e.g., `verylongemailaddress@company.com`) truncate
  cleanly in the sidebar with an ellipsis, and hovering shows the full address in a tooltip.
  No horizontal scroll needed.

---

### UI-P2: Hover Action Icons Overflow Into Adjacent Email Cards

- **Problem:** When hovering over an email preview in the message list, the 4 action icons
  (Star, Archive, Read, Delete) are stacked vertically (`flex-col`) in an `absolute` container.
  Their total height (~130px) overflows into the space of the email card below.
- **Task:**
  1. In `src/components/message-card.tsx`, find the hover action container (~line 134):
     `<div className="absolute right-2 top-2.5 flex flex-col gap-1 ...">`.
  2. Change `flex-col` to `flex-row` so the icons sit horizontally.
  3. Adjust positioning: move from `top-2.5` to vertical center — use
     `top-1/2 -translate-y-1/2` or `top-2`.
  4. Remove the **Eye/EyeOff (read/unread) icon** from the hover actions entirely — it
     clutters the row and the read state is already visible via the blue dot indicator.
     Keep: Star, Archive, Delete.
  5. Ensure the 3 remaining icons still fit within the card's height without overlapping
     adjacent cards.
- **Done when:** Hovering an email shows 3 icons (Star, Archive, Trash) laid out horizontally,
  fully within the bounds of that card, not overlapping the card below.

---

### GMAIL-B1: Delete Button Not Working

- **Problem:** Although the Trash button exists in `message-card.tsx` and `handleDelete` is
  wired in `page.tsx` (~line 419), the message does not disappear from the list after deletion.
  Root cause: `handleDelete` calls `trashEmail` but likely does not remove the message from
  local state on success.
- **Task:**
  1. In `src/app/page.tsx`, find `handleDelete` (~line 419).
  2. After the successful `trashEmail` API call, remove the message from `gmailMessages`
     (and `folderMessages` if applicable) state — same pattern as `handleArchive`.
  3. If `selectedMessage` is the deleted message, clear it: `setSelectedMessage(null)`.
  4. Add optimistic removal: remove from state immediately before the API call, restore on error.
  5. Check `src/lib/gmail.ts` — ensure `trashEmail` makes the correct Gmail API call
     (`POST .../messages/{id}/trash`) and does not silently swallow errors.
- **Done when:** Clicking the delete icon moves the email to Trash immediately (disappears
  from current view), and the Trash folder shows it when navigated to.

---

### UI-P3: Remove Contacts Page

- **Problem:** The Contacts page (`src/app/contacts/page.tsx`) serves no purpose in the
  current product and adds navigation noise.
- **Task:**
  1. Delete the directory `src/app/contacts/` and its `page.tsx`.
  2. In `src/app/page.tsx`, find any nav link or `NavButton` pointing to `/contacts` and
     remove it (search for `Contact`, `contacts`, `Users` icons used as the contacts nav item).
  3. If any other file imports or links to `/contacts`, remove those references too.
  4. Run `npm run build` — it must produce zero errors.
- **Done when:** `/contacts` returns a 404, no link to it exists in the UI, build passes.

---

### UI-P4: Black Email Background Bleeds Into App UI

- **Problem:** When opening an email whose HTML content includes dark/black CSS
  (e.g., `<body style="background:black">` or `<style>body{background:#000}</style>`),
  the dark styles bleed out of the email preview and affect surrounding UI elements.
  Root cause: `src/components/ai-draft-panel.tsx` ~line 278 renders `htmlContent` with
  `dangerouslySetInnerHTML` directly in the component tree, so any `<style>` tags in the
  email affect the whole page.
- **Task:**
  1. Replace the `dangerouslySetInnerHTML` email body renderer in `ai-draft-panel.tsx`
     with a sandboxed `<iframe>` using the `srcDoc` prop:
     ```tsx
     <iframe
       srcDoc={message.htmlContent}
       sandbox="allow-same-origin"
       className="w-full h-full border-0 rounded"
       style={{ minHeight: '300px' }}
       title="Email content"
     />
     ```
  2. The `sandbox="allow-same-origin"` attribute prevents scripts from running while
     allowing the email's own CSS to render — but that CSS is now scoped to the iframe
     and cannot affect the parent page.
  3. Remove the `prose` wrapper classes that were on the old `dangerouslySetInnerHTML` div —
     they are no longer needed since the iframe has its own document scope.
  4. Ensure the iframe resizes to fit its content or has a sensible `min-height`.
- **Done when:** Opening an email with a black background renders the email correctly inside
  a contained area, with zero bleed of its styles into the Nexaro UI.

---

### SLACK-B1: Slack Connection Not Activating / Not Showing in Sidebar

- **Problem:** After completing the Slack OAuth flow, Slack does not appear in the sidebar
  and `slackConnected` stays `false`.
  Root cause: The Slack OAuth callback (`src/app/api/slack/callback/route.ts` ~line 78)
  writes to Firestore via REST with **no `Authorization` header**. Firestore security rules
  reject this unauthenticated write silently — the callback still redirects to
  `?slack_connected=true`, but nothing was actually saved.
- **Task:**
  1. In `src/app/api/slack/callback/route.ts`, fix the Firestore REST write by adding
     an API key query parameter to the URL:
     ```ts
     const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
     const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/tokens/slack?key=${apiKey}`;
     ```
     This authenticates the request to Firestore using the Firebase Web API key, which
     is permitted for server-to-Firestore REST calls when Firestore rules allow the write.
  2. Check `firestore.rules` — the path `users/{uid}/tokens/{tokenId}` must allow writes
     from the web API key. If rules require `request.auth != null`, you need a different
     approach: use a Firebase custom token or store via a server-side service account.
     Simplest fix: relax the rule for the `tokens` subcollection to allow API-key-authenticated
     writes, or use `allow write: if true` temporarily and tighten later.
  3. **Also fix the sidebar not refreshing:** In `src/app/page.tsx`, the `useEffect` that
     calls `getSlackConnection` only runs once on mount. After the OAuth redirect back to
     the dashboard, the Slack state is stale. Fix: check the URL for `?slack_connected=true`
     on mount and force a re-fetch of connections, or add a periodic re-check.
     ```tsx
     // In DashboardContent, add:
     useEffect(() => {
       const params = new URLSearchParams(window.location.search);
       if (params.get('slack_connected') === 'true') {
         // Remove param from URL cleanly
         window.history.replaceState({}, '', '/');
         // Re-fetch connections
         if (user) {
           getSlackConnection(user.uid).then(conn => setSlackConnected(!!conn));
         }
       }
     }, [user]);
     ```
- **Done when:** After completing Slack OAuth and returning to the dashboard, Slack appears
  in the sidebar under connected accounts within seconds. No manual refresh needed.

---

## 🟡 PHASE 2 — Integration Roadmap

### INFRA-01: Plan & Document Integration Expansion Strategy

- **Context:** Nexaro currently supports Gmail and Google Calendar (working), with Slack and
  Microsoft (code done, credentials pending). The goal is to become a complete unified inbox.
- **Task:** Create a file `architecture/integrations-roadmap.md` documenting the following
  integration plan. Use this as the canonical reference for future integration work.

  **Priority order for future integrations:**

  | Priority | Service | Why |
  |----------|---------|-----|
  | 1 | **Slack** (fix existing) | Already coded — just needs the auth bug fixed (SLACK-B1) |
  | 2 | **Microsoft Outlook + Teams** | Already coded — needs credentials in `.env.local` |
  | 3 | **WhatsApp Business** | Most-used messaging platform globally; critical for exec comms |
  | 4 | **Linear / Jira** | Execs track engineering progress here; high-signal notifications |
  | 5 | **LinkedIn Messages** | B2B executives receive important outreach and DMs here |
  | 6 | **Notion** | Many CEOs use it as a second brain; surface @mentions and task assignments |
  | 7 | **Telegram** | Preferred by European/Asian exec communities; supports channels |
  | 8 | **Twitter/X DMs** | Investor, partner, and press DMs often happen here |
  | 9 | **Discord** | Web3, gaming, and tech communities use Discord for real business comms |
  | 10 | **Zoom / Google Meet** | Surface upcoming meetings and post-call summaries |

  **For each new integration, the implementation checklist is:**
  - [ ] Python adapter in `tools/adapters/{service}_adapter.py` (reads from API, normalizes via `normalize_payload.py`)
  - [ ] OAuth routes in `src/app/api/{service}/connect/route.ts` and `callback/route.ts`
  - [ ] Token stored at `users/{uid}/tokens/{service}` in Firestore
  - [ ] Service appears in sidebar when connected (same pattern as Gmail accounts in `ACCOUNTS` computed array)
  - [ ] "Connect" button in Settings → Integrations tab
  - [ ] Source filter in `src/components/source-filter.tsx` updated with new source

  **For WhatsApp specifically (highest priority new integration):**
  - Requires WhatsApp Business API (via Meta) — needs a verified business account
  - Use the Cloud API webhook approach: Meta sends message events to a Next.js webhook endpoint
  - Webhook route: `src/app/api/whatsapp/webhook/route.ts`
  - Store connection at: `users/{uid}/tokens/whatsapp`
  - No Python adapter needed — messages arrive via push (webhook), not pull

- **Done when:** `architecture/integrations-roadmap.md` exists with the full table and
  per-integration checklist. The file should serve as a runbook for adding any new integration.

---

## 🔁 Self-Improvement Protocol

After **every code change you make**, invoke the `/simplify` skill to review the change for:
- Unnecessary complexity or duplication
- Missed reuse of existing utilities
- Quality and efficiency issues

Fix any issues found before moving to the next task. This step is not optional — it ensures
each change leaves the codebase cleaner than it was.

---

## 🛠️ After Phase 1 & 2 — Next Steps

1. **Activate Slack & Microsoft** — once credentials are in `.env.local`, unblock SLACK-B1
   and run the Microsoft equivalent fix.
2. **WhatsApp Business integration** — highest-value new integration for the target audience.
3. **AI Smart Reply improvements** — hook up Gemini API once `GEMINI_API_KEY` is set.
4. **Push Notifications** — Firebase Cloud Messaging for messages with importance score > 80.
5. **Mobile responsive audit** — test all pages on mobile, fix grid layouts.

---

*Last updated: March 2026*
*First task: UI-P1 — Sidebar Account Name Overflow*
