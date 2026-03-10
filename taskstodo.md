~~In den Einstellungen bei Integrations kann man nicht auf Aktiv, Inaktiv und Custom klicken~~ ✅ Fixed

~~Das Markieren Icon bei den Mails ist falsch und man kann sachen nicht entarchivieren/markieren~~ ✅ Fixed

~~Man kann wenn man in mails auf Reply drückt zwar die mail schreiben aber es kommt ein Fehler und es wird nichts abgeschickt~~ ✅ Fixed

## Phase 1 (claude-agent-instructions.md) — alle Tasks ✅ abgeschlossen

- ~~GMAIL-B1: Sent-Ordner leer~~ ✅ `fetchEmailsPage` mit `labelIds=SENT` wenn SENT-Ordner gewählt
- ~~GMAIL-B2: Markieren & Favoriten~~ ✅ Star-Button in message-card.tsx, `starEmail()` in gmail.ts
- ~~GMAIL-B3: Archiv-Feedback~~ ✅ Archiv-Button zeigt Inbox-Icon wenn Mail bereits archiviert
- ~~GMAIL-B4: Pagination / Load More~~ ✅ "Mehr laden" Button mit nextPageToken-Unterstützung
- ~~GMAIL-B5: Löschen & Papierkorb~~ ✅ `trashEmail()`, Trash-Button, Papierkorb-Ordner in Sidebar
- ~~UI-P1: Header Sync Bug~~ ✅ Header-Titel spiegelt gewählten Ordner wider
- ~~UI-P2: Sidebar "Add Account" non-functional~~ ✅ Link zu /settings?tab=integrations
- ~~UI-P3: Truncated Account Names~~ ✅ title-Attribut für Tooltip auf Hover

## Phase 2 (claude-agent-instructions.md v2) — ✅ Abgeschlossen (2026-03-10)

- ~~UI-P1: Sidebar Account Name Overflow~~ ✅ `min-w-0 overflow-hidden` auf flex container — truncate funktioniert jetzt
- ~~UI-P2: Hover Icons Overflow~~ ✅ `flex-col` → `flex-row`, `top-1/2 -translate-y-1/2`, Eye/EyeOff entfernt
- ~~GMAIL-B1: Delete Button Not Working~~ ✅ Optimistic removal vor API-Call, Rollback bei Fehler
- ~~UI-P3: Remove Contacts Page~~ ✅ `src/app/contacts/` gelöscht, Nav-Link entfernt, Build sauber
- ~~UI-P4: Black Email Background Bleed~~ ✅ `dangerouslySetInnerHTML` → `<iframe sandbox="" srcDoc>` isoliert Email-CSS
- ~~SLACK-B1: Slack Connection Not Activating~~ ✅ `?key=${apiKey}` in Firestore REST URL; OAuth-Redirect-Effect mit Early-Exit
- ~~INFRA-01: Integration Roadmap~~ ✅ `architecture/integrations-roadmap.md` erstellt
- **Bonus:** Microsoft callback ebenfalls `?key=` Fix (gleicher Bug wie Slack)

## Remaining Phase 6 Polish (not started)

| Task | Notes |
|------|-------|
| Push Notifications | Firebase Cloud Messaging + service worker required |
| Mobile Responsive | Audit and fix grid layouts for small screens |
| Snooze / Pin | Add `snoozedUntil` Firestore field + cron to re-activate |

## ⚠️ Slack App Config — Action Required

The Slack OAuth redirect URI in `.env.local` should be `https://nexaro-9j3h.vercel.app/api/slack/callback`.
You must add this **exact URL** to the Slack app's OAuth redirect URLs at api.slack.com/apps → OAuth & Permissions → Redirect URLs.
