# CLAUDE.md — Nexaro Agent Briefing (Stand: März 2026)

> Du bist der Lead Engineer von Nexaro. Du arbeitest autonom, ohne auf Anweisungen zu warten.
> Dein Ziel ist es, die Unified Inbox SaaS-App für CEOs zu perfektionieren.
> Du liest diese Datei und arbeitest den Backlog von oben nach unten ab.

---

## 🧠 Was ist Nexaro?

Nexaro aggregiert Kommunikation (Gmail, Slack, MS Teams, Outlook, Kalender) auf einer
KI-priorisierten Oberfläche für Executives. Jede Aktion muss sofortiges visuelles Feedback geben —
CEOs dulden keine Latenz und keine UI-Unklarheiten.

---

## 🏗️ Tech Stack

| Layer | Technologie |
|-------|-------------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend/DB | Firebase (Firestore, Auth, Storage) — kein firebase-admin, nur client SDK |
| AI Pipeline | Python (`tools/`), `score_importance.py` |
| Integrations | Gmail API, Google Calendar API, Slack API, MS Graph |
| Auth | Firebase Auth via `src/contexts/AuthContext.tsx`, `useAuth()` Hook |

---

## ⚠️ Invarianten — Absolute Regeln

1. **TypeScript strict** — Kein `any`, kein `catch (e: any)`, immer `e instanceof Error ? e.message : String(e)`
2. **Firestore REST** — Server-seitige Schreibvorgänge via REST API (kein firebase-admin)
3. **Keine Adapter ohne Normalisierung** — Jede Nachricht durch `normalize_payload.py`
4. **Interactive Feedback** — Jeder Button muss sofortiges Feedback geben (Loading-State oder Toast)
5. **Nach jedem Task:** `taskstodo.md` und `progress.md` aktualisieren

---

## 🔴 PHASE 1 — Kritische Bugs (Sofort, in dieser Reihenfolge)

### UI-P1: Compose-Dialog X-Button funktioniert nicht

- **Problem:** Der X-Button (oben rechts) im "Neue Nachricht" Compose-Dialog schließt das Fenster nicht. Nur der "Verwerfen"-Button unten funktioniert korrekt.
- **Task:** In `src/components/compose-email-dialog.tsx` und/oder `src/components/compose-panel.tsx` den `onClick`-Handler des X-Buttons debuggen. Wahrscheinlich ist der Close-Handler nicht an das richtige Element gebunden oder fehlt komplett. Sicherstellen, dass der gleiche Handler verwendet wird wie beim "Verwerfen"-Button. Den Dialog-State (z.B. `open`/`setOpen`) tracen und sicherstellen, dass der X-Button ihn auf `false` setzt.
- **Done wenn:** Klick auf X-Button schließt den Compose-Dialog zuverlässig. Kein Unterschied zum "Verwerfen"-Button.

---

### UI-P2: "Generate Draft" Button hat keinen sichtbaren Effekt

- **Problem:** Im Message-Detail-Panel passiert beim Klick auf "Generate Draft" nichts Sichtbares — kein Spinner, kein Fehler, kein Draft. Das liegt wahrscheinlich am fehlenden `GEMINI_API_KEY`.
- **Task:** In `src/components/ai-draft-panel.tsx`:
  1. Beim Klick sofort einen Loading-Spinner setzen (`isGenerating = true`)
  2. Wenn der API-Call fehlschlägt (weil `GEMINI_API_KEY` fehlt oder leer ist), eine sichtbare Fehlermeldung anzeigen: `"AI-Draft nicht verfügbar: Kein API-Key konfiguriert. Bitte GEMINI_API_KEY in .env.local eintragen."`
  3. Den Error-State im UI anzeigen (rotes Banner oder inline Fehlermeldung unter dem Button)
  4. `isGenerating` nach Abschluss/Fehler zurücksetzen
- **Done wenn:** Button zeigt Loading-Spinner beim Klick und eine klare, verständliche Fehlermeldung wenn kein AI-Backend verfügbar ist.

---

### INFRA-B1: Firestore Permission-Denied Errors in der Konsole

