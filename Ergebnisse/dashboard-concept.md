# Nexaro Dashboard-Konzept: Personalisierbares Widget-Dashboard

> UI-P4 Brainstorming — Stand: März 2026

---

## 1. Analyse des aktuellen Zustands

### Problem:
Das Dashboard zeigt aktuell einfach die Gmail-Inbox an — eine 1:1 Kopie des Gmail-Bereichs. Das ist:
- **Redundant:** Gmail hat bereits einen eigenen Sidebar-Eintrag
- **Wertlos:** Kein Mehrwert gegenüber dem Gmail-View
- **Verwirrend:** User fragt sich "Warum sehe ich das Gleiche zweimal?"

### Lösung:
Ein **personalisierbares Widget-Dashboard**, das dem CEO auf einen Blick das Wichtigste zeigt — aggregiert über alle verbundenen Integrationen.

---

## 2. Widget-Katalog mit Bewertung

### 🟢 Must-Have (MVP)

| # | Widget | Beschreibung | Datenquelle | Aufwand |
|---|--------|-------------|-------------|---------|
| 1 | **Tagesübersicht** | Nächste 3 Termine + wichtigste ungelesene Mails + offene Todos | Calendar + Gmail + Todos | M |
| 2 | **KI-Highlights** | Top 5-10 wichtigste Nachrichten über alle Integrationen (nach AI-Score) | allMessages sorted by importance | S |
| 3 | **Ungelesen-Zähler** | Gmail (12), Slack (5), Teams (3) als kompakte Kacheln | Message counts by source | S |
| 4 | **Quick Actions** | Buttons: Mail verfassen, Slack-Nachricht, Kalender öffnen, Todo erstellen | Static links/modals | S |
| 5 | **Todo-Widget** | Top 5 offene Todos mit Checkbox und Priorität-Dot | useTodos hook | S |
| 6 | **Kalender-Widget** | Nächste 5 Termine mit Uhrzeit, Teilnehmer, Ort | Calendar API | M |

### 🟡 Nice-to-Have (Phase 2)

| # | Widget | Beschreibung | Aufwand |
|---|--------|-------------|---------|
| 7 | **Aktivitäts-Feed** | Chronologischer Stream über alle Kanäle | M |
| 8 | **KI-Zusammenfassung** | "Seit deinem letzten Login..." — AI-generiertes Briefing | L |
| 9 | **VIP-Kontakte** | Nachrichten von definierten Kontakten (Investoren, Board) | M |
| 10 | **Notizen / Quick Notes** | Kleines Notepad für schnelle Gedanken | S |
| 11 | **Krypto & Aktien** | BTC, ETH, AAPL, TSLA mit Sparklines | M (externe API) |
| 12 | **Wetter-Widget** | Aktuelles Wetter am Standort | S (externe API) |
| 13 | **Statistiken** | Antwortzeiten, unbearbeitete Mails-Trend, Kommunikationsvolumen | M |
| 14 | **Bookmarks / Favoriten** | Schnellzugriff auf Links/Kontakte | S |

### 🔵 Später (Phase 3+)

| # | Widget | Beschreibung | Aufwand |
|---|--------|-------------|---------|
| 15 | **Kanban-Widget** | Mini-Kanban mit Drag & Drop | L |
| 16 | **Docs-Widget** | Zuletzt bearbeitete Dokumente aus Drive/Dropbox | L (Integration) |
| 17 | **AI-Chat-Widget** | Mini KI-Assistent auf dem Dashboard | L |
| 18 | **Goals-Widget** | OKR/Ziel-Tracking mit Fortschrittsbalken | M |
| 19 | **Reporting-Widget** | Wöchentliche KPI-Zusammenfassung | L |
| 20 | **Milestones-Widget** | Projekt-Timeline mit Deadlines | M |
| 21 | **File Manager-Widget** | Zuletzt geteilte Dateien aus allen Integrationen | L |
| 22 | **Gantt Chart-Widget** | Visuelle Projekt-Timeline | XL |

---

## 3. Widget-Personalisierung — UX-Konzept

### 3.1 Hinzufügen

```
Dashboard Header:   [Dashboard]                    [+ Widget hinzufügen] [⚙ Bearbeiten]
```

