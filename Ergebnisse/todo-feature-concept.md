# Todo-Feature-Konzept für Nexaro

> Ergebnis des UI-P5 Brainstormings — Stand: 11. März 2026

---

## 1. Executive Summary

Nexaro braucht einen zentralen Todo-Bereich, der CEOs ermöglicht, Aufgaben aus E-Mails, Slack-Nachrichten und anderen Quellen zu sammeln, priorisieren und abzuarbeiten. Das Feature kombiniert manuelle Todo-Erstellung mit KI-basierter Action-Item-Extraktion aus Nachrichten.

---

## 2. Wo lebt der Todo-Bereich?

### Empfehlung: Eigener Sidebar-Eintrag + Dashboard-Widget

- **Sidebar-Eintrag:** "Aufgaben" als eigener Menüpunkt mit Offen-Zähler (Badge)
- **Dashboard-Widget:** Kompaktes Widget mit den Top-5 offenen Todos
- **In-Message-Action:** "Als Aufgabe markieren" Button im Message-Detail-Panel

### Begründung:
CEOs wollen keine Extra-App öffnen. Der Sidebar-Eintrag ist 1 Klick entfernt. Das Dashboard-Widget zeigt die wichtigsten Todos auf einen Blick. Der In-Message-Button ermöglicht kontextbezogenes Erstellen.

---

## 3. Todo-Datenmodell

### Firestore Collection: `users/{uid}/todos`

```typescript
interface Todo {
    id: string;                       // Auto-generated Firestore ID
    title: string;                    // Kurzbeschreibung der Aufgabe
    description?: string;             // Optionale Langbeschreibung
    status: "open" | "in_progress" | "done" | "archived";
    priority: "low" | "medium" | "high" | "urgent";
    deadline?: string;                // ISO 8601 Datum (optional)
    category?: string;                // z.B. "Finanzen", "HR", "Investor Relations"
    tags?: string[];                  // Freie Tags

    // Herkunft
    source: "manual" | "ai_extracted";
    sourceMessageId?: string;         // ID der Ursprungs-Nachricht
    sourceMessageSubject?: string;    // Betreff zur Anzeige
    sourceType?: "gmail" | "slack" | "teams" | "outlook";

    // KI-Metadaten
    aiConfidence?: number;            // 0-1, wie sicher die KI ist
    aiSuggested?: boolean;            // true = noch nicht vom User bestätigt

    // Timestamps
    createdAt: string;                // ISO 8601
    updatedAt: string;                // ISO 8601
    completedAt?: string;             // ISO 8601, wann als done markiert

    // Sortierung
    sortOrder: number;                // Für manuelles Umsortieren
}
```

### Firestore Security Rules:
```
match /users/{userId}/todos/{todoId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## 4. Todo-Stati und Lifecycle

```
[Offen] → [In Bearbeitung] → [Erledigt] → [Archiviert]
   ↑            ↓                  ↓
   ←←←←←←←←←←←←    (zurücksetzen)
```

- **Offen:** Standardstatus, Aufgabe wartet
- **In Bearbeitung:** User arbeitet gerade daran
- **Erledigt:** Aufgabe abgeschlossen (Checkbox angehakt)
- **Archiviert:** Aus der Hauptliste entfernt, aber noch in der History

---

## 5. Manuelle Todos

### Quick-Add-Bar (am Kopf der Todo-Liste)
- Einfaches Input-Feld: "Neue Aufgabe hinzufügen..." + Enter
- Standardwerte: status=open, priority=medium, source=manual
- Nach Enter: Todo erscheint sofort oben in der Liste

### Inline-Editing
- Klick auf Titel → Editierbar (contentEditable oder fokussiertes Input)
- Klick auf Priorität-Badge → Dropdown (low/medium/high/urgent)
- Klick auf Deadline → Date-Picker Inline
- Klick auf Kategorie → Dropdown oder freie Eingabe

### Erweiterte Erstellung (Modal)
- Button "+" neben Quick-Add öffnet ein Detail-Modal
- Felder: Titel, Beschreibung, Priorität, Deadline, Kategorie, Tags
- Für komplexere Aufgaben mit Beschreibung

### Drag & Drop (Stretch Goal)
- Todos per Drag & Drop umsortieren
- sortOrder-Feld in Firestore wird aktualisiert

---

## 6. KI-generierte Todos aus Nachrichten

### 6.1 On-Demand Extraktion (MVP)

**Button "Aufgaben extrahieren" im Message-Detail-Panel:**
- User liest eine Mail → klickt "Aufgaben extrahieren"
- API-Call an `/api/ai/extract-todos` mit Mail-Body
- KI analysiert den Text und extrahiert Action Items
- Ergebnis: Liste von vorgeschlagenen Todos
- User bestätigt oder verwirft jeden Vorschlag einzeln
- Bestätigte Todos landen in der Todo-Liste mit `source: "ai_extracted"`

### 6.2 Automatische Vorschläge (Phase 2)

- Bei jeder neuen Mail: Background-Check auf Action Items
- Gefundene Items erscheinen als "Vorgeschlagen" Badge in der Todo-Liste
- User muss bestätigen bevor sie in die aktive Liste kommen
- Nur bei Mails mit `importance_score > 5` (filtert Newsletter etc. raus)

### 6.3 KI-Prompt-Strategie

```
Du bist ein Assistent für einen CEO. Analysiere die folgende E-Mail und extrahiere
konkrete Aufgaben (Action Items) die der Empfänger erledigen muss.

