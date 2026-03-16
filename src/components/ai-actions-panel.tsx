"use client";

import { useState } from "react";
import { Loader2, AlertCircle, RefreshCw, FileText, ListChecks, GitBranch, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJob, enqueueAndProcess } from "@/hooks/useJob";
import { auth } from "@/lib/firebase";
import type { Message } from "@/lib/mock-data";

interface ActionState {
    jobId: string | null;
    idToken: string | null;
    error: string | null;
}

const DEFAULT_ACTION: ActionState = { jobId: null, idToken: null, error: null };

interface ActionBlockProps {
    label: string;
    icon: React.ReactNode;
    state: ActionState;
    onRun: () => void;
}

function ActionBlock({ label, icon, state, onRun }: ActionBlockProps) {
    const { job, isLoading } = useJob(state.jobId, state.idToken);

    const running = isLoading || job?.status === "pending" || job?.status === "running";
    const done = job?.status === "completed";
    const failed = job?.status === "failed" || !!state.error;
    const idle = !state.jobId && !state.error;

    const resultText = done && job?.output
        ? (typeof job.output.result === "string"
            ? job.output.result
            : JSON.stringify(job.output, null, 2))
        : null;

    const errorText = state.error ?? (failed ? (job?.error ?? "Processing failed") : null);

    return (
        <div className="rounded-sm border border-border/60 bg-background overflow-hidden">
            {/* Header row */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{icon}</span>
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                </div>
                {(idle || done) && (
                    <button
                        onClick={onRun}
                        className={cn(
                            "flex items-center gap-1 rounded-sm border border-border/80 bg-background px-2 py-1 text-[11px] font-medium transition-all shadow-sm",
                            done
                                ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                : "text-primary hover:bg-primary/5 hover:border-primary/40"
                        )}
                    >
                        {done ? <RefreshCw className="h-2.5 w-2.5" /> : "Run"}
                    </button>
                )}
                {running && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analyzing...
                    </div>
                )}
                {failed && (
                    <button
                        onClick={onRun}
                        className={cn(
                            "flex items-center gap-1.5 rounded-sm border border-destructive/40 bg-background px-2 py-1 text-[11px] font-medium",
                            "text-destructive hover:bg-destructive/5 transition-all shadow-sm"
                        )}
                    >
                        <RefreshCw className="h-2.5 w-2.5" />
                        Retry
                    </button>
                )}
            </div>

            {/* Result */}
            {resultText && (
                <div className="px-3 py-2 text-xs text-foreground leading-relaxed whitespace-pre-wrap border-t border-border/40 bg-muted/10">
                    {resultText}
                </div>
            )}

            {/* Error */}
            {failed && errorText && (
                <div className="px-3 py-2 flex items-start gap-2 border-t border-border/40 bg-destructive/5">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-destructive" />
                    <span className="text-[11px] text-destructive">{errorText}</span>
                </div>
            )}
        </div>
    );
}

interface AIActionsPanelProps {
    message: Message;
    className?: string;
}

export function AIActionsPanel({ message, className }: AIActionsPanelProps) {
    const [summary, setSummary] = useState<ActionState>(DEFAULT_ACTION);
    const [actions, setActions] = useState<ActionState>(DEFAULT_ACTION);
    const [decisions, setDecisions] = useState<ActionState>(DEFAULT_ACTION);
    const [isOpen, setIsOpen] = useState(false);

    async function run(
        type: "thread_summary" | "action_extraction" | "decision_detection",
        setter: React.Dispatch<React.SetStateAction<ActionState>>,
    ) {
        setter(DEFAULT_ACTION);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");
            const idToken = await user.getIdToken();
            const { jobId } = await enqueueAndProcess(
                type,
                {
                    messageId: message.id,
                    subject: message.subject ?? "",
                    sender: message.sender,
                    body: message.content,
                    source: message.source,
                },
                idToken,
            );
            setter({ jobId, idToken, error: null });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setter({ jobId: null, idToken: null, error: msg });
        }
    }

    return (
        <div className={cn("flex-shrink-0 border-t border-border/40 overflow-hidden", className)}>
            {/* Collapsed header — always visible, click to toggle */}
            <button
                onClick={() => setIsOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-sm bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <GitBranch className="h-3 w-3 text-violet-500" />
                    </div>
                    <h3 className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                        AI Analysis
                    </h3>
                </div>
                <ChevronDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Expandable content — own scroll so it can't crush the email body */}
            {isOpen && (
                <div className="flex flex-col gap-2 px-3 pb-3 max-h-[55vh] overflow-y-auto">
                    <ActionBlock
                        label="Summarize Thread"
                        icon={<FileText className="h-3.5 w-3.5" />}
                        state={summary}
                        onRun={() => void run("thread_summary", setSummary)}
                    />
                    <ActionBlock
                        label="Extract Actions"
                        icon={<ListChecks className="h-3.5 w-3.5" />}
                        state={actions}
                        onRun={() => void run("action_extraction", setActions)}
                    />
                    <ActionBlock
                        label="Detect Decisions"
                        icon={<GitBranch className="h-3.5 w-3.5" />}
                        state={decisions}
                        onRun={() => void run("decision_detection", setDecisions)}
                    />
                </div>
            )}
        </div>
    );
}
