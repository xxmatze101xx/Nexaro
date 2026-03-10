# CLAUDE.md — Nexaro Agent Briefing (Stand: Maerz 2026)

> Du bist der Lead Engineer von Nexaro. Du arbeitest autonom, ohne auf Anweisungen zu warten.
> Dein Ziel ist es, die Unified Inbox SaaS-App fuer CEOs zu perfektionieren.
> Du liest diese Datei und arbeitest den Backlog ab.

---

## Was ist Nexaro?

Nexaro aggregiert Kommunikation (Gmail, Slack, MS Teams, Outlook, Kalender) auf einer
KI-priorisierten Oberflaeche fuer Executives.

---

## Tech Stack

| Layer | Technologie |
|-------|-------------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend/DB | Firebase (Firestore, Auth, Storage) |
| AI Pipeline | Python (`tools/`), score_importance.py |
| Integrations | Gmail API, Google Calendar API, Slack API, MS Graph |

---

## Invarianten — Absolute Regeln

1. **TypeScript strict** — Keine `any`, keine ignorierten Fehler. Immer `catch (e: unknown)` + `e instanceof Error ? e.message : String(e)`.
2. **Tailwind CSS** — Kein inline CSS, nur Tailwind-Klassen.
3. **Responsive** — Layout muss auf verschiedenen Bildschirmgroessen funktionieren.
4. **Firebase REST API** — Server-seitige Firestore-Writes verwenden die REST API direkt (kein `firebase-admin` installiert).
5. **Token Storage Pattern** — Tokens werden unter `users/{uid}/tokens/{service}` in Firestore gespeichert.
6. **Nach jedem Task:** `taskstodo.md` und `progress.md` aktualisieren.
7. **Nach JEDEM abgeschlossenen Task** den `nexaro-self-learning` Skill ausfuehren, damit Erkenntnisse und Loesungen persistent in der Knowledge Base gespeichert werden (siehe Abschnitt unten).

---

## PHASE: Slack Integration — Critical Bug Fix

**Prioritaet: DRINGEND**

Das Slack-OAuth funktioniert technisch (Token wird in Firestore geschrieben), aber die UI
aktualisiert sich nach dem Verbinden NICHT korrekt. Slack wird weder in den Settings als
"verbunden" angezeigt, noch erscheint es in der Dashboard-Sidebar als aktive Quelle.

Der gesamte Flow muss durchdebuggt werden:
`OAuth Callback → Token-Speicherung → Redirect → UI-State-Update → Dashboard-Sidebar`

---

### SLACK-B1: OAuth Callback schreibt Token, aber Redirect-Parameter kommen nicht an

- **Problem:** Nach erfolgreichem Slack-OAuth schreibt `src/app/api/slack/callback/route.ts` den Token via Firestore REST API in `users/{uid}/tokens/slack`. Danach wird mit `?slack_connected=true` zurueck zu `/settings` redirected. Aber: Die Settings-Seite erkennt den Parameter moeglicherweise nicht zuverlaessig, oder der Token-Write ist noch nicht abgeschlossen wenn die Settings-Seite den Check macht.
- **Relevante Dateien:**
  - `src/app/api/slack/callback/route.ts` (Zeilen 38-87) — Token Exchange + Firestore Write + Redirect
  - `src/app/settings/page.tsx` (Zeilen 89-114) — URL-Parameter-Erkennung und Re-Fetch
