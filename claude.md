CLAUDE.md — Nexaro Agent Briefing (Stand: Maerz 2026)

Du bist der Lead Engineer von Nexaro. Du arbeitest autonom, ohne auf Anweisungen zu warten.
Dein Ziel ist es, die Unified Inbox SaaS-App fuer CEOs zu perfektionieren.
Du liest diese Datei und arbeitest den Backlog ab.


Was ist Nexaro?
Nexaro aggregiert Kommunikation (Gmail, Slack, MS Teams, Outlook, Kalender) auf einer
KI-priorisierten Oberflaeche fuer Executives.

Tech Stack
LayerTechnologieFrontendNext.js (App Router), TypeScript, Tailwind CSSBackend/DBFirebase (Firestore, Auth, Storage)AI PipelinePython (tools/), score_importance.pyIntegrationsGmail API, Google Calendar API, Slack API, MS Graph

Invarianten — Absolute Regeln

TypeScript strict — Keine any, keine ignorierten Fehler.
Tailwind CSS — Kein inline CSS, nur Tailwind-Klassen.
Responsive — Layout muss auf verschiedenen Bildschirmgroessen funktionieren.
Nach jedem Task: taskstodo.md und progress.md aktualisieren.


PHASE 1 — Email-Detailansicht: Mehr Platz fuer den Email-Body
UI-P1: Email-Body bekommt zu wenig vertikalen Platz

Problem: Wenn man im Dashboard eine Nachricht anklickt, oeffnet sich rechts das Detail-Panel. Der eigentliche Email-Inhalt (Body) wird in einem viel zu kleinen Bereich angezeigt — oft nur 200-300px Hoehe. Das ist fuer laengere Mails komplett unbrauchbar. Der CEO muss staendig scrollen um eine normale Mail zu lesen. Das Layout teilt den verfuegbaren Platz schlecht auf: Der Header (Absender, Betreff, Datum) und der untere Bereich (AI Draft Panel, Reply-Bereich) nehmen unverhältnismäßig viel Raum ein, waehrend der eigentliche Mail-Content — also das was der User lesen will — eingequetscht wird.
Task:

Oeffne die relevanten Dateien fuer das Message-Detail-Panel. Wahrscheinlich:

src/components/message-card.tsx (oder eine aehnliche Detail-Komponente)
src/components/ai-draft-panel.tsx
src/components/compose-panel.tsx
src/app/page.tsx (Dashboard-Layout mit dem rechten Panel)


Analysiere das aktuelle Layout des rechten Panels. Identifiziere welche Bereiche wie viel Platz bekommen:

Header-Bereich (Absender, Betreff, Datum, Source-Badge)
Email-Body (der eigentliche Inhalt)
AI Draft Panel ("Generate Draft" Button + Draft-Anzeige)
Reply-Bereich


Aendere das Layout so, dass der Email-Body den groessten Anteil des verfuegbaren Platzes bekommt:

Der Email-Body-Container soll flex-1 oder flex-grow bekommen und den gesamten verbleibenden vertikalen Raum ausfuellen
Der Body soll overflow-y: auto haben damit man bei langen Mails innerhalb des Bodies scrollen kann
Setze eine min-height von mindestens 400px oder 50vh fuer den Body-Bereich
Der Header oben soll kompakt bleiben (nicht mehr als noetig)
Der AI-Draft/Reply-Bereich unten soll eine feste oder maximale Hoehe haben und nicht den Body-Bereich verdraengen


Das gesamte rechte Panel soll als Flex-Column aufgebaut sein:



     [Header — flex-shrink-0, kompakt]
     [Email-Body — flex-1, overflow-y-auto, nimmt allen Restplatz]
     [AI Draft / Reply — flex-shrink-0, max-h begrenzt, eigener Scroll]

Stelle sicher, dass der AI-Draft-Bereich und Reply-Bereich bei Bedarf einen eigenen Scrollbereich haben (overflow-y-auto mit max-h-[200px] oder aehnlich), damit sie nicht den Body-Bereich auffressen wenn ein langer Draft generiert wird.
Teste mit verschiedenen Mail-Laengen: kurze Mails (1-2 Saetze), mittlere Mails (1 Absatz), lange Mails (Newsletter mit Bildern und viel Text).


Done wenn:

Der Email-Body nimmt mindestens 50% des verfuegbaren vertikalen Platzes im Detail-Panel ein
Lange Mails sind innerhalb des Body-Bereichs scrollbar ohne dass das gesamte Panel scrollt
Der AI-Draft/Reply-Bereich ist sichtbar aber begrenzt (max 200-250px Hoehe)
Der Header bleibt kompakt oben
Das Layout funktioniert auf 1080p und 1440p Bildschirmen
npm run build laeuft ohne Fehler




Naechste Schritte nach Phase 1

Ueberpruefen ob das Layout auch im Compose-Modus (Neue Nachricht) gut aussieht
Mobile Responsive Version des Detail-Panels anpassen
Dark Mode Kompatibilitaet pruefen


---

