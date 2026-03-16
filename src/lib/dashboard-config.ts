"use client";

export type WidgetId =
  | "clock"
  | "quote"
  | "shortcuts"
  | "inbox-summary"
  | "stocks"
  | "meetings";

export interface WidgetMeta {
  id: WidgetId;
  label: string;
  description: string;
  defaultEnabled: boolean;
  colSpan: 1 | 2;
}

export const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  clock: {
    id: "clock",
    label: "Uhr & Datum",
    description: "Live-Uhr mit aktuellem Datum",
    defaultEnabled: true,
    colSpan: 1,
  },
  quote: {
    id: "quote",
    label: "Motivations-Zitat",
    description: "Täglich wechselndes inspirierendes Zitat",
    defaultEnabled: true,
    colSpan: 2,
  },
  shortcuts: {
    id: "shortcuts",
    label: "Schnellzugriffe",
    description: "Schnellzugriff auf häufige Aktionen",
    defaultEnabled: false,
    colSpan: 1,
  },
  "inbox-summary": {
    id: "inbox-summary",
    label: "Posteingang-Übersicht",
    description: "Ungelesene Nachrichten nach Quelle",
    defaultEnabled: false,
    colSpan: 1,
  },
  stocks: {
    id: "stocks",
    label: "Aktien",
    description: "Aktuelle Aktienkurse (AAPL, MSFT, GOOGL)",
    defaultEnabled: false,
    colSpan: 2,
  },
  meetings: {
    id: "meetings",
    label: "Nächste Meetings",
    description: "Bevorstehende Meetings der nächsten 24 Stunden",
    defaultEnabled: false,
    colSpan: 1,
  },
};

export interface WidgetConfig {
  id: WidgetId;
  enabled: boolean;
}

export const DEFAULT_CONFIG: WidgetConfig[] = Object.values(WIDGET_META).map(
  (m) => ({ id: m.id, enabled: m.defaultEnabled })
);

const STORAGE_KEY = "nexaro-dashboard-config";

export function loadDashboardConfig(): WidgetConfig[] {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_CONFIG;
    const parsed = JSON.parse(stored) as WidgetConfig[];
    // Merge stored config with defaults so new widgets appear for existing users
    const storedIds = new Set(parsed.map((w) => w.id));
    return [
      ...parsed,
      ...DEFAULT_CONFIG.filter((d) => !storedIds.has(d.id)),
    ];
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveDashboardConfig(config: WidgetConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
