# Nexaro AI-Modell-Analyse: Mail-Priorisierung & Draft-Generierung

**Dokument-Version:** 1.0
**Datum:** 2026-03-12
**Autor:** Nexaro Engineering
**Zielgruppe:** Technische Entscheidungstraeger, Product Owner, CTO

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Ist-Zustand der Nexaro AI-Pipeline](#2-ist-zustand-der-nexaro-ai-pipeline)
3. [Anforderungsprofil](#3-anforderungsprofil)
4. [Modell-Analyse: Mail-Priorisierung](#4-modell-analyse-mail-priorisierung)
5. [Modell-Analyse: Draft-Generierung](#5-modell-analyse-draft-generierung)
6. [Vergleichstabelle aller Modelle](#6-vergleichstabelle-aller-modelle)
7. [Architektur-Entscheidungen](#7-architektur-entscheidungen)
8. [Datenschutz und DSGVO](#8-datenschutz-und-dsgvo)
9. [Kostenberechnung nach Skalierung](#9-kostenberechnung-nach-skalierung)
10. [Empfehlungen](#10-empfehlungen)
11. [Architektur-Vorschlag](#11-architektur-vorschlag)
12. [Migrationsplan](#12-migrationsplan)

---

## 1. Executive Summary

Nexaro benoetigt AI fuer zwei fundamental unterschiedliche Aufgaben:

- **Mail-Priorisierung** (Klassifikation, 0-100 Score): Hoher Durchsatz, niedrige Kosten, Batch-faehig
- **Draft-Generierung** (Textproduktion, CEO-Stil): Hohe Qualitaet, Personalisierung, Echtzeit-Latenz

Die aktuelle Implementierung nutzt eine Keyword-basierte Heuristik (`score_importance.py`) fuer Scoring und Groq/Llama-3.3-70B fuer Draft-Generierung. Diese Analyse bewertet alle relevanten Modelloptionen und empfiehlt eine Hybrid-Architektur: **guenstiges Modell fuer Scoring + Premium-Modell fuer Drafts**.

**Kernergebnis:** Die optimale Kombination ist **Gemini 2.0 Flash fuer Priorisierung** (Kosten-Leistungs-Verhaeltnis, Batch-API) und **Claude 3.5 Sonnet oder GPT-4o fuer Draft-Generierung** (Qualitaet, Tonalitaet, Multilingual). Fuer fruehe Skalierungsphasen bleibt Groq/Llama als kostenlose Draft-Alternative bestehen.

---

## 2. Ist-Zustand der Nexaro AI-Pipeline

### 2.1 Mail-Priorisierung (score_importance.py)

**Aktueller Ansatz:** Regelbasierte Heuristik in Python mit 6 Scoring-Faktoren:

| Faktor | Gewicht | Methode |
|--------|---------|---------|
| Keyword-Analyse | 2.0 | Pattern-Matching gegen 14 Urgency-Keywords |
| Source-Prioritaet | 1.5 | Statische Map (Gmail=1.5, Slack=1.0 etc.) |
| Recency | 1.5 | Zeitdifferenz-basiert (< 1h = 1.5, < 4h = 1.0) |
| Thread-Tiefe | 1.0 | Boolean: Hat Thread-ID ja/nein |
| VIP-Sender | 2.0 | Abgleich gegen User-VIP-Liste |
| Zeit-Sensitivitaet | 2.0 | Regex fuer Datums-/Uhrzeitangaben |

**Ergebnis:** Score 0.0 bis 10.0, UI multipliziert mit 10 auf 0-100 Skala.

**Schwaechen des aktuellen Ansatzes:**
- Kein semantisches Verstaendnis (kann "Der CEO von TechCorp will sich morgen treffen" nicht von "Der CEO-Bericht ist fertig" unterscheiden)
- Keine Kontextualisierung (kennt nicht die Wichtigkeit bestimmter Absender basierend auf Geschaeftsbeziehungen)
- Starre Keyword-Liste, kein Lernen aus Nutzerverhalten
- Kein Verstaendnis von Ironie, impliziter Dringlichkeit oder geschaeftlicher Relevanz
- Thread-Tiefe wird nur binaer bewertet, nicht nach Eskalationsmuster

### 2.2 Draft-Generierung (/api/ai/draft)

**Aktueller Ansatz:** Groq API mit Llama-3.3-70B-Versatile

- System-Prompt: "Busy executive assistant", 3 Absaetze max, professionell-freundlich
- Input: Absender, Betreff, Body (kein Thread-Kontext)
- Max Tokens: 400, Temperature: 0.7
- Keine Personalisierung, kein Schreibstil-Lernen
- Kein Multilingual-Handling (Prompt ist Englisch, Antwort-Sprache undefiniert)

**Zusaetzlich vorhanden:** `/api/ai/extract-todos` nutzt Gemini 2.0 Flash fuer Action-Item-Extraktion aus E-Mails (deutscher System-Prompt, Temperature 0.3).

**Schwaechen:**
- Kein Thread-Kontext (nur einzelne Mail wird analysiert)
- Kein Absender-Kontext (wer ist diese Person, welche Beziehung besteht)
- Keine Personalisierung (gleicher Ton fuer alle CEOs)
- Sprache wird nicht erkannt/gesteuert
- Groq hat gelegentliche Verfuegbarkeitsprobleme bei hoher Last

---

## 3. Anforderungsprofil

### 3.1 Mail-Priorisierung

| Anforderung | Spezifikation |
|-------------|---------------|
| Durchsatz | 100-10.000 Mails/Tag pro User, Batch-Verarbeitung |
| Latenz | < 5 Sekunden fuer Einzelmail, Batch darf Minuten dauern |
| Genauigkeit | > 85% Uebereinstimmung mit CEO-Bewertung |
| Kosten-Limit | < $0.001 pro Scoring-Vorgang |
| Output | Numerischer Score 0-100 + Kategorie (High/Medium/Low) |
| Kontext | Absender-Historie, Unternehmenszugehoerigkeit, Thread-Verlauf |
| Lernfaehigkeit | Score soll sich an Nutzerverhalten anpassen |

### 3.2 Draft-Generierung

| Anforderung | Spezifikation |
|-------------|---------------|
| Latenz | < 2 Sekunden bis erster Text (Streaming bevorzugt) |
| Qualitaet | Professionell, CEO-angemessen, kontextbewusst |
| Personalisierung | Schreibstil des Users lernen und nachahmen |
| Kontext | Gesamter Thread, Absender-Profil, Firmenkontext |
| Sprachen | Deutsch und Englisch minimum, weitere optional |
| Max Laenge | 500 Zeichen Standard, bis 2000 bei Bedarf |
| Safety | Keine halluzinierten Fakten, keine unangemessenen Inhalte |

---

## 4. Modell-Analyse: Mail-Priorisierung

### 4.1 OpenAI GPT-4o und GPT-4o-mini

**GPT-4o:**
- Input: $2.50/1M Tokens, Output: $10.00/1M Tokens
- Latenz: 300-800ms (Einzelanfrage)
- Kontextfenster: 128K Tokens
- Staerken: Exzellentes semantisches Verstaendnis, zuverlaessige Klassifikation, Function Calling fuer strukturierten Output
- Schwaechen: Fuer reines Scoring ueberdimensioniert und zu teuer
- Batch-API: 50% Rabatt, Ergebnis innerhalb 24h

**GPT-4o-mini:**
- Input: $0.15/1M Tokens, Output: $0.60/1M Tokens
- Latenz: 100-400ms
- Kontextfenster: 128K Tokens
- Staerken: 17x guenstiger als GPT-4o bei 85-90% der Klassifikationsqualitaet, ideal fuer High-Volume Scoring
- Schwaechen: Bei komplexen Kontextentscheidungen etwas schwaecher
- Batch-API: 50% Rabatt verfuegbar

**Bewertung fuer Priorisierung:** GPT-4o-mini ist ein starker Kandidat. Bei einer durchschnittlichen Mail von ~500 Tokens Input und ~50 Tokens Output kostet ein einzelnes Scoring ca. $0.000105 — weit unter dem Budget-Limit.

### 4.2 Anthropic Claude Sonnet und Haiku

**Claude 3.5 Sonnet:**
- Input: $3.00/1M Tokens, Output: $15.00/1M Tokens
- Latenz: 300-1000ms
- Kontextfenster: 200K Tokens
- Staerken: Sehr gutes Verstaendnis von Geschaeftskontext, zuverlaessige strukturierte Outputs
- Schwaechen: Fuer Batch-Scoring zu teuer, keine Batch-API mit vergleichbarem Rabatt

**Claude 3.5 Haiku:**
- Input: $0.80/1M Tokens, Output: $4.00/1M Tokens
- Latenz: 100-500ms
- Kontextfenster: 200K Tokens
- Staerken: Gute Klassifikationsqualitaet, 200K Kontext erlaubt Thread-Analyse, schnell
- Schwaechen: Teurer als GPT-4o-mini und Gemini Flash fuer vergleichbare Scoring-Qualitaet
- Kosten pro Scoring: ca. $0.0006 — ueber dem optimalen Bereich

**Bewertung fuer Priorisierung:** Claude Haiku ist qualitativ gut, aber im Preis-Leistungs-Vergleich fuer reines Scoring nicht optimal. Der groessere Kontext (200K vs 128K) ist fuer Scoring selten relevant, da der Input pro Mail begrenzt ist.

### 4.3 Google Gemini Flash und Pro

**Gemini 2.0 Flash:**
- Input: $0.10/1M Tokens, Output: $0.40/1M Tokens (Standard)
- Batch-Preis: $0.025/1M Input, $0.10/1M Output (75% Rabatt)
- Latenz: 50-300ms (extrem schnell)
- Kontextfenster: 1M Tokens
- Staerken: Guenstigstes Modell am Markt, extrem schnell, riesiges Kontextfenster, Google-Integration
- Schwaechen: Etwas geringere Nuancierung bei komplexen Geschaeftskontexten
- Kosten pro Scoring (Batch): ca. $0.0000165 — fast vernachlaessigbar

**Gemini 2.0 Pro:**
- Input: $1.25/1M Tokens, Output: $10.00/1M Tokens
- Latenz: 200-600ms
- Kontextfenster: 1M Tokens
- Staerken: Deutlich besseres Reasoning, 1M Kontext fuer Mega-Threads
- Schwaechen: Fuer Scoring-Zwecke Overkill

**Bewertung fuer Priorisierung:** Gemini 2.0 Flash ist der klare Preis-Leistungs-Sieger fuer Batch-Scoring. Die Batch-API mit 75% Rabatt macht es praktisch kostenlos bei hohem Volumen. Die Qualitaet reicht fuer Klassifikationsaufgaben vollkommen aus.

### 4.4 Open-Source Modelle (Llama, Mistral, Phi)

**Llama 3.3 70B (via Groq):**
- Groq-Preis: $0.59/1M Input, $0.79/1M Output
- Latenz: 50-200ms auf Groq (LPU-Inferenz)
- Kontextfenster: 128K Tokens
- Staerken: Sehr schnell auf Groq, gute Klassifikationsqualitaet, Open Source
- Schwaechen: Groq hat Rate-Limits im Free-Tier, Verfuegbarkeitsrisiko

**Llama 3.2 3B (Self-Hosted):**
- Self-Hosting: ~$0.30/Stunde auf A10G GPU (ca. 100 Scorings/Sekunde)
- Kosten pro Scoring: ca. $0.000003 bei Volllast
- Staerken: Extrem guenstig bei hohem Volumen, volle Datenkontrolle
- Schwaechen: Infrastruktur-Overhead, Qualitaet deutlich unter groesseren Modellen, Wartung

**Mistral Small (24B):**
- API: $0.20/1M Input, $0.60/1M Output
- Latenz: 100-400ms
- Staerken: Gutes Preis-Leistungs-Verhaeltnis, europaeischer Anbieter (Datenschutz)
- Schwaechen: Kleineres Oekosystem, weniger Battle-Tested fuer Klassifikation

**Microsoft Phi-4 (14B):**
- Nur Self-Hosted oder Azure AI verfuegbar
- Staerken: Sehr kompakt, gute Reasoning-Faehigkeiten fuer die Groesse
- Schwaechen: Nicht direkt als API verfuegbar, nur fuer Self-Hosting-Szenarien relevant

**Bewertung fuer Priorisierung:** Llama 3.3 via Groq ist eine solide kostenguenstige Option. Fuer Self-Hosting lohnt sich Llama 3.2 3B erst ab ~50.000 Scorings/Tag. Mistral Small ist interessant fuer DSGVO-Compliance (franzoesischer Anbieter), aber nicht guenstiger als Gemini Flash.

### 4.5 Fine-Tuned Modelle

**Lohnt sich Fine-Tuning fuer CEO-Priorisierung?**

| Aspekt | Bewertung |
|--------|-----------|
| Qualitaetsgewinn | Hoch — fine-tuned Modelle koennen CEO-spezifische Priorisierung 15-25% besser als Prompting |
| Kosten fuer Training | GPT-4o-mini Fine-Tuning: $3.00/1M Training-Tokens, einmalig $50-200 pro User |
| Inference-Kosten | Gleich wie Base-Modell (kein Aufpreis bei OpenAI) |
| Datenaufwand | Minimum 200-500 gelabelte Beispiele pro CEO |
| Cold-Start-Problem | Neue User haben keine Trainingsdaten, Fallback noetig |
| Wartung | Periodisches Re-Training wenn sich Prioritaeten aendern |

**Empfohlener Ansatz:** Fine-Tuning auf GPT-4o-mini als Phase-2-Feature. Phase 1 nutzt Prompting mit Few-Shot-Beispielen aus dem Nutzerverhalten (welche Mails wurden sofort geoeffnet/beantwortet). Sobald genuegend labeled Daten vorliegen (nach ~4 Wochen Nutzung), wird pro User ein fine-tuned Modell erstellt.

**Fine-Tuning-Pipeline:**
1. User liest/beantwortet Mails -> implizites Labeling (beantwortet = wichtig)
2. Nach 500 Interaktionen: Trainingsdatensatz generieren
3. Fine-Tune GPT-4o-mini auf User-spezifische Gewichtung
4. A/B-Test: Fine-Tuned vs. Prompting, Score-Accuracy messen
5. Bei > 10% Verbesserung: Fine-Tuned Modell aktivieren

### 4.6 Klassisches ML (BERT, Logistic Regression)

**Logistic Regression / Random Forest:**
- Kosten: Praktisch null (CPU-basiert)
- Latenz: < 1ms
- Trainingsaufwand: Gering, Feature-Engineering noetig
- Qualitaet: 65-75% Accuracy fuer binaere Klassifikation (wichtig/unwichtig)
- Staerken: Erklaerbar, deterministisch, extrem schnell
- Schwaechen: Kein semantisches Verstaendnis, braucht handgefertigte Features

**BERT / DistilBERT (Fine-Tuned):**
- Kosten: Self-Hosted $0.10-0.30/Stunde auf CPU, ~1000 Scorings/Sekunde
- Latenz: 5-20ms
- Trainingsaufwand: Mittel, braucht ~1000 gelabelte Beispiele
- Qualitaet: 75-85% Accuracy fuer Multi-Class-Klassifikation
- Staerken: Gutes semantisches Verstaendnis, kostenguenstig, schnell, gut erforscht
- Schwaechen: Kein Verstaendnis fuer geschaeftliche Nuancen, limitierter Kontext (512 Tokens)

**Bewertung:** Klassisches ML eignet sich als **erster Filter** (Vorklassifikation), nicht als alleinige Loesung. Ein zweistufiger Ansatz ist sinnvoll:
1. **Stufe 1:** DistilBERT/Logistic Regression fuer Grob-Klassifikation (< 1ms)
2. **Stufe 2:** LLM (Gemini Flash) nur fuer Nachrichten im "unsicheren Bereich" (Score 30-70)

Dies reduziert LLM-Kosten um geschaetzt 60-70% bei gleicher Endqualitaet.

---

## 5. Modell-Analyse: Draft-Generierung

### 5.1 Qualitaetsvergleich fuer professionelle CEO-Antworten

| Modell | CEO-Tonalitaet | Kontextverstaendnis | Multilingual (DE/EN) | Personalisierung |
|--------|---------------|---------------------|---------------------|-----------------|
| GPT-4o | Exzellent | Exzellent | Sehr gut | Gut via System-Prompt |
| GPT-4o-mini | Gut | Gut | Gut | Akzeptabel |
| Claude 3.5 Sonnet | Exzellent | Exzellent | Sehr gut | Sehr gut (laengerer Kontext) |
| Claude 3.5 Haiku | Gut | Gut | Gut | Akzeptabel |
| Gemini 2.0 Flash | Gut | Gut | Gut (DE etwas schwaecher) | Akzeptabel |
| Gemini 2.0 Pro | Sehr gut | Sehr gut | Gut | Gut |
| Llama 3.3 70B (Groq) | Akzeptabel-Gut | Gut | Maessig (DE deutlich schwaecher) | Schwach |
| Mistral Large | Gut | Gut | Sehr gut (starkes Franzoesisch/Deutsch) | Gut |

### 5.2 Detailanalyse der Top-Kandidaten

#### GPT-4o fuer Drafts

- **Kosten:** $2.50/1M Input + $10.00/1M Output
- **Latenz:** 300-800ms First-Token, Streaming verfuegbar
- **Kontextfenster:** 128K Tokens
- **Staerken:**
  - Herausragende Qualitaet bei professioneller Korrespondenz
  - Zuverlaessiges Instruction-Following (haelt sich an Laengen-Vorgaben)
  - Gute deutsche Textqualitaet
  - Streaming-API fuer progressive Anzeige
  - Function Calling fuer strukturierte Outputs (Sprache, Formality-Level)
- **Schwaechen:**
  - Teurer als Alternativen
  - 128K Kontext reicht fuer Thread + Firmenkontext, aber kein Spielraum
- **Kosten pro Draft:** ~$0.003-0.008 (abhaengig von Thread-Laenge)

#### Claude 3.5 Sonnet fuer Drafts

- **Kosten:** $3.00/1M Input + $15.00/1M Output
- **Latenz:** 300-1000ms First-Token, Streaming verfuegbar
- **Kontextfenster:** 200K Tokens
- **Staerken:**
  - Bestes Verstaendnis fuer Nuancen und Tonalitaet
  - 200K Kontext erlaubt umfangreichen Thread-Verlauf + Firmenkontext + Schreibstil-Beispiele
  - Sehr gutes Deutsch, natuerlich klingend
  - Exzellent bei "schreibe wie dieser CEO" (Style-Matching)
  - Zuverlaessigstes Safety-Verhalten (keine unpassenden Drafts)
- **Schwaechen:**
  - Am teuersten im Output
  - Etwas langsamere First-Token-Time als GPT-4o
- **Kosten pro Draft:** ~$0.004-0.012

#### Gemini 2.0 Flash fuer Drafts

- **Kosten:** $0.10/1M Input + $0.40/1M Output
- **Latenz:** 50-200ms First-Token (extrem schnell)
- **Kontextfenster:** 1M Tokens
- **Staerken:**
  - Unschlagbar guenstig
  - Schnellste Latenz aller Optionen
  - 1M Kontext erlaubt theoretisch gesamte Mailbox-Historie
  - Bereits in Nexaro integriert (extract-todos nutzt Gemini)
- **Schwaechen:**
  - CEO-Tonalitaet nicht auf dem Niveau von GPT-4o/Claude Sonnet
  - Deutsche Textqualitaet merklich schwaecher (kuenstlicher klingend)
  - Weniger zuverlaessig bei komplexen Tone-Anweisungen
  - Gelegentlich zu ausfuehrlich oder zu formelhaft
- **Kosten pro Draft:** ~$0.0001-0.0004

#### Llama 3.3 70B via Groq (aktuell implementiert)

- **Kosten:** $0.59/1M Input + $0.79/1M Output
- **Latenz:** 50-150ms First-Token (Groq LPU extrem schnell)
- **Kontextfenster:** 128K Tokens
- **Staerken:**
  - Sehr niedrige Latenz dank Groq-Hardware
  - Guenstig
  - Bereits implementiert und funktional
  - Open-Source-Modell, kein Vendor-Lock-in
- **Schwaechen:**
  - Deutsche Textqualitaet deutlich schlechter als GPT-4o/Claude
  - Weniger zuverlaessig bei Laengen- und Format-Vorgaben
  - Groq hat aggressives Rate-Limiting (30 RPM im Free-Tier)
  - Verfuegbarkeitsgarantien schwaecher als bei OpenAI/Google/Anthropic
  - Personalisierung ueber System-Prompt funktioniert schlechter
- **Kosten pro Draft:** ~$0.0006-0.0015

### 5.3 Kontextfenster-Anforderungen

Fuer eine hochwertige Draft-Generierung braucht das Modell folgenden Kontext:

| Kontext-Element | Geschaetzte Tokens | Prioritaet |
|-----------------|-------------------|------------|
| System-Prompt (Rolle, Regeln, Stil) | 200-500 | Kritisch |
| Aktuelle E-Mail (Body + Header) | 200-1000 | Kritisch |
| Thread-Historie (letzte 5-10 Nachrichten) | 1000-5000 | Hoch |
| Absender-Profil (Name, Firma, Beziehung) | 100-300 | Hoch |
| User-Schreibstil-Beispiele (3-5 fruehere Antworten) | 500-2000 | Mittel |
| Unternehmenskontext (Firma, Branche, aktuelle Projekte) | 200-500 | Mittel |
| **Gesamt** | **2200-9300** | — |

Alle betrachteten Modelle haben ausreichende Kontextfenster (mindestens 128K). Der praktische Bedarf liegt unter 10K Tokens — das Kontextfenster ist kein differenzierender Faktor.

### 5.4 Personalisierung: Schreibstil-Lernen

**Drei Ansaetze fuer Style-Matching:**

**A) Few-Shot Prompting (empfohlen fuer Phase 1):**
- 3-5 fruehere Antworten des Users als Beispiele im System-Prompt
- Kein Training noetig, sofort verfuegbar nach wenigen Antworten
- Qualitaet: 70-80% Style-Match
- Kosten: Nur marginale Token-Erhoehung (~1500 Tokens extra)

**B) Fine-Tuning (Phase 2, ab 50+ Antworten pro User):**
- Eigenes Modell pro User oder LoRA-Adapter
- Qualitaet: 85-95% Style-Match
- Kosten: $50-200 einmalig pro User-Modell
- Nachteil: Cold-Start, Latenz bei Modell-Laden

**C) Embedding-basiertes Retrieval (Phase 2, alternativ):**
- Alle User-Antworten als Embeddings speichern
- Bei neuer Draft-Anfrage: aehnlichste fruehere Antworten per Vektor-Suche finden
- Diese als Beispiele im Prompt verwenden (dynamisches Few-Shot)
- Qualitaet: 75-85% Style-Match, skaliert besser als Fine-Tuning
- Kosten: Embedding-Kosten vernachlaessigbar, Vektor-DB ~$10-30/Monat

**Empfehlung:** Start mit Ansatz A, Migration zu Ansatz C sobald genuegend Daten vorliegen. Fine-Tuning (B) nur fuer Power-User mit > 200 Antworten und explizitem Wunsch.

### 5.5 Multilingual-Faehigkeiten

| Modell | Deutsch | Englisch | Code-Switching |
|--------|---------|----------|----------------|
| GPT-4o | Sehr gut, natuerlich | Exzellent | Automatisch, zuverlaessig |
| Claude 3.5 Sonnet | Sehr gut, natuerlich | Exzellent | Automatisch, zuverlaessig |
| Gemini 2.0 Flash | Gut, gelegentlich steif | Sehr gut | Funktioniert, manchmal inkonsistent |
| Llama 3.3 70B | Akzeptabel, oft anglizistisch | Sehr gut | Unzuverlaessig |
| Mistral Large | Sehr gut | Sehr gut | Sehr gut (europaeischer Fokus) |

**Spracherkennung:** Der Draft-Endpoint sollte die Sprache der eingehenden Mail automatisch erkennen und den Draft in derselben Sprache generieren. Alle Top-Modelle koennen dies ueber einen einfachen Prompt-Zusatz: "Antworte in der Sprache der eingehenden Nachricht."

### 5.6 Latenz-Analyse (Time-to-First-Token)

Anforderung: < 2 Sekunden fuer gesamten Draft (nicht nur First Token).

| Modell | TTFT (P50) | TTFT (P95) | Gesamtzeit ~300 Tokens | Erfuellt < 2s? |
|--------|-----------|-----------|----------------------|----------------|
| GPT-4o | 350ms | 900ms | 1.2-2.0s | Knapp, mit Streaming |
| GPT-4o-mini | 150ms | 500ms | 0.6-1.2s | Ja |
| Claude 3.5 Sonnet | 400ms | 1200ms | 1.5-2.5s | Riskant ohne Streaming |
| Claude 3.5 Haiku | 150ms | 500ms | 0.5-1.0s | Ja |
| Gemini 2.0 Flash | 80ms | 250ms | 0.3-0.7s | Ja, mit grossem Puffer |
| Llama 3.3 (Groq) | 60ms | 200ms | 0.2-0.5s | Ja, am schnellsten |
| Mistral Large | 300ms | 800ms | 1.0-1.8s | Ja, mit Streaming |

**Ergebnis:** Fuer das 2-Sekunden-Ziel sind alle Modelle mit Streaming geeignet. Ohne Streaming fallen Claude Sonnet und GPT-4o bei hoher Last gelegentlich aus dem Fenster. **Streaming ist fuer die UX in jedem Fall empfehlenswert** — der User sieht sofort Text entstehen.

---

## 6. Vergleichstabelle aller Modelle

### 6.1 Fuer Mail-Priorisierung (Scoring)

| Modell | Kosten/1K Scorings | Qualitaet (1-10) | Latenz (P50) | Batch-faehig | DSGVO | Empfehlung |
|--------|-------------------|------------------|-------------|-------------|-------|------------|
| Gemini 2.0 Flash | $0.017 (Batch) | 7.5 | 100ms | Ja (75% Rabatt) | EU-Option | **Beste Wahl** |
| GPT-4o-mini | $0.105 | 8.0 | 200ms | Ja (50% Rabatt) | EU-Option | Sehr gut |
| GPT-4o-mini (Batch) | $0.053 | 8.0 | Async | Ja | EU-Option | Sehr gut fuer Bulk |
| Claude 3.5 Haiku | $0.60 | 7.5 | 200ms | Nein | EU-Region | Zu teuer |
| Llama 3.3 (Groq) | $0.44 | 7.0 | 80ms | Nein | Unklar | Rate-Limits |
| Mistral Small | $0.23 | 7.0 | 200ms | Ja | EU (Frankreich) | DSGVO-Argument |
| DistilBERT (Self-Host) | ~$0.001 | 6.0 | 5ms | N/A | Voll kontrolliert | Als Vorstufe |
| Keyword-Heuristik | $0.00 | 4.5 | < 1ms | N/A | Voll kontrolliert | Aktuell, ungenuegend |

### 6.2 Fuer Draft-Generierung

| Modell | Kosten/1K Drafts | Qualitaet (1-10) | TTFT (P50) | Deutsch | Personalisierung | DSGVO | Empfehlung |
|--------|-----------------|------------------|-----------|---------|-----------------|-------|------------|
| GPT-4o | $5.50 | 9.5 | 350ms | Sehr gut | Gut | EU-Option | **Top-Qualitaet** |
| Claude 3.5 Sonnet | $8.00 | 9.5 | 400ms | Sehr gut | Sehr gut | EU-Region | **Bester Kontext** |
| GPT-4o-mini | $0.45 | 7.5 | 150ms | Gut | Akzeptabel | EU-Option | Budget-Option |
| Gemini 2.0 Flash | $0.25 | 7.0 | 80ms | Gut (-) | Akzeptabel | EU-Option | Guenstigste |
| Llama 3.3 (Groq) | $0.75 | 7.0 | 60ms | Maessig | Schwach | Unklar | **Aktuell, ersetzen** |
| Mistral Large | $3.00 | 8.0 | 300ms | Sehr gut | Gut | EU | DSGVO-Favorit |
| Claude 3.5 Haiku | $2.20 | 8.0 | 150ms | Gut | Akzeptabel | EU-Region | Gutes Mittelfeld |

---

## 7. Architektur-Entscheidungen

### 7.1 Eigene API-Schicht vs. Direkter Provider-Zugriff vom Frontend

**Empfehlung: Immer ueber eigene API-Route (wie aktuell implementiert)**

| Kriterium | Eigene API | Direkt vom Frontend |
|-----------|-----------|-------------------|
| API-Key-Sicherheit | Keys nur serverseitig | Keys im Client exponiert |
| Rate-Limiting | Zentral steuerbar | Nicht kontrollierbar |
| Provider-Wechsel | Ein Punkt zum Aendern | Jede Komponente aendern |
| Caching | Serverseitig moeglich | Nicht moeglich |
| Monitoring | Zentrales Logging | Kein Einblick |
| Latenz | +10-30ms Overhead | Minimal schneller |
| DSGVO-Audit | Ein Daten-Durchgangspunkt | Schwer nachvollziehbar |

Die aktuelle Architektur (`/api/ai/draft`, `/api/ai/extract-todos`) ist korrekt. Alle AI-Calls muessen ueber Next.js API Routes laufen.

**Erweiterung:** Ein einheitlicher AI-Gateway (`/api/ai/gateway`) der alle Modell-Calls bündelt:

```
/api/ai/gateway
  ├── action: "score"      → Gemini Flash (Batch oder Einzel)
  ├── action: "draft"      → GPT-4o / Claude Sonnet (Streaming)
  ├── action: "extract"    → Gemini Flash
  └── action: "classify"   → GPT-4o-mini (Spam/Kategorie)
```

### 7.2 Caching-Strategien

**Fuer Priorisierung:**

| Strategie | Beschreibung | Erwartete Cache-Hit-Rate |
|-----------|-------------|-------------------------|
| Sender-Score-Cache | Score-Beitrag pro Absender cachen (VIP-Status, Antwort-Frequenz) | 80-90% |
| Thread-Score-Cache | Wenn Thread-Score berechnet, fuer nachfolgende Mails wiederverwenden | 40-60% |
| Keyword-Cache | Haeufige Keyword-Kombinationen mit vorberechnetem Score | 20-30% |
| User-Profil-Cache | User-Preferences (VIP-Liste, Source-Prioritaeten) im Memory | 99% |

**Implementierung:** Redis oder Firestore-Subcollection `users/{uid}/scoring_cache` mit TTL von 1 Stunde.

**Fuer Draft-Generierung:**

Caching ist hier weniger sinnvoll, da jeder Draft kontextabhaengig ist. Sinnvoll sind:
- **User-Style-Cache:** Schreibstil-Zusammenfassung pro User (aktualisiert bei jeder gesendeten Antwort)
- **Sender-Profil-Cache:** Informationen ueber Absender (Name, Firma, letzte Interaktionen)
- **Template-Cache:** Fuer Standardantworten (Terminbestaetigung, Delegierung, Absage)

### 7.3 Hybrid-Ansatz: Guenstiges Modell fuer Scoring + Premium fuer Drafts

**Dies ist die empfohlene Architektur:**

| Aufgabe | Modell | Begruendung |
|---------|--------|-------------|
| Scoring (Batch, neue Mails) | Gemini 2.0 Flash (Batch-API) | 75% Rabatt, ausreichende Qualitaet, schnell |
| Scoring (Einzelmail, Echtzeit) | Gemini 2.0 Flash (Standard) | Schnellste Latenz, guenstig |
| Scoring (unsichere Faelle) | GPT-4o-mini | Bessere Nuancierung fuer Grenzfaelle |
| Draft-Generierung (Standard) | GPT-4o | Beste CEO-Tonalitaet, zuverlaessig |
| Draft-Generierung (Premium/DSGVO) | Claude 3.5 Sonnet | Bester Kontext, bestes Style-Matching |
| Draft-Generierung (Budget/Fallback) | Gemini 2.0 Flash | Wenn Premium-APIs ausfallen oder Budget knapp |
| Todo-Extraktion | Gemini 2.0 Flash | Bereits implementiert, ausreichende Qualitaet |

**Fallback-Kette fuer Draft-Generierung:**
1. GPT-4o (primaer)
2. Claude 3.5 Sonnet (sekundaer, bei OpenAI-Ausfall)
3. Gemini 2.0 Flash (tertiaer, Notfall-Fallback)
4. Groq/Llama 3.3 (letzter Fallback, aktuell implementiert)

---

## 8. Datenschutz und DSGVO

### 8.1 Wo werden E-Mails verarbeitet?

| Anbieter | Datenverarbeitung | DSGVO-Status | DPA verfuegbar |
|----------|------------------|-------------|----------------|
| OpenAI | USA (Standard), EU via Azure | Art. 46 DSGVO (SCCs) | Ja |
| OpenAI via Azure | EU (West Europe Region) | Art. 28 DSGVO konform | Ja (Microsoft DPA) |
| Anthropic | USA (Standard), EU via AWS eu-west | Art. 46 DSGVO (SCCs) | Ja |
| Google (Gemini) | USA (Standard), EU-Region waehlbar | Art. 28 DSGVO konform | Ja (Google Cloud DPA) |
| Groq | USA, keine EU-Option | Problematisch | Begrenzt |
| Mistral | Frankreich / EU | Nativ DSGVO-konform | Ja |
| Self-Hosted | Eigene Infrastruktur | Voll kontrolliert | N/A |

### 8.2 DSGVO-Anforderungen fuer Nexaro

| Anforderung | Umsetzung |
|-------------|-----------|
| **Datensparsamkeit** | Nur relevante Mail-Teile an AI senden (Subject, Body-Excerpt, Sender) — keine Attachments, keine Signaturen |
| **Zweckbindung** | AI-Verarbeitung nur fuer Scoring und Drafts, keine Weiterverwendung |
| **Auftragsverarbeitung** | DPA mit jedem AI-Provider abschliessen |
| **Loeschung** | AI-Provider duerfen keine Trainingsdaten aus Nexaro-Requests behalten |
| **Transparenz** | User muss wissen, dass AI seine Mails verarbeitet (Onboarding-Hinweis) |
| **Widerspruchsrecht** | User muss AI-Features komplett deaktivieren koennen |
| **Datenresidenz** | Fuer EU-Kunden: EU-Regionen verwenden (Azure EU, GCP EU) |

### 8.3 Empfehlung fuer DSGVO-Compliance

**Kurzfristig (Marktstart):**
- OpenAI via Azure EU-Region fuer Drafts
- Gemini via Google Cloud EU-Region fuer Scoring
- DPA mit beiden Anbietern
- Opt-in fuer AI-Features im Onboarding

**Mittelfristig (Enterprise-Kunden):**
- Mistral als EU-native Alternative anbieten
- Self-Hosted Option fuer On-Premise-Kunden evaluieren
- Audit-Trail fuer alle AI-Verarbeitungen

---

## 9. Kostenberechnung nach Skalierung

### 9.1 Annahmen pro User/Monat

| Parameter | Wert |
|-----------|------|
| Eingehende Mails/Tag | 80 |
| Eingehende Slack/Teams-Nachrichten/Tag | 40 |
| Nachrichten zu scoren pro Tag | 120 |
| Nachrichten zu scoren pro Monat | 2.600 |
| Drafts generiert pro Tag | 10 |
| Drafts pro Monat | 220 |
| Durchschnittliche Tokens pro Scoring (Input) | 500 |
| Durchschnittliche Tokens pro Scoring (Output) | 50 |
| Durchschnittliche Tokens pro Draft (Input) | 2.000 |
| Durchschnittliche Tokens pro Draft (Output) | 300 |

### 9.2 Kosten pro User/Monat — Verschiedene Konfigurationen

#### Konfiguration A: Budget (Gemini Flash fuer alles)

| Komponente | Berechnung | Kosten/User/Monat |
|-----------|-----------|-------------------|
| Scoring (Batch) | 2.600 x 500 Tokens = 1.3M Input, 2.600 x 50 = 130K Output | $0.05 |
| Drafts | 220 x 2.000 = 440K Input, 220 x 300 = 66K Output | $0.07 |
| Todo-Extraktion | 220 x 1.000 = 220K Input, 220 x 200 = 44K Output | $0.04 |
| **Gesamt** | | **$0.16** |

#### Konfiguration B: Empfohlen (Gemini Scoring + GPT-4o Drafts)

| Komponente | Berechnung | Kosten/User/Monat |
|-----------|-----------|-------------------|
| Scoring (Gemini Flash Batch) | 1.3M Input, 130K Output | $0.05 |
| Drafts (GPT-4o) | 440K Input, 66K Output | $1.76 |
| Todo-Extraktion (Gemini Flash) | 220K Input, 44K Output | $0.04 |
| **Gesamt** | | **$1.85** |

#### Konfiguration C: Premium (Claude Sonnet Drafts + GPT-4o-mini Scoring)

| Komponente | Berechnung | Kosten/User/Monat |
|-----------|-----------|-------------------|
| Scoring (GPT-4o-mini) | 1.3M Input, 130K Output | $0.27 |
| Drafts (Claude 3.5 Sonnet) | 440K Input, 66K Output | $2.31 |
| Todo-Extraktion (Gemini Flash) | 220K Input, 44K Output | $0.04 |
| **Gesamt** | | **$2.62** |

#### Konfiguration D: Aktuell (Groq/Llama + Gemini)

| Komponente | Berechnung | Kosten/User/Monat |
|-----------|-----------|-------------------|
| Scoring (Keyword-Heuristik) | Kein API-Call | $0.00 |
| Drafts (Groq Llama 3.3) | 440K Input, 66K Output | $0.31 |
| Todo-Extraktion (Gemini Flash) | 220K Input, 44K Output | $0.04 |
| **Gesamt** | | **$0.35** |

### 9.3 Hochrechnung nach Nutzerzahl

#### Konfiguration B (Empfohlen): Gemini Scoring + GPT-4o Drafts

| Nutzer | AI-Kosten/Monat | AI-Kosten/Jahr | Kosten/User/Monat |
|--------|----------------|---------------|-------------------|
| 1.000 | $1.850 | $22.200 | $1.85 |
| 10.000 | $18.500 | $222.000 | $1.85 |
| 100.000 | $185.000 | $2.220.000 | $1.85 |

#### Konfiguration A (Budget): Gemini Flash fuer alles

| Nutzer | AI-Kosten/Monat | AI-Kosten/Jahr | Kosten/User/Monat |
|--------|----------------|---------------|-------------------|
| 1.000 | $160 | $1.920 | $0.16 |
| 10.000 | $1.600 | $19.200 | $0.16 |
| 100.000 | $16.000 | $192.000 | $0.16 |

### 9.4 Kosten im Kontext des SaaS-Pricings

Bei einem angenommenen Nexaro-Preis von $49-99/User/Monat:

| Konfiguration | AI-Kosten/User | % vom Umsatz ($49) | % vom Umsatz ($99) |
|---------------|---------------|--------------------|--------------------|
| A: Budget | $0.16 | 0.3% | 0.2% |
| B: Empfohlen | $1.85 | 3.8% | 1.9% |
| C: Premium | $2.62 | 5.3% | 2.6% |
| D: Aktuell | $0.35 | 0.7% | 0.4% |

**Ergebnis:** Selbst die Premium-Konfiguration bleibt unter 6% der Einnahmen — AI-Kosten sind fuer ein SaaS-Produkt in dieser Preisklasse gut tragbar. Die empfohlene Konfiguration B liegt bei unter 4%.

### 9.5 Skaleneffekte und Volumenrabatte

Bei > 10.000 Usern greifen zusaetzliche Optimierungen:

| Optimierung | Erwartete Einsparung |
|-------------|---------------------|
| OpenAI Tier-4/5 Rabatte (ab $10K/Monat) | 10-20% |
| Gemini Enterprise-Vertrag | 15-30% |
| Intelligentes Caching (Sender-Profile, Templates) | 20-30% |
| Zweistufiges Scoring (ML-Vorfilter + LLM) | 40-60% auf Scoring |
| Prompt-Optimierung (kuerzere System-Prompts) | 10-15% |
| **Kumuliert** | **50-70% Reduktion** |

Bei 100.000 Usern sinken die effektiven AI-Kosten der Konfiguration B von $1.85 auf geschaetzt $0.60-0.90/User/Monat.

---

## 10. Empfehlungen

### 10.1 Empfehlung fuer Mail-Priorisierung

**Primaer: Google Gemini 2.0 Flash (Batch-API)**

Begruendung:
1. **Kosten:** Mit Abstand das guenstigste Modell ($0.017 pro 1.000 Scorings im Batch) — praktisch vernachlaessigbar
2. **Qualitaet:** Fuer Klassifikationsaufgaben (Score 0-100) voellig ausreichend. Das Modell versteht Geschaeftskontext, erkennt Dringlichkeit und kann mit Absender-Informationen arbeiten.
3. **Latenz:** Schnellstes Modell am Markt (50-100ms), auch Echtzeit-Scoring ohne Batch moeglich
4. **Integration:** Google-Oekosystem passt zu Gmail/GCal-Integration, Gemini ist bereits fuer extract-todos implementiert
5. **Skalierung:** Batch-API mit 75% Rabatt ideal fuer Massen-Scoring bei neuen Mails
6. **Kontextfenster:** 1M Tokens erlaubt theoretisch gesamte Thread-Historie fuer kontextuelles Scoring

**Sekundaer (fuer unsichere Faelle, Score 30-70): GPT-4o-mini**

Fuer Nachrichten, die nach dem Gemini-Scoring im mittleren Bereich landen, kann GPT-4o-mini als zweite Meinung eingeholt werden. Dies verbessert die Genauigkeit um geschaetzt 10-15% bei minimalem Mehrkosten.

**Migrationsplan vom aktuellen Keyword-System:**
1. **Woche 1-2:** Gemini Flash Scoring-Endpoint implementieren, parallel zur Heuristik laufen lassen
2. **Woche 3-4:** A/B-Test: Heuristik vs. Gemini vs. Hybrid (Heuristik + Gemini)
3. **Woche 5:** Ergebnisse auswerten, bestes System als Standard setzen
4. **Monat 2-3:** Feedback-Loop implementieren (User-Interaktion als implizites Label)
5. **Monat 4-6:** Fine-Tuning evaluieren basierend auf gesammelten Daten

### 10.2 Empfehlung fuer Draft-Generierung

**Primaer: OpenAI GPT-4o**

Begruendung:
1. **Qualitaet:** Zusammen mit Claude Sonnet die beste Textqualitaet fuer professionelle Korrespondenz. Zuverlaessiges Instruction-Following (Laenge, Tonalitaet, Format).
2. **Deutsch:** Natuerlich klingende deutsche Texte, deutlich besser als Llama/Gemini Flash
3. **Latenz:** Mit Streaming unter 2 Sekunden erreichbar, auch bei laengerem Kontext
4. **Oekosystem:** Breitstes Tooling (Function Calling, Structured Output, JSON-Mode), einfachste Integration
5. **Zuverlaessigkeit:** Hoechste API-Uptime und beste SLAs aller Anbieter
6. **Kosten:** $1.76/User/Monat fuer Drafts — bei $49-99/User/Monat SaaS-Preis absolut tragbar

**Alternativ fuer DSGVO-sensible Enterprise-Kunden: Claude 3.5 Sonnet**

Claude Sonnet bietet gleichwertige Qualitaet mit besserer Personalisierungsfaehigkeit (groesseres Kontextfenster fuer mehr Schreibstil-Beispiele). Fuer Kunden, die Anthropic's Datenschutz-Policy bevorzugen, oder wenn besonders nuanciertes Tone-Matching gefragt ist.

**Sofortige Verbesserung der aktuellen Implementierung (vor Provider-Wechsel):**

Auch ohne Provider-Wechsel laesst sich die Draft-Qualitaet mit Groq/Llama deutlich verbessern:
1. Thread-Kontext mitsenden (aktuell wird nur einzelne Mail uebergeben)
2. Sprach-Erkennung einbauen (Draft-Sprache = Mail-Sprache)
3. User-Schreibstil-Beispiele in System-Prompt aufnehmen
4. Temperature von 0.7 auf 0.5 reduzieren (konsistentere Ergebnisse)

### 10.3 Empfehlung Gesamtarchitektur

**Konfiguration B (Empfohlen) mit Fallback-Kette:**

```
Mail-Priorisierung:    Gemini 2.0 Flash (Batch) → GPT-4o-mini (Echtzeit-Fallback)
Draft-Generierung:     GPT-4o (primaer) → Claude Sonnet (sekundaer) → Gemini Flash (Notfall)
Todo-Extraktion:       Gemini 2.0 Flash (beibehalten)
Scoring-Vorfilter:     DistilBERT/Logistic Regression (Phase 2, Self-Hosted)
```

---

## 11. Architektur-Vorschlag

### 11.1 Architektur-Diagramm (Beschreibung)

```
                         ┌─────────────────────────────┐
                         │       Nexaro Frontend        │
                         │    (Next.js App Router)      │
                         └──────────┬──────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────────┐
                         │    /api/ai/gateway           │
                         │  (Unified AI Router)         │
                         │                              │
                         │  - Auth-Check (Firebase)     │
                         │  - Rate-Limiting pro User    │
                         │  - Request-Logging           │
                         │  - Model-Selection-Logic     │
                         │  - Fallback-Chain-Handler    │
                         └──────┬────────┬────────┬────┘
                                │        │        │
                    ┌───────────┘        │        └───────────┐
                    ▼                    ▼                    ▼
          ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
          │ Scoring-      │    │ Draft-        │    │ Extraction-  │
          │ Pipeline      │    │ Pipeline      │    │ Pipeline     │
          │               │    │               │    │              │
          │ 1. ML-Vorfilter│   │ 1. Kontext    │    │ Gemini Flash │
          │    (Phase 2)  │    │    sammeln    │    │              │
          │ 2. Gemini     │    │ 2. Style-     │    └──────────────┘
          │    Flash      │    │    Beispiele  │
          │ 3. GPT-4o-mini│    │ 3. GPT-4o    │
          │    (Grenzfaelle)│  │    (Stream)  │
          └──────┬────────┘    └──────┬───────┘
                 │                    │
                 ▼                    ▼
          ┌──────────────┐    ┌──────────────┐
          │  Score-Cache  │    │ Style-Cache  │
          │  (Firestore)  │    │ (Firestore)  │
          │               │    │              │
          │ - Sender-Scores│   │ - User-Style │
          │ - Thread-Scores│   │ - Sender-    │
          │ - User-Prefs  │    │   Profile   │
          └──────────────┘    └──────────────┘

                         ┌─────────────────────────────┐
                         │     Feedback-Loop            │
                         │                              │
                         │  User oeffnet Mail → Score+  │
                         │  User antwortet  → Score++   │
                         │  User ignoriert  → Score-    │
                         │  User sendet Draft → Style+  │
                         │  User editiert Draft→ Style- │
                         └─────────────────────────────┘
```

### 11.2 Datenfluss fuer Scoring

```
Neue Mail empfangen
        │
        ▼
┌───────────────────┐
│ Normalisierung    │  normalize_payload.py
│ (bestehend)       │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐     ┌──────────────┐
│ Sender im Cache?  │──Ja─▶│ Cached Score │
│                   │      │ zurueckgeben │
└───────┬───────────┘      └──────────────┘
        │ Nein
        ▼
┌───────────────────┐
│ ML-Vorfilter      │  Phase 2: DistilBERT
│ (Optional)        │  Score > 80 oder < 20 → direkt verwenden
└───────┬───────────┘
        │ Score 20-80 (unsicher)
        ▼
┌───────────────────┐
│ Gemini Flash      │  LLM-Scoring mit Kontext:
│ Scoring           │  - Mail-Content
│                   │  - Absender-Profil
│                   │  - Thread-Historie
│                   │  - User-VIP-Liste
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Score in Cache +  │  write_to_firestore.py
│ Firestore         │
└───────────────────┘
```

### 11.3 Datenfluss fuer Draft-Generierung

```
User klickt "Generate Draft"
        │
        ▼
┌───────────────────┐
│ Kontext sammeln   │
│                   │
│ - Aktuelle Mail   │
│ - Thread (5 Msgs) │
│ - Sender-Profil   │
│ - User-Style      │
│   (3-5 Beispiele) │
│ - Firmenkontext   │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Sprache erkennen  │  Anhand der eingehenden Mail
│                   │  → DE oder EN System-Prompt
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ GPT-4o            │  Streaming-Response
│ (oder Fallback)   │
│                   │  System: CEO-Assistant + Style
│                   │  User: Thread + aktuelle Mail
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Stream an Client  │  Progressive Anzeige im UI
│                   │
│ User editiert/    │
│ sendet Draft      │──── Feedback-Loop:
│                   │     Draft + Edit speichern
└───────────────────┘     fuer Style-Learning
```

### 11.4 API-Gateway Implementation (Pseudocode)

```typescript
// /api/ai/gateway/route.ts — Unified AI Router

type AIAction = "score" | "draft" | "extract" | "classify";

interface AIRequest {
    action: AIAction;
    payload: Record<string, unknown>;
    userId: string;
}

// Model-Selection basiert auf Action + User-Tier
const MODEL_CONFIG: Record<AIAction, ModelChain> = {
    score: {
        primary: { provider: "gemini", model: "gemini-2.0-flash" },
        fallback: { provider: "openai", model: "gpt-4o-mini" },
    },
    draft: {
        primary: { provider: "openai", model: "gpt-4o" },
        fallback: { provider: "anthropic", model: "claude-3-5-sonnet" },
        emergency: { provider: "gemini", model: "gemini-2.0-flash" },
    },
    extract: {
        primary: { provider: "gemini", model: "gemini-2.0-flash" },
    },
    classify: {
        primary: { provider: "openai", model: "gpt-4o-mini" },
    },
};
```

---

## 12. Migrationsplan

### Phase 1: Sofortige Verbesserungen (Woche 1-2)

**Ohne Provider-Wechsel, nur Code-Aenderungen:**

1. Thread-Kontext in `/api/ai/draft` einbauen (letzte 5 Nachrichten mitsenden)
2. Sprach-Erkennung implementieren (Draft-Sprache = Mail-Sprache)
3. Temperature von 0.7 auf 0.5 senken
4. System-Prompt um Laengen-Kontrolle und Sprach-Matching erweitern
5. Feedback-Logging starten (welche Drafts werden gesendet/editiert/verworfen)

### Phase 2: Scoring-Migration (Woche 3-6)

1. Gemini Flash Scoring-Endpoint neben Heuristik implementieren
2. A/B-Test mit Shadow-Scoring (beide Systeme parallel, Heuristik aktiv)
3. Scoring-Prompt entwickeln und optimieren mit realen Mails
4. Score-Cache in Firestore aufbauen
5. Gemini-Scoring als Standard aktivieren, Heuristik als Fallback behalten

### Phase 3: Draft-Provider-Wechsel (Woche 7-10)

1. GPT-4o Draft-Endpoint implementieren (neben Groq)
2. Streaming-Support in Frontend einbauen (progressive Textanzeige)
3. User-Style-Learning starten (gesendete Antworten als Beispiele speichern)
4. A/B-Test: Groq/Llama vs. GPT-4o Drafts (User-Zufriedenheit messen)
5. Bei positiven Ergebnissen: GPT-4o als Standard, Groq als Fallback

### Phase 4: Optimierung (Monat 3-6)

1. ML-Vorfilter fuer Scoring evaluieren (DistilBERT Training mit gesammelten Daten)
2. Embedding-basiertes Style-Matching implementieren
3. Unified AI Gateway bauen (zentrale Model-Selection und Fallback-Logik)
4. Cost-Monitoring Dashboard implementieren (AI-Kosten pro User tracken)
5. Fine-Tuning-Pipeline fuer Power-User evaluieren

### Phase 5: Enterprise-Features (Monat 6-12)

1. DSGVO-konforme EU-Deployment-Option (Azure EU + GCP EU)
2. Mistral-Integration als EU-native Alternative
3. Self-Hosted Scoring-Option fuer On-Premise-Kunden
4. Per-User Fine-Tuning fuer Enterprise-Tier
5. Multi-Provider-Fallback mit automatischem Health-Check

---

## Anhang: Quellen und Preisstand

Alle Preisangaben basieren auf den oeffentlichen Preislisten der Anbieter (Stand: Maerz 2026). Preise koennen sich aendern. Enterprise-Rabatte sind nicht beruecksichtigt.

| Anbieter | Preisliste |
|----------|-----------|
| OpenAI | platform.openai.com/pricing |
| Anthropic | anthropic.com/pricing |
| Google Gemini | ai.google.dev/pricing |
| Groq | groq.com/pricing |
| Mistral | mistral.ai/pricing |

---

*Dokument-Ende. Naechste Aktualisierung empfohlen nach Abschluss von Phase 2 (Scoring-Migration).*
