# NEXARO_KNOWLEDGE.md — Wissens-Datenbank

*Auto-generiert und gepflegt durch KI-Agent | Stand: März 2026*

---

## 📋 Abgeschlossene Tasks & Learnings

---

### ✅ CLAUDE.md Audit (März 2026) — Vollständige Backlog-Analyse

**Root-Cause:** Alle Code-implementierten Tasks des CLAUDE.md-Backlogs waren bereits vollständig implementiert. Nur Dokumentations-Tasks (Ergebnisse/*.md) fehlten noch.

**Was war bereits implementiert:**

#### SLACK-B1/B2/B3 (Slack Messaging) — ✅ KOMPLETT
- `src/app/api/slack/messages/route.ts` — `conversations.history` API mit User-Token-Fallback auf Bot-Token
- `src/app/api/slack/send/route.ts` — `chat.postMessage` zum Senden
- `src/components/slack-channel-view.tsx` — Vollständige UI mit Send-Button, Auto-Polling alle 15s, Message-Groupierung
- **Scopes:** Channels:history, groups:history, im:history, chat:write — alles vorhanden
- **User-Auflösung:** users.info API-Call für Display-Namen

#### UI-P1 (Popup Navigation) — ✅ KOMPLETT
- `src/components/new-message-toast.tsx` — Toast mit `onClick={() => { onOpen(message); onDismiss(id); }}`
- Die `onOpen`-Funktion navigiert direkt zur Nachricht via `setSelectedMessage`

#### UI-P2 (Notification Settings Toggle) — ✅ KOMPLETT
- `src/app/settings/` → `NotificationsSection` Komponente
- `users/{uid}/settings.notifications.*` in Firestore
- Granulare Kontrolle: popupEnabled, popupGmail, popupSlack, popupTeams
- `getNotificationSettings()` in `src/lib/user.ts`
- In `page.tsx` LIVE-02-Logik respektiert Settings

#### UI-P3 (Settings Design) — ✅ KOMPLETT
- Settings-Seite verwendet konsistente bg-background, bg-card, border-border Tailwind-Klassen
- Sticky Header, Sidebar-Nav, gleiche Typografie und Abstände wie Inbox

#### GMAIL-F1 (Progressive Loading + Polling) — ✅ KOMPLETT
- `fetchEmailsProgressively()` in `src/lib/gmail.ts` — Batched Loading (10er-Batches, 200 total)
- Auto-Polling alle 30s (`setInterval` in page.tsx LIVE-01)
- Cached erste 200 Mails in IndexedDB
- Skeleton/Loading States vorhanden

#### GMAIL-F2 (File Attachments) — ✅ KOMPLETT
- `src/components/compose-panel.tsx` — Drag & Drop + 📎 & 🖼️ Buttons
- `fileToAttachment()` in `src/lib/gmail.ts` — Base64-Kodierung, MIME-Type Detection
- 25 MB Limit mit Fehlermeldung
- Bild-Thumbnail Vorschau + Dateiname + Größe + X-Button
- MIME multipart/mixed Encoding für Gmail API

#### UI-P5 (Todo-Feature) — ✅ KOMPLETT
- `src/app/todos/` — eigene Todos-Route
- `src/lib/todos.ts` — Firestore CRUD
- Sidebar-Integration mit ListTodo Icon
- Ergebnisse/todo-feature-concept.md vorhanden

#### INFRA-F1 (Integrations Brainstorming) — ✅ KOMPLETT
- `Ergebnisse/integrations-brainstorming.md` — Alle 7 Integrationen analysiert

#### AI-F1 (AI Model Analysis) — ✅ KOMPLETT
- `Ergebnisse/ai-model-analysis.md` — Vollständiger Modell-Vergleich

#### AI-F2 (Pricing Strategy) — ✅ KOMPLETT
- `Ergebnisse/pricing-strategy.md` — Abo-Modelle und Break-Even-Analyse

#### UI-P4 (Dashboard Concept) — ✅ KOMPLETT
- `Ergebnisse/dashboard-concept.md` — Widget-System-Konzept

**Was neu erstellt wurde (März 2026):**
- `Ergebnisse/further-integrations-research.md` — INFRA-F2: Top-10 weitere Integrationen
- `Ergebnisse/ai-assistant-concept.md` — AI-F3: KI-Assistent Konzept + Implementierungsplan
- `Ergebnisse/setup-guide.md` — FINAL: Vollständige Setup & Deployment Anleitung

---

### Architekturwissen: Slack Integration Pattern

**Learnings:**
- Slack API gibt `error: "missing_scope"` zurück, nicht HTTP 403 — immer JSON-Response prüfen
- Für Channels braucht man BEIDE Token: User-Token (xoxp-) für akkurate Channel-Permissions, Bot-Token (xoxb-) als Fallback
- `conversations.list` ohne `is_member: true` Filter zeigt alle Workspaces-Channels — immer filtern!
- DM Channel-Typ in Slack: `type === "im"` für 1:1 DMs, `type === "mpim"` für Gruppen-DMs
- User-ID zu Display-Name: `users.info?user={userId}` → `user.real_name` bevorzugen

---

### Architekturwissen: Gmail API Patterns

**Learnings:**
- Für Mail-Listenansicht: `format=METADATA` verwenden — spart 90% der Response-Größe
- `format=FULL` nur beim Öffnen einer Mail
- `historyId` für inkrementelle Syncs (nur neue Mails holen, nicht alle) — wichtig für Polling
- Attachments: Base64-kodiert, MIME `multipart/mixed` erforderlich
- Thread-Replies: Brauchen `threadId` im Request Body UND `In-Reply-To`/`References` Header mit RFC `Message-ID` (nicht Gmail Message-ID!)
- Next.js Cache: Bei Gmail `GET` nach `POST` immer `cache: 'no-store'` setzen

---

### Architekturwissen: Google Calendar OAuth

**Learnings:**
- Drei Scopes nötig: `calendar.readonly` (Liste), `calendar.events` (CRUD), `userinfo.email` (Identifikation)
- Nur active/selected Calendars laden (`cal.selected === true`) — verhindert Performance-Probleme bei vielen Calendars
- Nach Scope-Änderung müssen User reconnecten (neuer Token mit neuen Scopes)

---

### Architekturwissen: Firebase/Firestore Patterns

**Schema: User-Settings (aktuell implementiert):**
```
users/{uid}/
  settings/
    notifications: { popupEnabled, popupGmail, popupSlack, popupTeams }
  tokens/
    slack: { access_token, user_access_token }
    microsoft: { access_token, refresh_token }
  gmail/ [...accounts]
  calendar/ [...accounts]
  profile: { displayName, photoURL, email }
  todos/{todoId}: { title, description, status, priority, ... }
  dashboard/
    widgets: [...widget configs]
```

---

### Architekturwissen: Notification-System

**Pattern für neue Nachrichten-Toasts:**
1. `prevMsgIdsRef` speichert vorherige Message-IDs
2. Bei Update: Differenz berechnen → neue IDs = neue Nachrichten
3. Guard `sessionStartTimestampRef.current`: Nur Nachrichten die NACH Session-Start ankamen
4. Guard `isLoadingMoreRef.current`: Keine Toasts beim Load-More
5. `notifSettings.popupEnabled` als globaler Kill-Switch
6. Pro-Integration-Flags: `popupGmail`, `popupSlack`, `popupTeams`
7. Max 3 Toasts gleichzeitig (LIFO), Auto-Dismiss nach 5s

---

### Gotchas & Pitfalls

| Problem | Lösung |
|---------|--------|
| Slack `missing_scope` ist ein JSON-Error, kein HTTP-Error | `data.ok` prüfen, nicht `res.ok` |
| Gmail Replay ohne RFC `Message-ID` → falsche Thread-Zuordnung | `rfcMessageId` aus Headers extrahieren |
| Google Calendar lädt alle Calendars → Performance | `cal.selected` filtern |
| Next.js cached Fetch nach POST → Stale Data | `cache: 'no-store'` in Fetch-Optionen |
| Firebase Firestore write-Race bei OAuth-Redirect | Optimistic update + Retry-Loop |
| Vercel: `.env.local` vs Environment Variables | Vercel-Dashboard ist die Source of Truth für Production |

---

*Letzte Aktualisierung: März 2026*

### 2026-03-12 — Self-Learning (SLACK-B1/B3 Follow-up)

**Was wurde gemacht?**
- Slack-Channel-History-Fetch von statischem `limit=50` auf Cursor-basierte Pagination umgestellt (`conversations.history` mit `next_cursor`, bis zu 5 Seiten).
- Slack-Send-Flow erweitert: API gibt now `message.ts/user/userName/text` zurück.
- UI (`SlackChannelView`) zeigt gesendete Nachricht sofort als optimistischen Eintrag und entfernt/ersetzt diesen je nach API-Ergebnis.
- Nutzerfreundliche Fehlermeldungen für häufige Slack-Fehler (`missing_scope`, `not_in_channel`) ergänzt.

**Root-Cause**
- Channel-Ansichten wirkten "leer" oder unvollständig, weil nur die letzten 50 Nachrichten geladen wurden.
- Send-Fehler waren für Nutzer nicht sichtbar, da nur Logging stattfand.

**Gotchas / Pitfalls**
- Slack liefert viele Fehler als `{ ok: false, error: ... }` bei HTTP 200; `res.ok` allein reicht nicht.
- Für robuste UX muss ein optimistischer Eintrag eindeutig identifizierbar sein (`optimisticTs`) und bei Fehler zuverlässig entfernt werden.

**Architektur-Entscheidung**
- History-Pagination serverseitig in der API-Route zentralisiert, damit UI simpel bleibt und keine Slack-Cursor-Details kennen muss.
- Optimistisches UI im Client + endgültige Konsistenz durch direktes Re-Fetch nach erfolgreichem Senden.


