# CLAUDE.md — Nexaro Agent Briefing: Third Party Data Avoidance (Stand: März 2026)

> Du bist der Lead Engineer von Nexaro. Du arbeitest autonom, ohne auf Anweisungen zu warten.
> Dein Ziel: Sicherstellen, dass KEINE rohen personenbezogenen oder sensiblen Daten
> Nexaro's eigene Infrastruktur verlassen — auch nicht an OpenAI oder Gemini.
> Du liest diese Datei und arbeitest den Backlog von oben nach unten ab.

---

## Was ist das Ziel?

Nexaro verarbeitet vertrauliche CEO-Kommunikation. Bevor Email-Inhalte an externe
LLM-APIs (OpenAI gpt-4o-mini, Gemini) gesendet werden, muessen alle personenbezogenen
und sensiblen Daten durch nummerierte Platzhalter ersetzt werden.

Ablauf:
  1. scrubText(emailBody)  →  anonymisierter Text + Mapping-Tabelle
  2. Anonymisierter Text geht an OpenAI / Gemini
  3. LLM-Output kommt zurueck
  4. restoreText(llmOutput, mapping)  →  finaler Text mit echten Werten

Die Mapping-Tabelle verlasst NIEMALS den eigenen Server.
Sie lebt nur im Scope des jeweiligen Request-Handlers.

---

## Tech Stack (relevant fuer diesen Task)

| Layer | Technologie |
|-------|-------------|
| Frontend/API | Next.js (App Router), TypeScript, Tailwind CSS |
| AI Pipeline | Python (tools/), score_importance_ai.py |
| Draft-Route | src/app/api/ai/draft/route.ts → OpenAI gpt-4o-mini |
| Scoring | tools/score_importance_ai.py → Gemini 2.0 Flash |

---

## Invarianten

- TypeScript strict — Keine any, keine ignorierten Fehler
- Nach jedem Task: taskstodo.md und progress.md aktualisieren
- Das Mapping-Objekt darf NIEMALS geloggt, in Firestore gespeichert oder in einer
  API-Response zurueckgegeben werden

---

## PRIV-1: TypeScript PII Scrubber — src/lib/pii-scrubber.ts

Problem:
  Kein Scrubbing-Modul existiert in der TypeScript-Codebasis.
  Email-Inhalte gehen ungefiltert an OpenAI.

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
    - Gleiche Werte bekommen denselben Platzhalter:
      Wenn "max@firma.at" zweimal vorkommt → immer [EMAIL_1]
    - Reihenfolge der Pattern-Anwendung (spezifischeres zuerst):
      IBAN → Email → Phone → Amount → Address → Org → Person
    - restoreText macht einfaches String-Replace mit dem Mapping

  Test-Cases als Kommentare in der Datei:
    Input:  "Hallo Max Mustermann, dein Vertrag #V-2024-991 ueber EUR 45.000 wurde geprueft."
    Output: "Hallo [PERSON_1], dein Vertrag [SECRET_1] ueber [AMOUNT_1] wurde geprueft."
    Mapping: { "[PERSON_1]": "Max Mustermann", "[SECRET_1]": "#V-2024-991", "[AMOUNT_1]": "EUR 45.000" }

Done wenn:
  - scrubText erkennt alle 7 Kategorien korrekt
  - Gleiche Werte bekommen denselben Platzhalter
  - restoreText(scrubText(original).anonymized, mapping) == original (Round-trip Test)
  - Keine any Types, TypeScript strict kompatibel


## PRIV-2: Integration in /api/ai/draft/route.ts

Problem:
  Die Draft-Route sendet body, subject, sender, senderEmail ungefiltert an OpenAI.
  Datei: src/app/api/ai/draft/route.ts

Task:
  1. Importiere scrubText, restoreText aus @/lib/pii-scrubber
  2. VOR dem OpenAI-Call:
       const { anonymized: anonymizedBody, mapping } = scrubText(draftBody.body);
       const { anonymized: anonymizedSubject } = scrubText(draftBody.subject ?? "");
  3. Sende anonymizedBody und anonymizedSubject an OpenAI (nicht die Originale)
  4. NACH dem OpenAI-Call:
       const rawDraft = openAIResponse.choices[0].message.content;
       const restoredDraft = restoreText(rawDraft, mapping);
       return NextResponse.json({ draft: restoredDraft });
  5. WICHTIG: mapping darf NIEMALS in Response, Logs oder Firestore erscheinen

  Edge Cases:
    - Wenn scrubText fehlschlaegt (throw): graceful fallback auf Original mit console.warn
    - Leere Strings nicht scrubben
    - sender-Feld ist bereits durch score_importance_ai.py auf Initiale abgekuerzt —
      pruefen ob zusaetzliches Scrubbing noetig ist

Done wenn:
  - Draft-Route sendet keine rohen Email-Inhalte mehr an OpenAI
  - Generierter Draft enthaelt nach Restore die echten Namen/Betraege
  - Mapping taucht nirgends in Logs oder Response auf
  - npm run build laeuft ohne Fehler


## PRIV-3: Integration in weitere AI-Routes

Problem:
  Weitere Routes verarbeiten ebenfalls Email-Inhalte.

Task:
  Prueffe folgende Routes und wende das Scrub/Restore-Pattern an wo noetig:
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

Problem:
  tools/score_importance_ai.py sendet Content-Previews an Gemini ohne Scrubbing.

Task:
  Erstelle tools/pii_scrubber.py mit Microsoft Presidio.

  Dependencies (in requirements.txt ergaenzen):
    presidio-analyzer==2.2.354
    presidio-anonymizer==2.2.354
    spacy==3.7.4
    # Nach Installation: python -m spacy download de_core_news_sm

  Interface:
    def scrub_text(text: str) -> tuple[str, dict[str, str]]:
        """Returns (anonymized_text, mapping)"""

    def restore_text(anonymized: str, mapping: dict[str, str]) -> str:
        """Replaces placeholders back with original values"""

  Presidio-Konfiguration:
    - Erkenne: PERSON, EMAIL_ADDRESS, PHONE_NUMBER, ORGANIZATION, LOCATION,
               IBAN_CODE, CREDIT_CARD, NRP (Steuernummer)
    - Eigener Recognizer fuer AMOUNT (Geldbetraege, Regex-basiert)
    - Eigener Recognizer fuer CONTRACT_ID (Pattern: #[A-Z]-\d{4}-\d+)
    - Sprache: Deutsch (de) primaer, Englisch (en) als Fallback
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

Problem:
  User wissen nicht, dass ihre Daten anonymisiert werden. Transparenz erhoeht Vertrauen.

Task:
  Fuege einen visuellen Hinweis im AI-Draft-Panel hinzu.
  Relevante Datei: src/components/ai-draft-panel.tsx (oder aehnlich)

  - Heroicons ShieldCheckIcon + Text "Privatsphaere geschuetzt"
    direkt unter dem "Generate Draft"-Button
  - Tooltip on hover:
    "Persoenliche Daten werden vor der Verarbeitung anonymisiert und danach
    wiederhergestellt. Keine Rohdaten verlassen Nexaro."
  - Styling: text-xs text-green-600 dark:text-green-400 flex items-center gap-1

Done wenn:
  - Badge ist im Draft-Panel sichtbar
  - Tooltip erscheint on hover
  - Dark Mode kompatibel

---

*Letzte Aktualisierung: 17. März 2026*
*Naechster Task: PRIV-1 — src/lib/pii-scrubber.ts erstellen*