- **Task:**
  1. Oeffne `src/app/api/slack/callback/route.ts` und pruefe:
     - Wird der Firestore REST API Write mit `await` abgewartet bevor der Redirect passiert?
     - Wird der Response-Status der REST API geprueft (2xx) bevor redirected wird?
     - Ist die Redirect-URL korrekt aufgebaut (`/settings?slack_connected=true`)?
  2. Oeffne `src/app/settings/page.tsx` und pruefe:
     - Wird `window.location.search` korrekt ausgelesen (Zeilen 89-95)?
     - Wird nach dem Erkennen von `slack_connected=true` tatsaechlich `getSlackConnection()` aufgerufen?
     - Gibt es ein Race-Condition-Problem: Die Settings-Seite liest den Token aus Firestore BEVOR der REST API Write aus dem Callback vollstaendig abgeschlossen ist?
  3. Fuege Error-Logging in den Callback hinzu: Logge den Firestore REST API Response-Status, damit sichtbar ist ob der Write erfolgreich war.
  4. Stelle sicher, dass der Redirect ERST nach erfolgreichem Write passiert (await + status check).
- **Done wenn:** Nach dem Slack-OAuth-Flow wird zuverlaessig `?slack_connected=true` an die Settings-URL angehaengt UND der Token ist bereits in Firestore wenn die Settings-Seite ihn abfragt.

---

### SLACK-B2: Settings-Seite zeigt Slack nicht als "verbunden" nach OAuth-Redirect

- **Problem:** In `src/app/settings/page.tsx` wird `slackConnected` State initial auf `false` gesetzt. Der `useEffect` auf Zeile 100-104 ruft `getSlackConnection()` beim Laden auf. Aber wenn der User von OAuth zurueckkommt, muss der separate `useEffect` (der URL-Parameter erkennt) den State ebenfalls updaten. Dieser zweite useEffect muss:
  1. Den URL-Parameter `slack_connected=true` erkennen
  2. `getSlackConnection()` aufrufen
  3. `setSlackConnected(true)` setzen
  - Moegliches Problem: Der useEffect wird vor dem `user`-Objekt ausgefuehrt (Dependency `[user]`), oder `getSlackConnection()` gibt `null` zurueck weil der Firestore-Write noch propagiert.
- **Relevante Dateien:**
  - `src/app/settings/page.tsx` — Zeilen 47 (`slackConnected` State), 89-114 (URL-Parameter-Handling), 100-104 (Initial Load)
  - `src/lib/user.ts` — Zeilen 238-246 (`getSlackConnection()` Funktion)
- **Task:**
  1. Stelle sicher, dass der URL-Parameter-useEffect `getSlackConnection()` aufruft und bei Erfolg `setSlackConnected(true)` setzt.
  2. Falls `getSlackConnection()` nach dem Redirect `null` zurueckgibt (Race Condition), implementiere einen Retry mit kurzer Verzoegerung (z.B. 500ms warten, dann nochmal versuchen, max 3 Versuche).
  3. Alternativ: Wenn `slack_connected=true` als URL-Parameter vorhanden ist, setze `setSlackConnected(true)` sofort (optimistic update), und verifiziere danach asynchron mit `getSlackConnection()`.
  4. Pruefe, ob nach dem URL-Parameter-Cleanup (`window.history.replaceState`) der State korrekt bleibt.
- **Done wenn:** Nach dem OAuth-Redirect zeigt die Settings-Seite Slack sofort als "verbunden" (gruener Toggle) an. Auch bei Page-Refresh bleibt der Status korrekt (Token aus Firestore gelesen).

---

### SLACK-B3: Dashboard-Sidebar zeigt Slack nicht als aktive Integration

- **Problem:** Im Dashboard (`src/app/page.tsx`, Zeilen 575-625) wird Slack nur dann in der Sidebar angezeigt, wenn `slackConnected === true`. Dieser State wird beim Page-Load in einem useEffect gesetzt (Zeilen 153-157) via `getSlackConnection()`. Ausserdem gibt es einen separaten useEffect (Zeilen 181-190) der URL-Parameter prueft — aber wenn der User direkt von Settings zum Dashboard navigiert (ohne OAuth-Redirect-Parameter), muss der initiale Load funktionieren.
- **Relevante Dateien:**
  - `src/app/page.tsx` — Zeilen 73-74 (State), 153-157 (Initial Load), 181-190 (OAuth Redirect Check), 575-625 (ACCOUNTS useMemo)
  - `src/lib/user.ts` — `getSlackConnection()`
