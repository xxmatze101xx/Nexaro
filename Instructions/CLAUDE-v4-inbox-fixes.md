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

1. **TypeScript strict** — Keine `any`, keine ignorierten Fehler.
2. **Tailwind CSS** — Kein inline CSS, nur Tailwind-Klassen.
3. **Responsive** — Layout muss auf verschiedenen Bildschirmgrößen funktionieren.
4. **Kein `alert()`** — Immer inline Error-Banner mit `useState` (siehe Knowledge Base).
5. **Firestore onSnapshot** — Immer `if (!user) return;` Guard + Error-Handler als 3. Argument.
6. **Nach jedem Task:** `taskstodo.md` und `progress.md` aktualisieren.
7. **Nach jedem abgeschlossenen Task:** Den `nexaro-self-learning` Skill einmal durchlaufen lassen, um Learnings, Gotchas und Architektur-Entscheidungen in `NEXARO_KNOWLEDGE.md` festzuhalten. Das ist PFLICHT — kein optionaler Schritt.

---

## 🔴 PHASE 1 — Email Detail Panel: Body nimmt nicht den vollen Platz ein

### UI-P1: Email-Body wird nur zu ~1/3 angezeigt, Rest ist leerer Raum

**Problem:** Wenn man im Dashboard eine Nachricht anklickt, öffnet sich rechts das Detail-Panel. Der eigentliche Email-Body (z.B. eine Twitch-Notification mit Logo und Text) nimmt nur ca. ein Drittel des verfügbaren Platzes ein. Darunter ist viel leerer Raum bis zum "Generate Draft" Button ganz unten. Der User muss innerhalb des Panels runterscrollen um die ganze Mail zu sehen — obwohl genug Platz da wäre um alles auf einmal anzuzeigen.

**⚠️ Bekanntes Gotcha aus Knowledge Base:** Das Detail-Panel wurde bereits einmal auf ein 3-Sektionen Flex-Layout umgebaut (`flex-shrink-0` Header → `flex-1 overflow-y-auto min-h-[400px]` Body → `flex-shrink-0 max-h-[280px]` AI Draft). Trotzdem zeigt der Body nicht den vollen Platz an. Das Problem liegt wahrscheinlich NICHT am Flex-Layout selbst, sondern an einem der folgenden:

**Mögliche Ursachen (alle prüfen!):**

1. **iframe-Höhe:** Der Email-Body wird oft als `<iframe>` gerendert (für HTML-Mails). Wenn das iframe eine feste Höhe hat oder `height: auto` statt `height: 100%`, füllt es den `flex-1` Container nicht aus. Das iframe muss `h-full w-full` oder `min-h-full` haben.

2. **Outer Container Constraint:** Das gesamte rechte Panel bekommt möglicherweise seine Höhe nicht korrekt vererbt. Prüfe ob die Parent-Container von `ai-draft-panel.tsx` alle `h-full` oder `flex-1` haben — von `page.tsx` bis runter zum Panel.

3. **`min-h-[400px]` zu klein auf großen Screens:** Auf einem 1440p Monitor (1440px Höhe, abzüglich Header ~120px = ~1320px verfügbar) sind 400px nur ~30%. Der Body-Container braucht möglicherweise `min-h-[50vh]` statt einer fixen px-Größe.

4. **Content vs Container:** Wenn der Email-Content selbst klein ist (z.B. kurze Mail), soll der Container trotzdem den vollen Platz einnehmen — der "Generate Draft" Button soll immer ganz unten am Panel kleben, nicht direkt unter dem Content.

**Dateien:**
- `src/components/ai-draft-panel.tsx` — Hauptdatei für das Detail-Panel Layout
- `src/app/page.tsx` — Dashboard-Layout, prüfe wie das rechte Panel eingebunden wird (ca. Zeile 911-1001)

**Task:**

1. Öffne `src/components/ai-draft-panel.tsx` und analysiere die aktuelle Flex-Struktur
2. Prüfe die gesamte Container-Kette von `page.tsx` bis zum Body-Container:
   - Hat jeder Parent `h-full` oder `flex-1`?
   - Gibt es irgendwo ein `overflow-hidden` das die Höhe abschneidet?
3. Prüfe wie der Email-Body gerendert wird:
   - Wenn iframe: Hat es `h-full w-full`? Oder eine feste Höhe?
   - Wenn plain text: Ist der Container `flex-1`?
