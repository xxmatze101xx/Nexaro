# CLAUDE.md — Nexaro Agent Briefing

> Du bist der Lead Engineer von Nexaro. Du arbeitest autonom, ohne auf Anweisungen zu warten.
> Nach jedem abgeschlossenen Task wählst du selbst den nächsten aus dieser Datei.
> Du fragst NICHT nach, was du als nächstes tun sollst. Du liest diese Datei und arbeitest den Backlog ab.

---

## 🧠 Was ist Nexaro?

Nexaro ist eine **Unified Inbox SaaS-App für CEOs und Executives**. Sie aggregiert alle Kommunikationskanäle (Gmail, Slack, Google Calendar, Microsoft Teams, Outlook) auf einer einzigen, KI-priorisierten Oberfläche. Der CEO sieht auf einen Blick was wichtig ist – ohne zwischen 5 Apps wechseln zu müssen.

**Zielgruppe:** Busy Executives, CEOs, Gründer  
**Core Value Prop:** Eine Inbox für alles. KI entscheidet was zuerst kommt.

---

## 🏗️ Tech Stack

| Layer | Technologie |
|-------|------------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend/DB | Firebase (Firestore, Auth, Storage) |
| AI Pipeline | Python (`tools/`), score_importance.py |
| Integrations | Gmail API, Google Calendar API (weitere folgen) |
| Auth | Firebase Auth (noch nicht vollständig integriert) |

---

## 📁 Projektstruktur

```
Nexaro/
├── architecture/           # SOPs & Architektur-Docs (LESEN vor Änderungen!)
│   ├── system-overview.md
│   ├── firebase-sop.md
│   ├── integration-sop.md
│   └── ai-scoring-sop.md
├── tools/                  # Python AI-Pipeline
│   ├── adapters/
│   │   └── mock_adapter.py
│   ├── normalize_payload.py
│   ├── score_importance.py
│   ├── write_to_firestore.py
│   ├── daemon.py
│   └── verify_firebase.py
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard / Unified Inbox
│   │   ├── calendar/page.tsx
│   │   ├── contacts/page.tsx
│   │   ├── settings/page.tsx     # ⚠️ 47k+ Zeilen – muss refactored werden
│   │   ├── login/page.tsx
│   │   └── api/
│   │       ├── gmail/            # OAuth exchange + refresh ✅
│   │       └── calendar/         # OAuth exchange + refresh ✅
│   ├── components/
│   │   ├── ai-draft-panel.tsx
│   │   ├── compose-email-dialog.tsx
│   │   ├── compose-panel.tsx
│   │   ├── importance-badge.tsx
│   │   ├── message-card.tsx
│   │   └── source-filter.tsx
│   └── lib/
│       ├── firebase.ts
│       ├── gmail.ts
│       ├── calendar.ts
│       ├── user.ts
│       ├── storage.ts
│       ├── mock-data.ts
│       └── utils.ts
├── gemini.md               # Data Schemas & Maintenance Log — IMMER aktuell halten
├── progress.md             # Phasen-Fortschritt
└── taskstodo.md            # Offene Bugs
```

---

## ⚠️ Invarianten — Diese Regeln NIEMALS brechen

1. **Lies `architecture/` vor jeder neuen Integration** – die SOPs definieren wie Adapter, Schemas und Firebase-Struktur aussehen müssen.
2. **Kein Adapter ohne Normalisierung** – jede Integration muss durch `normalize_payload.py` laufen und ein einheitliches Message-Schema erzeugen.
3. **Firebase-Schema nicht eigenmächtig ändern** – Änderungen am Firestore-Schema immer in `gemini.md` dokumentieren.
4. **Keine Magic Strings** – alle Konstanten (Collection Names, API Endpoints) in dedizierte Config-Dateien.
5. **TypeScript strict** – kein `any`, keine ignorierten TS-Fehler.
6. **Nach jedem Task:** `taskstodo.md` und `progress.md` aktualisieren.

---

## 🔴 PHASE 1 — Kritische Bugs fixen (Sofort, in dieser Reihenfolge)

Diese Bugs machen die App unbenutzbar. Fange hier an.

### BUG-01: Reply-Funktion broken
- **Datei:** `src/components/ai-draft-panel.tsx`, `src/components/compose-panel.tsx`
- **Problem:** Reply schreiben → Fehler beim Senden
- **Fix:** Gmail Send API in `src/lib/gmail.ts` debuggen, Error-Handling hinzufügen, Reply-Thread-ID korrekt mitgeben
- **Done wenn:** Eine echte Gmail-Reply kann gesendet werden ohne Fehler

### BUG-02: Archivieren/Markieren broken
- **Datei:** `src/components/message-card.tsx`
- **Problem:** Icons falsch, Funktionalität kaputt
- **Fix:** Gmail API calls für `archive` (Label INBOX entfernen) und `markAsRead` implementieren, Icons durch korrekte Lucide-Icons ersetzen
- **Done wenn:** Archivieren und Markieren funktioniert und spiegelt sich in Gmail wider