- **Task:**
  1. Pruefe den initialen `useEffect` (Zeilen 153-157): Wird `getSlackConnection()` korrekt aufgerufen? Wird das Ergebnis korrekt in `setSlackConnected()` umgewandelt?
  2. Teste den Flow: Settings → Slack verbinden → OAuth → Zurueck zu Settings → Navigiere zum Dashboard. Wird `slackConnected` korrekt gesetzt?
  3. Falls das Problem ist, dass der Dashboard-Load VOR dem Firestore-Write abschliesst: Implementiere denselben Retry-Mechanismus wie in SLACK-B2.
  4. Pruefe die `ACCOUNTS` useMemo (Zeilen 575-625): Haengt sie korrekt von `slackConnected` ab? Wird sie re-evaluiert wenn sich der State aendert?
  5. Stelle sicher, dass das Slack-Icon korrekt geladen wird: `<Image src="/ServiceLogos/Slack.svg" />` — existiert diese Datei?
- **Done wenn:** Nach dem Verbinden von Slack in den Settings und anschliessender Navigation zum Dashboard erscheint Slack in der linken Sidebar mit Icon und "Direktnachrichten" Unteritem. Auch bei direktem Dashboard-Aufruf (Page Refresh) wird Slack angezeigt wenn es verbunden ist.

---

### SLACK-B4: Toggle-Switch fungiert nur als "Connect" — kein Disconnect moeglich

- **Problem:** In `src/components/settings/IntegrationsSection.tsx` (Zeilen 190-208) ruft der Toggle-Switch immer `onConnect(integration.id)` auf — unabhaengig davon ob die Integration bereits verbunden ist oder nicht. Das bedeutet: Klickt man auf den Toggle wenn Slack verbunden ist, wird man ERNEUT durch den OAuth-Flow geschickt statt Slack zu trennen. Die Funktion `disconnectSlack()` existiert in `src/lib/user.ts`, wird aber nirgends aufgerufen.
- **Relevante Dateien:**
  - `src/components/settings/IntegrationsSection.tsx` — Zeilen 190-208 (Toggle-Button)
  - `src/app/settings/page.tsx` — `onConnect` Handler (Zeilen 259-261)
  - `src/lib/user.ts` — `disconnectSlack()` Funktion (bereits implementiert, loescht `users/{uid}/tokens/slack`)
- **Task:**
  1. Aendere die `onConnect` Logik in `src/app/settings/page.tsx` so, dass sie zwischen Connect und Disconnect unterscheidet:
     - Wenn `slackConnected === false` → OAuth-Flow starten (wie bisher)
     - Wenn `slackConnected === true` → `disconnectSlack(user.uid)` aufrufen, dann `setSlackConnected(false)` setzen
  2. Alternativ: Fuege einen separaten `onDisconnect` Handler hinzu und uebergib ihn an `IntegrationsSection`.
  3. Orientiere dich am Gmail-Disconnect-Pattern (Zeilen 211-225 in IntegrationsSection.tsx): Gmail hat bereits einen expliziten "Trennen"-Button pro Account.
  4. Fuege eine Bestaetigung hinzu bevor Slack getrennt wird (z.B. `confirm("Slack wirklich trennen?")`).
- **Done wenn:** Der Toggle-Switch in den Settings trennt Slack korrekt (loescht Token aus Firestore) und der UI-State aktualisiert sich sofort. Re-Connect ist danach moeglich.

---

### SLACK-B5: Firestore REST API Write — Error Handling und Validierung

- **Problem:** Der Callback (`src/app/api/slack/callback/route.ts`) schreibt Tokens via Firestore REST API. Es ist unklar ob Fehler bei diesem Write korrekt behandelt werden. Ein fehlgeschlagener Write (z.B. ungueltige API-Key, Permission Denied) wuerde dazu fuehren, dass der Redirect mit `?slack_connected=true` erfolgt obwohl kein Token gespeichert wurde.
- **Relevante Dateien:**
  - `src/app/api/slack/callback/route.ts` — Zeilen 63-85 (Firestore REST Write)
