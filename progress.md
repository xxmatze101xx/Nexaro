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

## Phase 2 (claude-agent-instructions.md v2) — ✅ Abgeschlossen (2026-03-10)

| Task | Status | Änderungen |
|------|--------|-----------|
| UI-P1 Sidebar Overflow | ✅ | `min-w-0 overflow-hidden` auf `flex items-center gap-2` in page.tsx ACCOUNTS.map |
| UI-P2 Hover Icons Overflow | ✅ | `flex-col→flex-row`, `top-2.5→top-1/2 -translate-y-1/2`, Eye/EyeOff entfernt in message-card.tsx |
| GMAIL-B1 Delete Optimistic | ✅ | Optimistic removal vor `trashEmail()`, Rollback auf Fehler; `handleDelete` in page.tsx |
| UI-P3 Contacts Page entfernt | ✅ | `src/app/contacts/` gelöscht, `<Link href="/contacts">` + Users/Contact Imports entfernt |
| UI-P4 Black Email Bleed | ✅ | `dangerouslySetInnerHTML` → `<iframe sandbox="" srcDoc>` in ai-draft-panel.tsx |
| SLACK-B1 Slack Auth Fix | ✅ | `?key=${NEXT_PUBLIC_FIREBASE_API_KEY}` in Firestore REST URL (slack + microsoft callbacks); OAuth redirect useEffect mit Early-Exit Guard |
| INFRA-01 Integration Roadmap | ✅ | `architecture/integrations-roadmap.md` erstellt (10 Integrationen, Checkliste, WhatsApp-Sonderfall) |

## Phase 3 (claude-agent-instructions-v3.md) — ✅ Abgeschlossen (2026-03-10)

| Task | Status | Änderungen |
|------|--------|-----------|
| UI-P1 Compose X-Button | ✅ | TypeScript `catch (err: any)` → `catch (err: unknown)` in compose-email-dialog + compose-panel |
| UI-P2 Generate Draft Feedback | ✅ | `draftError` state + rotes Banner statt `alert()`; spezifische Msg bei fehlendem API-Key |
| INFRA-B1 Firestore Permissions | ✅ | `onSnapshot` nur wenn `user !== null`; Error-Handler mit `console.warn` |
| CAL-B1 Kalender Kontrast | ✅ | `readableTextColor(hex)` WCAG-Funktion; dunkler Text auf hellen Events |
| UI-P4 Importance Score Variation | ✅ | Keyword-Heuristik + stabiler Hash-Offset ersetzt fixed `3.0` Default |
| LIVE-01 Gmail Polling 60s | ✅ | `setInterval` 60_000ms auf `refreshCount` State |
| LIVE-02 New Message Toast | ✅ | `new-message-toast.tsx` Komponente; `prevMsgIdsRef` zum Tracking neuer IDs |
| UI-L1 Email Detail Height | ✅ | iframe `onLoad` passt Höhe dynamisch an scrollHeight an (max 600px) |
| UX-V1 Globale Suche | ✅ | `searchScope` State; Toggle-Pills unter Suchfeld; `allMessages` vs `displayMessages` |
| UX-V2 Action Toasts | ✅ | `useToast` hook, `ToastContainer`; Archive/Star/Delete/ToggleRead zeigen Toast |
| UX-V3 Reply Greeting | ✅ | Auto-fill "Guten Tag [firstName],\n\n\nMit freundlichen Grüßen" wenn kein Draft |
| FEAT-01 Digest Settings | ✅ | `DigestSection.tsx` + `/api/digest/route.ts`; Firestore `users/{uid}/settings/digest` |
| FEAT-02 Keyboard Shortcuts | ✅ | `d`=delete, `u`=unread, `s`=star, Escape=close; Overlay mit allen 7 Shortcuts |
| FEAT-03 Inbox Overview Widget | ✅ | `inbox-overview-widget.tsx`; Farb-Indikator grün/orange/rot; Klick setzt Source-Filter |

## Tagesplan UI-P1 — Email-Body Layout — ✅ Abgeschlossen (2026-03-10)

| Task | Status | Änderungen |
|------|--------|-----------|
| UI-P1 Email-Body Platz | ✅ | `ai-draft-panel.tsx`: 1 großer Scroll-Container → 3 Sektionen: Header (flex-shrink-0), Body (flex-1 overflow-y-auto min-h-[400px]), AI Draft (flex-shrink-0 max-h-[280px] overflow-y-auto) |
| Bonus: alert() entfernt | ✅ | handleSend, handleArchive, handleToggleRead nutzen jetzt `setDraftError()` statt `alert()` |

## Phase 6 Polish — ✅ Abgeschlossen (2026-03-18)

| Task | Status | Änderungen |
|------|--------|-----------|
| Snooze / Pin | ✅ | `src/lib/message-meta.ts` (Firestore ops); `snoozeMessage`, `unsnoozeMessage`, `togglePin`, `snoozeUntil`; Firestore path `users/{uid}/message_meta/{messageId}`; MessageCard: Pin + Snooze-Dropdown (4 Optionen); page.tsx: `handleSnooze`, `handlePin`, snoozed-Filter, pinned floaten nach oben; cron route `/api/cron/unsnooze` (15min); vercel.json aktualisiert |
| Mobile Responsive | ✅ | Sidebar: `fixed inset-y-0 left-0 z-40` mit `translate-x` Transition; Hamburger-Button (Menu Icon) im Header; Backdrop Overlay; Message List: `w-full md:w-[480px]`, bei offenem Detail `hidden md:flex`; Detail Panel: mobiler "← Zurück" Button; Sidebar schließt bei Nav-Klick |
| Push Notifications | ✅ | `public/firebase-messaging-sw.js`: FCM compat SW mit postMessage Config-Injection; `hooks/usePushNotifications.ts`: Notification-Permission, SW-Registrierung, FCM-Token via NEXT_PUBLIC_FIREBASE_VAPID_KEY, Token in Firestore `users/{uid}/fcm_tokens/{tokenKey}`, Foreground-Message-Handler; Integration in page.tsx |
