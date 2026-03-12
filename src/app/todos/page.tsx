"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { useTodos, type Todo, type TodoPriority } from "@/hooks/useTodos";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    ListTodo,
    Plus,
    Check,
    Circle,
    Trash2,
    Calendar as CalIcon,
    ArrowLeft,
    Sparkles,
    Loader2,
    AlertCircle,
    ChevronDown,
    Mail,
    MessageSquare,
    ExternalLink,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Priority Helpers                                                   */
/* ------------------------------------------------------------------ */

const PRIORITY_CONFIG: Record<TodoPriority, { label: string; dot: string; ring: string }> = {
    urgent: { label: "Dringend", dot: "bg-destructive", ring: "ring-destructive/30" },
    high: { label: "Hoch", dot: "bg-orange-500", ring: "ring-orange-500/30" },
    medium: { label: "Mittel", dot: "bg-yellow-500", ring: "ring-yellow-500/30" },
    low: { label: "Niedrig", dot: "bg-muted-foreground/50", ring: "ring-muted-foreground/20" },
};

const PRIORITY_ORDER: TodoPriority[] = ["urgent", "high", "medium", "low"];

function PriorityDot({ priority, className }: { priority: TodoPriority; className?: string }) {
    const cfg = PRIORITY_CONFIG[priority];
    return <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", cfg.dot, className)} title={cfg.label} />;
}

/* ------------------------------------------------------------------ */
/*  TodoItem Component                                                 */
/* ------------------------------------------------------------------ */

interface TodoItemProps {
    todo: Todo;
    onToggle: () => void;
    onUpdate: (data: Partial<Omit<Todo, "id" | "createdAt">>) => void;
    onDelete: () => void;
}

