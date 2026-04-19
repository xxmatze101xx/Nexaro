"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    ChevronLeft, Calendar as CalendarIcon, ChevronRight,
    Plus, Clock, MapPin, Check, Loader2, ChevronDown, X, Trash2, MoreHorizontal, Search,
    LayoutDashboard, FolderOpen, Settings as SettingsIcon, Bot,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { getCalendarAccounts, setCalendarAccountVisibility, CalendarAccount } from "@/lib/user";
import { fetchCalendarEvents, getAccountColor, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getCalendarAuthErrors, CalendarEvent } from "@/lib/calendar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL_H = 64;
const GUTTER = 56;
const PRELOAD = 3;
type ViewMode = "day" | "week" | "month" | "agenda";

const DAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const TIME_LABELS = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

const weekDays = (anchor: Date): Date[] => {
    const d = new Date(anchor);
    const off = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + off); d.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x; });
};
const mStart = (y: number, m: number) => new Date(y, m, 1);
const mEnd = (y: number, m: number) => new Date(y, m + 1, 0, 23, 59, 59, 999);
const rangeKey = (f: Date, t: Date) => `${f.getFullYear()}-${f.getMonth()}_${t.getFullYear()}-${t.getMonth()}`;

const snapH = (h: number) => Math.round(h * 4) / 4; // snap to 15-min
const fmtH = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const parseH = (s: string) => { const [hh, mm] = s.split(":").map(Number); return hh + (mm || 0) / 60; };

// ─── Color Contrast Helper ────────────────────────────────────────────────────
/** Returns a dark or light text color for readable contrast on any bg hex color */
function readableTextColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Perceived luminance (WCAG formula)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.45 ? "#1e293b" : "#f8fafc";
}

// ─── Overlap Layout ───────────────────────────────────────────────────────────
interface LayoutEv extends CalendarEvent { lane: number; lanes: number; }

