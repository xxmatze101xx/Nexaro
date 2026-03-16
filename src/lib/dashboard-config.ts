"use client";

export type WidgetCategory =
  | "time"
  | "productivity"
  | "communication"
  | "finance"
  | "analytics"
  | "weather"
  | "content"
  | "health"
  | "tools"
  | "personal"
  | "ai"
  | "misc";

export type WidgetId =
  | "clock" | "quote" | "shortcuts" | "inbox-summary" | "stocks" | "meetings"
  | "world-clock" | "pomodoro" | "calendar-mini" | "countdown" | "week-planner"
  | "working-hours" | "stopwatch"
  | "tasks" | "notes" | "habit-tracker" | "goals" | "focus-mode" | "reading-list"
  | "project-status" | "kpi-dashboard" | "okr-tracker" | "sprint-board"
  | "decision-log" | "meeting-prep-widget" | "agenda-today" | "whiteboard"
  | "slack-activity" | "email-stats" | "team-status" | "response-time-widget"
  | "unread-count" | "message-queue" | "contact-quick"
  | "crypto" | "currency" | "portfolio" | "budget" | "expenses"
  | "mrr-widget" | "burn-rate" | "revenue" | "invoices"
  | "productivity-score" | "weekly-summary" | "visitor-stats" | "conversion-rate"
  | "nps" | "churn-rate" | "growth-metrics" | "email-analytics"
  | "weather-current" | "weather-forecast" | "air-quality" | "uv-index"
  | "tech-news" | "business-news" | "word-of-day" | "fun-fact"
  | "thought-of-day" | "rss-reader" | "hacker-news"
  | "water-tracker" | "break-reminder" | "mood-tracker" | "meditation"
  | "breathing" | "affirmations" | "gratitude" | "sleep-tracker"
  | "calculator" | "unit-converter" | "timer" | "color-picker"
  | "qr-generator" | "password-gen" | "text-counter" | "json-format"
  | "base64-tool" | "regex-tool" | "hash-gen" | "ip-info"
  | "birthday-tracker" | "journal" | "bucket-list" | "skill-tracker"
  | "reading-progress" | "photo-memory" | "travel-goals"
  | "ai-inbox-summary" | "action-items" | "inbox-sentiment"
  | "ai-meeting-insights" | "smart-priority" | "ai-recommendations" | "email-templates"
  | "system-status" | "news-ticker" | "leaderboard" | "changelog";

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface WidgetMeta {
  id: WidgetId;
  label: string;
  description: string;
  category: WidgetCategory;
  defaultEnabled: boolean;
  defaultLayout: Omit<LayoutItem, "i">;
}

export const CATEGORY_META: Record<WidgetCategory, { label: string }> = {
  time:         { label: "Zeit & Kalender" },
  productivity: { label: "Produktivität" },
  communication:{ label: "Kommunikation" },
  finance:      { label: "Finanzen" },
  analytics:    { label: "Analytics" },
  weather:      { label: "Wetter" },
  content:      { label: "News & Inhalte" },
  health:       { label: "Gesundheit" },
  tools:        { label: "Tools" },
  personal:     { label: "Persönlich" },
  ai:           { label: "KI & Smart" },
  misc:         { label: "Sonstiges" },
};

