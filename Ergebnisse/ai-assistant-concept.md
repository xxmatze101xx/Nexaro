# AI-F3: Persönlicher KI-Assistent — Konzept & Implementierungsplan

*Erstellt: März 2026 | Nexaro-Projekt*

---

## 🧠 Executive Summary

Nexaro's KI-Assistent soll sich wie ein „digitaler Chief of Staff" anfühlen — kontextbewusst, personalisiert, kosteneffizient. Kein generischer Chatbot, sondern eine Erweiterung des CEOs selbst: Der Assistent kennt den Schreibstil, die Prioritäten, die Kontakte und den Kontext des Users.

---

## Phase A: Brainstorming-Ergebnisse

### 1. Schreibstil-Training & Personalisierung

**Ansatz-Vergleich:**

| Ansatz | Qualität | Kosten | Datenschutz | Empfehlung |
|--------|----------|--------|-------------|------------|
| **Fine-Tuning** | ⭐⭐⭐⭐⭐ | Sehr hoch (GPU-Training) | Sensibel (Daten verlassen System) | ❌ Zu teuer für Nische |
| **Few-Shot Prompting** | ⭐⭐⭐⭐ | Niedrig (Token-Kosten) | OK (Beispiele im Prompt) | ✅ MVP-Empfehlung |
| **RAG mit User-Beispielen** | ⭐⭐⭐⭐⭐ | Mittel (Embedding-Kosten) | OK (on-demand retrieval) | ✅ Langfristige Empfehlung |

**Empfohlene Architektur: Few-Shot → RAG-Migration**

**MVP (Few-Shot Prompting):**
- Analysiere die letzten 20–50 gesendeten Mails des Users
- Extrahiere Stil-Merkmale: Anrede, Grußformeln, Satzkomplexität, Formalitätsniveau, Sprache (DE/EN)
- Speichere als strukturiertes Stil-Profil in Firestore: `users/{uid}/aiProfile`
- Bei Draft-Generierung: 3–5 gesendete Mails als Few-Shot-Beispiele im System-Prompt

**Langfristig (RAG):**
- Vektorisiere alle gesendeten Mails (OpenAI `text-embedding-3-small` oder Gemini Embeddings)
- Speichere in Firestore mit Vektor-Index oder extern (Pinecone/Weaviate)
- Bei Draft-Anfrage: Finde die 3 ähnlichsten gesendeten Mails (ähnlicher Empfänger, Kontext) → Few-Shot

**Stil-Profil-Schema (Firestore):**
```json
{
  "formalityLevel": "formal|semi-formal|casual",
  "preferredLanguage": "de|en|mixed",
  "averageSentenceLength": 15,
  "greetingStyles": ["Sehr geehrte/r", "Hallo"],
  "closingStyles": ["Mit freundlichen Grüßen", "Viele Grüße"],
  "usesFirstName": true,
  "exampleMails": ["mail_id_1", "mail_id_2", "mail_id_3"],
  "lastAnalyzed": "ISO8601"
}
```

**Manuelle Anpassung:** User kann in Settings sein Stil-Profil sehen und via Slider/Toggle anpassen:
- Formalitätsniveau: Formell ←→ Locker
- Länge: Kurz ←→ Detailliert
- Sprache: Deutsch | Englisch | Je nach Empfänger

**Mehrere Schreibstile:** CEO kann Profile für verschiedene Kontext definieren:
- "Investor-Stil" (formell, professionell)
- "Team-Slack-Stil" (locker, mit Emojis)
- "Kunden-Mail-Stil" (freundlich-professionell)

---

### 2. KI-Tab & Chat-Interface (UX-Design)

**Sidebar-Eintrag:** `✨ KI-Assistent` zwischen Todos und Settings

**Chat-Interface Features:**
- Moderne Chat-UI (ähnlich ChatGPT, aber Nexaro-branded)
- Kontext-Chips oben: aktuell geöffnete Mail/Channel als Kontext
- Schnell-Aktionen als Buttons: "Fasse letzte Mails zusammen", "Erstelle Draft", "Was ist heute wichtig?"
- Nachrichtenverlauf in Firestore: `users/{uid}/aiChats/{chatId}/messages`
- Streaming-Antworten (SSE) für bessere UX

