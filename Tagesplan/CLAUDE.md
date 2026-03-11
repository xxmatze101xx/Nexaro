# CLAUDE.md — Nexaro Agent Briefing (Stand: März 2026)

> Du bist der Lead Engineer von Nexaro. Du arbeitest autonom, ohne auf Anweisungen zu warten.
> Dein Ziel ist es, die Unified Inbox SaaS-App für CEOs zu perfektionieren.
> Du liest diese Datei und arbeitest den Backlog ab.

---

## 🧠 Was ist Nexaro?

Nexaro aggregiert Kommunikation (Gmail, Slack, MS Teams, Outlook, Kalender) auf einer
KI-priorisierten Oberfläche für Executives.

---

## 🏗️ Tech Stack

| Layer | Technologie |
|-------|-------------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend/DB | Firebase (Firestore, Auth, Storage) |
| AI Pipeline | Python (`tools/`), score_importance.py |
| Integrations | Gmail API, Google Calendar API, Slack API, MS Graph |

---

## ⚠️ Invarianten — Absolute Regeln

1. **Keine Adapter ohne Normalisierung** – Jede Nachricht muss durch `normalize_payload.py` laufen.
2. **Firebase Rules** – Beachte die Security Rules in Firestore.
3. **TypeScript strict** – Keine `any`, keine ignorierten Fehler.
4. **Interactive Feedback** – Buttons müssen sofortiges Feedback geben.
5. **Nach jedem Task:** `taskstodo.md` und `progress.md` aktualisieren.
6. **🧠 Self-Learning nach JEDEM Task** – Nach Abschluss jedes einzelnen Tasks MUSS die `NEXARO_KNOWLEDGE.md` aktualisiert werden. Dokumentiere: Was wurde gemacht? Was war die Root-Cause? Welche Gotchas/Pitfalls wurden entdeckt? Welche Architektur-Entscheidungen wurden getroffen? Dies ist NICHT optional — ohne Knowledge-Base-Update gilt ein Task als NICHT abgeschlossen.

---

## 🔴 PHASE 1 — Slack Messaging & Notification System & Settings Redesign

Arbeite diese Liste von oben nach unten ab.

---

### SLACK-B1: Keine Nachrichten werden in Slack Channels empfangen

- **Problem:** In der Slack-Integration werden in Channels keine eingehenden Nachrichten angezeigt. Die Channel-Ansicht bleibt leer bzw. zeigt "No messages found", obwohl im echten Slack-Workspace Nachrichten vorhanden sind.
- **Task:**
  1. Prüfe den Slack-Sync-Mechanismus in `src/lib/integrations/slack/` — werden `conversations.history` API-Calls korrekt für Channels (nicht nur DMs) ausgeführt?
  2. Stelle sicher, dass die Channel-IDs korrekt aufgelöst werden und die Bot-Token-Scopes `channels:history` und `groups:history` enthalten.
  3. Prüfe ob die Nachrichten nach dem Fetch korrekt in Firestore geschrieben und normalisiert werden (`normalize_payload.py`).
  4. Überprüfe, ob der Realtime-Listener (z.B. Slack Events API oder Polling) für Channel-Nachrichten aktiv ist.
  5. Teste sowohl öffentliche als auch private Channels.