4. Stelle sicher dass der "Generate Draft" / AI Draft Bereich **immer am unteren Rand** des Panels klebt — unabhängig davon wie viel Content die Email hat
5. Das Layout soll so aussehen:

```
┌─────────────────────────────────────┐
│ Source Badge + Close Button         │  flex-shrink-0
├─────────────────────────────────────┤
│ Sender / Subject / Date            │  flex-shrink-0
├─────────────────────────────────────┤
│                                     │
│                                     │
│   EMAIL BODY                        │  flex-1 (nimmt ALLEN Restplatz)
│   (iframe oder text)                │  overflow-y-auto
│   h-full auf dem iframe!            │  min-h-0 (wichtig für flex!)
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ AI Draft / Reply (kompakt)          │  flex-shrink-0, max-h-[250px]
└─────────────────────────────────────┘
```

6. **Wichtig:** Setze `min-h-0` auf den Body-Container — das ist ein bekannter Flex-Bug wo `min-height: auto` (der Default) verhindert dass ein flex-child kleiner wird als sein Content. `min-h-0` erlaubt echtes Shrinking.

7. Teste auf 1080p (1920×1080) und 1440p (2560×1440) — der Body muss auf beiden mindestens 50% des Panels einnehmen.

**Done wenn:**
- Der Email-Body füllt den gesamten verfügbaren Platz zwischen Header und AI Draft aus
- Kurze Mails: Body-Container ist trotzdem groß, AI Draft klebt unten
- Lange Mails: Body scrollt eigenständig, AI Draft bleibt sichtbar
- iframe (HTML-Mails) füllt den Container komplett aus
- Kein leerer Raum zwischen Body und AI Draft
- `npm run build` läuft ohne Fehler

---

## 🔴 PHASE 2 — Toast Notifications: Nur bei ECHTEN neuen Emails

### LIVE-B1: Toast-Popups erscheinen bei alten/geladenen Emails

**Problem:** Die `NewMessageToast`-Benachrichtigungen unten rechts poppen auf wenn:
- Die App initial lädt (alle existierenden Mails werden als "neu" erkannt)
- Man "Mehr laden" klickt und ältere Mails nachgeladen werden
- Gmail-Folder gewechselt werden

Sie sollen **NUR** erscheinen wenn tatsächlich eine neue Email in Echtzeit reinkommt — also eine Mail die NACH dem letzten Load-Zeitpunkt eingegangen ist.

**⚠️ Bekanntes Gotcha aus Knowledge Base:** Die aktuelle Implementierung nutzt `prevMsgIdsRef` (ein `Set<string>` in einem `useRef`) um neue von alten Messages zu unterscheiden. Beim ersten Load werden alle IDs gespeichert ohne Toast. Das Problem: "Mehr Laden" fügt Messages zu `allMessages` hinzu, und der `useEffect` der auf `allMessages` hört erkennt diese als "neu".

**Dateien:**
- `src/app/page.tsx` — Zeilen 539-558 (New Message Detection Hook), Zeilen 477-511 (handleLoadMore)
- `src/components/new-message-toast.tsx` — Toast UI
- `src/hooks/useToast.ts` — Toast Hook

**Task:**

1. Öffne `src/app/page.tsx` und finde den `useEffect` der neue Messages erkennt (ca. Zeile 539-558)

2. Implementiere eine robuste "echte neue Email" Erkennung. Folgende Strategie:

   **Option A — isLoadingMore Flag (empfohlen):**
   ```typescript
   const isLoadingMoreRef = useRef(false);

   // In handleLoadMore:
   isLoadingMoreRef.current = true;
   // ... fetch more messages ...
   isLoadingMoreRef.current = false;

   // Im Detection-useEffect:
   if (isLoadingMoreRef.current) return; // Skip — das sind nachgeladene, keine neuen
   ```

   **Option B — Timestamp-basiert:**
   ```typescript
   const lastKnownTimestampRef = useRef<number>(Date.now());

   // Nur Mails mit timestamp > lastKnownTimestamp als "neu" behandeln
   const trulyNew = newMessages.filter(m =>
     new Date(m.timestamp).getTime() > lastKnownTimestampRef.current
   );
   ```

   **Option C — Kombination (am robustesten):**
   Nutze BEIDE Checks: `isLoadingMore === false` UND `message.timestamp > sessionStartTimestamp`

