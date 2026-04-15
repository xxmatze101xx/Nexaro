"use client";

import { useState } from "react";
import { Loader2, AlertCircle, RefreshCw, FileText, ListChecks, GitBranch, ChevronDown, Sparkles, Play } from "lucide-react";
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
    description: string;
    icon: React.ReactNode;
    state: ActionState;
    onRun: () => void;
}

function ActionBlock({ label, description, icon, state, onRun }: ActionBlockProps) {
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
        <div className={cn(
            "rounded-lg border overflow-hidden transition-all duration-200",
            done ? "border-violet-500/30 bg-violet-500/5" : "border-border/60 bg-background",
            failed && "border-destructive/30 bg-destructive/5"
        )}>
            {/* Header row */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-8 w-8 rounded-md flex items-center justify-center shrink-0 border",
                        done
                            ? "bg-violet-500/15 border-violet-500/30 text-violet-500"
                            : failed
                                ? "bg-destructive/10 border-destructive/30 text-destructive"
                                : "bg-muted border-border/60 text-muted-foreground"
                    )}>
                        {icon}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground leading-none">{label}</span>
                        <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                </div>

                <div className="shrink-0 ml-3">
                    {(idle || done) && (
                        <button
                            onClick={onRun}
                            className={cn(
                                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all",
                                done
                                    ? "border-violet-500/30 bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400"
                                    : "border-violet-500/40 bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400"
                            )}
                        >
                            {done
                                ? <><RefreshCw className="h-3 w-3" /> Re-run</>
                                : <><Play className="h-3 w-3 fill-current" /> Run</>
                            }
                        </button>
                    )}
                    {running && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border border-border/40">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                            <span>Analyzing…</span>
                        </div>
                    )}
                    {failed && (
                        <button
                            onClick={onRun}
                            className="flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-all"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                        </button>
                    )}
                </div>
            </div>

            {/* Result */}
            {resultText && (
                <div className="px-4 pb-4 pt-1">
                    <div className="rounded-md bg-background/80 border border-violet-500/20 px-3 py-2.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {resultText}
                    </div>
                </div>
            )}

            {/* Error */}
            {failed && errorText && (
                <div className="px-4 pb-3 pt-1 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                    <span className="text-xs text-destructive leading-relaxed">{errorText}</span>
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
    const [isOpen, setIsOpen] = useState(true);

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
        <div className={cn("flex-shrink-0 border-t border-border/50 overflow-hidden", className)}>
            {/* Panel header */}
            <button
                onClick={() => setIsOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-md bg-violet-500/15 flex items-center justify-center border border-violet-500/30 shrink-0">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                        <h3 className="text-sm font-semibold text-foreground leading-none">
                            AI Analysis
                        </h3>
                        <p className="text-xs text-muted-foreground leading-none">
                            Summarize, extract actions, detect decisions
                        </p>
                    </div>
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Expandable content */}
            {isOpen && (
                <div className="flex flex-col gap-2.5 px-4 pb-4 max-h-[55vh] overflow-y-auto">
                    <ActionBlock
                        label="Summarize Thread"
                        description="Get a concise summary of this conversation"
                        icon={<FileText className="h-4 w-4" />}
                        state={summary}
                        onRun={() => void run("thread_summary", setSummary)}
                    />
                    <ActionBlock
                        label="Extract Actions"
                        description="Identify action items and next steps"
                        icon={<ListChecks className="h-4 w-4" />}
                        state={actions}
                        onRun={() => void run("action_extraction", setActions)}
                    />
                    <ActionBlock
                        label="Detect Decisions"
                        description="Surface key decisions and commitments"
                        icon={<GitBranch className="h-4 w-4" />}
                        state={decisions}
                        onRun={() => void run("decision_detection", setDecisions)}
                    />
                </div>
            )}
        </div>
    );
}