- **Relevante Dateien:** `src/lib/integrations/slack/`, `src/app/api/slack/`, `tools/normalize_payload.py`
- **Done wenn:** Neue und bestehende Nachrichten in Slack Channels werden in der Nexaro-Inbox korrekt angezeigt und in Echtzeit aktualisiert.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (Root-Cause, Gotchas, Scope-Probleme etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### SLACK-B2: Keine Nachrichten werden in Slack Direktnachrichten empfangen

- **Problem:** Ähnlich wie bei Channels werden auch in Slack-Direktnachrichten (DMs) keine Nachrichten empfangen und angezeigt.
- **Task:**
  1. Prüfe ob `conversations.history` für DM-Channel-IDs (`im:history` Scope) korrekt aufgerufen wird.
  2. Stelle sicher, dass DM-Channels beim Sync korrekt identifiziert werden (DMs haben einen eigenen Channel-Typ `im`).
  3. Überprüfe die Firestore-Queries, die Nachrichten für die DM-Ansicht laden — filtert der Query korrekt nach Channel-Typ?
  4. Teste mit verschiedenen Usern und prüfe, ob User-IDs korrekt zu Display-Namen aufgelöst werden.
- **Relevante Dateien:** `src/lib/integrations/slack/`, `src/components/message-list.tsx`
- **Done wenn:** Slack-DMs werden empfangen, korrekt angezeigt und der Absender wird mit richtigem Namen dargestellt.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (DM-Channel-Typen, User-ID-Mapping etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### SLACK-B3: Keine Nachrichten können über Slack gesendet werden

- **Problem:** Aus der Nexaro-App heraus können weder in Channels noch in DMs Nachrichten über Slack gesendet werden. Die Sende-Funktion fehlt oder ist defekt.
- **Task:**
  1. Prüfe ob eine Sende-Funktion existiert (`chat.postMessage` API-Call). Falls nicht, implementiere sie.
  2. Stelle sicher, dass der Bot-Token den Scope `chat:write` hat.
  3. Implementiere/repariere den Send-Button im Message-Compose-Bereich für Slack-Konversationen.
  4. Nach dem Senden muss die Nachricht sofort in der lokalen Ansicht erscheinen (optimistisches UI-Update).
  5. Fehlerbehandlung: Zeige dem User eine klare Fehlermeldung, wenn das Senden fehlschlägt (z.B. fehlende Berechtigungen im Channel).
- **Relevante Dateien:** `src/lib/integrations/slack/`, `src/app/api/slack/`, `src/components/message-compose.tsx` (oder ähnlich)
- **Done wenn:** Nachrichten können aus Nexaro heraus in Slack Channels und DMs gesendet werden, erscheinen sofort in der Ansicht und werden im echten Slack-Workspace zugestellt.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (Scope-Requirements, optimistisches UI-Update Pattern etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### UI-P1: Popup-Nachricht navigiert nicht zur entsprechenden Nachricht

- **Problem:** Wenn eine neue Nachricht eingeht und der User auf die Popup-Benachrichtigung (Toast/Notification) klickt, wird er nicht zur entsprechenden Nachricht navigiert. Die Popup-Notification ist nicht mit der Nachricht verlinkt.
- **Task:**
  1. Finde die Toast/Notification-Komponente (vermutlich in `src/components/` — z.B. `notification-toast.tsx` oder ähnlich).
  2. Stelle sicher, dass bei Erstellung der Notification die `messageId` und der zugehörige Ordner/Kanal als Daten mitgegeben werden.
  3. Implementiere einen `onClick`-Handler auf der Notification, der:
     - Zum richtigen Ordner/Kanal navigiert (z.B. Slack Channel, Gmail Inbox)
     - Die spezifische Nachricht selektiert/scrollt
  4. Verwende den Next.js Router (`useRouter`) für die Navigation.
  5. Achte darauf, dass die Navigation sowohl für Gmail, Slack als auch andere Integrationen funktioniert.
- **Relevante Dateien:** `src/components/notification-toast.tsx` (oder ähnlich), `src/components/sidebar.tsx`, Router-Logic
- **Done wenn:** Klick auf eine Popup-Benachrichtigung navigiert den User direkt zur betreffenden Nachricht, die korrekt hervorgehoben/angezeigt wird.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (Notification-Datenstruktur, Router-Navigation-Pattern etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### UI-P2: Einstellung zum Deaktivieren von Popup-Benachrichtigungen

- **Problem:** Es gibt keine Möglichkeit für den User, Popup-Benachrichtigungen (Toasts) zu deaktivieren. Manche User finden die ständigen Popups störend und möchten sie abschalten können.
- **Task:**
  1. Füge in den Settings (`src/app/settings/page.tsx`) eine neue Option "Popup-Benachrichtigungen" hinzu mit einem Toggle-Switch.
  2. Speichere die Einstellung in Firestore unter dem User-Profil (z.B. `users/{uid}/settings.notifications.popupEnabled`).
  3. Lese diese Einstellung in der Notification-Komponente aus und zeige Popups nur an, wenn `popupEnabled === true` (Default: `true`).
  4. Optional: Biete granulare Kontrolle an — z.B. Popups nur für bestimmte Integrationen (Gmail ja, Slack nein).
  5. Der Toggle muss sofort wirksam sein, ohne Page-Reload.
- **Relevante Dateien:** `src/app/settings/page.tsx`, `src/components/notification-toast.tsx`, Firestore User-Settings
- **Done wenn:** Der User kann in den Einstellungen Popup-Benachrichtigungen ein-/ausschalten. Die Einstellung wird sofort angewendet und persistent in Firestore gespeichert.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (Firestore Settings-Schema, Realtime-Toggle-Pattern etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### UI-P3: Settings-Seite Design an restliche App anpassen

- **Problem:** Die Settings-Seite (`/settings`) passt vom Design/Styling nicht zur restlichen Nexaro-Applikation. Es wirkt wie eine eigene, inkonsistente App innerhalb der App — andere Farben, Abstände, Typografie oder Layout-Patterns als im Rest der Inbox-UI.
- **Task:**
  1. Analysiere das bestehende Design-System der Nexaro-App: Farben, Schriftgrößen, Abstände, Border-Radii, Card-Styles, Button-Styles. Orientiere dich an den Hauptseiten (Inbox, Message-Detail-View).
  2. Überarbeite `src/app/settings/page.tsx` und alle Settings-Subkomponenten:
     - Gleiche Hintergrundfarben und Farbpalette wie die Inbox
     - Gleiche Typografie (Font-Family, Font-Sizes, Font-Weights)
     - Gleiche Abstände und Padding-Patterns
     - Konsistente Button-Styles (Primary, Secondary, Destructive)
     - Konsistente Card/Container-Styles
     - Gleicher Sidebar-Stil falls die Settings eine eigene Navigation haben
  3. Stelle sicher, dass die Settings-Seite responsive ist und auf mobilen Geräten genauso gut aussieht wie der Rest der App.
  4. Nutze die bestehenden Tailwind-Klassen aus der App, anstatt neue/eigene Styles einzuführen.
  5. Prüfe Dark-Mode-Kompatibilität, falls die App einen hat.
- **Relevante Dateien:** `src/app/settings/page.tsx`, `src/app/settings/`, globale Styles (`globals.css` oder Tailwind Config), bestehende UI-Komponenten als Referenz
- **Done wenn:** Die Settings-Seite ist visuell nicht mehr von der restlichen App zu unterscheiden — gleiche Farben, Typografie, Abstände, Buttons und Layout-Patterns. Responsive und (falls vorhanden) Dark-Mode-kompatibel.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (Design-System-Tokens, Tailwind-Patterns, Dark-Mode-Handling etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### GMAIL-F1: Initiales Laden der letzten 200 Mails + Auto-Refresh Polling

- **Problem:** Beim ersten Öffnen der Gmail-Inbox werden Mails zu langsam oder unvollständig geladen. Der User muss warten, bis alle Nachrichten da sind, bevor er etwas sieht. Außerdem gibt es kein automatisches Nachladen neuer Mails — der User muss manuell refreshen.
- **Task:**
  1. **Progressive Loading implementieren:** Beim ersten Laden der Gmail-Inbox sollen die letzten 200 Mails abgerufen werden (`messages.list` mit `maxResults`). Wichtig: Die neuesten Mails zuerst laden (absteigend nach Datum), damit der User sofort die aktuellsten Nachrichten sieht.
  2. **Frühzeitige Anzeige (Streaming-UX):** Sobald die ersten ~10 Mails geladen sind, diese sofort in der UI anzeigen. Nicht warten bis alle 200 fertig sind. Implementiere dies z.B. über Batch-Fetching: erste Batch (10 Mails) → UI rendern → restliche Batches im Hintergrund nachladen.
  3. **Loading-State:** Während die restlichen Mails im Hintergrund laden, zeige einen dezenten Loading-Indikator (z.B. Skeleton-Rows oder Spinner am Ende der Liste), damit der User weiß, dass noch mehr kommt.
  4. **Auto-Refresh Polling:** Implementiere einen Polling-Mechanismus, der alle 15–30 Sekunden (konfigurierbar, Default: 30s) nach neuen Mails prüft. Nutze `messages.list` mit dem `after`-Parameter oder `historyId` für inkrementelle Syncs, um nur neue Mails zu holen.
  5. **Neue Mails einfügen:** Wenn neue Mails erkannt werden, füge sie oben in die Liste ein — ohne die aktuelle Scroll-Position zu verändern. Optional: Zeige einen Banner "3 neue Nachrichten" zum Hochscrollen.
  6. **"Mehr laden"-Funktion beibehalten:** Die bestehende Pagination/Load-More-Funktion muss weiterhin funktionieren. Der User soll nach den initialen 200 Mails weitere ältere Mails nachladen können (z.B. via "Ältere Mails laden"-Button oder Infinite Scroll mit `pageToken`/`nextPageToken`).
  7. **Performance:** Nutze die Gmail `format=METADATA` oder `format=MINIMAL` für die Listenansicht, um nicht den vollen Body jeder Mail zu laden. Den vollen Inhalt erst beim Öffnen einer Mail abrufen.
  8. **Fehlerbehandlung:** Bei API-Fehlern oder Rate-Limits soll das Polling graceful pausieren und nach einem Backoff erneut versuchen. Kein Crash oder Error-Toast bei temporären Netzwerkproblemen.
- **Relevante Dateien:** `src/lib/gmail.ts`, `src/lib/integrations/gmail/`, `src/app/api/gmail/`, `src/components/message-list.tsx`
- **Done wenn:**
  - Beim Öffnen der Inbox werden die ersten ~10 Mails sofort angezeigt, während die restlichen (bis 200) im Hintergrund laden.
  - Alle 200 Mails sind nach wenigen Sekunden vollständig geladen.
  - Neue Mails erscheinen automatisch alle 15–30 Sekunden ohne manuellen Refresh.
  - "Mehr laden" / Pagination für ältere Mails funktioniert weiterhin.
  - Kein Flackern, kein Scroll-Jump, saubere UX.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (Gmail API Pagination, historyId-Sync, Batch-Fetching-Pattern, Rate-Limiting etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### GMAIL-F2: Bilder und Dateien als Anhang in E-Mails hochladen

- **Problem:** Beim Verfassen oder Beantworten einer E-Mail in Nexaro können aktuell keine Bilder oder Dateien als Anhang hinzugefügt werden. Eine E-Mail-App ohne Attachment-Funktion ist für CEOs nicht nutzbar — Verträge, Präsentationen, Screenshots etc. müssen versendet werden können.
- **Task:**
  1. **File-Upload-Komponente erstellen:** Implementiere eine Upload-Komponente im Compose-/Reply-Bereich, die per Drag & Drop sowie über einen "Anhang hinzufügen"-Button (📎 Icon) Dateien entgegennimmt.
  2. **Unterstützte Dateitypen:** Alle gängigen Formate erlauben — PDF, DOCX, XLSX, PPTX, PNG, JPG, GIF, ZIP, CSV etc. Setze ein sinnvolles Größenlimit (z.B. 25 MB pro Anhang, analog zu Gmail).
  3. **Bild-Vorschau:** Hochgeladene Bilder (PNG, JPG, GIF) sollen als Thumbnail-Vorschau im Compose-Bereich angezeigt werden. Andere Dateitypen zeigen Dateiname + Größe + ein passendes Icon.
  4. **Mehrere Anhänge:** Der User muss mehrere Dateien gleichzeitig anhängen können. Jeder Anhang soll einzeln entfernbar sein (X-Button).
  5. **Gmail API Integration:** Nutze die Gmail API zum Senden von Mails mit Attachments. Attachments müssen als `multipart/mixed` MIME-Message encodiert werden. Verwende `messages.send` mit Base64-encodiertem MIME-Body. Siehe Gmail API Docs für das korrekte Format.
  6. **Upload-Feedback:** Zeige einen Fortschrittsbalken oder Spinner während des Uploads. Bei Fehlern (Datei zu groß, falsches Format, API-Fehler) eine klare Fehlermeldung anzeigen.
  7. **Inline-Bilder (Optional):** Falls zeitlich machbar, erlaube auch das Einfügen von Bildern direkt im Mail-Body (Inline-Images via `Content-ID`). Ansonsten als Stretch-Goal markieren.
- **Relevante Dateien:** `src/components/message-compose.tsx` (oder ähnlich), `src/lib/gmail.ts`, `src/app/api/gmail/`
- **Done wenn:**
  - Bilder und Dateien können per Drag & Drop oder Button als Anhang hinzugefügt werden.
  - Mehrere Anhänge gleichzeitig möglich, einzeln entfernbar.
  - Bild-Vorschau für Bilddateien, Dateiinfo für andere Typen.
  - E-Mail wird korrekt mit Attachments über die Gmail API versendet und kommt beim Empfänger mit Anhängen an.
  - Sinnvolles Größenlimit mit Fehlermeldung bei Überschreitung.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (MIME-Encoding, Gmail Attachment API, Drag & Drop UX-Patterns etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### UI-P5: Brainstorming + Implementierung — Todo-Bereich mit KI-Generierung aus Mails

- **Problem:** Nexaro hat keinen Todo-Bereich. CEOs erhalten ständig Aufgaben über E-Mails, Slack-Nachrichten etc., aber es gibt keinen zentralen Ort, um diese zu sammeln und abzuarbeiten. Manuelles Todo-Schreiben + KI-basierte Todo-Extraktion aus Nachrichten wären ein starkes Produktivitäts-Feature.
- **Task — PHASE A: Brainstorming (ZUERST!):**
  1. **Brainstorming-Skill aktivieren:** Bevor auch nur eine Zeile Code geschrieben wird, MUSS zuerst ein vollständiges Konzept erarbeitet werden.
  2. **Grundlegende Fragen klären:**
     - Wo lebt der Todo-Bereich? (Eigener Sidebar-Eintrag? Dashboard-Widget? Beides?)
     - Wie sieht ein Todo aus? (Titel, Beschreibung, Priorität, Deadline, Quelle/Herkunft, Status)
     - Welche Stati gibt es? (Offen, In Bearbeitung, Erledigt, Archiviert?)
     - Sollen Todos Kategorien/Tags haben? (z.B. "Finanzen", "HR", "Investor Relations")
  3. **Manuelle Todos:**
     - Wie erstellt der User manuell ein Todo? (Quick-Add-Bar, Floating Action Button, Shortcut?)
     - Inline-Editing oder Modal zum Bearbeiten?
     - Drag & Drop zum Umsortieren/Priorisieren?
     - Subtasks / Checklisten innerhalb eines Todos?
  4. **KI-generierte Todos aus Mails & Nachrichten:**
     - Wie erkennt die KI Action Items in E-Mails? (z.B. "Bitte sende mir bis Freitag den Bericht")
     - Automatisch vs. On-Demand: Sollen Todos automatisch vorgeschlagen werden, oder klickt der User einen "Todos extrahieren"-Button?
     - Wie wird die Verknüpfung zur Ursprungs-Nachricht hergestellt? (Link zurück zur Mail/Slack-Message)
     - Soll die KI auch Deadlines aus dem Kontext extrahieren? ("bis Freitag" → Deadline setzen)
     - Confidence-Score: Soll die KI anzeigen, wie sicher sie sich ist, dass es ein Action Item ist?
     - Batch-Extraktion: Alle ungelesenen Mails auf einmal nach Todos scannen?
  5. **UX-Konzept:**
     - Benachrichtigung bei überfälligen Todos?
     - Tages-/Wochenansicht?
     - Integration ins Dashboard als Widget?
     - Wie interagiert der Todo-Bereich mit dem Kalender? (Todos mit Deadline im Kalender anzeigen?)
  6. **Ergebnis-Datei schreiben:** `Ergebnisse/todo-feature-concept.md`
     - Vollständiges Feature-Konzept mit allen oben genannten Punkten
     - Empfohlene UX-Flows (Wireframe-Beschreibungen)
     - Datenmodell (Firestore-Schema für Todos)
     - KI-Prompt-Strategie für Action-Item-Extraktion
     - Priorisierte Implementierungs-Reihenfolge (MVP → Full Feature)
- **Task — PHASE B: Implementierung (NACH Brainstorming!):**
  7. **Datenmodell erstellen:** Firestore-Collection `users/{uid}/todos` mit dem im Brainstorming definierten Schema anlegen.
  8. **Todo-UI bauen:** Basierend auf dem Brainstorming-Ergebnis den Todo-Bereich implementieren — mindestens: Erstellen, Bearbeiten, Löschen, Abhaken, Sortieren.
  9. **KI-Extraktion implementieren:** Button "Todos aus Mail extrahieren" + Hintergrund-Analyse für automatische Vorschläge. Vorgeschlagene Todos müssen vom User bestätigt werden bevor sie in die Liste kommen.
  10. **Sidebar-Integration:** Todo-Bereich als eigenen Menüpunkt in die Sidebar aufnehmen mit Ungelesen-/Offen-Zähler.
  11. **Dashboard-Widget:** Todo-Widget für das personalisierbare Dashboard erstellen (siehe UI-P4).
- **Relevante Dateien:** `src/components/sidebar.tsx`, `src/app/todos/` (neu), `src/components/todo-*.tsx` (neu), Firestore Rules, AI-Pipeline
- **Done wenn:**
  - Brainstorming-Ergebnis liegt in `Ergebnisse/todo-feature-concept.md`
  - User kann manuell Todos erstellen, bearbeiten, priorisieren und abhaken
  - KI kann aus E-Mails und Nachrichten Action Items extrahieren und als Todo-Vorschläge anbieten
  - Todos sind über die Sidebar erreichbar und als Dashboard-Widget verfügbar
  - Jedes Todo hat eine Rückverlinkung zur Ursprungs-Nachricht (falls KI-generiert)
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (KI-Prompt-Design für Action-Item-Extraktion, Firestore-Schema-Patterns, Todo-UX-Best-Practices etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### INFRA-F1: Brainstorming — Neue Integrationen planen (Outlook, Teams, Proton Mail, HubSpot, Jira, Linear, Salesforce)

- **Problem:** Nexaro unterstützt bisher nur Gmail, Slack und Google Calendar. Um für CEOs wirklich als Unified Inbox zu funktionieren, müssen weitere geschäftskritische Tools integriert werden.
- **Task:**
  1. **Ordner erstellen:** Erstelle den Ordner `Ergebnisse/` im Projekt-Root, falls er noch nicht existiert.
  2. **Brainstorming-Skill aktivieren:** Nutze deinen Brainstorming-Skill, um für JEDE der folgenden Integrationen eine durchdachte Analyse zu erstellen:
     - **Microsoft Outlook** (E-Mail via MS Graph API)
     - **Microsoft Teams** (Chat & Channels via MS Graph API)
     - **Proton Mail** (E-Mail via Proton Bridge / API)
     - **HubSpot** (CRM-Kontakte, Deals, E-Mails via HubSpot API)
     - **Jira** (Tickets, Kommentare, Zuweisungen via Atlassian REST API)
     - **Linear** (Issues, Projekte, Kommentare via Linear GraphQL API)
     - **Salesforce** (CRM-Daten, Leads, Opportunities via Salesforce REST API)
  3. **Pro Integration analysieren:**
     - Welche API wird verwendet? (REST, GraphQL, OAuth-Flow)
     - Welche Daten sollen in die Nexaro-Inbox fließen? (Nachrichten, Tickets, CRM-Updates etc.)
     - Wie sieht die Normalisierung in das bestehende Nexaro-Message-Schema aus?
     - Welche OAuth-Scopes werden benötigt?
     - Welche Herausforderungen/Limitierungen gibt es? (Rate-Limits, Webhooks vs. Polling, Kosten)
     - Priorisierung: Wie wichtig ist diese Integration für die CEO-Zielgruppe?
     - Geschätzter Aufwand (S/M/L/XL)
  4. **Ergebnis-Datei schreiben:** Schreibe die gesamte Brainstorming-Analyse in eine einzelne Datei: `Ergebnisse/integrations-brainstorming.md`
     - Übersichtliches Format mit einer Sektion pro Integration
     - Am Ende eine Empfehlung für die Implementierungs-Reihenfolge
- **Relevante Dateien:** Bestehende Integrationen als Referenz: `src/lib/integrations/gmail/`, `src/lib/integrations/slack/`, `tools/normalize_payload.py`
- **Done wenn:** Die Datei `Ergebnisse/integrations-brainstorming.md` existiert und enthält für alle 7 Integrationen eine vollständige Analyse inkl. API-Details, Normalisierung, Herausforderungen und Aufwandsschätzung.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (API-Vergleiche, OAuth-Patterns, Normalisierungs-Strategien etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### INFRA-F2: Research — Welche weiteren Tools könnten verbunden werden?

- **Problem:** Über die bereits geplanten 7 Integrationen hinaus gibt es möglicherweise weitere Tools, die für CEOs und Executives relevant sind und in eine Unified Inbox gehören. Diese müssen identifiziert und bewertet werden.
- **Task:**
  1. **Stelle sicher, dass der Ordner `Ergebnisse/` existiert** (wurde ggf. schon in INFRA-F1 erstellt).
  2. **Umfassende Recherche durchführen:** Recherchiere, welche weiteren Tools und Plattformen für eine CEO-Unified-Inbox relevant sein könnten. Denke dabei an folgende Kategorien:
     - **Kommunikation:** Weitere E-Mail-Provider (Yahoo, Fastmail, Zoho Mail), Chat-Tools (Discord, Telegram, WhatsApp Business, Signal)
     - **Projektmanagement:** Asana, Monday.com, Notion, Trello, ClickUp, Basecamp
     - **CRM & Sales:** Pipedrive, Freshsales, Zoho CRM, Close.com
     - **Support & Ticketing:** Zendesk, Freshdesk, Intercom, Front
     - **Kalender & Scheduling:** Calendly, Cal.com, Microsoft Bookings
     - **Dokumente & Wissen:** Google Drive, Dropbox, Confluence, SharePoint
     - **Social Media:** LinkedIn Messages, Twitter/X DMs
     - **Finanzen:** Stripe Notifications, QuickBooks Alerts
     - **Sonstiges:** GitHub Issues/PRs, GitLab, Webhooks (generisch)
  3. **Pro Tool bewerten:**
     - Relevanz für die CEO-Zielgruppe (Hoch/Mittel/Niedrig)
     - API-Verfügbarkeit und -Qualität
     - Integrations-Aufwand
     - Marktabdeckung (wie viele potenzielle Nexaro-User nutzen dieses Tool?)
  4. **Ergebnis-Datei schreiben:** Schreibe die gesamte Recherche in eine einzelne Datei: `Ergebnisse/further-integrations-research.md`
     - Gruppiert nach Kategorien
     - Top-10-Empfehlungen am Anfang hervorgehoben
     - Für jedes empfohlene Tool: kurze Begründung warum es Priorität haben sollte
- **Done wenn:** Die Datei `Ergebnisse/further-integrations-research.md` existiert und enthält eine kategorisierte Übersicht aller relevanten Tools mit Bewertung, API-Infos und einer priorisierten Top-10-Liste.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (Tool-Landscape, API-Qualität verschiedener Anbieter, Marktanalyse etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### AI-F1: Brainstorming — Welche KI für Mail-Priorisierung & Draft-Generierung?

- **Problem:** Nexaro braucht eine KI-Komponente, die zwei Kernaufgaben übernimmt: (1) eingehende Mails nach Wichtigkeit für CEOs bewerten/priorisieren und (2) intelligente Antwort-Drafts generieren. Die Wahl des richtigen AI-Modells bzw. der richtigen Architektur ist entscheidend für Qualität, Kosten und Geschwindigkeit.
- **Task:**
  1. **Brainstorming-Skill aktivieren:** Nutze deinen Brainstorming-Skill, um eine umfassende Analyse der AI-Optionen zu erstellen.
  2. **Mail-Priorisierung analysieren — Modell-Optionen:**
     - **OpenAI** (GPT-4o, GPT-4o-mini) — Kosten, Latenz, Qualität für Classification-Tasks
     - **Anthropic Claude** (Sonnet, Haiku) — Vergleich bei Importance-Scoring, Kosten pro Token
     - **Google Gemini** (Flash, Pro) — Preis-Leistung für Batch-Processing
     - **Open-Source Modelle** (Llama, Mistral, Phi) — Self-Hosted vs. API, Kosten bei Scale
     - **Fine-Tuned Modelle** — Lohnt sich ein eigenes Fine-Tuning für CEO-spezifische Priorisierung?
     - **Klassische ML** (BERT, Logistic Regression) — Reicht ein einfacheres Modell für Scoring?
  3. **Draft-Generierung analysieren:**
     - Welches Modell liefert die besten professionellen E-Mail-Antworten im CEO-Stil?
     - Kontextfenster-Anforderungen (Thread-History, Absender-Kontext, Unternehmenskontext)
     - Personalisierung: Wie kann die KI den Schreibstil des Users lernen?
     - Mehrsprachigkeit (Deutsch/Englisch mindestens)
     - Latenz-Anforderungen: Draft muss in <2 Sekunden verfügbar sein
  4. **Architektur-Entscheidungen:**
     - Eigene API vs. Provider-API direkt aus dem Frontend?
     - Caching-Strategien für wiederkehrende Priorisierungsmuster
     - Hybrid-Ansatz: Günstiges Modell für Scoring + Premium-Modell für Drafts?
     - Privacy/Datenschutz: Wo werden die Mails verarbeitet? DSGVO-Konformität?
     - Kosten-Hochrechnung: Was kostet die KI pro User/Monat bei verschiedenen Szenarien?
  5. **Ergebnis-Datei schreiben:** `Ergebnisse/ai-model-analysis.md`
     - Vergleichstabelle aller Modelle (Kosten, Qualität, Latenz, Privacy)
     - Empfehlung für Priorisierung (inkl. Begründung)
     - Empfehlung für Draft-Generierung (inkl. Begründung)
     - Architektur-Vorschlag mit Diagramm-Beschreibung
     - Kosten-Kalkulation pro 1.000 / 10.000 / 100.000 User
- **Done wenn:** Die Datei `Ergebnisse/ai-model-analysis.md` existiert und enthält einen vollständigen Modell-Vergleich, klare Empfehlungen für Priorisierung und Drafts, einen Architektur-Vorschlag und eine Kostenkalkulation.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (Modell-Benchmarks, Kosten-Vergleiche, Architektur-Patterns für AI-Pipelines etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### AI-F2: Brainstorming — Abo-Modelle & Pricing-Strategie für Nexaro

- **Problem:** Nexaro braucht ein Preismodell, das für das Unternehmen profitabel ist und gleichzeitig für CEO-Nutzer attraktiv und bequem bleibt. Die richtige Balance zwischen Umsatz und User-Experience ist entscheidend für Wachstum.
- **Task:**
  1. **Brainstorming-Skill aktivieren:** Nutze deinen Brainstorming-Skill, um verschiedene Abo-Modelle durchzuspielen.
  2. **Markt-Analyse:**
     - Was verlangen vergleichbare Tools? (Superhuman, Front, Shortwave, Spark, Sanebox, Missive etc.)
     - Welche Pricing-Modelle nutzen sie? (Flat-Fee, Per-Seat, Usage-Based, Freemium)
     - Was ist die Zahlungsbereitschaft von CEOs/Executives für Produktivitäts-Tools?
  3. **Abo-Modelle durchspielen:**
     - **Free Tier:** Was wird kostenlos angeboten? (z.B. 1 Integration, limitierte AI-Features)
     - **Pro/Business Tier:** Welche Features sind Premium? (mehrere Integrationen, AI-Drafts, Priorisierung)
     - **Enterprise Tier:** Was rechtfertigt Enterprise-Pricing? (SSO, Admin-Dashboard, Priority Support, Custom AI-Training)
     - **Usage-Based Komponenten:** Lohnt sich ein Pay-per-AI-Call Modell zusätzlich? (z.B. X Drafts/Monat inklusive, danach Extra-Kosten)
     - **Jahres- vs. Monatsabos:** Wie viel Rabatt bei Jahreszahlung?
  4. **Kosten-Kalkulation:**
     - Was kostet Nexaro pro User/Monat? (Server, AI-API-Kosten, Firebase, Support)
     - Ab welchem Preis wird es profitabel?
     - Break-Even-Analyse bei verschiedenen User-Zahlen
  5. **Bequemlichkeit für den Nutzer:**
     - Einfacher Onboarding-Flow (keine Kreditkarte für Free Tier?)
     - Transparente Pricing-Page
     - Upgrade/Downgrade ohne Friction
     - Testphase-Strategie (14 Tage? 30 Tage? Feature-limitiert vs. Zeit-limitiert?)
  6. **Ergebnis-Datei schreiben:** `Ergebnisse/pricing-strategy.md`
     - Übersicht aller analysierten Modelle mit Vor- und Nachteilen
     - Konkrete Tier-Empfehlung (Free / Pro / Enterprise) mit Features pro Tier
     - Preisempfehlung pro Tier (monatlich + jährlich)
     - Kosten-Kalkulation und Break-Even-Analyse
     - Vergleichstabelle mit Wettbewerbern
- **Done wenn:** Die Datei `Ergebnisse/pricing-strategy.md` existiert und enthält eine vollständige Pricing-Analyse mit konkreten Tier-Empfehlungen, Preispunkten, Kosten-Kalkulation und Wettbewerber-Vergleich.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (SaaS-Pricing-Patterns, Kosten-Strukturen, Wettbewerber-Preise etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### UI-P4: Brainstorming — Dashboard-Inhalt neu konzipieren (Personalisierbares Widget-Dashboard)

- **Problem:** Das Dashboard zeigt aktuell einfach die Gmail-Inbox an. Das ergibt keinen Sinn, da es für Gmail bereits einen eigenen Bereich in der App gibt. Das Dashboard ist damit ein nutzloser Duplikat-View und verschenkt die Chance, dem CEO auf einen Blick das Wichtigste zu zeigen.
- **Task:**
  1. **Brainstorming-Skill aktivieren:** Nutze deinen Brainstorming-Skill, um zu konzipieren, was ein CEO-Dashboard wirklich zeigen sollte.
  2. **Analyse des aktuellen Zustands:**
     - Was zeigt das Dashboard gerade? (Gmail-Inbox-Duplikat)
     - Warum ist das schlecht? (Redundanz, kein Mehrwert, verwirrend für den User)
  3. **Kernkonzept: Personalisierbares Widget-Dashboard.** Das Dashboard soll aus frei konfigurierbaren Widgets bestehen, die der User selbst zusammenstellen kann. Jeder CEO hat andere Prioritäten — das Dashboard muss das widerspiegeln. Brainstorme folgende Widget-Ideen und bewerte sie:
     - **Tagesübersicht / "Dein Tag auf einen Blick":** Anstehende Termine (Google Calendar), wichtigste ungelesene Mails, offene Slack-Threads
     - **KI-priorisierte Highlights:** Die Top 5–10 wichtigsten Nachrichten über alle Integrationen hinweg (nicht nur Gmail)
     - **Action Items / To-Dos:** Von der KI extrahierte Aufgaben aus Mails und Nachrichten
     - **Ungelesen-Zähler pro Integration:** Gmail (12), Slack (5), Teams (3) — als schnelle Übersicht
     - **Quick Actions:** Schnellzugriff auf häufige Aktionen (Mail verfassen, Slack-Nachricht senden etc.)
     - **Kalender-Widget:** Nächste 3–5 Termine mit Meeting-Kontext (wer ist dabei, gibt es relevante Mails/Threads dazu?)
     - **Aktivitäts-Feed:** Chronologischer Stream über alle Kanäle (neueste Aktivitäten zuerst)
     - **KI-generierte Zusammenfassung:** "Seit deinem letzten Login ist Folgendes passiert..."
     - **Statistiken / Analytics:** Antwortzeiten, unbearbeitete Nachrichten-Trend, Kommunikationsvolumen
     - **VIP-Kontakte:** Nachrichten von bestimmten Personen (Board Members, Investoren) hervorgehoben
     - **Krypto & Aktien Overview:** Live-Widget das ausgewählte Kryptowährungen und Aktien mit aktuellen Kursen und prozentualer Veränderung (grün/rot) anzeigt. Der User wählt selbst welche Ticker er sehen will (z.B. BTC, ETH, AAPL, TSLA). Datenquelle z.B. CoinGecko API (Krypto) + Alpha Vantage / Yahoo Finance API (Aktien). Kompakte Darstellung mit Sparkline-Charts.
     - **Wetter-Widget:** Aktuelles Wetter am Standort des Users (relevant für Reise-CEOs)
     - **Notizen / Quick Notes:** Kleines Notepad für schnelle Gedanken direkt auf dem Dashboard
     - **Bookmarks / Favoriten:** Schnellzugriff auf wichtige Links, Dokumente oder Kontakte
     - **Kanban-Widget:** Mini-Kanban-Board direkt auf dem Dashboard (z.B. Spalten: "Zu erledigen", "In Arbeit", "Erledigt") — ideal für schnelles Task-Management ohne den Todo-Bereich zu öffnen. Cards per Drag & Drop zwischen Spalten verschieben.
     - **Docs-Widget:** Schnellzugriff auf zuletzt bearbeitete oder gepinnte Dokumente aus verbundenen Diensten (Google Drive, Dropbox, SharePoint etc.). Zeigt Vorschau, letztes Änderungsdatum und wer zuletzt bearbeitet hat. Direkter Link zum Öffnen.
     - **AI-Widget:** Persönlicher KI-Assistent direkt auf dem Dashboard — ein kompaktes Chat-Fenster für schnelle Fragen ("Was waren die wichtigsten Mails heute?", "Fasse den Slack-Thread zusammen", "Schreibe eine Antwort an..."). Kontextbewusst: Die KI hat Zugriff auf alle verbundenen Integrationen und kann sofort handeln.
     - **Goals-Widget:** Persönliche oder Team-Ziele definieren und tracken (z.B. "Q2 Revenue Target: 500k" mit Fortschrittsbalken). OKR-Style oder einfache Ziel-Definitionen mit Prozent-Tracking.
     - **Reporting-Widget:** Kompakte Reports und KPIs auf einen Blick — z.B. wöchentliche Kommunikations-Statistiken, Antwortzeiten, erledigte Todos, offene Action Items. Auto-generiert aus den Nexaro-Daten.
     - **Milestones-Widget:** Wichtige Projekt-Meilensteine mit Timeline-Ansicht. Zeigt anstehende Deadlines, erreichte Milestones und den Fortschritt wichtiger Projekte. Verknüpfung mit Todos und Kalender möglich.
     - **File Manager-Widget:** Mini-Dateimanager direkt auf dem Dashboard — zeigt zuletzt geteilte, empfangene oder hochgeladene Dateien aus allen Integrationen (Gmail-Anhänge, Slack-Files, Drive-Docs). Schnellsuche und Vorschau integriert.
     - **Gantt Chart-Widget:** Visuelle Projekt-Timeline als Gantt-Diagramm. Zeigt Tasks, Abhängigkeiten und Deadlines auf einer Zeitachse. Ideal für CEOs die mehrere Projekte parallel überblicken müssen. Interaktiv: Balken per Drag & Drop verschieben.
     - *(Weitere Widget-Ideen sollen durch Brainstorming und Research ergänzt werden — die obige Liste ist ein Startpunkt, keine abschließende Aufzählung!)*
  4. **Widget-Personalisierung — UX-Konzept:**
     - Wie fügt der User Widgets hinzu? (z.B. "+" Button → Widget-Galerie mit Vorschau)
     - Wie ordnet der User Widgets an? (Drag & Drop Grid-Layout, ähnlich wie Notion oder iOS Home Screen)
     - Wie entfernt/versteckt der User Widgets? (X-Button oder Kontextmenü)
     - Widget-Größen: Sollen Widgets verschiedene Größen haben können? (1x1, 2x1, 2x2 etc.)
     - Default-Layout: Was sieht ein neuer User beim ersten Login? (Sinnvolle Vorauswahl)
     - Persistenz: Widget-Konfiguration in Firestore speichern (`users/{uid}/dashboard.widgets`)
     - Mobile: Wie verhalten sich Widgets auf kleinen Screens? (1-Spalten-Stack)
  5. **Vergleich mit Wettbewerbern:**
     - Was zeigen Superhuman, Front, Spark, Shortwave auf ihrem Dashboard?
     - Was machen klassische Executive-Dashboards (z.B. Monday.com, Notion) gut?
     - Wie funktionieren Widget-basierte Dashboards bei Konkurrenten? (z.B. Notion, Apple Widgets, Windows Widgets)
  6. **Technische Architektur der Widget-Engine:**
     - Wie wird das Widget-System gebaut? (z.B. React-Komponenten mit einer Widget-Registry)
     - Wie werden Widgets lazy-loaded, damit das Dashboard schnell bleibt?
     - Wie kommunizieren Widgets mit Datenquellen? (eigener Hook pro Widget vs. zentraler Data-Layer)
     - Können Third-Party-Widgets später hinzugefügt werden? (Plugin-System)
  7. **Ergebnis-Datei schreiben:** `Ergebnisse/dashboard-concept.md`
     - Analyse des aktuellen Problems
     - Alle Widget-Ideen mit Bewertung (Must-Have / Nice-to-Have / Später)
     - Personalisierungs-UX-Konzept (Hinzufügen, Anordnen, Entfernen, Größen)
     - Empfohlenes Default-Layout für neue User
     - Technischer Architektur-Vorschlag für die Widget-Engine
     - Wettbewerber-Vergleich
     - Priorisierte Implementierungs-Reihenfolge
- **Done wenn:** Die Datei `Ergebnisse/dashboard-concept.md` existiert und enthält ein vollständiges Widget-Dashboard-Konzept inkl. aller Widget-Ideen, Personalisierungs-UX, Default-Layout, technischer Architektur und Priorisierung.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (Dashboard-UX-Patterns, Widget-Architektur, CEO-Workflows etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### AI-F3: Brainstorming + Implementierung — Persönlicher KI-Assistent mit Schreibstil-Training

- **Problem:** Nexaro hat keine tiefgreifende KI-Integration. CEOs brauchen mehr als nur eine Inbox — sie brauchen einen persönlichen digitalen Chief of Staff, der sie *kennt*: ihren Schreibstil, ihre Prioritäten, ihre Kontakte, ihren Kontext. Gleichzeitig muss die KI für Nexaro als Unternehmen kosteneffizient bleiben.
- **Task — PHASE A: Brainstorming (ZUERST!):**
  1. **Brainstorming-Skill aktivieren:** Bevor auch nur eine Zeile Code geschrieben wird, MUSS zuerst ein vollständiges Konzept erarbeitet werden.
  2. **Schreibstil-Training / Personalisierung:**
     - Wie lernt die KI den Schreibstil des Users? (Analyse der letzten 50–100 gesendeten Mails → Tonalität, Grußformeln, Satzlänge, Formalität, Sprache)
     - Fine-Tuning vs. Few-Shot-Prompting vs. RAG mit User-Beispielen — was ist am kosteneffizientesten?
     - Soll der User den Schreibstil manuell anpassen können? (z.B. "formeller", "kürzer", "freundlicher")
     - Mehrere Schreibstile pro User? (z.B. formell für Investoren, locker für Team-Slack)
     - Wie wird der Schreibstil persistent gespeichert? (Firestore User-Profil mit Style-Vektoren/Beispielen)
     - Privacy: Wo werden die Schreibstil-Daten verarbeitet? DSGVO-konform?
  3. **KI-Tab / Chat-Interface:**
     - Eigener Tab in der Sidebar: "KI-Assistent" mit Chat-Interface
     - Beispiel-Queries die funktionieren müssen:
       - "Wie viele ungelesene Mails habe ich?"
       - "Fasse mir die Mail von Thomas zusammen"
       - "Was passiert gerade im #sales Slack-Channel?"
       - "Schreibe eine Antwort an den Investor im gleichen Ton wie meine letzte Mail an ihn"
       - "Welche Action Items habe ich diese Woche?"
       - "Erstelle einen Draft für eine Absage an Bewerber XY"
     - Die KI muss Zugriff auf alle verbundenen Integrationen haben (Gmail, Slack, Calendar, etc.)
     - Kontextfenster-Management: Wie wird der relevante Kontext effizient an die KI übergeben?
     - Chat-History: Werden vergangene KI-Konversationen gespeichert?
  4. **Kosten-Optimierung (KRITISCH!):**
     - Hybrid-Ansatz: Einfache Fragen (Zähler, Status) → direkte Firestore-Queries OHNE LLM-Call
     - Zusammenfassungen, einfache Drafts → günstiges Modell (Haiku, GPT-4o-mini, Gemini Flash)
     - Komplexe Drafts, Schreibstil-Matching → Premium-Modell (Sonnet, GPT-4o)
     - Routing-Logik: Wie wird entschieden welches Modell für welche Anfrage genutzt wird?
     - Caching: Wiederkehrende Anfragen (z.B. "ungelesene Mails") cachen statt neu abfragen
     - Ziel-Kosten: <1–2€ pro User/Monat für KI-Nutzung
     - Token-Budget pro User/Tag oder Monat? (Fair-Use-Limit)
  5. **KI als "digitales Ich":**
     - Die KI soll sich anfühlen wie eine Erweiterung des Users, nicht wie ein generischer Bot
     - Kontextbewusstsein: Die KI merkt sich Präferenzen über die Zeit ("Du bevorzugst kurze Antworten", "Du duzt dein Team aber siezt Investoren")
     - Proaktive Vorschläge: "Du hast 3 Mails von deinem Investor unbeantwortet — soll ich Drafts erstellen?"
     - Lernkurve: Je mehr der User die KI nutzt, desto besser wird sie (Feedback-Loop)
  6. **Ergebnis-Datei schreiben:** `Ergebnisse/ai-assistant-concept.md`
     - Vollständiges Feature-Konzept
     - Schreibstil-Training-Architektur (mit Kosten-Vergleich der Ansätze)
     - KI-Tab UX-Design (Chat-Interface, Beispiel-Flows)
     - Modell-Routing-Strategie (günstig vs. premium)
     - Kosten-Kalkulation pro User/Monat
     - Privacy/DSGVO-Analyse
     - Priorisierte Implementierungs-Reihenfolge (MVP → Full Feature)
- **Task — PHASE B: Implementierung (NACH Brainstorming!):**
  7. **KI-Tab UI bauen:** Chat-Interface als eigenen Sidebar-Eintrag mit Nachrichtenverlauf.
  8. **Query-Router implementieren:** Routing-Logik die entscheidet: direkte DB-Query vs. günstiges LLM vs. Premium-LLM.
  9. **Integration-Kontext-Layer:** API die der KI Zugriff auf alle verbundenen Integrationen gibt (Mails lesen, Slack-Channels abfragen, Kalender checken).
  10. **Schreibstil-Analyse:** Pipeline die gesendete Mails des Users analysiert und ein Schreibstil-Profil erstellt.
  11. **Draft-Generierung mit Stil:** Antwort-Drafts die im Schreibstil des Users verfasst werden, basierend auf dem Profil.
  12. **Feedback-Loop:** User kann generierte Drafts bewerten (Daumen hoch/runter) → KI verbessert sich über Zeit.
- **Relevante Dateien:** `src/app/ai/` (neu), `src/components/ai-chat.tsx` (neu), `src/lib/ai/`, AI-Pipeline, Firestore User-Settings
- **Done wenn:**
  - Brainstorming-Ergebnis liegt in `Ergebnisse/ai-assistant-concept.md`
  - KI-Tab existiert in der Sidebar mit funktionierendem Chat-Interface
  - User kann Fragen zu seinen Mails, Slack-Channels, Kalender stellen und bekommt kontextbewusste Antworten
  - Drafts werden im Schreibstil des Users generiert
  - Kosten pro User bleiben unter 2€/Monat
  - Query-Routing funktioniert (einfache Fragen = kein LLM-Call)
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (LLM-Routing-Patterns, Schreibstil-Extraktion, Kosten-Optimierung, Context-Window-Management etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

### FINAL: Setup-Guide — OAuth-Konfiguration & Deployment-Anleitung

- **Problem:** Nach Abschluss aller Tasks muss Matteo wissen, welche OAuths konfiguriert werden müssen, welche API-Keys wo eingetragen werden, welche Scopes aktiviert sein müssen und wie das Deployment funktioniert. Ohne eine detaillierte Anleitung ist die App nicht lauffähig.
- **Task:**
  1. **Nach Abschluss ALLER vorherigen Tasks** erstelle ein umfassendes Setup-Dokument.
  2. **Pro Integration dokumentieren:**
     - Welche OAuth-App muss wo erstellt werden? (Google Cloud Console, Slack API Dashboard, Microsoft Azure Portal, etc.)
     - Schritt-für-Schritt: Wo klickt man, was trägt man ein, welche URLs werden benötigt
     - Welche Scopes/Permissions müssen aktiviert werden? (Exakte Liste pro Integration)
     - Welche Environment-Variables müssen gesetzt werden? (Name, Beschreibung, wo man den Wert herbekommt)
     - Redirect-URIs: Welche URLs müssen als Callback registriert werden?
  3. **API-Keys & Secrets:**
     - Vollständige Liste aller benötigten API-Keys, Client-IDs, Client-Secrets
     - Pro Key: Wo wird er erstellt? Wo wird er in der App eingetragen? (`.env.local`, Firebase Config, etc.)
     - Welche Keys sind kostenlos, welche kosten Geld? (z.B. AI-API-Keys)
  4. **Firebase Setup:**
     - Firestore Security Rules die deployed werden müssen
     - Firebase Auth Konfiguration (welche Provider aktivieren)
     - Firebase Storage Rules falls benötigt
  5. **Deployment:**
     - Vercel-Konfiguration (Environment Variables, Build Settings)
     - Domain-Setup (matteo.cacic.at)
     - Post-Deployment-Checks: Was muss nach dem Deploy getestet werden?
  6. **Ergebnis-Datei:** `Ergebnisse/setup-guide.md`
     - So detailliert wie möglich — Matteo soll die Anleitung Schritt für Schritt abarbeiten können ohne raten zu müssen
     - Screenshots-Beschreibungen wo nötig (z.B. "Klicke auf 'Create OAuth Client' → wähle 'Web Application'")
     - Troubleshooting-Sektion: Häufige Fehler und deren Lösung
- **Done wenn:** Die Datei `Ergebnisse/setup-guide.md` existiert und enthält eine vollständige, Schritt-für-Schritt-Anleitung für ALLE OAuth-Konfigurationen, API-Keys, Firebase-Setup und Deployment — so detailliert dass jemand ohne Vorwissen die App zum Laufen bringen kann.
- **🧠 Self-Learning:** Nach Abschluss → Erkenntnisse (OAuth-Flows, API-Key-Management, Deployment-Pitfalls etc.) in `NEXARO_KNOWLEDGE.md` loggen.

---

## 🛠️ Nächste Schritte nach Phase 1

- Gmail-Sende-Funktion (Reply, Forward) verbessern
- KI-Priorisierung in der Inbox verfeinern
- Keyboard-Shortcuts für Power-User
- Integrationen aus INFRA-F1 Brainstorming umsetzen (basierend auf priorisierter Reihenfolge)
- Dashboard-Widget-System implementieren (basierend auf UI-P4 Brainstorming)
- Todo-Feature ausbauen (basierend auf UI-P5 Brainstorming)
- Persönlichen KI-Assistenten ausbauen (basierend auf AI-F3 Brainstorming)

---

*Letzte Aktualisierung: 11. März 2026*
*Nächster Task: SLACK-B1 — Keine Nachrichten werden in Slack Channels empfangen*

---