- **Task:**
  1. Pruefe ob der Firestore REST API Response-Status gecheckt wird (sollte 200 sein).
  2. Falls der Write fehlschlaegt: Redirect mit `?slack_error=token_storage_failed` statt `?slack_connected=true`.
  3. Logge den vollstaendigen Firestore Response bei Fehlern (aber NICHT den Token selbst — Sicherheit!).
  4. Pruefe ob die Firestore REST API URL korrekt ist: `https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/users/{uid}/tokens/slack?key={apiKey}` — sind `projectId` und `apiKey` korrekt aus den Environment-Variablen gelesen?
  5. Pruefe ob die PATCH-Methode korrekt verwendet wird (nicht PUT, nicht POST).
- **Done wenn:** Bei fehlgeschlagenem Token-Write wird der User mit einer klaren Fehlermeldung zurueck zu den Settings geleitet. Kein falsches "verbunden"-Signal.

---

## Debug-Strategie (Empfohlen)

Arbeite den Bug in dieser Reihenfolge ab:

1. **SLACK-B5 zuerst** — Stelle sicher, dass der Token ueberhaupt korrekt gespeichert wird (Firestore REST Write Validierung)
2. **SLACK-B1** — Pruefe den Callback-Redirect-Flow
3. **SLACK-B2** — Fixe die Settings-UI-Aktualisierung
4. **SLACK-B3** — Fixe die Dashboard-Sidebar
5. **SLACK-B4** — Implementiere Disconnect

Grund: Wenn der Token gar nicht geschrieben wird, bringt es nichts die UI zu fixen. Bottom-up debuggen.

---

## Naechste Schritte nach diesem Fix

- Microsoft Teams / Outlook Integration auf dasselbe Pattern pruefen (gleicher Bug moeglich)
- End-to-End Test: Slack verbinden → Nachrichten abrufen → In Inbox anzeigen → Sidebar zeigt Slack
- Push-Notification-Support fuer Slack-Nachrichten
- Mobile Responsive fuer Settings-Integrations-Bereich

---

## PFLICHT: Self-Learning nach jedem Task

**Nach JEDEM abgeschlossenen Task (SLACK-B1 bis SLACK-B5) MUSS der `nexaro-self-learning` Skill einmal durchlaufen werden.**

Das bedeutet konkret:

1. Du bearbeitest z.B. `SLACK-B1` und schliesst den Task ab
2. **Bevor du mit SLACK-B2 weitermachst**, fuehrst du den `nexaro-self-learning` Skill aus
3. Der Skill liest deine Aenderungen, extrahiert Erkenntnisse und speichert sie in der Knowledge Base
4. Erst dann gehst du zum naechsten Task

**Warum das wichtig ist:**
- Erkenntnisse aus SLACK-B1 koennten SLACK-B2 einfacher machen
- Bug-Patterns werden dokumentiert und verhindern Wiederholung
- Die Knowledge Base wird mit jedem Task wertvoller
- Zukuenftige Claude-Sessions profitieren von deinen Learnings

**Format fuer den Self-Learning-Aufruf:**
Nachdem du einen Task abgeschlossen hast, sage:
> "Ich habe [TASK-ID] abgeschlossen. Starte den nexaro-self-learning Skill um die Erkenntnisse zu dokumentieren."

Dokumentiere mindestens:
- Was war die Root Cause des Problems?
- Welche Dateien waren betroffen?
- Welches Pattern/Fix hast du angewandt?
- Gibt es aehnliche Stellen im Code die dasselbe Problem haben koennten?

---

*Letzte Aktualisierung: 2026-03-10*
*Naechster Task: SLACK-B5 — Firestore REST API Write Error Handling*
*Prioritaet: DRINGEND — CEO-sichtbarer Bug*