- **Problem:** Beim Laden der App erscheinen wiederholt `FirebaseError: [code=permission-denied]: Missing or insufficient permissions` in der Browser-Konsole. Betrifft mindestens 2 verschiedene Snapshot-Listener.
- **Task:**
  1. In `src/lib/firebase.ts` und allen Dateien die `onSnapshot()` aufrufen: sicherstellen, dass die Listener erst nach vollständiger Auth-Initialisierung gestartet werden (nach `onAuthStateChanged` resolved)
  2. Im Firebase Console → Firestore → Rules prüfen: Es müssen Rules für `users/{uid}/messages`, `users/{uid}/tokens` und alle anderen genutzten Collections existieren. Basis-Regel: `allow read, write: if request.auth != null && request.auth.uid == userId;`
  3. Alle `onSnapshot`-Aufrufe wrappen mit einem Auth-Check: wenn `user` null ist, Listener nicht starten
  4. Falls Auth-Kontext (`useAuth()`) noch initialisiert wird (`loading === true`), alle Firebase-Calls pausieren
- **Done wenn:** Keine `permission-denied` Fehler mehr in der Browser-Konsole nach Login.

---

### CAL-B1: Kalender-Events Text fast unlesbar

- **Problem:** Im Wochen-Kalender sind Event-Titel und Uhrzeiten in hellcyan auf hellcyan Hintergrund gerendert — extrem niedriger Kontrast, kaum lesbar.
- **Task:** In `src/app/calendar/page.tsx` die Tailwind-Klassen für Kalender-Events anpassen:
  - Event-Hintergrund: `bg-blue-100` (leichtes Blau)
  - Event-Text: `text-blue-900` oder `text-slate-900` (dunkelblau/fast schwarz)
  - Event-Zeitangabe: `text-blue-700` (etwas heller, aber noch gut lesbar)
  - Dark Mode: `dark:bg-blue-900 dark:text-blue-100`
  - Ziel: WCAG AA Kontrast ≥ 4.5:1
- **Done wenn:** Event-Text (Titel + Uhrzeit) ist klar lesbar. Test: im hellen und dunklen Modus prüfen.

---

### UI-P4: Alle Nachrichten zeigen identischen Importance Score (30)

- **Problem:** Jede Nachricht im Dashboard zeigt Score "30" — die KI-Scoring-Pipeline differenziert nicht. Das ist das Kernfeature von Nexaro und es ist broken.
- **Task:** Debugging in dieser Reihenfolge:
  1. `tools/score_importance.py` prüfen: Läuft das Skript? Gibt es einen Fallback-Wert `30` wenn kein Modell antwortet?
  2. Prüfen ob `score_importance.py` aktiv für neue Messages ausgeführt wird oder ob es manuell getriggert werden muss
  3. In `src/components/message-card.tsx` und `src/components/importance-badge.tsx`: Prüfen welches Feld aus Firestore gelesen wird. Ist es `importance_score`? Ist das der korrekte Feldname den die Python-Pipeline schreibt?
  4. In Firestore Console ein paar `messages`-Dokumente öffnen und schauen ob das `importance_score`-Feld vorhanden ist und variiert
  5. Falls das Scoring nicht automatisch läuft: einen API-Route-Trigger (`/api/ai/score`) implementieren der bei neuen Messages die Scoring-Pipeline auslöst
  6. Sicherstellen dass das Frontend den Wert nicht mit einem fixen Fallback (`?? 30`) überschreibt
- **Done wenn:** Verschiedene Nachrichten zeigen unterschiedliche, sinnvolle Scores (Business-Mails > 60, Newsletter/Spam < 30).

---

## 🟡 PHASE 2 — Live Updates & Push-Benachrichtigungen

### LIVE-01: Echtzeit-Mail-Updates ohne Seite neu laden

- **Problem:** Neue Mails erscheinen erst nach manuellem Reload. Für einen CEO ist das inakzeptabel — die Inbox muss live sein.
- **Task:**
  1. In `src/app/page.tsx` (Dashboard) den bestehenden `useEffect`-Fetch durch einen Firestore `onSnapshot`-Listener ersetzen, der auf `users/{uid}/messages` hört
  2. Der Listener soll bei neuen/geänderten Dokumenten die Message-Liste im State aktualisieren ohne re-fetch
  3. Sicherstellen dass der Listener beim Unmount der Komponente aufgeräumt wird (`return () => unsubscribe()`)
  4. Gmail-Polling als Ergänzung: einen Background-Fetch alle 60 Sekunden implementieren der neue Gmail-Mails in Firestore schreibt (falls kein Webhook verfügbar)
  5. Typing: `messages` State korrekt typen, kein `any`
