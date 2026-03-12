/**
 * Todo types and Firestore CRUD helpers for Nexaro.
 */
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TodoStatus = "open" | "in_progress" | "done" | "archived";
export type TodoPriority = "low" | "medium" | "high" | "urgent";

export interface Todo {
    id: string;
    title: string;
    description?: string;
    status: TodoStatus;
    priority: TodoPriority;
    deadline?: string; // ISO 8601
    category?: string;
    tags?: string[];

    // Source
    source: "manual" | "ai_extracted";
    sourceMessageId?: string;
    sourceMessageSubject?: string;
    sourceType?: "gmail" | "slack" | "teams" | "outlook";

    // AI metadata
    aiConfidence?: number; // 0–1
    aiSuggested?: boolean; // true = not yet confirmed by user

    // Timestamps
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
    completedAt?: string;

    // Sort
    sortOrder: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function todosCol(uid: string) {
    return collection(db, "users", uid, "todos");
}

function todoDoc(uid: string, todoId: string) {
    return doc(db, "users", uid, "todos", todoId);
}

/** Convert Firestore doc to Todo. */
export function docToTodo(
    docId: string,
    data: Record<string, unknown>,
): Todo {
    const ts = (v: unknown): string => {
        if (!v) return new Date().toISOString();
        if (typeof v === "string") return v;
        if (v && typeof v === "object" && "toDate" in v) {
            return (v as Timestamp).toDate().toISOString();
        }
        return new Date().toISOString();
    };

    return {
        id: docId,
        title: (data.title as string) ?? "",
        description: (data.description as string) ?? undefined,
        status: (data.status as TodoStatus) ?? "open",
        priority: (data.priority as TodoPriority) ?? "medium",
        deadline: (data.deadline as string) ?? undefined,
        category: (data.category as string) ?? undefined,
        tags: (data.tags as string[]) ?? undefined,
        source: (data.source as "manual" | "ai_extracted") ?? "manual",
        sourceMessageId: (data.sourceMessageId as string) ?? undefined,
        sourceMessageSubject: (data.sourceMessageSubject as string) ?? undefined,
        sourceType: (data.sourceType as Todo["sourceType"]) ?? undefined,
        aiConfidence: (data.aiConfidence as number) ?? undefined,
        aiSuggested: (data.aiSuggested as boolean) ?? undefined,
        createdAt: ts(data.createdAt),
        updatedAt: ts(data.updatedAt),
        completedAt: (data.completedAt as string) ?? undefined,
        sortOrder: (data.sortOrder as number) ?? 0,
    };
}

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

export async function addTodo(
    uid: string,
    title: string,
    opts?: Partial<Omit<Todo, "id" | "createdAt" | "updatedAt">>,
): Promise<string> {
    const now = new Date().toISOString();
    const ref = await addDoc(todosCol(uid), {
        title,
        status: opts?.status ?? "open",
        priority: opts?.priority ?? "medium",
        source: opts?.source ?? "manual",
        sortOrder: opts?.sortOrder ?? Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(opts?.description && { description: opts.description }),
        ...(opts?.deadline && { deadline: opts.deadline }),
        ...(opts?.category && { category: opts.category }),
        ...(opts?.tags && { tags: opts.tags }),
        ...(opts?.sourceMessageId && { sourceMessageId: opts.sourceMessageId }),
        ...(opts?.sourceMessageSubject && { sourceMessageSubject: opts.sourceMessageSubject }),
        ...(opts?.sourceType && { sourceType: opts.sourceType }),
        ...(opts?.aiConfidence !== undefined && { aiConfidence: opts.aiConfidence }),
        ...(opts?.aiSuggested !== undefined && { aiSuggested: opts.aiSuggested }),
    });
    return ref.id;
}

export async function updateTodo(
    uid: string,
    todoId: string,
    data: Partial<Omit<Todo, "id" | "createdAt">>,
): Promise<void> {
    await updateDoc(todoDoc(uid, todoId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function toggleTodoStatus(
    uid: string,
    todoId: string,
    currentStatus: TodoStatus,
): Promise<void> {
    const newStatus: TodoStatus = currentStatus === "done" ? "open" : "done";
    const extra: Record<string, unknown> = { status: newStatus, updatedAt: serverTimestamp() };
    if (newStatus === "done") {
        extra.completedAt = new Date().toISOString();
    } else {
        extra.completedAt = null;
    }
    await updateDoc(todoDoc(uid, todoId), extra);
}

export async function deleteTodo(uid: string, todoId: string): Promise<void> {
    await deleteDoc(todoDoc(uid, todoId));
}

export async function archiveTodo(uid: string, todoId: string): Promise<void> {
    await updateDoc(todoDoc(uid, todoId), {
        status: "archived",
        updatedAt: serverTimestamp(),
    });
}
