Role & Goal
Du bist ein Senior Backend Architect und Security Expert. Deine Aufgabe ist es, ein "Privacy-Preserving AI Gateway" in [HIER SPRACHE/FRAMEWORK EINTRAGEN, z.B. Node.js/TypeScript oder Python/FastAPI] zu implementieren. Dieses Gateway bildet die Brücke zwischen unserem Frontend und der OpenAI-API. Das strikte Ziel: OpenAI darf zu keinem Zeitpunkt echte Projektnamen, sensible Variablen, Personendaten, IBANs oder Geschäftskonzepte "sehen".

Core Architecture Workflow
Bitte implementiere exakt folgenden 3-Phasen-Ablauf in Form einer sauberen API:

1. Phase: Local Scrubbing (Erkennung sensibler Daten PII ohne GPU-Server)
Baue einen ScrubberService.
Nimm den rohen Input des Nutzers.
Installiere eine bewährte Open-Source NLP/RegEx-Bibliothek (wie "microsoft/presidio", "compromise" o.ä.) direkt in deinem Web-Backend-Code. Es darf **kein** externes LLM oder lokaler GPU-Server (wie Ollama) eingebunden werden. Das Scrubbing muss in Millisekunden auf Basis von Pattern-Matching und Named Entity Recognition rein softwareseitig passieren.
Lass die Bibliothek den Text nach jeglichen Eigennamen, Firmennamen, Adressen, Bankdaten und Geschäftsbegriffen scannen.
Ersetze alle gefundenen sensiblen Daten durch strikte, nummerierte Tokens im Format [PERSON_1], [ORG_1], [IBAN_1] etc.
Erstelle ein lokales Mapping-Dictionary, das aufschlüsselt, was z.B. [PERSON_1] im Original war.
Speichere dieses Mapping (z.B. [PERSON_1]: "Thomas Müller") temporär (z.B. in Redis oder In-Memory Map) für die aktuelle Request-ID.

2. Phase: Der OpenAI Proxy Call
Benutze den scrubbed_text als User-Message für den echten Call an die OpenAI API (OpenAIService).
Injeziere folgenden System-Prompt bei OpenAI: "Du bist ein hilfreicher Assistent. ACHTUNG: Der User-Text enthält Platzhalter in eckigen Klammern (wie [PERSON_1] oder [ORG_1]). Du musst diese Platzhalter in deiner Antwort exakt so und grammatikalisch korrekt übernehmen. Verändere niemals die Bracket-Struktur dieser Platzhalter."

3. Phase: Re-Hydration & Delivery
Nimm den generierten Output von OpenAI. Dieser enthält nun die Lösung, aber gespickt mit Tokens wie [PERSON_1].
Baue einen RehydrationService. Hole das temporäre mapping anhand der Request-ID.
Ersetze mithilfe einer RegEx (oder replace) alle Tokens im String von OpenAI zurück in den Klartext aus dem Mapping.
Gib den vollkommen bereinigten Klartext als fertigen Response an das anfragende System/Frontend zurück.
Lösche das temporäre Mapping aus dem Speicher.

Technische Anforderungen
Modulare Struktur: Schreibe keine gigantische Datei. Teile den Code sauber auf (Controller, ScrubberService, OpenAIService, MappingStorage).
Robustness: Baue ein Fallback ein, falls Tokens in der Rückgabe von OpenAI einmal fehlschlagen oder verändert wurden.
Typisierung: Nutze strenge Typen (z.B. TypeScript Interfaces oder Pydantic Models).
Schritt 1: Bevor du den ganzen Code hinuntertippst, liefere mir bitte kurz eine Ordnerstruktur und bestätige, dass du den Architektur-Workflow verstanden hast.