- **Done wenn:** Neue Mails erscheinen im Dashboard innerhalb von 5 Sekunden ohne Seite neu laden.

---

### LIVE-02: Popup-Benachrichtigung bei neuer Nachricht

- **Problem:** Es gibt kein visuelles Signal wenn eine neue Mail eingeht. Der CEO muss aktiv schauen.
- **Task:**
  1. Eine neue Komponente `src/components/new-message-toast.tsx` erstellen
  2. Design: unten rechts, `fixed bottom-6 right-6`, weißes Card mit Schatten, Absender + Betreffzeile (gekürzt auf 50 Zeichen), Importance Badge
  3. Animation: `translate-y` Slide-in von unten, 300ms ease-out
  4. Auto-dismiss nach 5 Sekunden, mit Close-Button (X)
  5. Click auf den Toast öffnet die entsprechende Nachricht direkt
  6. Maximal 3 Toasts gleichzeitig (LIFO — ältester oben)
  7. Den Toast-Trigger in den Firestore `onSnapshot`-Listener aus LIVE-01 integrieren: wenn ein neues Dokument hinzukommt (`type === "added"`), Toast anzeigen
  8. Toast-State global verwalten (entweder in page.tsx oder einem leichtgewichtigen Context)
- **Done wenn:** Beim Eingang einer neuen Mail erscheint unten rechts ein animierter Toast mit Absender, Betreff und Importance Score. Auto-dismiss nach 5 Sekunden.

---

## 🟡 PHASE 3 — UI Layout Fixes

### UI-L1: Email-Detailansicht zu niedrig (muss scrollen)

- **Problem:** Der Bereich in dem die E-Mail-Inhalte angezeigt werden ist zu klein — der Benutzer muss permanent scrollen um den Inhalt zu lesen. Der verfügbare Viewport wird nicht genutzt.
- **Task:**
  1. In `src/app/page.tsx` und/oder `src/components/ai-draft-panel.tsx` die Höhenberechnung des Email-Inhalts-Containers finden
  2. Den Container auf `flex-1` oder `h-full` setzen damit er den verfügbaren Platz des Eltern-Containers ausfüllt
  3. Das äußere Layout prüfen: Die Seite soll ein festes 3-Spalten-Layout haben (Sidebar | Message-Liste | Detail), alle auf voller Viewport-Höhe (`h-screen`)
  4. Der Detail-Bereich soll intern scrollen (`overflow-y-auto`) — nicht der gesamte Viewport
  5. Das `<iframe>` (Email-Inhalt, isoliertes HTML) soll `flex-1` innerhalb seines Containers sein
  6. Auf Mobile (< 768px): nur eine Spalte anzeigen, Zurück-Button um zur Liste zu navigieren
- **Done wenn:** Die Email-Inhalte füllen den verfügbaren Bereich im Detail-Panel vollständig aus. Kein unnötiges Scrollen des äußeren Layouts mehr nötig.

---

### UI-L2: Icons in der Mail-Preview-Karte neu anordnen

- **Problem:** Die Aktions-Icons (Stern, Archiv, Löschen, etc.) in der Nachrichtenvorschau (`message-card.tsx`) sind schlecht platziert — sie stören das Layout oder sind schwer zu erreichen.
- **Task:**
  1. In `src/components/message-card.tsx` die Icon-Anordnung überarbeiten
  2. Neues Layout: Icons erscheinen beim Hover rechts-ausgerichtet in einer horizontalen Reihe, vertikal zentriert zur Nachrichtenkarte
  3. Reihenfolge: ⭐ Star | 📁 Archive | 🗑️ Delete (von links nach rechts)
  4. Icons: `w-4 h-4`, `text-slate-400 hover:text-slate-700`, Abstand `gap-2` zwischen Icons
  5. Icons außerhalb des Klick-Bereichs der Nachricht platzieren (kein Klick-Konflikt)
  6. Auf Touch-Geräten dauerhaft sichtbar (kein Hover-only)
  7. Jedes Icon mit einem `title`-Attribut für Tooltip: "Favorit", "Archivieren", "Löschen"
- **Done wenn:** Icons sind konsistent platziert, visuell aufgeräumt, und kollidieren nicht mit dem Klick-Bereich der Nachrichtenkarte.

---

## 🟡 PHASE 4 — UX Verbesserungen

### UX-V1: Suche globalisieren

