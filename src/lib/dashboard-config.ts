"use client";

export type WidgetId =
  | "clock"
  | "quote"
  | "shortcuts"
  | "inbox-summary"
  | "stocks"
  | "meetings";

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
  defaultEnabled: boolean;
  defaultLayout: Omit<LayoutItem, "i">;
}

// 12-column grid, rowHeight=80px
export const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  clock: {
    id: "clock",
    label: "Uhr & Datum",
    description: "Live-Uhr mit aktuellem Datum",
    defaultEnabled: true,
    defaultLayout: { x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  },
  quote: {
    id: "quote",
    label: "Motivations-Zitat",
    description: "Täglich wechselndes inspirierendes Zitat",
    defaultEnabled: true,
    defaultLayout: { x: 3, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
  },
  shortcuts: {
    id: "shortcuts",
    label: "Schnellzugriffe",
    description: "Schnellzugriff auf häufige Aktionen",
    defaultEnabled: false,
    defaultLayout: { x: 0, y: 3, w: 3, h: 4, minW: 2, minH: 3 },
  },
  "inbox-summary": {
    id: "inbox-summary",
    label: "Posteingang-Übersicht",
    description: "Ungelesene Nachrichten nach Quelle",
    defaultEnabled: false,
    defaultLayout: { x: 3, y: 3, w: 3, h: 4, minW: 2, minH: 3 },
  },
  stocks: {
    id: "stocks",
    label: "Aktien",
    description: "Aktuelle Aktienkurse (AAPL, MSFT, GOOGL)",
    defaultEnabled: false,
    defaultLayout: { x: 0, y: 7, w: 8, h: 3, minW: 3, minH: 2 },
  },
  meetings: {
    id: "meetings",
    label: "Nächste Meetings",
    description: "Bevorstehende Meetings der nächsten 24 Stunden",
    defaultEnabled: false,
    defaultLayout: { x: 6, y: 3, w: 3, h: 4, minW: 2, minH: 3 },
  },
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

const STORAGE_KEY = "nexaro-dashboard-config-v2";

export function loadConfig(): StoredConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as StoredConfig;
    // Add any new widget ids not present in stored config
    const storedIds = new Set(parsed.widgets.map((w) => w.id));
    return {
      widgets: [
        ...parsed.widgets,
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

/** Returns a layout item for a newly-added widget placed below existing items. */
export function makeLayoutItem(id: WidgetId, existing: LayoutItem[]): LayoutItem {
  const maxY = existing.reduce((m, l) => Math.max(m, l.y + l.h), 0);
  return { i: id, ...WIDGET_META[id].defaultLayout, y: maxY };
}
