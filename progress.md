# progress.md — Execution & Validation Progress
<!-- This file will track the steps performed, errors encountered, and test results -->

## Phase 1 (claude-agent-instructions.md) — ✅ Abgeschlossen (2026-03-09)

| Task | Status | Änderungen |
|------|--------|-----------|
| GMAIL-B1 Sent-Ordner | ✅ | `fetchEmailsPage(folder='SENT')` in gmail.ts; Ordner-Fetch-Effect in page.tsx |
| GMAIL-B2 Star/Favoriten | ✅ | `starEmail()` in gmail.ts; Star-Button + filled-Star-Icon in message-card.tsx |
| GMAIL-B3 Archiv-Feedback | ✅ | message-card.tsx zeigt Inbox-Icon statt Archive-Icon wenn `!labels.includes('INBOX')` |
| GMAIL-B4 Pagination | ✅ | `fetchEmailsPage` mit `nextPageToken`; "Mehr laden"-Button am Ende der Liste |
| GMAIL-B5 Löschen & Papierkorb | ✅ | `trashEmail()` + `unarchiveEmail()` in gmail.ts; Trash2-Button; Papierkorb in Sidebar |
| UI-P1 Header Sync | ✅ | `headerTitle` useMemo in page.tsx; Header zeigt Gesendet/Archiv/etc. |
| UI-P2 Add Account | ✅ | Button ersetzt durch `<Link href="/settings?tab=integrations">` |
| UI-P3 Truncated Names | ✅ | `title={account.name}` auf Sidebar-Account-Spans |