- **Problem:** Die Suche filtert nur Nachrichten im aktuell ausgewählten Ordner. Eine globale Suche fehlt.
- **Task:**
  1. In `src/app/page.tsx` den Such-State (`searchQuery`) prüfen: aktuell filtert er wahrscheinlich nur die angezeigte `messages`-Liste
  2. Suche soll standardmäßig global sein: Firestore-Query über alle `users/{uid}/messages` ohne Ordner-Filter
  3. Einen Toggle-Button neben dem Suchfeld hinzufügen: `"Globale Suche" | "Nur aktueller Ordner"` (Default: Global)
  4. State: `searchScope: 'global' | 'folder'` — beim Wechsel des Ordners bleibt der Scope erhalten
  5. UI: Toggle als kleines Pill-Element direkt unter oder neben dem Suchfeld
- **Done wenn:** Die Suche durchsucht standardmäßig alle Nachrichten. Toggle zur Einschränkung auf aktuellen Ordner vorhanden.

---

### UX-V2: Toast-Notifications für Aktionen

- **Problem:** Beim Archivieren, Markieren oder Löschen gibt es kein Feedback — der User weiß nicht ob die Aktion erfolgreich war.
- **Task:**
  1. Einen leichtgewichtigen Toast-Mechanismus implementieren (kein externes Package — eigene `useToast`-Hook in `src/hooks/useToast.ts`)
  2. Toast-Component: `src/components/ui/toast.tsx` — einfaches Snackbar-Design, `fixed bottom-4 left-1/2 -translate-x-1/2`, max-width 320px
  3. Nachrichten: `"Archiviert"`, `"Als gelesen markiert"`, `"Gelöscht"`, `"Favorit gesetzt"`, `"Stern entfernt"` — jeweils mit passendem Icon
  4. Auto-dismiss nach 3 Sekunden
  5. Toast aufrufen nach jedem erfolgreichen API-Call in `src/app/page.tsx` (archive, markRead, delete, star)
  6. **Achtung:** Nicht mit dem New-Message-Toast aus LIVE-02 kollidieren — New-Message-Toast ist unten rechts, Aktions-Toast ist unten zentriert
- **Done wenn:** Jede Nachrichtenaktion (Archivieren, Löschen, etc.) zeigt eine Snackbar-Bestätigung.

---

### UX-V3: Reply-Panel öffnet mit AI-Draft oder Grußformel

- **Problem:** Beim Klick auf "Reply" öffnet sich ein leeres Textfeld. Für einen CEO ist das verschwendete Zeit.
- **Task:**
  1. In `src/components/ai-draft-panel.tsx` oder `src/components/compose-panel.tsx`: beim Öffnen des Reply-Panels automatisch einen Draft-Request abschicken
  2. Wenn `GEMINI_API_KEY` vorhanden: `/api/ai/draft` aufrufen mit Kontext (Absender, Betreff, Body) → AI-Draft einfügen
  3. Wenn kein API-Key: eine Grußformel vorab einfügen: `"Guten Tag [Absendername],\n\n"` + `"\n\nMit freundlichen Grüßen"` — Name aus der eingehenden Mail extrahieren
  4. Loading-State während AI-Draft generiert wird: Textarea disabled + Spinner
  5. Der vorgeschlagene Text soll editierbar sein — er ist nur ein Vorschlag
- **Done wenn:** Reply-Panel öffnet nie mehr leer. Entweder AI-Draft oder Grußformel ist vorab eingetragen.

---

## 🟢 PHASE 5 — Neue Features

### FEAT-01: Tägliche/Wöchentliche Zusammenfassung

- **Problem:** CEOs wollen morgens auf einen Blick sehen was wichtig ist, ohne die App zu öffnen.
- **Task:**
  1. Settings-UI in `src/app/settings/page.tsx` (oder die zugehörige Settings-Komponente): neuer Abschnitt "Zusammenfassungen" mit:
     - Toggle: Tägliche Zusammenfassung An/Aus
     - Toggle: Wöchentliche Zusammenfassung An/Aus (montags)
     - Uhrzeit-Picker (Dropdown: 06:00, 07:00, 08:00, 09:00 Uhr) für den Versandzeitpunkt
     - E-Mail-Empfänger (vorausgefüllt mit der Gmail-Adresse des Users)
  2. Einstellungen in Firestore speichern: `users/{uid}/settings/digest` mit Feldern `daily: boolean`, `weekly: boolean`, `time: string`, `email: string`
  3. API-Route `src/app/api/digest/route.ts` erstellen:
     - Liest die Top-10 Nachrichten der letzten 24h (sortiert nach `importance_score` desc)
     - Generiert eine HTML-E-Mail-Zusammenfassung
     - Sendet via Gmail API (mit dem gespeicherten Access-Token des Users)
  4. **Hinweis zu Scheduling:** Ein echter Cron-Job braucht externe Infrastruktur (Vercel Cron oder Cloud Scheduler). Den API-Endpunkt fertigstellen und in `taskstodo.md` als `⏳ BLOCKED (needs Vercel Cron or external scheduler)` markieren.
