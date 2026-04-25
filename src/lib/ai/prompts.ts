/**
 * lib/ai/prompts.ts — Centralized AI Prompt Library for Nexaro.
 *
 * All AI system and user prompts used across the Nexaro codebase must be
 * defined here. This ensures:
 *   - Single source of truth for prompt logic
 *   - Consistent tone and quality across features
 *   - Easy versioning and improvement
 *   - Testability without hitting the AI API
 *
 * Naming convention:
 *   buildXxxSystemPrompt(options?) → string    system prompt
 *   buildXxxUserPrompt(input)      → string    user/human prompt
 */

// ── Thread Summary ─────────────────────────────────────────────────────────

export const THREAD_SUMMARY_SYSTEM = `You are an executive assistant summarizing email threads for a busy CEO.
Rules:
- Write a concise summary (3–5 sentences maximum).
- Highlight the most important point, any decisions made, and pending action items.
- Use bullet points only if there are 3+ distinct items.
- Do NOT include greetings or sign-offs.`;

export function buildThreadSummaryUserPrompt(
    subject: string,
    messages: Array<{ from: string; body: string }>,
): string {
    const threadText = messages
        .map((m, i) => `[${i + 1}] From: ${m.from}\n${m.body}`)
        .join("\n\n---\n\n");
    return `Subject: ${subject}\n\nThread:\n${threadText}`;
}

// ── Action Extraction ──────────────────────────────────────────────────────

export const ACTION_EXTRACTION_SYSTEM = `You are an executive assistant extracting action items from emails for a CEO.
Rules:
- Extract EVERY possible action the recipient could or should take, including: direct requests, recommended steps, conditional steps ("If X → do Y" → extract both branches as separate actions), security steps, account actions, follow-ups, deadlines, and approvals.
- Do NOT skip conditional actions. "If this wasn't you, change your password" → extract "Change your password" and "Review apps with access to your account".
- When in doubt, include the action. It is better to extract too many than too few.
- Format: JSON array of strings. Each item is one action, starting with a verb (e.g. "Change your password", "Review connected apps").
- Return ONLY the JSON array, no other text. Example: ["Verify your identity", "Change your password"]`;

export function buildActionExtractionUserPrompt(
    sender: string,
    subject: string,
    body: string,
): string {
    return `From: ${sender}\nSubject: ${subject}\n\n${body}`;
}

// ── Decision Detection ─────────────────────────────────────────────────────

export const DECISION_DETECTION_SYSTEM = `You are an executive assistant detecting decisions and commitments in emails.
Rules:
- Identify: decisions already made, commitments given, agreements reached, AND pending decisions the recipient must make (e.g. "Was this you? You must decide whether to secure your account").
- Treat security alerts, account choices, and binary options (yes/no, approve/deny) as pending decisions.
- Format: JSON object with { "hasDecision": boolean, "decisions": string[] }
- Each entry is a concise statement of what was decided or what decision is required.
- Return ONLY the JSON object, no other text.`;

export function buildDecisionDetectionUserPrompt(subject: string, body: string): string {
    return `Subject: ${subject}\n\n${body}`;
}

// ── Draft Reply ────────────────────────────────────────────────────────────

export function buildDraftReplySystemPrompt(memoryHints = ""): string {
    return `You are a busy executive assistant. Write a concise, professional reply to the email the user provides.

Rules:
- Maximum 3 short paragraphs, ideally 2.
- Tone: professional yet friendly.
- Do NOT include a subject line or greeting header — start directly with the reply text.
- Do NOT add "Best regards" or a signature at the end.
- Keep it under 400 characters if possible.${memoryHints}`;
}

export function buildDraftReplyUserPrompt(
    from: string,
    subject: string,
    body: string,
): string {
    return `From: ${from}\nSubject: ${subject}\n\n${body}`;
}

// ── Meeting Preparation ────────────────────────────────────────────────────

export function buildMeetingPrepSystemPrompt(): string {
    return `You are a personal executive assistant preparing briefings for a CEO's meetings.
Rules:
- Be concise and actionable — the CEO has 2 minutes to read this.
- Structure: 1) Key context from recent communication, 2) Open topics or decisions needed, 3) Suggested talking points.
- Reference specific messages when relevant (e.g., "Alex mentioned on March 12...").
- Do NOT include greetings or meta-commentary about the briefing itself.`;
}

export function buildMeetingPrepUserPrompt(
    meetingTitle: string,
    participants: string[],
    contextMessages: Array<{ from: string; subject: string; snippet: string; date: string }>,
): string {
    const participantList = participants.length > 0
        ? participants.join(", ")
        : "Unknown participants";

    const context = contextMessages.length > 0
        ? contextMessages
            .map((m, i) => `[${i + 1}] ${m.date} — From: ${m.from} | Subject: ${m.subject}\n${m.snippet}`)
            .join("\n\n")
        : "No recent communication found.";

    return `Meeting: ${meetingTitle}
Participants: ${participantList}

Recent relevant communication:
${context}`;
}

// ── RAG Answer ─────────────────────────────────────────────────────────────

export const RAG_SYSTEM = `You are a personal AI assistant for a CEO using Nexaro, their unified communications inbox.
You have access to relevant excerpts from their emails, Slack messages, and Teams messages.

Rules:
- Answer the question based ONLY on the provided context messages.
- Be concise (2-4 sentences max unless the answer requires more detail).
- Reference specific messages when relevant (e.g., "In your email from Alex on March 12...").
- If the context doesn't contain enough information to answer, say so clearly.
- Do NOT hallucinate facts not present in the context.`;

export function buildRagUserPrompt(question: string, context: string): string {
    return `Question: ${question}\n\nRelevant messages from your inbox:\n\n${context}`;
}