# PHASE 2 — PII-Scrubbing: Datenschutz vor LLM-API-Calls

Nexaro sendet Email-Inhalte an externe LLM-APIs (OpenAI gpt-4o-mini, Gemini) zur
Draft-Generierung und Importance-Scoring. Ziel dieser Phase: Alle personenbezogenen
und sensiblen Daten werden VOR dem API-Call durch nummerierte Platzhalter ersetzt.
Nach dem API-Call werden die echten Werte wieder eingesetzt. Die Mapping-Tabelle
verlaesst NIEMALS den eigenen Server.

Architektur-Entscheidung:
- Die Draft-Route (src/app/api/ai/draft/route.ts) ist TypeScript/Next.js — kein direkter Python-Aufruf moeglich.
- Scrubbing wird daher in zwei Ebenen implementiert:
  1. src/lib/pii-scrubber.ts — TypeScript-Modul fuer alle Next.js API-Routes (regex-basiert)
  2. tools/pii_scrubber.py — Python-Modul fuer die Python-Pipeline (Presidio-basiert, hoehere Genauigkeit)
- Beide Module folgen dem gleichen Interface: scrub(text) -> { anonymized, mapping } und restore(text, mapping) -> original


## PRIV-1: TypeScript PII Scrubber — src/lib/pii-scrubber.ts

Problem: Kein Scrubbing-Modul existiert in der TypeScript-Codebasis. Email-Inhalte gehen ungefiltert an OpenAI.

Task:
  Erstelle src/lib/pii-scrubber.ts mit folgenden Anforderungen:

  Zu erkennende und zu ersetzende Kategorien:
    [PERSON_N]   — Vollstaendige Namen (Vor- + Nachname, "Max Mustermann", "Dr. Anna Bauer")
    [EMAIL_N]    — E-Mail-Adressen (RFC-konformes Regex)
    [PHONE_N]    — Telefonnummern (AT/DE/CH Format: +43, +49, 0800 etc.)
    [ORG_N]      — Firmennamen (GmbH, AG, KG, Ltd, Inc, Corp)
    [LOCATION_N] — Strassenadressen (Strasse + Hausnummer + PLZ + Ort)
    [AMOUNT_N]   — Geldbetraege (EUR 1.200, $5,000, 2.4M EUR etc.)
    [SECRET_N]   — Projektnummern, Vertragsnummern, IBANs, Steuernummern (Pattern-basiert)

  Interface (exakt so exportieren):

    export interface ScrubMapping {
      [placeholder: string]: string;
    }

    export interface ScrubResult {
      anonymized: string;
      mapping: ScrubMapping;
    }

    export function scrubText(text: string): ScrubResult
    export function restoreText(anonymized: string, mapping: ScrubMapping): string

  Implementierungsdetails:
    - Counter-basierter Ansatz: Jedes Entity bekommt eine eindeutige Nummer pro Session
    - Gleiche Werte bekommen denselben Platzhalter (wenn "max@firma.at" zweimal vorkommt -> immer [EMAIL_1])
    - Reihenfolge: IBAN -> Email -> Phone -> Amount -> Address -> Org -> Person (spezifischeres zuerst)
    - restoreText macht einfaches String-Replace mit dem Mapping

  Test-Cases als Kommentare in der Datei:
    Input:  "Hallo Max Mustermann, dein Vertrag #V-2024-991 ueber EUR 45.000 wurde geprueft."
    Output: "Hallo [PERSON_1], dein Vertrag [SECRET_1] ueber [AMOUNT_1] wurde geprueft."
    Mapping: { "[PERSON_1]": "Max Mustermann", "[SECRET_1]": "#V-2024-991", "[AMOUNT_1]": "EUR 45.000" }

Done wenn:
  - scrubText erkennt alle 7 Kategorien korrekt
  - Gleiche Werte bekommen denselben Platzhalter
  - restoreText(scrubText(original).anonymized, mapping) gibt exakt den Original-Text zurueck (Round-trip Test)
  - Keine any Types, TypeScript strict kompatibel
  - Exportiert von src/lib/pii-scrubber.ts


## PRIV-2: Integration in /api/ai/draft/route.ts

Problem: Die Draft-Route sendet body, subject, sender, senderEmail ungefiltert an OpenAI.

Task:
  Modifiziere src/app/api/ai/draft/route.ts:

  1. Importiere scrubText, restoreText aus @/lib/pii-scrubber
  2. VOR dem OpenAI-Call: Scrube draftBody.body und draftBody.subject
  3. Sende anonymizedBody und anonymizedSubject an OpenAI (nicht die Originale)
  4. NACH dem OpenAI-Call: Restore den generierten Draft mit restoreText(rawDraft, mapping)
  5. WICHTIG: Das mapping-Objekt darf NIEMALS in der API-Response, in Logs oder in
     Firestore gespeichert werden. Es lebt nur im Scope des Request-Handlers.

  Edge Cases:
    - Wenn scrubText fehlschlaegt (throw), falle gracefully zurueck auf das Original (mit console.warn)
    - Leere Strings muessen nicht gescrubbt werden
    - Das sender-Feld ist bereits durch score_importance_ai.py auf Initiale abgekuerzt —
      pruefen ob zusaetzliches Scrubbing noetig ist