Für jede Aufgabe gib zurück:
- title: Kurze, actionable Beschreibung (max 100 Zeichen)
- priority: "low" | "medium" | "high" | "urgent"
- deadline: Falls im Text ein Datum/Frist erwähnt wird (ISO 8601), sonst null
- confidence: 0-1 wie sicher du bist, dass es ein echtes Action Item ist

Regeln:
- Nur konkrete Aufgaben, keine allgemeinen Informationen
- "Bitte sende mir den Bericht" → Aufgabe
- "Zur Info: der Bericht ist fertig" → KEINE Aufgabe
- Erkenne implizite Deadlines: "bis Freitag" → nächster Freitag als ISO-Datum
- Erkenne Dringlichkeit: "ASAP", "dringend" → priority: urgent

E-Mail:
Betreff: {subject}
Von: {sender}
---
{body}
```

### 6.4 API-Endpoint: `/api/ai/extract-todos`

```typescript
// Request
POST /api/ai/extract-todos
{
    subject: string;
    sender: string;
    body: string;
    messageId: string;
    messageSource: "gmail" | "slack" | "teams";
}

// Response
{
    todos: Array<{
        title: string;
        priority: "low" | "medium" | "high" | "urgent";
        deadline: string | null;
        confidence: number;
    }>;
}
```

---

## 7. UX-Flows

### 7.1 Todo-Hauptansicht (Sidebar → "Aufgaben")

```
┌─────────────────────────────────────────────┐
│  Aufgaben                              + ▼  │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐│
│  │ 📝 Neue Aufgabe hinzufügen...    Enter  ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [Offen (7)] [In Bearbeitung (2)] [Erledigt]│
│                                             │
│  🔴 Investor-Deck bis Freitag finalisieren  │
│     Deadline: 14.03 · Von: Mail von Thomas  │
│                                             │
│  🟠 Quartalsreport an Board senden          │
│     Priorität: Hoch · Manuell erstellt      │
│                                             │
│  🟡 Feedback zu Marketing-Kampagne geben    │
│     Von: Slack #marketing · KI-Vorschlag    │
│                                             │
│  ⚪ Team-Meeting-Agenda vorbereiten          │
│     Deadline: 13.03 · Priorität: Mittel     │
│                                             │
│  ── KI-Vorschläge (nicht bestätigt) ──      │
│                                             │
│  💡 Vertrag von Lieferant XY prüfen         │
│     Confidence: 85% · [Bestätigen] [✕]      │
│                                             │
└─────────────────────────────────────────────┘
```

### 7.2 In-Message Todo-Extraktion

```
User liest Mail → Klickt "📋 Aufgaben extrahieren"
    ↓
Loading Spinner (1-2s)
    ↓
