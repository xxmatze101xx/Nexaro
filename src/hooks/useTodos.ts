"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    type Todo,
    type TodoStatus,
    type TodoPriority,
    docToTodo,
    addTodo as addTodoFn,
    updateTodo as updateTodoFn,
    toggleTodoStatus as toggleFn,
    deleteTodo as deleteTodoFn,
    archiveTodo as archiveTodoFn,
} from "@/lib/todos";

export function useTodos(uid: string | null) {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);

    // Realtime listener — excludes archived
    useEffect(() => {
        if (!uid) {
            setTodos([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "users", uid, "todos"),
            where("status", "in", ["open", "in_progress", "done"]),
            orderBy("sortOrder", "asc"),
        );

        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                const items = snap.docs.map((d) =>
                    docToTodo(d.id, d.data() as Record<string, unknown>),
                );
                setTodos(items);
                setLoading(false);
            },
            (err) => {
                console.warn("[useTodos] Listener error:", err.message);
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [uid]);

    const addTodo = useCallback(
        async (title: string, opts?: Partial<Omit<Todo, "id" | "createdAt" | "updatedAt">>) => {
            if (!uid) return;
            await addTodoFn(uid, title, opts);
        },
        [uid],
    );

    const updateTodo = useCallback(
        async (todoId: string, data: Partial<Omit<Todo, "id" | "createdAt">>) => {
            if (!uid) return;
            await updateTodoFn(uid, todoId, data);
        },
        [uid],
    );

    const toggleStatus = useCallback(
        async (todoId: string, currentStatus: TodoStatus) => {
            if (!uid) return;
            await toggleFn(uid, todoId, currentStatus);
        },
        [uid],
    );

    const removeTodo = useCallback(
        async (todoId: string) => {
            if (!uid) return;
            await deleteTodoFn(uid, todoId);
        },
        [uid],
    );

    const archiveTodo = useCallback(
        async (todoId: string) => {
            if (!uid) return;
            await archiveTodoFn(uid, todoId);
        },
        [uid],
    );

    // Derived counts
    const openCount = todos.filter((t) => t.status === "open" || t.status === "in_progress").length;

    return {
        todos,
        loading,
        openCount,
        addTodo,
        updateTodo,
        toggleStatus,
        removeTodo,
        archiveTodo,
    };
}

export type { Todo, TodoStatus, TodoPriority };