3. Stelle außerdem sicher dass:
   - Beim initialen App-Load (erster Fetch) KEINE Toasts erscheinen
   - Beim Wechsel zwischen Sidebar-Items (Inbox → Sent → Inbox) KEINE Toasts für bereits geladene Mails erscheinen
   - Nur Mails die NACH dem letzten erfolgreichen Fetch reinkommen einen Toast triggern
   - Der Firestore `onSnapshot` Listener (falls vorhanden) korrekt zwischen initialen Daten und Updates unterscheidet — `snapshot.docChanges().filter(c => c.type === 'added')` ist NICHT genug, weil der initiale Load auch `added` ist

4. Edge Cases testen:
   - App öffnen → kein Toast (nur initiales Laden)
   - "Mehr laden" klicken → kein Toast (alte Mails)
   - Folder wechseln → kein Toast
   - Neue Mail kommt rein während App offen → Toast ✅
   - Seite refreshen → kein Toast (alles ist "initial load")

**Done wenn:**
- Toast-Popups erscheinen NUR wenn eine echte neue Email eintrifft
- "Mehr laden" löst KEINE Toasts aus
- Initialer App-Load löst KEINE Toasts aus
- Folder-Wechsel löst KEINE Toasts aus
- Echte neue Mails (via Firestore Listener oder Polling) zeigen weiterhin korrekt Toasts
- `npm run build` läuft ohne Fehler

---

## 🔴 PHASE 3 — Reply Panel: Vollständige Email-Komposition wie Gmail

### UI-P2: Reply erlaubt nur Text-Eingabe, keine vollständige Email-Komposition

**Problem:** Wenn man den "Reply" Button drückt, öffnet sich nur ein einfaches Textarea zum Text eingeben. Es fehlen komplett:
- **Empfänger-Feld (To):** Wird automatisch mit dem Original-Sender befüllt, aber der User kann es nicht ändern
- **CC / BCC Felder:** Komplett fehlend
- **Betreff-Feld:** Wird automatisch auf "Re: [Originalbetreff]" gesetzt, aber nicht editierbar
- **Formatierung:** Kein Rich-Text, keine Attachments

Der User muss das Gefühl haben, eine echte Email-Plattform zu bedienen — wie Gmail, Outlook oder Apple Mail. Das AI Draft Generating ist nur ein **Add-On** Feature, nicht die Hauptfunktion. Der Reply-Flow muss auch OHNE AI Draft vollständig nutzbar sein.

**Dateien:**
- `src/components/ai-draft-panel.tsx` — Aktueller Reply-Bereich (Zeilen 318-420)
- `src/components/compose-panel.tsx` — Bestehendes Compose-Panel für neue Mails (hat bereits To/Subject Felder!)
- `src/components/compose-email-dialog.tsx` — Dialog für neue Emails
- `src/lib/gmail.ts` — Gmail Send API

**Task:**

1. Analysiere zuerst `src/components/compose-panel.tsx` — dieses Panel hat bereits Felder für From, To, Subject. Nutze das als Referenz/Vorlage für den Reply-Modus.

2. Erweitere den Reply-Bereich in `ai-draft-panel.tsx` (oder erstelle eine neue Komponente `reply-compose-panel.tsx`) mit folgenden Feldern:

   ```
   ┌─────────────────────────────────────────┐
   │ Von:    matteo@cacic.at            [▼]  │  ← Account-Auswahl (wenn mehrere)
   ├─────────────────────────────────────────┤
   │ An:     [original-sender@email.com] [x] │  ← Editierbar, pre-filled
   ├─────────────────────────────────────────┤
   │ CC:     [                          ] [+]│  ← Optional, eingeklappt by default
   │ BCC:    [                          ] [+]│  ← Optional, eingeklappt by default
   ├─────────────────────────────────────────┤
   │ Betreff: Re: Original Subject           │  ← Editierbar, pre-filled
   ├─────────────────────────────────────────┤
   │                                         │
   │  [Email-Body Textarea]                  │  ← Haupteingabe, größter Bereich
   │                                         │
   ├─────────────────────────────────────────┤
   │ [📎 Attach] [🤖 AI Draft] [Senden →]   │  ← Toolbar unten
   └─────────────────────────────────────────┘
   ```

