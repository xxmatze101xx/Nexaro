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

## Phase 3 (claude-agent-instructions-v3.md) — ✅ Abgeschlossen (2026-03-10)

- ~~UI-P1: Compose X-Button~~ ✅ Buttons waren korrekt; TypeScript `any` in catch-clauses gefixt
- ~~UI-P2: Generate Draft kein Feedback~~ ✅ Inline `draftError` State + Banner; kein alert() mehr
- ~~INFRA-B1: Permission-Denied Firestore~~ ✅ `onSnapshot` nur wenn `user` nicht null
- ~~CAL-B1: Kalender Text unlesbar~~ ✅ `readableTextColor(hex)` Hilfsfunktion via WCAG-Luminanz
- ~~UI-P4: Alle Scores = 30~~ ✅ Heuristische Keyword-Scores + stabiler Hash-Offset pro Message
- ~~LIVE-01: Gmail Polling~~ ✅ `setInterval` alle 60s auf refreshCount
- ~~LIVE-02: New-Message Toast~~ ✅ `NewMessageToast` component, bottom-right, max 3, 5s auto-dismiss
- ~~UI-L1: Email Detail zu niedrig~~ ✅ iframe onLoad passt Höhe an (max 600px)
- ~~UX-V1: Globale Suche~~ ✅ Toggle Global/Ordner-Scope unter Suchfeld (nur wenn Suche aktiv)
- ~~UX-V2: Toast für Aktionen~~ ✅ `useToast` hook + `ToastContainer` (bottom-center)
- ~~UX-V3: Reply mit Greeting~~ ✅ Reply-Button füllt "Guten Tag [Name],...,Mit freundlichen Grüßen" vor
- ~~FEAT-01: Tägliche Zusammenfassung~~ ✅ `DigestSection` Settings + `/api/digest` Route; ⏳ BLOCKED (needs Vercel Cron)
- ~~FEAT-02: Keyboard Shortcuts~~ ✅ `d`=delete, `u`=toggle-read, `s`=star, Escape=close-detail; Overlay aktualisiert
- ~~FEAT-03: Inbox Overview Widget~~ ✅ `InboxOverviewWidget` über Message-Liste, klickbar filtert nach Source

## Tagesplan CLAUDE-email-height.md — ✅ Abgeschlossen (2026-03-10)

- ~~UI-P1: Email-Body bekommt zu wenig vertikalen Platz~~ ✅ Detail-Panel in 3 unabhängige Flex-Sektionen aufgeteilt; Body scrollt eigenständig

## Tagesplan CLAUDE.md — In Bearbeitung (2026-03-11)

- ~~SLACK-B1: Slack Channel Messages~~ ✅ Server-side proxy `/api/slack/messages`, User Token für `conversations.history`
- ~~SLACK-B2: Slack DM Messages~~ ✅ `/api/slack/dms` Route, `im:history` scope, User name resolution
- ~~SLACK-B3: Slack Send Messages~~ ✅ `/api/slack/send`, `chat.postMessage`, optimistic UI update
- ~~UI-P1: Popup-Navigation~~ ✅ Toast-Klick navigiert zur Nachricht
- ~~UI-P2: Popup-Einstellung~~ ✅ Toggle in Settings, Firestore-persistent
- ~~UI-P3: Settings Design~~ ✅ Alle 7 Settings-Komponenten auf CSS-Token-System umgestellt, Dark Mode funktioniert
- ~~GMAIL-F1: Progressive Loading 200 Mails~~ ✅ Batch-Fetch mit Streaming-UI, 30s Polling
- ~~GMAIL-F2: Email Attachments~~ ✅ Alle 3 Compose-Panels mit Drag&Drop, File-Picker, Vorschau, 25MB-Limit, MIME multipart/mixed
- ~~UI-P5: Todo-Bereich mit KI-Generierung~~ ✅ Firestore CRUD, useTodos Hook, /todos Page, AI Extraction, Sidebar-Link
- ~~INFRA-F1: Integrations-Brainstorming~~ ✅ `Ergebnisse/integrations-brainstorming.md` erstellt
- INFRA-F2: Further Integrations Research — ⏳ Noch offen
- ~~AI-F1: AI Model Analysis~~ ✅ `Ergebnisse/ai-model-analysis.md` erstellt
- ~~AI-F2: Pricing Strategy~~ ✅ `Ergebnisse/pricing-strategy.md` erstellt
- ~~UI-P4: Dashboard Widget Concept~~ ✅ `Ergebnisse/dashboard-concept.md` erstellt
- AI-F3: AI Assistant Concept + Implementation — ⏳ Noch offen
- FINAL: Setup Guide — ⏳ Noch offen

## Remaining Phase 6 Polish (not started)

| Task | Notes |
|------|-------|
| Push Notifications | Firebase Cloud Messaging + service worker required |
| Mobile Responsive | Audit and fix grid layouts for small screens |
| Snooze / Pin | Add `snoozedUntil` Firestore field + cron to re-activate |

## ⚠️ Slack App Config — Action Required

The Slack OAuth redirect URI in `.env.local` should be `https://nexaro-9j3h.vercel.app/api/slack/callback`.
You must add this **exact URL** to the Slack app's OAuth redirect URLs at api.slack.com/apps → OAuth & Permissions → Redirect URLs.

- ~~SLACK-B1 Follow-up (Channel history pagination + send UX hardening)~~ ✅ `/api/slack/messages` paginiert jetzt bis zu 1000 Nachrichten; Slack-Send hat optimistisches UI + klare Fehlertexte