function layoutDayEvents(evs: CalendarEvent[]): LayoutEv[] {
    if (!evs.length) return [];
    const sorted = [...evs].sort((a, b) => a.start.getTime() - b.start.getTime());
    const laneEnds: number[] = [];
    const withLane = sorted.map(ev => {
        let lane = laneEnds.findIndex(end => end <= ev.start.getTime());
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
        laneEnds[lane] = ev.end.getTime();
        return { ...ev, lane, lanes: 0 };
    });
    return withLane.map(ev => {
        const concurrent = withLane.filter(o => o.start < ev.end && o.end > ev.start);
        return { ...ev, lanes: Math.max(...concurrent.map(o => o.lane)) + 1 };
    });
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ anchor, onSelect }: { anchor: Date; onSelect: (d: Date) => void }) {
    const { t, locale } = useLanguage();
    const today = new Date();
    const [vy, setVY] = useState(anchor.getFullYear());
    const [vm, setVM] = useState(anchor.getMonth());
    const [picker, setPicker] = useState<null | "month" | "year">(null);
    useEffect(() => { setVY(anchor.getFullYear()); setVM(anchor.getMonth()); }, [anchor]);
    const prevM = () => vm === 0 ? (setVM(11), setVY(y => y - 1)) : setVM(m => m - 1);
    const nextM = () => vm === 11 ? (setVM(0), setVY(y => y + 1)) : setVM(m => m + 1);
    const lead = new Date(vy, vm, 1).getDay() === 0 ? 6 : new Date(vy, vm, 1).getDay() - 1;
    const daysInM = new Date(vy, vm + 1, 0).getDate();
    return (
        <div className="px-3 py-3 select-none">
            <div className="flex items-center justify-between mb-3">
                <button onClick={() => setPicker(p => p ? null : "month")} className="flex items-center gap-1 text-sm font-bold hover:text-primary transition-colors">
                    {MONTH_NAMES[vm].slice(0, 3)} {vy}
                    <ChevronDown className={`w-3 h-3 transition-transform ${picker ? "rotate-180" : ""}`} />
                </button>
                <div className="flex gap-0.5">
                    <button onClick={prevM} className="p-1 hover:bg-muted rounded transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={nextM} className="p-1 hover:bg-muted rounded transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
            </div>
            {picker && (
                <div className="mb-3 rounded-xl bg-muted/50 border border-border/60 p-2 animate-in fade-in duration-150">
                    {picker === "month" ? (
                        <>
                            <button onClick={() => setPicker("year")} className="text-xs font-bold text-primary hover:underline mb-2 block">{vy} ▾</button>
                            <div className="grid grid-cols-3 gap-1">
                                {MONTH_NAMES.map((mn, idx) => (
                                    <button key={mn} onClick={() => { setVM(idx); setPicker(null); }}
                                        className={`text-[11px] py-1 rounded-lg font-semibold transition-colors ${idx === vm ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                                        {mn.slice(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setPicker("month")} className="text-xs font-bold text-primary hover:underline mb-2 block">{t("calendar.months")}</button>
                            <div className="grid grid-cols-3 gap-1 max-h-36 overflow-y-auto">
                                {Array.from({ length: 20 }, (_, i) => today.getFullYear() - 5 + i).map(y => (
                                    <button key={y} onClick={() => { setVY(y); setPicker("month"); }}
                                        className={`text-[11px] py-1 rounded-lg font-semibold transition-colors ${y === vy ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                                        {y}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
            <div className="grid grid-cols-7 mb-1">
                {DAY_SHORT.map(d => <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
                {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInM }, (_, i) => i + 1).map(d => {
                    const date = new Date(vy, vm, d);
                    const isT = sameDay(date, today);
                    const isSel = sameDay(date, anchor);
                    return (
                        <button key={d} onClick={() => { onSelect(date); setPicker(null); }}
                            className={`w-full py-0.5 text-xs rounded-full font-medium transition-all ${isT && !isSel ? "text-primary font-bold" : ""} ${isSel ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                            {d}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Create Event Panel ───────────────────────────────────────────────────────
// ─── Event Editor Popover ───────────────────────────────────────────────────────
interface EventEditorData {
    id?: string;
    calendarId?: string;
    description?: string;
    title: string;
    start: Date;
    end: Date;
    location: string;
    email: string;
}

function EventEditorPopover({ day, startH, endH, accounts, onSave, onDelete, onClose, editEvent, position }: {
    day: Date; startH: number; endH: number;
    accounts: CalendarAccount[];
    onSave: (d: EventEditorData) => void;
    onDelete?: (id: string, calendarId: string, email: string) => void;
    onClose: () => void;
    editEvent?: CalendarEvent | null;
    position: { x: number, y: number };
}) {
    const { t, locale } = useLanguage();
    const [title, setTitle] = useState(editEvent?.title ?? "");

    // Parse hours correctly if we're editing an existing event
    const initSH = editEvent ? editEvent.start.getHours() + editEvent.start.getMinutes() / 60 : startH;
    const initEH = editEvent ? editEvent.end.getHours() + editEvent.end.getMinutes() / 60 : endH;

    const [sH, setSH] = useState(initSH);
    const [eH, setEH] = useState(initEH);
    const [loc, setLoc] = useState(editEvent?.location ?? "");
    const [email, setEmail] = useState(editEvent?.accountEmail ?? accounts[0]?.email ?? "");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => { titleRef.current?.focus(); }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSave = async () => {
        if (!title.trim()) return titleRef.current?.focus();

        let start = new Date(day);
        let end = new Date(day);

        if (editEvent) {
            start = new Date(editEvent.start);
            end = new Date(editEvent.start); // use same day as original start
        }

        start.setHours(Math.floor(sH), Math.round((sH % 1) * 60), 0, 0);
        end.setHours(Math.floor(eH), Math.round((eH % 1) * 60), 0, 0);

        // Handle cross-day changes properly if needed, but for simple edits same-day is fine.
        if (end.getTime() < start.getTime()) {
            end.setDate(end.getDate() + 1);
        }

        setSaving(true);
        await onSave({
            id: editEvent?.id,
            calendarId: editEvent?.calendarId,
            description: editEvent?.description,
            title,
            start,
            end,
            location: loc,
            email
        });
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!editEvent || !onDelete) return;
        if (window.confirm(t("calendar.deleteConfirm"))) {
            setDeleting(true);
            await onDelete(editEvent.id, editEvent.calendarId, editEvent.accountEmail);
            setDeleting(false);
        }
    };

    // Calculate safe position to avoid rendering off-screen
    const safeX = Math.min(position.x + 10, typeof window !== 'undefined' ? window.innerWidth - 390 : position.x);
    const safeY = Math.min(position.y + 10, typeof window !== 'undefined' ? window.innerHeight - 500 : position.y);

    return (
        <div ref={popoverRef} className="bg-card rounded-[24px] shadow-2xl shadow-black/10 border border-border w-[380px] overflow-hidden animate-in zoom-in-95 fade-in duration-200 absolute z-50 pointer-events-auto" style={{ left: safeX, top: safeY }}>
            <div className="p-5">
                <input
                    ref={titleRef}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSave()}
                    placeholder={t("calendar.addEvent")}
                    className="w-full text-[22px] tracking-tight font-medium bg-transparent outline-none mb-5 placeholder:text-muted-foreground/40 text-foreground"
                />

                <div className="space-y-3">
                    {/* DateTime Picker Row */}
                    <div className="flex items-center gap-3 text-sm py-1.5 rounded-lg">
                        <CalendarIcon className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        <span className="font-medium text-foreground/90 whitespace-nowrap text-[15px]">
                            {(editEvent ? editEvent.start : day).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                        </span>
                    </div>

                    {/* Times */}
                    <div className="flex items-center gap-3 text-sm py-1.5 rounded-lg">
                        <Clock className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        <div className="flex items-center gap-2">
                            <input type="time" value={fmtH(sH)} onChange={e => setSH(parseH(e.target.value))}
                                className="bg-transparent font-medium outline-none hover:bg-muted/50 rounded transition-colors text-[15px] cursor-pointer" />
                            <span className="text-muted-foreground/40 font-bold px-1 select-none">›</span>
                            <input type="time" value={fmtH(eH)} onChange={e => setEH(parseH(e.target.value))}
                                className="bg-transparent font-medium outline-none hover:bg-muted/50 rounded transition-colors text-[15px] cursor-pointer" />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-3 text-sm py-1.5 rounded-lg">
                        <MapPin className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        <input value={loc} onChange={e => setLoc(e.target.value)} placeholder={t("calendar.addLocation")}
                            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground/50 font-medium" />
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-border/40 my-4" />

                    {/* Category/Account */}
                    {accounts.length > 0 && Array.from(new Set(accounts.map(a => a.email))).length > 1 && (
                        <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(accounts.map(a => a.email))).map(accEmail => {
                                const isSel = email === accEmail;
                                const col = getAccountColor(accEmail);
                                return (
                                    <button key={accEmail} onClick={() => setEmail(accEmail)}
                                        className="px-3 py-1 rounded-full text-[13px] font-medium transition-all shrink-0"
                                        style={isSel ? { backgroundColor: col, color: "#fff" } : { backgroundColor: col + "20", color: col }}>
                                        {accEmail.split('@')[0]}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Account Fallback (if only 1) */}
                    {accounts.length > 0 && Array.from(new Set(accounts.map(a => a.email))).length === 1 && (
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[13px] font-medium" style={{ backgroundColor: getAccountColor(accounts[0].email), color: "#fff" }}>
                                {accounts[0].email.split('@')[0]}
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {accounts.length === 0 ? (
                    <div className="mt-6 pt-4 text-center">
                        <p className="text-muted-foreground text-[13px] mb-3">{t("calendar.noCalendarEditor")}</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 mt-6">
                        {editEvent && (
                            <button onClick={handleDelete} disabled={deleting || saving} className="p-2.5 hover:bg-red-50 text-red-500 rounded-xl transition-colors disabled:opacity-50">
                                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" strokeWidth={1.5} />}
                            </button>
                        )}
                        <button onClick={handleSave} disabled={saving || !title.trim() || !email} className="flex-1 py-3 bg-blue-600 text-white text-[15px] font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editEvent ? t("calendar.saveEvent") : t("calendar.createEvent"))}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Time Grid ────────────────────────────────────────────────────────────────
interface DragState { dayIdx: number; startH: number; endH: number; }
interface CreateState { day: Date; startH: number; endH: number; }
interface RescheduleState { ev: CalendarEvent; dayIdx: number; startH: number; origDuration: number; }

function TimeGrid({ days, events, selected, onSelect, onCreateRequest, onReschedule, uid, accounts, creating, isLoading, view, onDayClick }: {
    days: Date[];
    events: CalendarEvent[];
    selected: CalendarEvent | null;
    onSelect: (ev: CalendarEvent | null, e?: React.MouseEvent) => void;
    onCreateRequest: (s: CreateState & { x: number, y: number }) => void;
    onReschedule?: (ev: CalendarEvent, newStart: Date, newEnd: Date) => void;
    uid: string | null;
    accounts: CalendarAccount[];
    creating?: (CreateState & { x: number, y: number }) | null;
    isLoading?: boolean;
    view: ViewMode;
    onDayClick: (d: Date) => void;
}) {
    const { t, locale } = useLanguage();
    const scrollRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const today = new Date();
    const nowH = today.getHours() + today.getMinutes() / 60;
    const showNow = days.some(d => sameDay(d, today));
    const [drag, setDrag] = useState<DragState | null>(null);
    const isDragging = useRef(false);
    const [reschedule, setReschedule] = useState<RescheduleState | null>(null);
    const isRescheduling = useRef(false);

    useEffect(() => {
        if (scrollRef.current && gridRef.current) {
            scrollRef.current.scrollTop = gridRef.current.offsetTop + 8 * CELL_H - 32;
        }
    }, []);

    // ── Drag helpers ──
    const yToHour = (clientY: number) => {
        const rect = gridRef.current?.getBoundingClientRect();
        if (!rect) return 0;
        const y = clientY - rect.top;
        return Math.max(0, Math.min(23.75, snapH(y / CELL_H)));
    };

    const handleColMouseDown = (e: React.MouseEvent, dayIdx: number) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const h = yToHour(e.clientY);
        isDragging.current = true;
        setDrag({ dayIdx, startH: h, endH: Math.min(24, h + 0.5) });
    };

    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (isDragging.current && drag) {
                const h = yToHour(e.clientY);
                setDrag(prev => prev ? { ...prev, endH: Math.max(prev.startH + 0.25, h) } : null);
            } else if (isRescheduling.current && reschedule) {
                const h = yToHour(e.clientY);
                setReschedule(prev => prev ? { ...prev, startH: Math.max(0, Math.min(24 - prev.origDuration, snapH(h))) } : null);
            }
        };
        const up = (e: MouseEvent) => {
            if (isDragging.current && drag) {
                isDragging.current = false;
                onCreateRequest({ day: days[drag.dayIdx], startH: drag.startH, endH: drag.endH, x: e.clientX, y: e.clientY });
                setDrag(null);
            } else if (isRescheduling.current && reschedule) {
                isRescheduling.current = false;
                if (onReschedule) {
                    const newStart = new Date(reschedule.ev.start);
                    newStart.setHours(Math.floor(reschedule.startH), Math.round((reschedule.startH % 1) * 60), 0, 0);
                    const newEnd = new Date(newStart.getTime() + reschedule.origDuration * 3_600_000);
                    onReschedule(reschedule.ev, newStart, newEnd);
                }
                setReschedule(null);
            }
        };
        const keyUp = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                isDragging.current = false; setDrag(null);
                isRescheduling.current = false; setReschedule(null);
            }
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
        window.addEventListener("keydown", keyUp);
        return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); window.removeEventListener("keydown", keyUp); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drag, reschedule, days]);

    const timedEvs = (d: Date) => events.filter(ev => !ev.allDay && sameDay(ev.start, d));
    const allDayEvs = (d: Date) => events.filter(ev => ev.allDay && sameDay(ev.start, d));
    const hasAllDay = days.some(d => allDayEvs(d).length > 0);

    return (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
            {isLoading && (
                <div className="absolute inset-0 z-50 pointer-events-none">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="absolute left-[72px] right-4 h-10 bg-muted/60 rounded-lg animate-pulse"
                            style={{ top: `${(i * 18 + 8) * (100 / 100)}%` }} />
                    ))}
                </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-scroll min-h-0 relative">
                {/* Sticky day headers — placed inside scroll container so column widths exactly match the grid below */}
                <div className="sticky top-0 z-30 bg-background">
                    <div className="flex border-b border-border">
                        <div className="shrink-0 border-r border-border" style={{ width: GUTTER }} />
                        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                            {days.map((d, i) => {
                                const isT = sameDay(d, today);
                                return (
                                    <button key={i} onClick={() => onDayClick(d)}
                                        className={`flex flex-col items-center justify-center py-2.5 border-r border-border last:border-r-0 transition-colors hover:bg-muted/30 ${isT ? "bg-primary/5" : ""}`}>
                                        <span className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                                            {view === "week" ? DAY_SHORT[i] : d.toLocaleDateString(locale, { weekday: "short" })}
                                        </span>
                                        <span className={`text-xl font-bold leading-none ${isT ? "text-primary" : ""}`}>{d.getDate()}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {hasAllDay && (
                        <div className="flex border-b border-border bg-background">
                            <div className="shrink-0 border-r border-border flex items-center justify-center" style={{ width: GUTTER }}>
                                <span className="text-[9px] font-bold text-muted-foreground">{t("calendar.allDay")}</span>
                            </div>
                            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                                {days.map((d, i) => (
                                    <div key={i} className="border-r border-border last:border-r-0 p-1 min-h-[28px]">
                                        {allDayEvs(d).map(ev => (
                                            <div key={ev.id} onClick={(e) => onSelect(selected?.id === ev.id ? null : ev, e)}
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded mb-0.5 cursor-pointer truncate"
                                                style={{ backgroundColor: ev.color + "66", color: readableTextColor(ev.color + "ff") }}>
                                                {ev.title}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex" style={{ height: 24 * CELL_H }}>
                    {/* Time labels — anchor 00:00 to top edge and 24:00 to bottom edge so they aren't clipped */}
                    <div className="relative shrink-0 border-r border-border" style={{ width: GUTTER }}>
                        {TIME_LABELS.map((h, i) => (
                            <div key={h}
                                className="absolute right-2 text-[10px] font-semibold text-muted-foreground leading-none pointer-events-none"
                                style={{
                                    top: i * CELL_H,
                                    transform: i === 0 ? undefined : i === 24 ? "translateY(-100%)" : "translateY(-50%)",
                                }}>
                                {h}
                            </div>
                        ))}
                    </div>

                    {/* Event grid */}
                    <div ref={gridRef} className="flex-1 relative" style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                        {/* Hour lines */}
                        {HOURS.map((_, i) => (
                            <div key={i} className="absolute left-0 right-0 border-t border-border/40 pointer-events-none" style={{ top: i * CELL_H }} />
                        ))}
                        {HOURS.map((_, i) => (
                            <div key={`h${i}`} className="absolute left-0 right-0 border-t border-border/20 pointer-events-none" style={{ top: i * CELL_H + CELL_H / 2 }} />
                        ))}

                        {/* Now indicator */}
                        {showNow && (
                            <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: nowH * CELL_H }}>
                                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 -ml-1" />
                                <div className="flex-1 border-t-2 border-rose-500 opacity-80" />
                            </div>
                        )}

                        {/* Day columns */}
                        {days.map((day, ci) => {
                            const laid = layoutDayEvents(timedEvs(day));
                            return (
                                <div key={ci} className="border-r border-border/40 last:border-r-0 relative cursor-crosshair"
                                    onMouseDown={(e) => handleColMouseDown(e, ci)}>

                                    {/* Drag ghost */}
                                    {drag && drag.dayIdx === ci && (
                                        <div className="absolute z-30 rounded-lg border-2 border-primary border-dashed bg-primary/10 pointer-events-none select-none"
                                            style={{ top: drag.startH * CELL_H, height: Math.max((drag.endH - drag.startH) * CELL_H, 16), left: 3, right: 3 }}>
                                            <p className="text-[10px] font-bold text-primary px-1.5 pt-1">
                                                {fmtH(drag.startH)} – {fmtH(drag.endH)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Creation ghost (when popover is open) */}
                                    {!drag && creating && sameDay(creating.day, day) && (
                                        <div className="absolute z-20 rounded-lg border-2 border-primary/50 border-dashed bg-primary/10 pointer-events-none select-none"
                                            style={{ top: creating.startH * CELL_H, height: Math.max((creating.endH - creating.startH) * CELL_H, 16), left: 3, right: 3 }}>
                                            <p className="text-[10px] font-bold text-primary px-1.5 pt-1">
                                                {fmtH(creating.startH)} – {fmtH(creating.endH)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Reschedule ghost */}
                                    {reschedule && reschedule.dayIdx === ci && (
                                        <div className="absolute z-40 rounded-r-md border-2 border-primary border-dashed bg-primary/20 pointer-events-none select-none"
                                            style={{ top: reschedule.startH * CELL_H, height: Math.max(reschedule.origDuration * CELL_H, 22), left: 3, right: 3 }}>
                                            <p className="text-[10px] font-bold text-primary px-1.5 pt-1">
                                                {fmtH(reschedule.startH)} – {fmtH(Math.min(24, reschedule.startH + reschedule.origDuration))}
                                            </p>
                                        </div>
                                    )}

                                    {/* Events with overlap layout */}
                                    {laid.map(ev => {
                                        const startH = ev.start.getHours() + ev.start.getMinutes() / 60;
                                        const endH = ev.end.getHours() + ev.end.getMinutes() / 60;
                                        const top = startH * CELL_H;
                                        const height = Math.max((endH - startH) * CELL_H, 22);
                                        const w = 100 / ev.lanes;
                                        const left = ev.lane * w;
                                        const isSel = selected?.id === ev.id;
                                        const isBeingRescheduled = reschedule?.ev.id === ev.id;
                                        return (
                                            <div key={ev.id}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    if (e.button !== 0 || !onReschedule) return;
                                                    const origDuration = (ev.end.getTime() - ev.start.getTime()) / 3_600_000;
                                                    const h = ev.start.getHours() + ev.start.getMinutes() / 60;
                                                    isRescheduling.current = true;
                                                    setReschedule({ ev, dayIdx: ci, startH: h, origDuration });
                                                }}
                                                onClick={(e) => { e.stopPropagation(); if (!isRescheduling.current) onSelect(isSel ? null : ev, e); }}
                                                style={{
                                                    top, height,
                                                    left: `calc(${left}% + 3px)`,
                                                    width: `calc(${w}% - 6px)`,
                                                    position: "absolute",
                                                    backgroundColor: ev.color + (isBeingRescheduled ? "33" : "66"),
                                                    borderLeft: `3px solid ${ev.color}`,
                                                    opacity: isBeingRescheduled ? 0.4 : 1,
                                                }}
                                                className={`rounded-r-md px-1.5 py-1 cursor-grab active:cursor-grabbing transition-all hover:brightness-95 z-10 select-none ${isSel ? "ring-2 ring-primary/50 z-20 shadow-lg" : ""}`}>
                                                <p className="text-[11px] font-bold leading-tight line-clamp-2" style={{ color: readableTextColor(ev.color + "ff") }}>{ev.title}</p>
                                                {height > 30 && (
                                                    <p className="text-[9px] mt-0.5 font-medium opacity-80" style={{ color: readableTextColor(ev.color + "ff") }}>
                                                        {ev.start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                                        {" – "}
                                                        {ev.end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ anchor, events, selected, onSelect, onDay }: {
    anchor: Date; events: CalendarEvent[];
    selected: CalendarEvent | null;
    onSelect: (ev: CalendarEvent | null, e?: React.MouseEvent) => void;
    onDay: (d: Date) => void;
}) {
    const today = new Date();
    const y = anchor.getFullYear(), m = anchor.getMonth();
    const lead = new Date(y, m, 1).getDay() === 0 ? 6 : new Date(y, m, 1).getDay() - 1;
    const daysInM = new Date(y, m + 1, 0).getDate();
    const evs = (d: Date) => events.filter(ev => sameDay(ev.start, d));
    return (
        <div className="flex-1 flex flex-col overflow-y-auto p-3">
            <div className="grid grid-cols-7 mb-1">
                {DAY_SHORT.map(d => <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>)}
            </div>
            <div className="flex-1 grid grid-cols-7 gap-1" style={{ gridAutoRows: "minmax(80px, 1fr)" }}>
                {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInM }, (_, i) => i + 1).map(d => {
                    const date = new Date(y, m, d);
                    const isT = sameDay(date, today);
                    const dayEvs = evs(date);
                    return (
                        <div key={d} onClick={() => onDay(date)}
                            className={`rounded-xl p-1.5 border cursor-pointer transition-all hover:shadow-sm ${isT ? "border-primary/40 bg-primary/5" : "border-border/50 hover:bg-muted/30"}`}>
                            <div className={`text-xs font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isT ? "bg-primary text-primary-foreground" : "text-foreground"}`}>{d}</div>
                            {dayEvs.slice(0, 3).map(ev => (
                                <div key={ev.id}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={e => { e.stopPropagation(); onSelect(selected?.id === ev.id ? null : ev, e); }}
                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 mb-0.5"
                                    style={{ backgroundColor: ev.color + "66", color: readableTextColor(ev.color + "ff") }}>
                                    {ev.title}
                                </div>
                            ))}
                            {dayEvs.length > 3 && <div className="text-[9px] text-muted-foreground font-semibold pl-1">+{dayEvs.length - 3} mehr</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Agenda View ──────────────────────────────────────────────────────────────
function AgendaView({ events, selected, onSelect, onCreateRequest }: {
    events: CalendarEvent[];
    selected: CalendarEvent | null;
    onSelect: (ev: CalendarEvent | null, e?: React.MouseEvent) => void;
    onCreateRequest: () => void;
}) {
    const { t, locale } = useLanguage();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d;
    });
    const grouped = days.map(d => ({
        date: d,
        evs: events.filter(ev => sameDay(ev.start, d)).sort((a, b) => a.start.getTime() - b.start.getTime()),
    })).filter(g => g.evs.length > 0);

    if (grouped.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
                <CalendarIcon className="w-12 h-12 opacity-15" />
                <p className="text-sm">{t("calendar.noUpcoming")}</p>
                <button onClick={onCreateRequest}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" />
                    {t("calendar.createEvent")}
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {grouped.map(({ date, evs }) => (
                <div key={date.toISOString()}>
                    <div className="sticky top-0 bg-background/90 backdrop-blur-sm py-1.5 mb-2 border-b border-border z-10">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            {date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        {evs.map(ev => {
                            const isSel = selected?.id === ev.id;
                            return (
                                <div key={ev.id}
                                    onClick={(e) => onSelect(isSel ? null : ev, e)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:shadow-sm ${isSel ? "ring-2 ring-primary/40 shadow-md" : ""}`}
                                    style={{ backgroundColor: ev.color + "18", borderLeft: `3px solid ${ev.color}` }}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                                        {!ev.allDay && (
                                            <p className="text-xs text-muted-foreground">
                                                {ev.start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                                                {" – "}
                                                {ev.end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        )}
                                        {ev.location && <p className="text-xs text-muted-foreground truncate">{ev.location}</p>}
                                    </div>
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
    return (
        <AuthGuard>
            <CalendarContent />
        </AuthGuard>
    );
}

function CalendarContent() {
    const { user } = useAuth();
    const { t, locale } = useLanguage();
    const { showToast } = useToast();
    const pathname = usePathname();
    const [uid, setUid] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
    const [authErrorEmails, setAuthErrorEmails] = useState<string[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selected, setSelected] = useState<CalendarEvent | null>(null);
    const [popupPos, setPopupPos] = useState<{ x: number, y: number } | null>(null);
    const [anchor, setAnchor] = useState(() => new Date());
    const [view, setView] = useState<ViewMode>("week");
    const [creating, setCreating] = useState<(CreateState & { x: number, y: number }) | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const loadedRanges = useRef(new Set<string>());
    const today = new Date();

    const filteredEvents = searchQuery.trim()
        ? events.filter(ev => {
            const q = searchQuery.toLowerCase();
            return ev.title.toLowerCase().includes(q) ||
                ev.location?.toLowerCase().includes(q) ||
                ev.description?.toLowerCase().includes(q);
        })
        : events;

    useEffect(() => {
        if (!user) { setIsLoading(false); return; }
        setUid(user.uid);
        getCalendarAccounts(user.uid).then(accs => setAccounts(accs)).catch(console.error);
    }, [user]);

    const loadRange = useCallback(async (uid: string, accs: CalendarAccount[], from: Date, to: Date) => {
        const key = rangeKey(from, to);
        if (loadedRanges.current.has(key)) return;
        loadedRanges.current.add(key);
        const visible = accs.filter(a => a.visible !== false);
        if (!visible.length) return;
        try {
            const all = await Promise.all(visible.map(acc => fetchCalendarEvents(uid, acc.email, from, to)));
            setEvents(prev => { const map = new Map(prev.map(e => [e.id, e])); all.flat().forEach(e => map.set(e.id, e)); return Array.from(map.values()); });
            // Check for auth errors after loading (token refresh may have failed)
            setAuthErrorEmails(getCalendarAuthErrors(visible.map(a => a.email)));
        } catch { loadedRanges.current.delete(key); }
    }, []);

    useEffect(() => {
        if (!uid || !accounts.length) { setIsLoading(false); return; }
        setIsLoading(true);
        const p = [];
        for (let o = -PRELOAD; o <= PRELOAD; o++)
            p.push(loadRange(uid, accounts, mStart(today.getFullYear(), today.getMonth() + o), mEnd(today.getFullYear(), today.getMonth() + o)));
        Promise.all(p).finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid, accounts, loadRange]);

    useEffect(() => {
        if (!uid || !accounts.length) return;
        const y = anchor.getFullYear(), m = anchor.getMonth();
        [-1, 0, 1].forEach(o => {
            const key = rangeKey(mStart(y, m + o), mEnd(y, m + o));
            if (!loadedRanges.current.has(key)) loadRange(uid, accounts, mStart(y, m + o), mEnd(y, m + o));
        });

        // Background auto-refresh on window focus
        const onFocus = () => {
            if (!uid || !accounts.length) return;
            const cy = anchor.getFullYear(), cm = anchor.getMonth();
            loadedRanges.current.clear();
            [-1, 0, 1].forEach(o => {
                loadRange(uid, accounts, mStart(cy, cm + o), mEnd(cy, cm + o));
            });
        };
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [anchor, uid, accounts, loadRange]);

    const toggleVis = async (email: string, vis: boolean) => {
        if (!uid) return;
        setAccounts(prev => prev.map(a => a.email === email ? { ...a, visible: !vis } : a));
        loadedRanges.current.clear(); setEvents([]);
        await setCalendarAccountVisibility(uid, email, !vis);
    };

    const handleReschedule = async (ev: CalendarEvent, newStart: Date, newEnd: Date) => {
        if (!uid) return;
        const prevStart = ev.start;
        const prevEnd = ev.end;
        setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, start: newStart, end: newEnd } : e));
        try {
            await updateCalendarEvent(uid, ev.accountEmail, ev.calendarId, ev.id, {
                title: ev.title, start: newStart, end: newEnd, location: ev.location, description: ev.description,
            });
            showToast(t("calendar.reschedule"), "✅");
        } catch {
            setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, start: prevStart, end: prevEnd } : e));
            showToast(t("calendar.rescheduleFailed"), "⚠️");
        }
    };

    const nav = (dir: -1 | 1) => {
        const d = new Date(anchor);
        if (view === "day") d.setDate(d.getDate() + dir);
        else if (view === "week") d.setDate(d.getDate() + dir * 7);
        else if (view === "month") { d.setMonth(d.getMonth() + dir); d.setDate(1); }
        setAnchor(d);
    };

    const handleSaveEvent = async (data: EventEditorData) => {
        if (!uid) return;

        if (data.id && data.calendarId) {
            // Update
            await updateCalendarEvent(uid, data.email, data.calendarId, data.id, {
                title: data.title, start: data.start, end: data.end, location: data.location, description: data.description
            });
        } else {
            // Create
            await createCalendarEvent(uid, data.email, { title: data.title, start: data.start, end: data.end, location: data.location });
        }

        // Reload the month we mutated
        const key = rangeKey(mStart(data.start.getFullYear(), data.start.getMonth()), mEnd(data.start.getFullYear(), data.start.getMonth()));
        loadedRanges.current.delete(key);
        await loadRange(uid, accounts, mStart(data.start.getFullYear(), data.start.getMonth()), mEnd(data.start.getFullYear(), data.start.getMonth()));
        setCreating(null);
        setSelected(null);
    };

    const handleDeleteEvent = async (eventId: string, calendarId: string, email: string) => {
        if (!uid || !selected) return;
        await deleteCalendarEvent(uid, email, calendarId, eventId);

        const key = rangeKey(mStart(selected.start.getFullYear(), selected.start.getMonth()), mEnd(selected.start.getFullYear(), selected.start.getMonth()));
        loadedRanges.current.delete(key);
        await loadRange(uid, accounts, mStart(selected.start.getFullYear(), selected.start.getMonth()), mEnd(selected.start.getFullYear(), selected.start.getMonth()));
        setSelected(null);
    };

    const gridDays = view === "day" ? [anchor] : weekDays(anchor);

    const headerLabel = (() => {
        if (view === "day") return anchor.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        if (view === "week") {
            const wk = weekDays(anchor);
            return `${wk[0].toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${wk[6].toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;
        }
        if (view === "agenda") return t("calendar.agenda");
        return anchor.toLocaleDateString(locale, { month: "long", year: "numeric" });
    })();

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
            {/* Left main navigation sidebar — kept consistent with dashboard nav */}
            <aside className="w-[220px] hidden md:flex flex-col border-r border-sidebar-border bg-sidebar h-full shrink-0">
                <div className="flex items-center gap-2 px-4 h-14 shrink-0 border-b border-sidebar-border">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <CalendarIcon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-foreground">Nexaro</span>
                </div>
                <nav className="px-2 py-4 space-y-0.5">
                    <Link href="/dashboard" className={cn("w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors", pathname === "/dashboard" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        Dashboard
                    </Link>
                    <Link href="/calendar" className={cn("w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors", pathname === "/calendar" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <CalendarIcon className="w-4 h-4 shrink-0" />
                        Kalender
                    </Link>
                    <Link href="/dashboard" className="w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground">
                        <FolderOpen className="w-4 h-4 shrink-0" />
                        Files
                    </Link>
                    <Link href="/settings" className={cn("w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors", pathname === "/settings" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <SettingsIcon className="w-4 h-4 shrink-0" />
                        Einstellungen
                    </Link>
                    <Link href="/dashboard" className="w-full flex items-center gap-3 p-2 rounded-md font-medium text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Bot className="w-4 h-4 shrink-0" />
                        AI Chat
                    </Link>
                </nav>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-14 border-b border-border flex items-center justify-between px-5 bg-background shrink-0 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link href="/dashboard" className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50 shrink-0 transition-colors">
                            <ChevronLeft className="w-3.5 h-3.5" /> Dashboard
                        </Link>
                        <h1 className="text-sm font-bold tracking-tight capitalize truncate">{headerLabel}</h1>
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />}
                        <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60 border border-border/40 hidden xl:inline-flex items-center shrink-0">
                            {Intl.DateTimeFormat().resolvedOptions().timeZone}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Search */}
                        <div className="relative hidden md:block">
                            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={t("calendar.search")}
                                className="pl-8 pr-3 py-1.5 text-xs bg-muted/60 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 w-44 transition-all focus:w-56"
                            />
                        </div>
                        {/* View toggle */}
                        <div className="flex bg-muted rounded-lg p-0.5 gap-px border border-border/50">
                            {(["day", "week", "month", "agenda"] as ViewMode[]).map(v => (
                                <button key={v} onClick={() => setView(v)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${view === v ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                    {v === "day" ? t("calendar.day") : v === "week" ? t("calendar.week") : v === "month" ? t("calendar.month") : t("calendar.agenda")}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => nav(-1)} disabled={view === "agenda"} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/50 disabled:opacity-30 disabled:pointer-events-none"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setAnchor(new Date())} className="px-3 py-1 text-xs font-bold bg-muted/60 hover:bg-muted rounded-lg border border-border/50 transition-colors">{t("calendar.today")}</button>
                            <button onClick={() => nav(1)} disabled={view === "agenda"} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/50 disabled:opacity-30 disabled:pointer-events-none"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                </header>

                {/* No-calendar banner */}
                {!isLoading && accounts.length === 0 && (
                    <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300">
                        <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="w-4 h-4 shrink-0" />
                            <span className="font-semibold">{t("calendar.noCalendarBanner")}</span>
                            <span className="text-amber-700 dark:text-amber-400 hidden sm:inline">{t("calendar.noCalendarBannerDetail")}</span>
                        </div>
                        <Link href="/settings" className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shrink-0 transition-colors">{t("calendar.connectNow")}</Link>
                    </div>
                )}

                {/* Auth-error banner — shown when token refresh fails (expired / revoked) */}
                {authErrorEmails.length > 0 && (
                    <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-2.5 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300">
                        <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="w-4 h-4 shrink-0" />
                            <span className="font-semibold">{t("calendar.authExpired")}</span>
                            <span className="text-red-700 dark:text-red-400 hidden sm:inline">
                                — {authErrorEmails.join(", ")} {t("calendar.authExpiredDetail")}
                            </span>
                        </div>
                        <a href="/api/calendar/auth" className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shrink-0 transition-colors">{t("calendar.reconnect")}</a>
                    </div>
                )}

                {/* Calendar body */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {view === "agenda" ? (
                        <AgendaView events={filteredEvents} selected={selected}
                            onSelect={(ev, e) => { setSelected(ev); setCreating(null); if (e) setPopupPos({ x: e.clientX, y: e.clientY }); }}
                            onCreateRequest={() => setCreating({ day: new Date(), startH: 9, endH: 10, x: window.innerWidth / 2, y: window.innerHeight / 2 })} />
                    ) : view !== "month" ? (
                        <TimeGrid days={gridDays} events={filteredEvents} selected={selected}
                            onSelect={(ev, e) => { setSelected(ev); setCreating(null); if (e) setPopupPos({ x: e.clientX, y: e.clientY }); }}
                            onCreateRequest={(req) => { setCreating(req); setSelected(null); }}
                            onReschedule={handleReschedule}
                            uid={uid} accounts={accounts} creating={creating} isLoading={isLoading}
                            view={view} onDayClick={(d) => { setAnchor(d); setView("day"); }} />
                    ) : (
                        <MonthView anchor={anchor} events={filteredEvents} selected={selected}
                            onSelect={(ev, e) => { setSelected(ev); setCreating(null); if (e) setPopupPos({ x: e.clientX, y: e.clientY }); }} onDay={(d) => { setAnchor(d); setView("day"); }} />
                    )}
                </div>

                {/* New/Edit event panel */}
                {(creating || (selected && popupPos)) && (
                    <EventEditorPopover
                        key={creating ? "create" : `edit-${selected!.id}`}
                        day={creating ? creating.day : selected!.start}
                        startH={creating ? creating.startH : 0}
                        endH={creating ? creating.endH : 0}
                        accounts={accounts}
                        onSave={handleSaveEvent}
                        onDelete={handleDeleteEvent}
                        onClose={() => { setCreating(null); setSelected(null); setPopupPos(null); }}
                        editEvent={selected}
                        position={creating ? { x: creating.x, y: creating.y } : popupPos!}
                    />
                )}
            </main>

            {/* Right calendar widgets sidebar — month picker + calendar accounts */}
            <aside className="w-[260px] hidden lg:flex flex-col border-l border-sidebar-border bg-sidebar h-full shrink-0 overflow-y-auto">
                <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{t("calendar.title")}</p>
                        <p className="text-xs text-muted-foreground truncate">{accounts.length} {t("calendar.myCalendars").toLowerCase()}</p>
                    </div>
                </div>
                <MiniCalendar anchor={anchor} onSelect={(d) => { setAnchor(d); if (view === "month" || view === "agenda") setView("day"); }} />
                <div className="px-4 py-3 border-t border-sidebar-border">
                    <div className="flex items-center justify-between text-sm font-bold mb-3">
                        <span>{t("calendar.myCalendars")}</span>
                        <Link href="/settings" className="text-xs text-muted-foreground hover:text-foreground">{t("calendar.manage")}</Link>
                    </div>
                    {accounts.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-2">
                            <p>{t("calendar.noCalendar")}</p>
                            <Link href="/settings" className="text-primary hover:underline mt-1 inline-block font-semibold">{t("calendar.connectNow")}</Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {accounts.map(acc => {
                                const color = getAccountColor(acc.email);
                                const vis = acc.visible !== false;
                                return (
                                    <label key={acc.email} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleVis(acc.email, vis)}>
                                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                                            style={vis ? { backgroundColor: color, borderColor: color } : { borderColor: color }}>
                                            {vis && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <span className="text-xs truncate max-w-[180px] font-medium">{acc.email}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}