export const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  // ── Zeit & Kalender ──────────────────────────────────────────────
  clock:           { id:"clock",           label:"Uhr & Datum",               description:"Live-Uhr mit aktuellem Datum",                    category:"time",         defaultEnabled:true,  defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "world-clock":   { id:"world-clock",     label:"Weltzeituhr",                description:"Zeit in mehreren Zeitzonen",                      category:"time",         defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:3,minH:2} },
  pomodoro:        { id:"pomodoro",        label:"Pomodoro Timer",             description:"25-Min-Fokus-Timer mit Pausen",                   category:"time",         defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:4,minW:2,minH:3} },
  "calendar-mini": { id:"calendar-mini",   label:"Mini-Kalender",              description:"Monatsansicht auf einen Blick",                   category:"time",         defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:4,minW:3,minH:4} },
  countdown:       { id:"countdown",       label:"Countdown",                  description:"Countdown bis zu einem wichtigen Termin",         category:"time",         defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "week-planner":  { id:"week-planner",    label:"Wochenplaner",               description:"Überblick über die aktuelle Woche",               category:"time",         defaultEnabled:false, defaultLayout:{x:0,y:0,w:6,h:4,minW:4,minH:3} },
  "working-hours": { id:"working-hours",   label:"Arbeitsstunden",             description:"Tägliche Arbeitszeit verfolgen",                  category:"time",         defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  stopwatch:       { id:"stopwatch",       label:"Stoppuhr",                   description:"Stoppuhr mit Rundenzeiten",                       category:"time",         defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },

  // ── Produktivität ────────────────────────────────────────────────
  shortcuts:            { id:"shortcuts",            label:"Schnellzugriffe",          description:"Schnellzugriff auf häufige Aktionen",            category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:3,w:3,h:4,minW:2,minH:3} },
  tasks:                { id:"tasks",                label:"Aufgaben",                 description:"Persönliche To-do Liste",                        category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:5,minW:2,minH:3} },
  notes:                { id:"notes",                label:"Notizen",                  description:"Schnelle Notizen und Gedanken",                   category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:2,minH:3} },
  "habit-tracker":      { id:"habit-tracker",        label:"Gewohnheiten",             description:"Tägliche Gewohnheiten verfolgen",                 category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  goals:                { id:"goals",                label:"Tagesziele",               description:"Heutige Ziele und Fortschritt",                   category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:2,minH:3} },
  "focus-mode":         { id:"focus-mode",           label:"Fokus-Modus",              description:"Deep-Work-Session starten",                       category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "reading-list":       { id:"reading-list",         label:"Leseliste",                description:"Artikel und Links für später",                    category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:2,minH:3} },
  "project-status":     { id:"project-status",       label:"Projektstatus",            description:"Laufende Projekte und Fortschritt",               category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  "kpi-dashboard":      { id:"kpi-dashboard",        label:"KPI-Dashboard",            description:"Schlüsselkennzahlen auf einen Blick",             category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:6,h:4,minW:3,minH:2} },
  "okr-tracker":        { id:"okr-tracker",          label:"OKR Tracker",              description:"Objectives und Key Results verfolgen",            category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:6,h:5,minW:3,minH:3} },
  "sprint-board":       { id:"sprint-board",         label:"Sprint Board",             description:"Agile Sprint-Übersicht",                          category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:8,h:5,minW:4,minH:3} },
  "decision-log":       { id:"decision-log",         label:"Entscheidungsprotokoll",   description:"Wichtige Entscheidungen festhalten",              category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  "meeting-prep-widget":{ id:"meeting-prep-widget",  label:"Meeting-Vorbereitung",     description:"Nächstes Meeting vorbereiten",                    category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  "agenda-today":       { id:"agenda-today",         label:"Tagesagenda",              description:"Alle Termine und Aufgaben heute",                 category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:5,minW:3,minH:3} },
  whiteboard:           { id:"whiteboard",           label:"Whiteboard",               description:"Schnelles digitales Whiteboard",                  category:"productivity", defaultEnabled:false, defaultLayout:{x:0,y:0,w:6,h:5,minW:4,minH:4} },

  // ── Kommunikation ────────────────────────────────────────────────
  "inbox-summary":       { id:"inbox-summary",        label:"Posteingang-Übersicht",   description:"Ungelesene Nachrichten nach Quelle",              category:"communication", defaultEnabled:false, defaultLayout:{x:3,y:3,w:3,h:4,minW:2,minH:3} },
  meetings:              { id:"meetings",              label:"Nächste Meetings",        description:"Bevorstehende Meetings der nächsten 24 Stunden",  category:"communication", defaultEnabled:false, defaultLayout:{x:6,y:3,w:3,h:4,minW:2,minH:3} },
  "slack-activity":      { id:"slack-activity",       label:"Slack Aktivität",         description:"Ungelesene Nachrichten in Slack",                 category:"communication", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:2,minH:3} },
  "email-stats":         { id:"email-stats",          label:"E-Mail Statistiken",      description:"Gesendete und empfangene E-Mails heute",          category:"communication", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:2,minH:2} },
  "team-status":         { id:"team-status",          label:"Team-Status",             description:"Online-Status der Teammitglieder",                category:"communication", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:2,minH:3} },
  "response-time-widget":{ id:"response-time-widget", label:"Antwortzeit",             description:"Durchschnittliche Antwortzeit",                   category:"communication", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "unread-count":        { id:"unread-count",         label:"Ungelesene Nachrichten",  description:"Gesamtzahl ungelesener Nachrichten",              category:"communication", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "message-queue":       { id:"message-queue",        label:"Ausstehende Antworten",   description:"Nachrichten die eine Antwort benötigen",          category:"communication", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:2,minH:3} },
  "contact-quick":       { id:"contact-quick",        label:"Schnellkontakte",         description:"Häufig kontaktierte Personen",                    category:"communication", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:4,minW:2,minH:3} },

  // ── Finanzen ─────────────────────────────────────────────────────
  stocks:      { id:"stocks",      label:"Aktien",            description:"Aktuelle Aktienkurse (AAPL, MSFT, GOOGL)",   category:"finance", defaultEnabled:false, defaultLayout:{x:0,y:7,w:8,h:3,minW:3,minH:2} },
  crypto:      { id:"crypto",      label:"Kryptowährungen",   description:"BTC, ETH und weitere Kurse",                 category:"finance", defaultEnabled:false, defaultLayout:{x:0,y:0,w:6,h:3,minW:3,minH:2} },
  currency:    { id:"currency",    label:"Währungsrechner",   description:"Aktuelle Wechselkurse",                      category:"finance", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:3,minH:2} },
  portfolio:   { id:"portfolio",   label:"Portfolio",         description:"Investitionsportfolio Übersicht",            category:"finance", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  budget:      { id:"budget",      label:"Budget",            description:"Monatliches Budget und Ausgaben",            category:"finance", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  expenses:    { id:"expenses",    label:"Ausgaben",          description:"Letzte Ausgaben und Transaktionen",          category:"finance", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  "mrr-widget":{ id:"mrr-widget",  label:"MRR / ARR",         description:"Monthly und Annual Recurring Revenue",       category:"finance", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:2,minH:2} },
  "burn-rate": { id:"burn-rate",   label:"Burn Rate",         description:"Monatlicher Kapitalverbrauch",               category:"finance", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  revenue:     { id:"revenue",     label:"Umsatz",            description:"Umsatzentwicklung und Ziele",                category:"finance", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:2,minH:2} },
  invoices:    { id:"invoices",    label:"Rechnungen",        description:"Offene und fällige Rechnungen",              category:"finance", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },

  // ── Analytics ────────────────────────────────────────────────────
  "productivity-score": { id:"productivity-score", label:"Produktivitätsscore",     description:"KI-Score für heutigen Arbeitstag",          category:"analytics", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "weekly-summary":     { id:"weekly-summary",     label:"Wochenzusammenfassung",   description:"Rückblick auf die vergangene Woche",        category:"analytics", defaultEnabled:false, defaultLayout:{x:0,y:0,w:6,h:4,minW:4,minH:3} },
  "visitor-stats":      { id:"visitor-stats",      label:"Website-Besucher",        description:"Tägliche Seitenbesuche und Trends",         category:"analytics", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:2,minH:2} },
  "conversion-rate":    { id:"conversion-rate",    label:"Konversionsrate",         description:"Conversion Funnel Metriken",                category:"analytics", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  nps:                  { id:"nps",                label:"NPS Score",               description:"Net Promoter Score Entwicklung",            category:"analytics", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "churn-rate":         { id:"churn-rate",         label:"Churn Rate",              description:"Kündigungsrate und Kundenbindung",          category:"analytics", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "growth-metrics":     { id:"growth-metrics",     label:"Wachstumsmetriken",       description:"Wachstumstrends und KPIs",                  category:"analytics", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:2} },
  "email-analytics":    { id:"email-analytics",    label:"E-Mail Analytics",        description:"Öffnungsrate und Klickrate",                category:"analytics", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:2,minH:2} },

  // ── Wetter ───────────────────────────────────────────────────────
  "weather-current":  { id:"weather-current",  label:"Aktuelles Wetter",    description:"Wetter für deinen Standort",      category:"weather", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "weather-forecast": { id:"weather-forecast", label:"Wettervorhersage",    description:"5-Tage Wettervorhersage",         category:"weather", defaultEnabled:false, defaultLayout:{x:0,y:0,w:8,h:3,minW:4,minH:2} },
  "air-quality":      { id:"air-quality",      label:"Luftqualität",        description:"Aktueller Luftqualitätsindex",    category:"weather", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "uv-index":         { id:"uv-index",         label:"UV-Index",            description:"Aktueller UV-Index",              category:"weather", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },

  // ── News & Inhalte ───────────────────────────────────────────────
  quote:          { id:"quote",          label:"Motivations-Zitat",   description:"Täglich wechselndes inspirierendes Zitat",  category:"content", defaultEnabled:true,  defaultLayout:{x:3,y:0,w:6,h:3,minW:3,minH:2} },
  "tech-news":    { id:"tech-news",      label:"Tech News",           description:"Aktuelle Technologieneuigkeiten",           category:"content", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:5,minW:3,minH:3} },
  "business-news":{ id:"business-news", label:"Business News",       description:"Wirtschafts- und Unternehmensnews",         category:"content", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:5,minW:3,minH:3} },
  "word-of-day":  { id:"word-of-day",   label:"Wort des Tages",      description:"Tägliches Vokabel-Highlight",               category:"content", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "fun-fact":     { id:"fun-fact",      label:"Wusstest du?",        description:"Täglicher Wissensfakt",                     category:"content", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:3,minH:2} },
  "thought-of-day":{ id:"thought-of-day",label:"Gedanke des Tages", description:"Tägliche Denkanstöße",                      category:"content", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:3,minH:2} },
  "rss-reader":   { id:"rss-reader",    label:"RSS Reader",          description:"Eigene RSS-Feeds verfolgen",                category:"content", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:5,minW:3,minH:3} },
  "hacker-news":  { id:"hacker-news",   label:"Hacker News",         description:"Top-Stories von Hacker News",               category:"content", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:5,minW:3,minH:3} },

  // ── Gesundheit ───────────────────────────────────────────────────
  "water-tracker":  { id:"water-tracker",  label:"Wasser-Tracker",       description:"Tägliche Wasseraufnahme verfolgen",          category:"health", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "break-reminder": { id:"break-reminder", label:"Pausenerinnerung",      description:"Regelmäßige Erinnerungen für Pausen",        category:"health", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "mood-tracker":   { id:"mood-tracker",   label:"Stimmungs-Tracker",     description:"Tägliche Stimmung festhalten",               category:"health", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  meditation:       { id:"meditation",     label:"Meditationstimer",      description:"Geführte Meditationssessions",               category:"health", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:4,minW:2,minH:3} },
  breathing:        { id:"breathing",      label:"Atemübungen",           description:"Geführte Atemtechnik für Stressreduktion",   category:"health", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:4,minW:2,minH:3} },
  affirmations:     { id:"affirmations",   label:"Affirmationen",         description:"Tägliche positive Affirmationen",            category:"health", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:3,minH:2} },
  gratitude:        { id:"gratitude",      label:"Dankbarkeits-Journal",  description:"Tägliche Dankbarkeitseinträge",              category:"health", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  "sleep-tracker":  { id:"sleep-tracker",  label:"Schlaf-Tracker",        description:"Schlafdauer und -qualität verfolgen",        category:"health", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:3,minH:2} },

  // ── Tools ────────────────────────────────────────────────────────
  calculator:      { id:"calculator",      label:"Taschenrechner",      description:"Schnelle Berechnungen",                    category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:5,minW:2,minH:4} },
  "unit-converter":{ id:"unit-converter",  label:"Einheitenrechner",    description:"Einheiten umrechnen",                      category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  timer:           { id:"timer",           label:"Timer",               description:"Anpassbarer Countdown-Timer",              category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:3,minW:2,minH:2} },
  "color-picker":  { id:"color-picker",    label:"Farbpalette",         description:"Farben auswählen und kopieren",            category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  "qr-generator":  { id:"qr-generator",   label:"QR-Code Generator",   description:"QR-Codes für URLs erstellen",              category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:3,h:4,minW:2,minH:3} },
  "password-gen":  { id:"password-gen",   label:"Passwort-Generator",  description:"Sichere Passwörter generieren",            category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:3,minH:2} },
  "text-counter":  { id:"text-counter",   label:"Textanalyse",         description:"Zeichen, Wörter und Sätze zählen",        category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  "json-format":   { id:"json-format",    label:"JSON Formatter",      description:"JSON formatieren und validieren",          category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:5,minW:3,minH:3} },
  "base64-tool":   { id:"base64-tool",    label:"Base64 Encoder",      description:"Text in Base64 konvertieren",              category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  "regex-tool":    { id:"regex-tool",     label:"Regex Tester",        description:"Reguläre Ausdrücke testen",               category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:6,h:4,minW:4,minH:3} },
  "hash-gen":      { id:"hash-gen",       label:"Hash Generator",      description:"MD5, SHA256 und weitere Hashes",          category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  "ip-info":       { id:"ip-info",        label:"IP-Info",             description:"Eigene IP und Netzwerkinfos",             category:"tools", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:3,minH:2} },

  // ── Persönlich ───────────────────────────────────────────────────
  "birthday-tracker": { id:"birthday-tracker", label:"Geburtstage",        description:"Bevorstehende Geburtstage",                  category:"personal", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  journal:            { id:"journal",           label:"Tagebuch",           description:"Tägliche Gedanken und Ereignisse",           category:"personal", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:5,minW:3,minH:3} },
  "bucket-list":      { id:"bucket-list",       label:"Bucket List",        description:"Ziele und Wünsche festhalten",               category:"personal", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:5,minW:3,minH:3} },
  "skill-tracker":    { id:"skill-tracker",     label:"Skill Tracker",      description:"Fähigkeiten entwickeln und verfolgen",       category:"personal", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  "reading-progress": { id:"reading-progress",  label:"Lesefortschritt",    description:"Bücher und Leseziele verfolgen",             category:"personal", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  "photo-memory":     { id:"photo-memory",      label:"Foto-Erinnerung",    description:"Zufällige Foto-Erinnerungen anzeigen",       category:"personal", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  "travel-goals":     { id:"travel-goals",      label:"Reiseziele",         description:"Traumreiseziele und Reisepläne",             category:"personal", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },

  // ── KI & Smart ───────────────────────────────────────────────────
  "ai-inbox-summary":    { id:"ai-inbox-summary",    label:"KI Posteingang-Analyse",    description:"KI-Zusammenfassung deiner Inbox",               category:"ai", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  "action-items":        { id:"action-items",        label:"Action Items",              description:"KI-erkannte Handlungsaufgaben",                  category:"ai", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  "inbox-sentiment":     { id:"inbox-sentiment",     label:"Inbox Sentiment",           description:"Stimmungsanalyse deiner Kommunikation",          category:"ai", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:3,minW:3,minH:2} },
  "ai-meeting-insights": { id:"ai-meeting-insights", label:"KI Meeting-Insights",       description:"KI-Analyse vergangener Meetings",                category:"ai", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  "smart-priority":      { id:"smart-priority",      label:"Smart Priority",            description:"KI-priorisierte Aufgabenliste",                  category:"ai", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:5,minW:3,minH:3} },
  "ai-recommendations":  { id:"ai-recommendations",  label:"KI Empfehlungen",           description:"Personalisierte Handlungsempfehlungen",          category:"ai", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },
  "email-templates":     { id:"email-templates",     label:"E-Mail Templates",          description:"Häufige E-Mail-Vorlagen",                        category:"ai", defaultEnabled:false, defaultLayout:{x:0,y:0,w:5,h:4,minW:3,minH:3} },

  // ── Sonstiges ────────────────────────────────────────────────────
  "system-status": { id:"system-status", label:"System-Status",         description:"Status verbundener Dienste",         category:"misc", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
  "news-ticker":   { id:"news-ticker",   label:"News-Ticker",           description:"Scrollende Nachrichtenzeile",        category:"misc", defaultEnabled:false, defaultLayout:{x:0,y:0,w:8,h:2,minW:4,minH:2} },
  leaderboard:     { id:"leaderboard",   label:"Leaderboard",           description:"Team-Performance Rangliste",         category:"misc", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:5,minW:3,minH:3} },
  changelog:       { id:"changelog",     label:"Änderungsprotokoll",    description:"Letzte Systemänderungen",            category:"misc", defaultEnabled:false, defaultLayout:{x:0,y:0,w:4,h:4,minW:3,minH:3} },
};

export interface WidgetConfig {
  id: WidgetId;
  enabled: boolean;
}

export interface StoredConfig {
  widgets: WidgetConfig[];
  layout: LayoutItem[];
}

const WIDGET_IDS = Object.keys(WIDGET_META) as WidgetId[];

export const DEFAULT_CONFIG: StoredConfig = {
  widgets: WIDGET_IDS.map((id) => ({
    id,
    enabled: WIDGET_META[id].defaultEnabled,
  })),
  layout: WIDGET_IDS.filter((id) => WIDGET_META[id].defaultEnabled).map(
    (id) => ({ i: id, ...WIDGET_META[id].defaultLayout })
  ),
};

const STORAGE_KEY = "nexaro-dashboard-config-v3";

export function loadConfig(): StoredConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as StoredConfig;
    const storedIds = new Set(parsed.widgets.map((w) => w.id));
    return {
      widgets: [
        ...parsed.widgets.filter((w) => WIDGET_IDS.includes(w.id as WidgetId)),
        ...WIDGET_IDS.filter((id) => !storedIds.has(id)).map((id) => ({
          id,
          enabled: false,
        })),
      ],
      layout: parsed.layout ?? DEFAULT_CONFIG.layout,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: StoredConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function makeLayoutItem(id: WidgetId, existing: LayoutItem[]): LayoutItem {
  const maxY = existing.reduce((m, l) => Math.max(m, l.y + l.h), 0);
  return { i: id, ...WIDGET_META[id].defaultLayout, y: maxY };
}
