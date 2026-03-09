# CLAUDE.md — Nexaro Agent Briefing (Stand: März 2026)

> Du bist der Lead Engineer von Nexaro. Du arbeitest autonom, ohne auf Anweisungen zu warten.
> Dein Ziel ist es, die Unified Inbox SaaS-App für CEOs zu perfektionieren.
> Du liest diese Datei und arbeitest den Backlog (Phase 1) ab.

---

## 🧠 Was ist Nexaro?

Nexaro aggregiert Kommunikation (Gmail, Slack, MS Teams, Outlook, Kalender) auf einer KI-priorisierten Oberfläche für Executives. 

---

## 🏗️ Tech Stack

| Layer | Technologie |
|-------|------------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend/DB | Firebase (Firestore, Auth, Storage) |
| AI Pipeline | Python (`tools/`), score_importance.py |
| Integrations | Gmail API, Google Calendar API |

---

## ⚠️ Invarianten — Absolute Regeln

1. **Keine Adapter ohne Normalisierung** – Jede Nachricht muss durch `normalize_payload.py` laufen.
2. **Firebase Rules** – Beachte die Security Rules in Firestore.
3. **TypeScript strict** – Keine `any`, keine ignorierten Fehler.
4. **Interactive Feedback** – Buttons müssen sofortiges Feedback geben (Status-Änderungen, Tooltips).
5. **Nach jedem Task:** `taskstodo.md` und `progress.md` aktualisieren.

---

## 🔴 PHASE 1 — Kritische Bugs & Gmail-Verbesserungen (Priorität!)

Arbeite diese Liste von oben nach unten ab.

### GMAIL-B1: Sent-Ordner leer
- **Problem:** Der Ordner "Gesendet" im Sidebar zeigt "No messages found", obwohl Mails vorhanden sind.
- **Task:** Checke die Filter-Logik in `src/lib/gmail.ts` oder den fetch-Aufruf. Stelle sicher, dass `SENT` Label korrekt abgefragt werden.
- **Done wenn:** Gesendete Emails im entsprechenden Ordner erscheinen.

### GMAIL-B2: Markieren & Favoriten (Missing Feature)
- **Problem:** Es gibt keinen Button um Emails als "Wichtig" (Starred) zu markieren. Der "Gelesen/Ungelesen" Button ist vorhanden, aber unzureichend.
- **Task:** Implementiere einen Star/Important-Toggle im `message-card.tsx` und der Detailansicht. Nutze die Gmail API um `STARRED` Label zu setzen/entfernen.
- **Done wenn:** User können Mails markieren und der Status wird mit Gmail synchronisiert.

### GMAIL-B3: Archiv-Feedback
- **Problem:** Wenn eine Email archiviert ist, ist der Button-Status unklar.
- **Task:** Ändere das Icon/Label des Archiv-Buttons, wenn die Mail bereits archiviert ist (z.B. "In Inbox verschieben"). Sorge für visuelles Feedback.
- **Done wenn:** Der Button-Status reflektiert, ob die Nachricht im Archiv oder der Inbox ist.

### GMAIL-B4: Pagination / Load More
- **Problem:** Es werden zu wenige Emails geladen. Es gibt keine Möglichkeit "mehr" zu laden.
- **Task:** Implementiere einen "Load More" Button oder verbessere das Infinite Scrolling in der Nachrichtenliste.
- **Done wenn:** User können auch ältere Emails durch Nachladen sehen.

### GMAIL-B5: Löschen & Papierkorb
- **Problem:** Man kann keine Emails löschen und es gibt keinen Papierkorb.
- **Task:** Füge einen "Löschen" Button hinzu. Implementiere den Gmail API Call um Mails in den `TRASH` zu verschieben. Zeige den Papierkorb in der Sidebar an.
- **Done wenn:** Löschen funktioniert und der Papierkorb-Ordner existiert.

### UI-P1: Header Sync Bug
- **Problem:** Klickt man auf "Archiv", zeigt der Header oben immer noch "Inbox" an.
- **Task:** Synchronisiere den Page-Header mit dem aktuell gewählten Ordner in der Sidebar.
- **Done wenn:** Header zeigt "Archiv", "Gesendet" etc. korrekt an.

### UI-P2: Sidebar "Add Account" non-functional
- **Problem:** Der Button "Account hinzufügen" in der Sidebar tut nichts.
- **Task:** Verlinke den Button direkt auf `settings/page.tsx#integrations` oder öffne das entsprechende Integrations-Tab.
- **Done wenn:** Klick führt zu den Einstellungen für neue Konten.

### UI-P3: Truncated Account Names
- **Problem:** Lange Email-Adressen in der Sidebar werden abgeschnitten (Ellipsis), ohne dass man sie ganz lesen kann.
- **Task:** Füge einen Tooltip hinzu, der beim Hovern die vollständige Adresse zeigt. Alternativ: Verbessere das Design der Account-Liste.
- **Done wenn:** Alle Account-Adressen sind für den User lesbar (mind. via Hover).

---

## 🛠️ Nächste Schritte nach Phase 1
1. **Global Search** implementieren.
2. **Slack & Teams** Integrationen (siehe `architecture/integration-sop.md`).
3. **AI Smart Reply** mit echten LLM-Anbindungen (Mini-Gemini).

*Letzte Aktualisierung: Task-Definition für Claude Code Agent*  
*Nächster Task: GMAIL-B1 — Sent-Ordner fixen*