### BUG-03: Settings-Tabs nicht klickbar
- **Datei:** `src/app/settings/page.tsx`
- **Problem:** Integrations-Tabs (Aktiv/Inaktiv/Custom) reagieren nicht auf Klicks
- **Fix:** Tab-State-Management fixen. Die Datei hat 47k+ Zeilen – **refactore sie gleichzeitig** in separate Komponenten unter `src/components/settings/`
- **Done wenn:** Alle Tabs klickbar, Settings-Page unter 500 Zeilen

---

## 🟡 PHASE 2 — Firebase Auth vollständig integrieren

### AUTH-01: Echtes Auth-System
- **Aktuell:** Login-Seite existiert, aber kein funktionierendes Auth
- **Implementieren:**
  - Firebase Auth (Email/Password + Google OAuth) in `src/lib/user.ts`
  - Auth-State-Provider als React Context (`src/contexts/AuthContext.tsx`)
  - Route Guards für alle `/app/*` Seiten
  - Login/Logout Flow komplett
  - User-Dokument in Firestore beim ersten Login anlegen (`users/{uid}`)
- **Done wenn:** Nur eingeloggte User sehen die App, Token wird sicher gespeichert

---

## 🟡 PHASE 3 — AI-Scoring ins Frontend bringen

### AI-01: Python-Scores in UI anzeigen
- **Aktuell:** `score_importance.py` existiert, aber Scores erscheinen nicht im UI
- **Implementieren:**
  - Firestore-Listener in `src/lib/gmail.ts` der auf Score-Updates reagiert
  - `importance-badge.tsx` mit echten Scores aus Firestore verbinden (nicht Mock-Daten)
  - Score-Skala: 0-100, Badge-Farben: Rot (80+), Orange (50-79), Grau (<50)
- **Done wenn:** Jede Mail im Dashboard zeigt einen echten AI-Score aus Firestore

### AI-02: Echtes AI Smart Reply
- **Aktuell:** `ai-draft-panel.tsx` hat UI, aber kein LLM dahinter
- **Implementieren:**
  - API Route `/api/ai/draft` die Gemini API aufruft
  - Kontext: Mail-Betreff, Absender, Body → Draft generieren
  - Draft in `ai-draft-panel.tsx` anzeigen, editierbar machen
  - Umgebungsvariable: `GEMINI_API_KEY`
- **Done wenn:** Klick auf "Draft" generiert echten AI-Antwortvorschlag

---

## 🟡 PHASE 4 — Slack Integration

> Vor Start: `architecture/integration-sop.md` lesen!

### SLACK-01: Slack Adapter (Python)
- **Datei:** `tools/adapters/slack_adapter.py` (neu erstellen)
- **Implementieren:**
  - Slack SDK (`slack_sdk`) für Message-Fetching
  - Direkt-Nachrichten + erwähnte Nachrichten fetchen
  - Output durch `normalize_payload.py` normalisieren
  - Schema: `{ id, source: "slack", sender, subject, body, timestamp, threadId, channelName }`
  - In Firestore unter `users/{uid}/messages` schreiben

### SLACK-02: Slack OAuth (Next.js)
- **Datei:** `src/app/api/slack/` (neu erstellen)
- **Implementieren:**
  - `/api/slack/connect` – OAuth Redirect
  - `/api/slack/callback` – Token Exchange, Token in Firestore speichern
  - Scopes: `channels:history`, `im:history`, `users:read`

### SLACK-03: Slack im UI
- **Datei:** `src/app/settings/page.tsx` (Integrations-Tab)
- **Implementieren:**
  - "Connect Slack" Button mit OAuth Flow
  - Slack-Messages erscheinen im Dashboard mit Slack-Icon
  - `source-filter.tsx` um Slack-Filter erweitern
- **Done wenn:** Slack DMs erscheinen im Nexaro Dashboard

---

## 🟡 PHASE 5 — Microsoft Outlook & Teams

> Vor Start: `architecture/integration-sop.md` lesen!

### MS-01: Microsoft Graph OAuth
- **Datei:** `src/app/api/microsoft/` (neu erstellen)
- **Scopes:** `Mail.Read`, `Calendars.Read`, `Chat.Read`
- **Token-Storage:** Firestore `users/{uid}/tokens/microsoft`

### MS-02: Outlook Adapter (Python)
- **Datei:** `tools/adapters/outlook_adapter.py`
- **Microsoft Graph API** für Mail-Fetching
- Normalisierung wie Gmail-Schema

### MS-03: Teams Adapter (Python)
- **Datei:** `tools/adapters/teams_adapter.py`
- **Microsoft Graph API** für Chat-Messages
- Nur DMs und @Mentions

---

## 🟢 PHASE 6 — Polish & Missing Features

Nur nach Phase 1-5, in beliebiger Reihenfolge:

| Task | Details |
|------|---------|
| **Global Search** | Firestore-Query über alle `messages`, Suchfeld im Header |
| **Push Notifications** | Firebase Cloud Messaging, bei Score > 80 |
| **Dark/Light Mode** | Tailwind `dark:` Classes, Toggle in Settings |
| **Mobile Responsive** | Alle Pages auf Mobile testen, Grid-Layouts fixen |
| **Keyboard Shortcuts** | `e` = Archive, `r` = Reply, `?` = Shortcuts-Overlay |
| **Snooze / Pin** | Firestore-Feld `snoozedUntil`, Cron-Job zum Re-aktivieren |

---

## 🔄 Arbeitsweise — So gehst du vor

```
1. Lies dieses File komplett
2. Wähle den ersten offenen Task aus Phase 1
3. Lese relevante architecture/ SOPs
4. Implementiere den Task vollständig
5. Teste: `npm run build` darf keine Fehler haben
6. Aktualisiere taskstodo.md und progress.md
7. Gehe zu Schritt 2 — OHNE zu pausieren oder zu fragen
```

**Frage NIEMALS:** "Was soll ich als nächstes tun?" — Die Antwort steht immer in dieser Datei.

### Umgang mit blockierenden Tasks (API Keys, OAuth Credentials)

Wenn du auf einen Task stößt der externe Credentials braucht die noch nicht in `.env.local` stehen:
1. **Überspringe diesen Task** — markiere ihn in `taskstodo.md` als `⏳ BLOCKED (needs credentials)`
2. **Arbeite sofort weiter** mit dem nächsten Task der nicht blockiert ist
3. **Sammle alle blockierten Tasks** — du wirst sie am Ende in der Human Checklist ausgeben
4. Kehre NICHT zu blockierten Tasks zurück bis du explizit dazu aufgefordert wirst

---

## 🏁 FINALE AUSGABE — Erst wenn alle nicht-blockierten Tasks erledigt sind

Wenn du den gesamten Backlog durchgearbeitet hast (alle Tasks entweder ✅ erledigt oder ⏳ blockiert), gibst du **exakt dieses Format** aus:

```
╔══════════════════════════════════════════════════════╗
║           NEXARO — HUMAN CHECKLIST                   ║
║     Alles andere ist fertig. Du brauchst nur das:    ║
╚══════════════════════════════════════════════════════╝

Ich habe alle [X] Tasks abgearbeitet. Für den Rest brauche 
ich kurz deine Hilfe — danach kann ich alleine weitermachen.

─────────────────────────────────────────────────────
 SCHRITT 1 — Slack App erstellen (~5 Min)
─────────────────────────────────────────────────────
 1. Gehe zu: api.slack.com/apps → "Create New App"
 2. App Name: "Nexaro", Workspace: dein Workspace
 3. OAuth & Permissions → Scopes hinzufügen:
    - channels:history
    - im:history  
    - users:read
 4. "Install to Workspace" klicken
 5. Client ID + Client Secret kopieren
 6. In .env.local eintragen:
    SLACK_CLIENT_ID=...
    SLACK_CLIENT_SECRET=...
    SLACK_REDIRECT_URI=https://nexaro-9j3h.vercel.app/api/slack/callback

─────────────────────────────────────────────────────
 SCHRITT 2 — Microsoft Azure App (~10 Min)
─────────────────────────────────────────────────────
 1. Gehe zu: portal.azure.com → "App registrations"
 2. "New registration" → Name: "Nexaro"
 3. Redirect URI: https://nexaro-9j3h.vercel.app/api/microsoft/callback
 4. API Permissions hinzufügen: Mail.Read, Calendars.Read, Chat.Read
 5. Client ID + Client Secret kopieren
 6. In .env.local eintragen:
    MICROSOFT_CLIENT_ID=...
    MICROSOFT_CLIENT_SECRET=...
    MICROSOFT_REDIRECT_URI=...

─────────────────────────────────────────────────────
 SCHRITT 3 — Gemini API Key (~2 Min)
─────────────────────────────────────────────────────
 1. Gehe zu: aistudio.google.com/app/apikey
 2. "Create API Key" klicken
 3. In .env.local eintragen:
    GEMINI_API_KEY=...

─────────────────────────────────────────────────────

Sobald du das erledigt hast, sag mir: "Credentials sind drin"
— dann arbeite ich alle blockierten Tasks sofort ab.

Gesamtzeit die du brauchst: ~17 Minuten.
```

Diese Ausgabe kommt **einmal, am Ende** — nicht zwischendurch.

---

## 🔐 Umgebungsvariablen (in `.env.local`)

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Google OAuth (Gmail + Calendar)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Slack OAuth
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=

# Microsoft OAuth
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=

# AI
GEMINI_API_KEY=
```

---

*Letzte Aktualisierung: Projekt-Übergabe an Claude Code Agent*  
*Nächster Task: BUG-01 — Reply-Funktion fixen*