- Klick auf "+" öffnet Widget-Galerie (Modal)
- Galerie zeigt alle verfügbaren Widgets als Karten mit:
  - Icon + Name
  - Kurzbeschreibung
  - "Hinzufügen" Button
  - Preview/Screenshot (optional)
- Kategorisiert: "Produktivität", "Kommunikation", "Finanzen", "Sonstiges"

### 3.2 Anordnen

- **Grid-Layout** mit CSS Grid
- Widgets in einem 12-Spalten-Grid (wie CSS frameworks)
- **Drag & Drop** zum Umordnen (react-dnd oder native HTML5 drag)
- "Bearbeiten"-Modus: Widgets zeigen Drag-Handle + Resize-Griffe

### 3.3 Widget-Größen

| Größe | Grid-Spalten | Höhe | Beispiel |
|-------|-------------|------|---------|
| Small (1x1) | 4 Spalten | ~200px | Ungelesen-Zähler, Quick Notes |
| Medium (2x1) | 8 Spalten | ~200px | KI-Highlights, Todo-Widget |
| Large (2x2) | 8 Spalten | ~400px | Aktivitäts-Feed, Kalender |
| Full Width | 12 Spalten | ~300px | Tagesübersicht |

### 3.4 Entfernen

- Hover auf Widget → "×" Button oben rechts
- Oder: "Bearbeiten"-Modus → Klick auf Widget → "Entfernen"
- Bestätigungsdialog: "Widget entfernen? Du kannst es jederzeit wieder hinzufügen."

### 3.5 Persistenz

```
Firestore: users/{uid}/dashboard
{
    widgets: [
        { type: "day-overview", position: { row: 0, col: 0 }, size: "full" },
        { type: "ai-highlights", position: { row: 1, col: 0 }, size: "medium" },
        { type: "todo-widget", position: { row: 1, col: 8 }, size: "small" },
        { type: "calendar-widget", position: { row: 2, col: 0 }, size: "large" },
        { type: "unread-counts", position: { row: 2, col: 8 }, size: "small" },
    ],
    lastModified: "2026-03-12T..."
}
```

---

## 4. Empfohlenes Default-Layout (Neuer User)

```
┌──────────────────────────────────────────────┐
│  🌅 Dein Tag auf einen Blick                 │  ← Full Width
│  3 Termine · 12 ungelesene · 5 offene Todos  │
└──────────────────────────────────────────────┘
┌──────────────────────┐ ┌────────────────────┐
│  ⭐ KI-Highlights     │ │  ✅ Aufgaben       │
│  Top 5 Nachrichten   │ │  Top 5 offene      │
│  nach AI-Score       │ │  Todos             │
└──────────────────────┘ └────────────────────┘
┌──────────────────────┐ ┌────────────────────┐
│  📅 Kalender         │ │  📊 Ungelesen      │
│  Nächste 5 Termine   │ │  Gmail: 12         │
│                      │ │  Slack: 5          │
│                      │ │  Teams: 3          │
│                      │ │  ──────            │
│                      │ │  ⚡ Quick Actions   │
└──────────────────────┘ └────────────────────┘
```

---

## 5. Technische Architektur der Widget-Engine

### 5.1 Widget-Registry Pattern

```typescript
// src/lib/widget-registry.ts
interface WidgetDefinition {
    type: string;
    name: string;
    description: string;
    icon: React.ComponentType;
    component: React.LazyExoticComponent<React.ComponentType>;
    defaultSize: "small" | "medium" | "large" | "full";
    category: "productivity" | "communication" | "finance" | "other";
}

const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
    "day-overview": {
        type: "day-overview",
        name: "Tagesübersicht",
        description: "Termine, Mails und Todos auf einen Blick",
        icon: CalendarIcon,
        component: lazy(() => import("@/components/widgets/day-overview")),
        defaultSize: "full",
        category: "productivity",
    },
    // ... weitere Widgets
};
```

### 5.2 Lazy Loading

Jedes Widget wird mit `React.lazy()` importiert:
- Dashboard lädt nur die Widgets die der User konfiguriert hat
- Neue Widgets können hinzugefügt werden ohne das Bundle zu vergrößern
- Suspense-Boundary pro Widget mit Skeleton-Fallback

### 5.3 Widget-Kommunikation