**Beispiel-Queries die funktionieren müssen:**

| Query Type | KI-Routing | Kosten |
|------------|-----------|--------|
| "Wie viele ungelesene Mails?" | Direkte DB-Query (**kein LLM**) | ~0€ |
| "Fasse Mail von Thomas zusammen" | GPT-4o-mini / Gemini Flash | ~0.0001€ |
| "Was passiert im #sales Channel?" | GPT-4o-mini (Slack-Kontext) | ~0.0002€ |
| "Schreibe Antwort im CEO-Stil" | GPT-4o / Sonnet (Schreibstil-Matching) | ~0.002€ |
| "Analysiere meine Kommunikationsmuster" | GPT-4o / Sonnet | ~0.005€ |

---

### 3. Kosten-Optimierung (KRITISCH!)

**Query-Router-Logik:**

```
Anfrage eingehend
      ↓
   Intent-Klassifizierung (leichtgewichtiger Regex/heuristic classifier)
      ↓
[DATEN-QUERY] → Direkte Firestore-Query (0€)
[EINFACH] → Gemini Flash / GPT-4o-mini (€0.00001–0.0001)
[MITTEL] → GPT-4o-mini / Claude Haiku (€0.0001–0.001)
[KOMPLEX]→ GPT-4o / Claude Sonnet (€0.001–0.01)
```

**Intent-Klassifizierung (kein LLM benötigt):**
- Schlüsselwörter: "wie viele", "zeige mir", "count" → DB-Query
- Schlüsselwörter: "fass zusammen", "erkläre" → Light-Modell
- Schlüsselwörter: "schreibe", "antworte", "draft", "im Stil von" → Heavy-Modell

**Caching-Strategie:**
- Zusammenfassungen für denselben Mail-Thread bis zu 10 Minuten cachen
- Stil-Analyse: täglich einmal neu berechnen (nicht bei jeder Anfrage)
- "Was ist heute wichtig?" → Einmal morgens berechnen, für 1h cachen

**Token-Budget:**
- Free-Plan: 20 KI-Anfragen/Tag (Mix aus Light + Heavy)
- Pro-Plan: 100 KI-Anfragen/Tag + unbegrenzte DB-Queries
- Ziel: < 1–2€ pro User/Monat KI-Kosten

**Hochrechnung (Pro-User, 100 Anfragen/Tag):**
- 70% DB-Queries → €0
- 25% Light-Modell (avg 1000 tokens) → 25 × 0.00015€ = 0.00375€/Tag = 0.11€/Monat
- 5% Heavy-Modell (avg 2000 tokens) → 5 × 0.003€ = 0.015€/Tag = 0.45€/Monat
- **Gesamt: ~0.56€/Monat/User** ✅ (deutlich unter Ziel-1-2€)

---

### 4. KI als "digitales Ich" — Personalisierung über Zeit

**Feedback-Loop:**
- User bewertet Drafts: 👍 (gespeichert als positives Beispiel) / 👎 (vermeiden)
- Explizite Korrekturen: User editiert Draft → KI lernt aus der Differenz
- Implizites Feedback: Welche Drafts werden ohne Änderung gesendet? → Sehr gute Drafts

**Proaktive Vorschläge (Push-KI):**
- Täglich 09:00 Uhr: "3 unbeantwortet Mails von Investor X — soll ich Drafts erstellen?"
- Bei Termin in 30min: "Hier sind 2 relevante Mails zum Meeting mit [Name]"
- Bei langer Antwort-Verzögerung (>48h): "Du hast diese wichtige Mail noch nicht beantwortet"

**Kontextgedächtnis:**
- `users/{uid}/aiContext` in Firestore: Präferenzen, gelernte Muster
- "Du bevorzugst kurze Antworten" (avg. >5 Korrekturen in Richtung kürzer)
- "Du siezt immer [Firma XY]-Kontakte" (aus Trainings-Daten)

---

### 5. Privacy & DSGVO