┌────────────────────────────────────────┐
│ 2 Aufgaben gefunden:                   │
│                                        │
│ ☑ Vertrag bis Donnerstag unterschreiben│
│   Priorität: Hoch · Deadline: 13.03   │
│   [Hinzufügen] [Bearbeiten] [✕]       │
│                                        │
│ ☑ Reisekostenabrechnung einreichen     │
│   Priorität: Mittel · Kein Deadline    │
│   [Hinzufügen] [Bearbeiten] [✕]       │
│                                        │
│            [Alle hinzufügen]           │
└────────────────────────────────────────┘
```

---

## 8. Priorisierte Implementierungs-Reihenfolge

### MVP (Phase A — JETZT)
1. **Firestore-Schema + CRUD-Hooks** — `useTodos()` Hook mit `onSnapshot` Realtime-Listener
2. **Todo-Page** — `/todos` Route mit Todo-Liste, Quick-Add, Status-Filter-Tabs
3. **Sidebar-Integration** — "Aufgaben" Menüpunkt mit Offen-Badge
4. **Inline-Editing** — Titel, Priorität, Deadline direkt in der Liste bearbeitbar
5. **Checkbox-Toggle** — Klick auf Checkbox → Status open↔done

### Phase B — KI-Features
6. **API-Endpoint `/api/ai/extract-todos`** — Gemini/GPT Call mit Prompt
7. **"Aufgaben extrahieren" Button** im ai-draft-panel.tsx
8. **Vorschlags-UI** — KI-Vorschläge mit Bestätigen/Ablehnen
9. **Source-Link** — Klick auf "Von: Mail..." navigiert zur Ursprungs-Nachricht

### Phase C — Polish
10. **Dashboard-Widget** — Top-5 offene Todos auf dem Dashboard
11. **Benachrichtigung** bei überfälligen Todos
12. **Kategorien & Tags** — Filter/Group by Kategorie
13. **Drag & Drop** Umsortierung

---

## 9. Technische Architektur

### Custom Hook: `useTodos(uid: string)`

```typescript
function useTodos(uid: string) {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) return;
        const q = query(
            collection(db, "users", uid, "todos"),
            where("status", "!=", "archived"),
            orderBy("sortOrder", "asc")
        );
        return onSnapshot(q, (snap) => {
            setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Todo)));
            setLoading(false);
        });
    }, [uid]);

    const addTodo = async (title: string, opts?: Partial<Todo>) => { ... };
    const updateTodo = async (id: string, data: Partial<Todo>) => { ... };
    const deleteTodo = async (id: string) => { ... };
    const toggleStatus = async (id: string) => { ... };

    return { todos, loading, addTodo, updateTodo, deleteTodo, toggleStatus };
}
```

### Komponenten-Struktur

```
src/
├── app/todos/
│   └── page.tsx              ← Hauptseite mit TodoList
├── components/
│   ├── todo-list.tsx         ← Liste mit Filter-Tabs
│   ├── todo-item.tsx         ← Einzelnes Todo mit Inline-Edit
│   ├── todo-quick-add.tsx    ← Quick-Add Input
│   ├── todo-extract-modal.tsx← KI-Vorschlags-Modal
│   └── todo-widget.tsx       ← Dashboard-Widget
├── hooks/
│   └── useTodos.ts           ← Firestore CRUD Hook
└── lib/
    └── todos.ts              ← Todo Type + Helper Functions
```

---

## 10. Design-Entscheidungen

### Farben für Prioritäten
- **Urgent:** `text-destructive` (Rot) — 🔴
- **High:** `text-orange-500` — 🟠
- **Medium:** `text-yellow-500` — 🟡
- **Low:** `text-muted-foreground` — ⚪

### Todo-Karte (Inline-Stil, nicht Card)
- Kompakte Zeile: Checkbox | Priorität-Dot | Titel | Deadline | Source-Badge
- Hover: Zeigt Edit/Delete Icons
- Erledigt: Durchgestrichen + opacity-50

### Responsive
- Desktop: Volle Breite wie Inbox
- Mobile: Single-Column, Touch-optimiert

---

## 11. Wettbewerber-Analyse

| Feature | Superhuman | Spark | Front | Nexaro (geplant) |
|---------|-----------|-------|-------|-------------------|
| Manuelle Todos | ❌ | ✅ | ❌ | ✅ |
| KI-Extraktion | ❌ | Teilweise | ❌ | ✅ |
| In-Mail-Erstellung | ❌ | ✅ | ❌ | ✅ |
| Dashboard-Widget | ❌ | ❌ | ❌ | ✅ |
| Source-Verlinkung | ❌ | ✅ | ❌ | ✅ |

**Nexaro-Vorteil:** Einzige Unified-Inbox mit KI-basierter Todo-Extraktion aus ALLEN verbundenen Kanälen (Gmail + Slack + Teams).

---

*Erstellt am 11. März 2026 — Nexaro UI-P5 Brainstorming*