- **Done wenn:** Settings-UI ist vorhanden und speichert Einstellungen in Firestore. API-Route ist implementiert und kann manuell getriggert werden.

---

### FEAT-02: Keyboard Shortcuts vollständig und mit Overlay

- **Aktuell:** `e`=Archivieren, `r`=Reply, `s`=Star sind teilweise implementiert. Overlay für `?` existiert ggf. noch nicht.
- **Task:**
  1. In `src/app/page.tsx` alle bestehenden Keyboard-Shortcuts prüfen und testen: `e`, `r`, `s` müssen zuverlässig auf der aktuell ausgewählten Nachricht funktionieren
  2. Fehlende Shortcuts implementieren: `d`=Delete/Trash, `u`=Als ungelesen markieren, `Escape`=Detailansicht schließen
  3. Shortcuts deaktivieren wenn Focus in `<input>`, `<textarea>` oder `contenteditable` liegt
  4. `?`-Shortcut öffnet ein Modal `src/components/keyboard-shortcuts-overlay.tsx`:
     - Overlay mit allen Shortcuts in zwei Spalten
     - Schließen per `Escape` oder Klick auf Backdrop
     - Design: dunkel transluzentes Overlay, Shortcuts als `kbd`-Elemente formatiert
  5. Im Dashboard-Header ein kleines `?`-Icon hinzufügen das dasselbe Modal öffnet
- **Done wenn:** Alle 6 Shortcuts funktionieren zuverlässig. `?` öffnet ein vollständiges Shortcuts-Modal.

---

### FEAT-03: Mini-Widget "Inbox Overview" oben im Dashboard

- **Problem:** Der CEO sieht nicht sofort wie viele ungelesene Nachrichten pro Kanal warten — er muss scrollen oder filtern.
- **Task:**
  1. Neue Komponente `src/components/inbox-overview-widget.tsx`
  2. Design: horizontale Karte-Reihe direkt unter dem Header, vor der Message-Liste. Jede Karte zeigt:
     - Service-Icon (Gmail, Slack, Teams)
     - Anzahl ungelesener Nachrichten (`unread: number`)
     - Farb-Indikator: grün wenn 0, orange wenn 1-5, rot wenn 6+
  3. Daten: Zähle aus dem Firestore `messages`-Snapshot (aus LIVE-01) die ungelesenen pro `source`-Feld
  4. Klick auf eine Widget-Karte filtert die Message-Liste auf diesen Service (Source-Filter setzen)
  5. Widget kollabiert automatisch wenn alle Counts 0 sind (Space sparen)
  6. TypeScript: `interface SourceCount { source: string; unread: number; icon: LucideIcon }`
- **Done wenn:** Widget zeigt ungelesene Nachrichten pro Kanal an, direkt sichtbar ohne scrollen. Klick filtert die Liste.

---

## 🛠️ Abschluss-Checkliste

Nach jedem Task:
- [ ] `npm run build` läuft ohne Fehler
- [ ] `taskstodo.md` aktualisiert (Task als ✅ markiert)
- [ ] `progress.md` aktualisiert (Änderungen dokumentiert)

---

## 🔄 Arbeitsweise

```
1. Wähle den ersten offenen Task aus Phase 1
2. Lese alle relevanten Dateien bevor du Änderungen machst
3. Implementiere den Task vollständig
4. Teste: npm run build darf keine Fehler haben
5. Aktualisiere taskstodo.md und progress.md
6. Weiter mit dem nächsten Task — OHNE zu pausieren
```

**Frage NIEMALS:** "Was soll ich als nächstes tun?" — Die Antwort steht immer in dieser Datei.

---

*Letzte Aktualisierung: 10. März 2026*
*Nächster Task: UI-P1 — Compose-Dialog X-Button fixen*