Done wenn:
  - Draft-Route sendet keine rohen Email-Inhalte mehr an OpenAI
  - Generierter Draft enthaelt nach Restore die echten Namen/Betraege etc.
  - Mapping taucht nirgends in Logs oder Response auf
  - npm run build laeuft ohne Fehler


## PRIV-3: Integration in weitere AI-Routes

Problem: Neben /api/ai/draft gibt es weitere Routes die Email-Inhalte verarbeiten koennen.

Task:
  Prueffe folgende Routes auf ungefilterte Email-Inhalte und wende das Scrub/Restore-Pattern an:
    - src/app/api/ai/compose/route.ts
    - src/app/api/ai/suggestions/route.ts
    - src/app/api/ai/chat/route.ts
    - src/app/api/ai/query/route.ts

  Fuer jede Route:
  1. Identifiziere welche Felder Email-Inhalte tragen koennten
  2. Wende scrubText / restoreText an
  3. Kommentiere kurz welche Felder gescrubbt werden und warum

Done wenn:
  - Alle AI-Routes die Email-Content an externe APIs senden sind gescrubbt
  - Konsistente Verwendung des pii-scrubber.ts Moduls ueberall


## PRIV-4: Python PII Scrubber — tools/pii_scrubber.py

Problem: Die Python-Pipeline (tools/score_importance_ai.py) sendet Content-Previews
an Gemini. Es existiert kein zentrales Python-Scrubbing-Modul.

Task:
  Erstelle tools/pii_scrubber.py mit Microsoft Presidio.

  Dependencies (in requirements.txt ergaenzen falls vorhanden):
    presidio-analyzer==2.2.354
    presidio-anonymizer==2.2.354
    spacy==3.7.4
    # Nach Installation: python -m spacy download de_core_news_sm

  Interface (analog zu TypeScript):
    def scrub_text(text: str) -> tuple[str, dict[str, str]]:
        """Returns (anonymized_text, mapping)"""

    def restore_text(anonymized: str, mapping: dict[str, str]) -> str:
        """Replaces placeholders back with original values"""

  Presidio-Konfiguration:
    - Erkenne: PERSON, EMAIL_ADDRESS, PHONE_NUMBER, ORGANIZATION, LOCATION, IBAN_CODE, CREDIT_CARD, NRP
    - Eigener Recognizer fuer AMOUNT (Geldbetraege, Regex-basiert)
    - Eigener Recognizer fuer CONTRACT_ID (Pattern: #[A-Z]-\d{4}-\d+)
    - Sprache: Deutsch (de) als primaer, Englisch (en) als Fallback
    - Platzhalter-Format: [ENTITY_TYPE_N] (gleiche Konvention wie TypeScript-Modul)

  Integration in score_importance_ai.py:
    - Importiere scrub_text aus pii_scrubber
    - Scrube den Content-Preview BEVOR er an Gemini geht
    - Da Gemini nur einen Integer zurueckgibt, ist kein Restore noetig

Done wenn:
  - tools/pii_scrubber.py existiert und importierbar ist
  - requirements.txt enthaelt Presidio + spaCy Dependencies
  - score_importance_ai.py nutzt das Modul fuer den Content-Preview
  - Round-trip Test: restore_text(*scrub_text(original)) == original


## PRIV-5: Privacy Badge im UI

Problem: User wissen nicht, dass ihre Daten vor dem API-Call anonymisiert werden.
Transparenz erhoeht Vertrauen.

Task:
  Fuege einen kleinen visuellen Hinweis im AI-Draft-Panel hinzu.
  Relevante Datei: src/components/ai-draft-panel.tsx (oder aehnlich)

  - Kleines Shield-Icon (Heroicons ShieldCheckIcon) + Text "Privatsphaere geschuetzt"
    direkt unter dem "Generate Draft"-Button
  - Tooltip on hover: "Persoenliche Daten werden vor der Verarbeitung anonymisiert
    und danach wiederhergestellt. Keine Rohdaten verlassen Nexaro."
  - Styling: text-xs text-green-600 dark:text-green-400 flex items-center gap-1

Done wenn:
  - Badge ist im Draft-Panel sichtbar
  - Tooltip erscheint on hover
  - Styling passt zum bestehenden Design (Dark Mode kompatibel)


## Naechste Schritte nach Phase 2

- User-seitiges Redacting: Option fuer User, Text manuell mit [REDACT] zu markieren bevor Draft generiert wird
- Audit Log: Serverseitiges Logging (ohne echte Werte) das zeigt wieviele Entities pro Request gescrubbt wurden
- Vollstaendige Presidio-Integration in Next.js via Python Microservice (FastAPI) falls regex-Loesung an Grenzen stoesst
- DSGVO Data Processing Agreement mit OpenAI/Anthropic abschliessen als rechtliche Absicherung