**Datenspeicherung:**
- Mail-Inhalte werden NICHT dauerhaft in KI-Trainingsdaten gespeichert
- Nur Stil-Metadaten und Beispiel-IDs (nicht die Inhalte) in Firestore
- Bei RAG: Embeddings (Vektoren, nicht Klartext) in separater DB
- Mails werden nur on-demand an LLM-API gesendet, niemals dauerhaft übermittelt

**Transparenz:**
- Settings-Page zeigt: "Deine KI-Analyse basiert auf X gesendeten Mails"
- Option: KI-Personalisierung komplett deaktivieren
- Option: Alle KI-Lerndata löschen (DSGVO-Recht auf Löschung)

**Provider-Wahl:**
- EU-User: Anthropic (US, aber keine EU-Rechenzentren erforderlich für B2B SaaS mit AV)
- Azure OpenAI Service mit EU-Regionen als Alternative

---

## Phase B: Implementierungsplan (Priorisiert)

### MVP (Sprint 1-2):
1. **KI-Tab UI** – Chat-Interface in der Sidebar mit Basis-Funktionalität
2. **Query-Router** – Heuristic-basierter Router (kein LLM für Router selbst)
3. **Integration-Kontext-Layer** – API-Wrapper der KI Zugriff auf Gmail/Slack-Daten gibt
4. **Einfache Drafts** – Drafts basierend auf Stil-Profil (Few-Shot, 5 Beispiel-Mails)

### Version 1.0 (Sprint 3-4):
5. **Stil-Analyse-Pipeline** – Automatische Analyse gesendeter Mails bei erstem Login
6. **Feedback-Loop** – 👍/👎 für Drafts, Lernkurve
7. **Proaktive Push-Vorschläge** – Tägl. Zusammenfassung, unbeantwortet Mails

### Version 2.0 (Sprint 5+):
8. **RAG-Migration** – Embeddings für präziseres Stil-Matching
9. **Chat-History** – Persistente Konversationen, Kontext über Sessions hinweg
10. **Multi-Style-Profile** – Verschiedene Schreibstile für verschiedene Kontexte
11. **Advanced Proactive AI** – KI erkennt Pattern und handelt proaktiv

---

## 💰 Kosten-Kalkulation

| User-Stufe | Anfragen/Tag | Kosten/Monat |
|------------|-------------|-------------|
| Free (20/Tag) | 14% DB, 82% Light, 4% Heavy | ~0.08€ |
| Pro (100/Tag) | 70% DB, 25% Light, 5% Heavy | ~0.56€ |
| Heavy User (200/Tag) | 70% DB, 20% Light, 10% Heavy | ~1.20€ |

**Empfohlenes Modell:**
- **Priorisierung/Scoring:** Gemini 1.5 Flash (günstigster großer Anbieter) oder GPT-4o-mini
- **Draft-Generierung:** Claude Haiku (gut für formelle Texte, kostengünstig) oder GPT-4o-mini
- **Komplexe Drafts mit Stilanpassung:** Claude Sonnet 3.5 oder GPT-4o

---

## 🏗️ Technische Architektur

```
User → NextJS Frontend (KI-Chat-Tab)
         ↓
    /api/ai/chat (Edge Function)
         ↓
    Query-Router (Heuristic)
    ├─ [DB] → Firestore direkt
    ├─ [Light] → Anthropic Haiku / Gemini Flash
    └─ [Heavy] → Anthropic Sonnet / GPT-4o
         ↓
    Integration-Context-Layer
    ├─ Gmail-Context (letzte 10 Mails, Thread-History)  
    ├─ Slack-Context (Channel-History für /api/slack/messages)
    ├─ Calendar-Context (Google Calendar API)
    └─ User-Context (ai_style_profile, todos, preferences)
         ↓
    Response-Streaming (SSE) → User
```

**Firestore-Schema (neu):**
```
users/{uid}/
  aiProfile/          → Stil-Profil, Präferenzen
  aiChats/{chatId}/
    messages/         → Chat-Verlauf
  aiContext/          → Gelerntes Kontext-Gedächtnis
```