function TodoItem({ todo, onToggle, onUpdate, onDelete }: TodoItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(todo.title);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    const isDone = todo.status === "done";

    const handleSaveTitle = () => {
        const trimmed = editTitle.trim();
        if (trimmed && trimmed !== todo.title) {
            onUpdate({ title: trimmed });
        } else {
            setEditTitle(todo.title);
        }
        setIsEditing(false);
    };

    return (
        <div
            className={cn(
                "group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all",
                "hover:bg-muted/40",
                isDone && "opacity-50",
            )}
        >
            {/* Checkbox */}
            <button
                onClick={onToggle}
                className={cn(
                    "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    isDone
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:border-primary/60",
                )}
            >
                {isDone && <Check className="w-3 h-3" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {/* Priority dot */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPriorityMenu((v) => !v)}
                            className="focus:outline-none"
                        >
                            <PriorityDot priority={todo.priority} />
                        </button>
                        {showPriorityMenu && (
                            <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-md shadow-lg py-1 min-w-[120px]">
                                {PRIORITY_ORDER.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => {
                                            onUpdate({ priority: p });
                                            setShowPriorityMenu(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                                            todo.priority === p && "font-semibold text-primary",
                                        )}
                                    >
                                        <PriorityDot priority={p} />
                                        {PRIORITY_CONFIG[p].label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveTitle();
                                if (e.key === "Escape") {
                                    setEditTitle(todo.title);
                                    setIsEditing(false);
                                }
                            }}
                            className="flex-1 bg-transparent text-sm font-medium focus:outline-none text-foreground border-b border-primary/50"
                        />
                    ) : (
                        <span
                            onClick={() => {
                                setEditTitle(todo.title);
                                setIsEditing(true);
                            }}
                            className={cn(
                                "text-sm font-medium text-foreground cursor-text truncate",
                                isDone && "line-through text-muted-foreground",
                            )}
                        >
                            {todo.title}
                        </span>
                    )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {todo.deadline && (
                        <span className={cn(
                            "flex items-center gap-1 text-[11px]",
                            new Date(todo.deadline) < new Date() && todo.status !== "done"
                                ? "text-destructive font-semibold"
                                : "text-muted-foreground",
                        )}>
                            <CalIcon className="w-3 h-3" />
                            {new Date(todo.deadline).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                        </span>
                    )}

                    {todo.source === "ai_extracted" && (
                        <span className="flex items-center gap-1 text-[11px] text-primary/80">
                            <Sparkles className="w-3 h-3" />
                            KI
                        </span>
                    )}

                    {todo.sourceMessageSubject && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {todo.sourceType === "slack" ? (
                                <MessageSquare className="w-3 h-3 shrink-0" />
                            ) : (
                                <Mail className="w-3 h-3 shrink-0" />
                            )}
                            {todo.sourceMessageSubject}
                        </span>
                    )}

                    {todo.category && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {todo.category}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions (visible on hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                    onClick={onDelete}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Löschen"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Quick Add Component                                                */
/* ------------------------------------------------------------------ */

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (!trimmed) return;
        onAdd(trimmed);
        setValue("");
        inputRef.current?.focus();
    };

    return (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20 rounded-lg border border-dashed border-border/60 hover:border-primary/30 transition-colors">
            <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                }}
                placeholder="Neue Aufgabe hinzufügen..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {value.trim() && (
                <button
                    onClick={handleSubmit}
                    className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
                >
                    Enter ↵
                </button>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

type FilterTab = "open" | "done" | "all";

function TodosPageContent() {
    const { user } = useAuth();
    const { todos, loading, openCount, addTodo, updateTodo, toggleStatus, removeTodo } = useTodos(
        user?.uid ?? null,
    );
    const [activeTab, setActiveTab] = useState<FilterTab>("open");

    const filteredTodos = todos.filter((t) => {
        if (activeTab === "open") return t.status === "open" || t.status === "in_progress";
        if (activeTab === "done") return t.status === "done";
        return true; // "all"
    });

    // Sort: urgent/high first, then by sortOrder
    const sortedTodos = [...filteredTodos].sort((a, b) => {
        const pi = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
        if (pi !== 0) return pi;
        return a.sortOrder - b.sortOrder;
    });

    const openTodos = todos.filter((t) => t.status === "open" || t.status === "in_progress");
    const doneTodos = todos.filter((t) => t.status === "done");

    const tabs: { key: FilterTab; label: string; count: number }[] = [
        { key: "open", label: "Offen", count: openTodos.length },
        { key: "done", label: "Erledigt", count: doneTodos.length },
        { key: "all", label: "Alle", count: todos.length },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Top Bar */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/"
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Zurück zum Dashboard"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <ListTodo className="w-4 h-4 text-primary" />
                                </div>
                                <h1 className="text-lg font-bold text-foreground tracking-tight">
                                    Aufgaben
                                </h1>
                                {openCount > 0 && (
                                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        {openCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 mt-3">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                    activeTab === tab.key
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                )}
                            >
                                {tab.label}
                                <span className="ml-1.5 text-[10px] opacity-70">{tab.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                {/* Quick Add */}
                <QuickAdd onAdd={(title) => addTodo(title)} />

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && sortedTodos.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            {activeTab === "done" ? (
                                <Check className="w-8 h-8 text-primary" />
                            ) : (
                                <ListTodo className="w-8 h-8 text-primary" />
                            )}
                        </div>
                        <h3 className="text-base font-semibold text-foreground mb-1">
                            {activeTab === "done"
                                ? "Keine erledigten Aufgaben"
                                : "Keine offenen Aufgaben"}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                            {activeTab === "done"
                                ? "Erledigte Aufgaben erscheinen hier."
                                : "Erstelle deine erste Aufgabe oben oder extrahiere sie aus einer E-Mail."}
                        </p>
                    </div>
                )}

                {/* Todo List */}
                {!loading && sortedTodos.length > 0 && (
                    <div className="mt-4 space-y-0.5">
                        {sortedTodos.map((todo) => (
                            <TodoItem
                                key={todo.id}
                                todo={todo}
                                onToggle={() => toggleStatus(todo.id, todo.status)}
                                onUpdate={(data) => updateTodo(todo.id, data)}
                                onDelete={() => removeTodo(todo.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function TodosPage() {
    return (
        <AuthGuard>
            <TodosPageContent />
        </AuthGuard>
    );
}
