import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { scrubText, restoreText } from "@/lib/pii-scrubber";

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
    role: "user" | "assistant" | "system" | "tool";
    content: string | null;
    tool_call_id?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tool_calls?: any[];
}

interface ChatRequestBody {
    messages: { role: "user" | "assistant" | "system"; content: string }[];
    /** Optional live data context injected by the client from enabled integrations */
    context?: string;
    /** Google Calendar access token — enables AI to create/list events */
    calendarToken?: string;
    /** Google Calendar account email */
    calendarEmail?: string;
    /** IANA timezone string, e.g. "Europe/Vienna" */
    timezone?: string;
}

// ── Tool definitions ───────────────────────────────────────────────────────

const CALENDAR_TOOLS = [
    {
        type: "function",
        function: {
            name: "create_calendar_event",
            description:
                "Creates a new event in the user's Google Calendar. " +
                "Use this when the user asks to add, create, or schedule an event, appointment, or meeting. " +
                "Always confirm the exact date/time from context (today's date is in the system prompt).",
            parameters: {
                type: "object",
                properties: {
                    title: {
                        type: "string",
                        description: "Event title/summary",
                    },
                    start_datetime: {
                        type: "string",
                        description:
                            "Start time as a full ISO 8601 datetime string, e.g. 2024-03-18T16:00:00. " +
                            "Use the user's stated date or today's date from the system prompt.",
                    },
                    end_datetime: {
                        type: "string",
                        description:
                            "End time as a full ISO 8601 datetime string, e.g. 2024-03-18T17:00:00.",
                    },
                    description: {
                        type: "string",
                        description: "Optional event description",
                    },
                    location: {
                        type: "string",
                        description: "Optional event location",
                    },
                },
                required: ["title", "start_datetime", "end_datetime"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_calendar_events",
            description:
                "Lists events in the user's Google Calendar for a given time range. " +
                "Use this to answer questions about the user's schedule or to check for conflicts.",
            parameters: {
                type: "object",
                properties: {
                    time_min: {
                        type: "string",
                        description: "Start of time range in ISO 8601 format",
                    },
                    time_max: {
                        type: "string",
                        description: "End of time range in ISO 8601 format",
                    },
                },
                required: ["time_min", "time_max"],
            },
        },
    },
] as const;

// ── Tool execution ─────────────────────────────────────────────────────────

async function executeToolCall(
    name: string,
    argsJson: string,
    calendarToken: string,
    timezone: string,
): Promise<Record<string, unknown>> {
    let args: Record<string, string>;
    try {
        args = JSON.parse(argsJson) as Record<string, string>;
    } catch {
        return { error: "Invalid tool arguments JSON" };
    }

    switch (name) {
        case "create_calendar_event": {
            const res = await fetch(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${calendarToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        summary: args.title,
                        description: args.description ?? undefined,
                        location: args.location ?? undefined,
                        start: { dateTime: args.start_datetime, timeZone: timezone },
                        end: { dateTime: args.end_datetime, timeZone: timezone },
                    }),
                },
            );
            if (!res.ok) {
                const err = await res.text().catch(() => "");
                logger.error("ai/chat/tool", "create_calendar_event failed", {
                    status: res.status,
                    body: err.slice(0, 200),
                });
                return {
                    success: false,
                    error: `Google Calendar API error ${res.status}`,
                };
            }
            const event = (await res.json()) as {
                id?: string;
                summary?: string;
                start?: { dateTime?: string };
            };
            return {
                success: true,
                eventId: event.id,
                title: event.summary,
                start: event.start?.dateTime,
            };
        }

        case "list_calendar_events": {
            const params = new URLSearchParams({
                timeMin: args.time_min,
                timeMax: args.time_max,
                singleEvents: "true",
                orderBy: "startTime",
                maxResults: "20",
            });
            const res = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
                { headers: { Authorization: `Bearer ${calendarToken}` } },
            );
            if (!res.ok) {
                return { success: false, error: "Failed to list calendar events" };
            }
            const data = (await res.json()) as {
                items?: Array<{
                    summary?: string;
                    start?: { dateTime?: string; date?: string };
                    end?: { dateTime?: string; date?: string };
                    location?: string;
                }>;
            };
            const events = (data.items ?? []).map((ev) => ({
                title: ev.summary ?? "(Kein Titel)",
                start: ev.start?.dateTime ?? ev.start?.date,
                end: ev.end?.dateTime ?? ev.end?.date,
                location: ev.location,
            }));
            return { success: true, events };
        }

        default:
            return { error: `Unknown tool: ${name}` };
    }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "OPENAI_API_KEY is not configured." },
            { status: 500 },
        );
    }

    let body: ChatRequestBody;
    try {
        body = (await request.json()) as ChatRequestBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return NextResponse.json({ error: "messages array is required." }, { status: 400 });
    }

    const calendarToken = body.calendarToken?.trim() || undefined;
    const timezone = body.timezone?.trim() || "Europe/Vienna";

    // --- PII scrubbing (privacy boundary) ---
    // body.context contains live email/calendar data from integrations — scrub before sending to OpenAI.
    // mapping is scoped here and NEVER logged, stored, or returned.
    let contextForLLM = body.context?.trim() ?? "";
    let mapping = {};
    try {
        if (contextForLLM) {
            const r = scrubText(contextForLLM);
            contextForLLM = r.anonymized;
            mapping = r.mapping;
        }
    } catch (scrubErr) {
        console.warn("ai/chat: pii-scrubber failed, using original context", scrubErr);
        contextForLLM = body.context?.trim() ?? "";
        mapping = {};
    }
    // -----------------------------------------

    const contextSection = contextForLLM
        ? `\n\n---\n## Live Data from User's Integrations\nThe following real data was fetched from the user's connected accounts. Use it to give accurate, personalized answers.\n\n${contextForLLM}\n---`
        : "";

    const systemMessage: ChatMessage = {
        role: "system",
        content:
            `You are Nexaro AI, a personal executive assistant embedded in the Nexaro unified inbox.\n` +
            `You help CEOs manage their communication, prioritize decisions, draft messages, and think through complex topics.\n` +
            `Be concise, professional, and direct. Format responses with markdown when helpful (bullet points, bold text).\n` +
            `Today's date and time: ${new Date().toLocaleString("de-AT", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} (Timezone: ${timezone}).\n` +
            (calendarToken
                ? `You have direct access to the user's Google Calendar. When asked to create, modify, or query events, use the available tools — do NOT tell the user you cannot access the calendar.\n`
                : "") +
            contextSection,
    };

    // Build the OpenAI message history
    const llmMessages: ChatMessage[] = [
        systemMessage,
        ...body.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // Tools are only provided when we have a calendar token
    const tools = calendarToken ? CALENDAR_TOOLS : [];

    // ── Agentic tool-call loop (max 5 iterations) ──────────────────────────
    const MAX_ITERATIONS = 5;
    let rawReply = "";

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const openAIBody: Record<string, unknown> = {
            model: "gpt-4o-mini",
            messages: llmMessages,
            max_tokens: 1000,
            temperature: 0.7,
        };
        if (tools.length > 0) {
            openAIBody.tools = tools;
            openAIBody.tool_choice = "auto";
        }

        let res: Response;
        try {
            res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(openAIBody),
            });
        } catch (fetchErr) {
            logger.error("ai/chat", "Fetch to OpenAI failed", {
                error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
            });
            return NextResponse.json(
                { error: "AI generation failed. Please try again." },
                { status: 502 },
            );
        }

        if (!res.ok) {
            const errText = await res.text();
            logger.error("ai/chat", "OpenAI API error", {
                status: res.status,
                body: errText.slice(0, 300),
            });
            return NextResponse.json(
                { error: "AI generation failed. Please try again." },
                { status: 502 },
            );
        }

        const data = (await res.json()) as {
            choices?: Array<{
                finish_reason: string;
                message: {
                    role: string;
                    content: string | null;
                    tool_calls?: Array<{
                        id: string;
                        type: string;
                        function: { name: string; arguments: string };
                    }>;
                };
            }>;
        };

        const choice = data.choices?.[0];
        if (!choice) break;

        // ── Tool calls requested by the model ──────────────────────────────
        if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
            // Add the assistant's tool-call message to history
            llmMessages.push({
                role: "assistant",
                content: choice.message.content,
                tool_calls: choice.message.tool_calls,
            });

            // Execute each tool and append results
            for (const toolCall of choice.message.tool_calls) {
                const result = calendarToken
                    ? await executeToolCall(
                          toolCall.function.name,
                          toolCall.function.arguments,
                          calendarToken,
                          timezone,
                      )
                    : { error: "No calendar token available" };

                llmMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                });

                logger.info("ai/chat/tool", "Tool executed", {
                    tool: toolCall.function.name,
                    success: !("error" in result),
                });
            }

            // Continue the loop — the model will generate a follow-up response
            continue;
        }

        // ── Final text response ────────────────────────────────────────────
        rawReply = choice.message.content?.trim() ?? "";
        break;
    }

    if (!rawReply) {
        return NextResponse.json(
            { error: "AI returned an empty response." },
            { status: 502 },
        );
    }

    // Restore PII placeholders → real values before returning to the client
    const reply = restoreText(rawReply, mapping);

    logger.info("ai/chat", "Chat reply generated", { turns: body.messages.length });
    // mapping is intentionally excluded from the response
    return NextResponse.json({ reply });
}
