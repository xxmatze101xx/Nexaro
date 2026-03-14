## FEATURE: Semantic Search via Embeddings + Vector Index

### Ziel
Implementiere eine semantische Suchfunktion für Nexaro, damit Nachrichten, Threads und Konversationen über **Bedeutung statt Keywords** gefunden werden können.

Die Implementierung muss **ohne Speicherung von vollständigen Nachrichteninhalten** funktionieren.

Nur folgende Daten dürfen persistiert werden:

- Embeddings (Vektoren)
- Metadaten
- optional kurze KI-Zusammenfassungen

---

# Architektur

Pipeline:

integration data
(Gmail / Slack / Calendar)
↓
temporary text processing
↓
embedding generation
↓
vector storage
↓
semantic retrieval
↓
AI features (search, summaries, agents)

---

# Technologie

Embedding Model:
OpenAI `text-embedding-3-small`

Vector Storage:
Firebase Firestore + Vector Index (alternativ externe Vector DB wie Pinecone)

Backend:
Node / Next.js API Routes

---

# Datenmodell (Firestore)

Collection:

`message_embeddings`

Dokumentstruktur:

{
 id: string,
 source: "gmail" | "slack" | "teams",
 messageId: string,
 threadId: string,
 timestamp: number,

 embedding: number[], 
 summary: string | null,

 metadata: {
   sender: string,
   channel: string | null
 }
}

WICHTIG:
message body darf NICHT gespeichert werden.

---

# Embedding Pipeline

Beim Empfang einer neuen Nachricht:

1. Text extrahieren
2. Embedding erzeugen
3. Embedding speichern
4. Text verwerfen

Beispiel Implementation:

```ts
async function createEmbedding(text: string) {

 const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: text
 })

 return response.data[0].embedding
}

## FEATURE: Retrieval Layer (RAG)

### Ziel
Ermögliche AI-Antworten basierend auf den Daten des Users (Emails, Slack, Calendar), ohne Nachrichtentexte zu speichern.

Die AI soll relevante Inhalte aus Integrationen abrufen und kontextbasierte Antworten generieren.

---

# Architektur

User Query
↓
Query Embedding
↓
Vector Search
↓
Message IDs
↓
Fetch Original Messages via API
↓
Context Assembly
↓
LLM Response

---

# Query Pipeline

Bei einer Userfrage:

1. Embedding der Query erzeugen
2. Vector DB nach ähnlichen Embeddings durchsuchen
3. Message IDs erhalten
4. Originaldaten über Integration API abrufen
5. Kontext für LLM erstellen

---

# Beispiel Implementation

```ts
async function retrieveContext(query: string){

 const queryEmbedding = await createEmbedding(query)

 const results = await vectorDB.query({
  vector: queryEmbedding,
  topK: 10
 })

 const messages = await fetchMessagesFromSources(results.ids)

 return messages
}


---

# FEATURE: Knowledge Graph













```markdown
## FEATURE: Knowledge Graph

### Ziel
Baue ein semantisches Netzwerk aus Personen, Projekten, Nachrichten und Meetings.

Der Graph ermöglicht kontextübergreifende AI-Antworten.

---

# Graph Struktur

Nodes:

Person
Project
Company
Message
Meeting

Edges:

sent_by
related_to
mentions
belongs_to

---

# Datenmodell

Firestore Collections:

entities
relationships

Entity Beispiel:

{
 id: "person_123",
 type: "person",
 name: "John Investor"
}

Relationship Beispiel:

{
 from: "message_123",
 to: "person_123",
 type: "sent_by"
}

---

# Graph Update Pipeline

Beim Verarbeiten neuer Nachrichten:

1. Entities extrahieren
2. Beziehungen erkennen
3. Graph aktualisieren

---

# Beispiel

Email:
"Budget discussion for Project Atlas"

Graph:

Message → related_to → Project Atlas
Message → sent_by → John

## FEATURE: Thread Intelligence

### Ziel
Konversationen über mehrere Nachrichten hinweg verstehen.

Threads sollen automatisch zusammengefasst werden.

---

# Thread Pipeline

Thread Messages
↓
Thread Aggregation
↓
LLM Summary
↓
Summary speichern

---

# Speicherung

Thread Summary Collection:

thread_summaries

Dokumentstruktur:

{
 threadId: string,
 summary: string,
 lastUpdated: number
}

---

# Implementation

```ts
async function summarizeThread(messages){

 const summary = await llm.generate({
  prompt: "Summarize this conversation"
 })

 return summary
}


---

# FEATURE: AI Chat Interface











```markdown
## FEATURE: AI Chat Interface

### Ziel
Erstelle ein Chat-Interface für Nexaro.

User können Fragen zu ihren Daten stellen.

---

# Funktionen

User kann fragen:

- "Welche wichtigen Emails habe ich?"
- "Fasse Slack Channel zusammen"
- "Was sind meine Aufgaben?"

---

# Architektur

Chat UI
↓
Query Router
↓
Retrieval Layer
↓
LLM Response

---

# Query Routing

Einfache Queries:

Firestore Query

Komplexe Queries:

LLM + Retrieval

---

# Beispiel

```ts
async function handleUserQuery(query){

 const context = await retrieveContext(query)

 const answer = await llm.generate({
  context,
  query
 })

 return answer
}


---

# FEATURE: Action Item Extraction

```markdown
## FEATURE: Action Item Extraction

### Ziel
Extrahiere Aufgaben automatisch aus Nachrichten.

---

# Pipeline

Message
↓
LLM Analysis
↓
Action Items
↓
Todo Creation

---

# Beispiel

Input:

"Please send the financial report by Friday"

Output:

{
 title: "Send financial report",
 deadline: "Friday"
}

---

# Speicherung

todos collection

{
 id: string,
 title: string,
 deadline: timestamp,
 sourceMessageId: string
}

## FEATURE: AI Agent System

### Ziel
Ermögliche der AI Aktionen im Namen des Users auszuführen.

---

# Tools

read_email
send_email
search_messages
create_todo
schedule_meeting

---

# Agent Pipeline

User Request
↓
Planner
↓
Tool Selection
↓
Execution

---

# Beispiel

User:

"Schedule a meeting with the investor"

Agent:

1. Suche Investor Email
2. Prüfe Kalender
3. Schlage Termin vor
4. Sende Einladung

---

# Sicherheitsregeln

Agent darf nur Aktionen ausführen wenn:

- User authentifiziert ist
- Integration verbunden ist
- Aktion bestätigt wurde


AI Chat mit eigenene Daten