3. **Pre-Fill Logik für Reply:**
   - **An:** Automatisch den Absender der Original-Mail einfüllen
   - **Betreff:** "Re: " + Original-Betreff (sofern nicht schon "Re:" vorhanden)
   - **Body:** Leer starten, optional mit `\n\n--- Original Message ---\n` + quoted Original-Body
   - **CC:** Leer, aber wenn die Original-Mail CC-Empfänger hatte, diese vorschlagen

4. **CC/BCC Toggle:** Die CC/BCC Felder sollen standardmäßig eingeklappt sein. Ein kleiner "CC/BCC" Link-Button zeigt sie an wenn geklickt. Das spart Platz für einfache Replies.

5. **AI Draft als Add-On:**
   - Der "🤖 AI Draft" / "Generate Draft" Button bleibt in der Toolbar
   - Klick darauf füllt das Textarea mit dem generierten Draft
   - Der User kann den Draft dann editieren bevor er sendet
   - Das AI Feature ist OPTIONAL — der User kann auch ohne AI einfach tippen und senden

6. **Senden-Logik:**
   - Nutze die bestehende Gmail Send API in `src/lib/gmail.ts`
   - Stelle sicher dass To, CC, BCC, Subject korrekt an die API übergeben werden
   - Thread-ID für korrekte Reply-Threading mitgeben (bereits implementiert laut Knowledge Base)

7. **Layout innerhalb des Detail-Panels:**
   - Wenn der Reply-Modus aktiv ist, ersetzt der Reply-Compose-Bereich den AI Draft Bereich ODER wird darüber expandiert
   - Der Reply-Bereich darf größer werden als die bisherigen `max-h-[280px]` — er soll ca. 40-50% des Panels einnehmen wenn aktiv
   - Der Email-Body (den man beantwortet) soll weiterhin sichtbar sein (mindestens 50% des Panels)

**Done wenn:**
- Reply hat editierbare Felder: An (To), CC, BCC, Betreff, Body
- To und Betreff sind automatisch pre-filled bei Reply
- CC/BCC sind standardmäßig eingeklappt, per Toggle sichtbar
- AI Draft ist ein Button in der Toolbar, füllt den Body mit generiertem Text
- Senden funktioniert mit allen Feldern (To, CC, BCC, Subject, Body, Thread-ID)
- Der Reply-Flow fühlt sich an wie eine echte Email-App, nicht wie ein Chat
- Der Original-Email-Body bleibt beim Replyen sichtbar
- `npm run build` läuft ohne Fehler

---

## 🛠️ Nächste Schritte nach diesen Phases

- Forward-Funktion (ähnlich wie Reply, aber ohne Thread-ID und mit leerem An-Feld)
- Rich-Text Editor (Bold, Italic, Links) im Reply-Body
- Attachment-Support beim Reply
- Mobile Responsive Version des Reply-Panels
- Push Notifications (Firebase Cloud Messaging) bei neuen Mails mit Score > 80
- Snooze / Pin Feature

---

## 🔄 Self-Learning — PFLICHT nach jedem Task

**WICHTIG:** Nach JEDEM abgeschlossenen Task (egal ob Bug-Fix, Feature oder UI-Änderung) MUSS der `nexaro-self-learning` Skill einmal durchlaufen. Das bedeutet:

1. **Lies** `NEXARO_KNOWLEDGE.md` vor Beginn jedes Tasks
2. **Schreibe** nach Abschluss einen neuen Eintrag mit:
   - Was war das Problem?
   - Was war die Lösung?
   - Was ist das Key Takeaway für die Zukunft?
   - Welche Dateien waren betroffen?
3. **Kategorisiere** den Eintrag: `[BUG FIX]`, `[ARCHITECTURE]`, `[PERFORMANCE]`, oder `[GOTCHA]`

Das ist kein optionaler Schritt — es ist Teil des Definition of Done für jeden Task.

**Knowledge Base Pfad:** `C:\Users\matte\.claude\projects\C--Users-matte-Desktop-Nexaro\memory\NEXARO_KNOWLEDGE.md`

---

*Letzte Aktualisierung: 10. März 2026*
*Nächster Task: UI-P1 — Email-Body Layout Fix*