Jedes Widget erhält als Props:
```typescript
interface WidgetProps {
    uid: string;
    size: "small" | "medium" | "large" | "full";
    // Optional: shared data layer
    messages?: Message[];
    todos?: Todo[];
}
```

**Shared Data Layer:** Dashboard lädt Messages + Todos einmal und gibt sie per Props an alle Widgets weiter. Kein doppeltes Firestore-Querying.

### 5.4 Komponenten-Struktur

```
src/
├── components/widgets/
│   ├── widget-registry.ts       ← Registry + Types
│   ├── widget-grid.tsx          ← Grid-Layout + Drag&Drop
│   ├── widget-wrapper.tsx       ← Wrapper mit Header, Resize, Remove
│   ├── widget-gallery.tsx       ← Modal zum Hinzufügen
│   ├── day-overview.tsx         ← Widget: Tagesübersicht
│   ├── ai-highlights.tsx        ← Widget: KI-Highlights
│   ├── todo-widget.tsx          ← Widget: Aufgaben
│   ├── calendar-widget.tsx      ← Widget: Kalender
│   ├── unread-counts.tsx        ← Widget: Ungelesen-Zähler
│   └── quick-actions.tsx        ← Widget: Quick Actions
└── hooks/
    └── useDashboardConfig.ts    ← Firestore-persisted Widget-Config
```

---

## 6. Responsive Verhalten

### Desktop (>1024px): Multi-Column Grid
- 12-Spalten-Layout wie beschrieben
- Widgets in verschiedenen Größen

### Tablet (768-1024px): Vereinfachtes Grid
- Max 2 Spalten
- "Small" und "Medium" Widgets werden Full-Width
- "Large" Widgets behalten 2-Column-Span

### Mobile (<768px): Single Column Stack
- Alle Widgets in einer Spalte
- Reihenfolge nach Position (oben nach unten)
- Kein Drag & Drop (nur auf Desktop)
- "Bearbeiten" → einfache Liste zum Umsortieren

---

## 7. Wettbewerber-Vergleich

| Feature | Superhuman | Front | Spark | Notion | **Nexaro** |
|---------|-----------|-------|-------|--------|------------|
| Personalisierbar | ❌ | ❌ | ❌ | ✅ | ✅ |
| Widget-basiert | ❌ | ❌ | ❌ | ✅ | ✅ |
| Multi-Source-Aggregation | ❌ | Teilweise | ❌ | ❌ | ✅ |
| AI-priorisierte Highlights | ❌ | ❌ | Teilweise | ❌ | ✅ |
| Kalender-Integration | ❌ | ❌ | ❌ | ✅ | ✅ |
| Todo-Integration | ❌ | ❌ | ❌ | ✅ | ✅ |
| Drag & Drop Layout | ❌ | ❌ | ❌ | ✅ | ✅ |

**Nexaro-Vorteil:** Einziges Tool das ein personalisierbares Dashboard mit Multi-Source-Aggregation UND AI-Priorisierung bietet.

---

## 8. Priorisierte Implementierungs-Reihenfolge

### Phase 1 — MVP Dashboard (2-3 Tage)
1. Widget-Registry + Widget-Wrapper
2. Static Grid-Layout (noch kein Drag & Drop)
3. Tagesübersicht Widget
4. KI-Highlights Widget (Top-5 nach AI-Score)
5. Ungelesen-Zähler Widget
6. Quick Actions Widget
7. Todo-Widget (reuse useTodos)

### Phase 2 — Personalisierung (2-3 Tage)
8. Widget-Galerie Modal
9. Drag & Drop (react-dnd)
10. Resize (Small/Medium/Large)
11. Firestore-Persistenz der Konfiguration
12. Kalender-Widget

### Phase 3 — Advanced Widgets (1 Woche)
13. KI-Zusammenfassung ("Seit deinem letzten Login...")
14. VIP-Kontakte Widget
15. Notizen Widget
16. Statistiken Widget
17. Krypto/Aktien Widget (externe API)
18. Wetter Widget

### Phase 4 — Power Features (2+ Wochen)
19. AI-Chat Widget
20. Kanban Widget
21. Goals/OKR Widget
22. Gantt Chart Widget

---

*Erstellt am 12. März 2026 — Nexaro UI-P4 Dashboard-Konzept*
