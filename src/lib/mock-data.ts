// Mock data for development — matches gemini.md Output Payload schema

export interface Message {
    id: string;
    source: "slack" | "gmail" | "gcal" | "outlook" | "teams" | "proton" | "apple";
    external_id: string;
    content: string;
    htmlContent?: string | null;
    subject?: string;
    sender: string;
    senderEmail?: string;
    timestamp: string;
    importance_score: number;
    ai_draft_response: string | null;
    accountId?: string;
    labels?: string[];
    status: "unread" | "read" | "replied" | "archived";
    threadId?: string;
    rfcMessageId?: string;
}

export const mockMessages: Message[] = [
    {
        id: "1",
        source: "gmail",
        external_id: "gm-001",
        content: "URGENT: The quarterly board meeting has been moved to tomorrow at 9 AM. Please confirm your attendance and review the attached financial report before the meeting.",
        sender: "sarah.chen@company.com",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        importance_score: 9.2,
        ai_draft_response: "Hi Sarah, thank you for the heads up. I'll review the financial report this evening and confirm my attendance. See you tomorrow at 9 AM.",
        status: "unread",
    },
    {
        id: "2",
        source: "slack",
        external_id: "sl-002",
        content: "Hey team, the new feature deployment is scheduled for today at 5 PM. Please make sure all PRs are merged by 3 PM. This is critical for the release.",
        sender: "Mike Johnson",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        importance_score: 7.5,
        ai_draft_response: "Thanks Mike. I'll ensure my PRs are merged before the deadline. Is there anything specific you need me to review?",
        status: "unread",
    },
    {
        id: "3",
        source: "outlook",
        external_id: "ol-003",
        content: "Please review and sign the updated partnership agreement with Acme Corp. The deadline is this Friday. Legal has already approved the terms.",
        sender: "legal@company.com",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        importance_score: 8.1,
        ai_draft_response: "Thank you for sending this over. I'll review the agreement today and have it signed by Thursday.",
        status: "unread",
    },
    {
        id: "4",
        source: "teams",
        external_id: "tm-004",
        content: "Quick update: The client presentation went well. They loved the new dashboard design. Follow-up meeting next week.",
        sender: "Emma Davis",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        importance_score: 5.3,
        ai_draft_response: "Great to hear, Emma! Let me know when the follow-up is scheduled and I'll block off my calendar.",
        status: "read",
    },
    {
        id: "5",
        source: "gcal",
        external_id: "gc-005",
        content: "Reminder: Weekly standup in 30 minutes. Room: Conference A / Zoom link attached.",
        sender: "Google Calendar",
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        importance_score: 6.0,
        ai_draft_response: null,
        status: "unread",
    },
    {
        id: "6",
        source: "gmail",
        external_id: "gm-006",
        content: "Hi! Just wanted to share this interesting article about AI trends in enterprise software. Thought you might find it relevant for Nexaro.",
        sender: "newsletter@techdigest.com",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        importance_score: 2.1,
        ai_draft_response: null,
        status: "read",
    },
    {
        id: "7",
        source: "slack",
        external_id: "sl-007",
        content: "Team lunch on Friday? I'm thinking sushi. 🍣 Let me know if you're in!",
        sender: "Alex Thompson",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        importance_score: 1.5,
        ai_draft_response: null,
        status: "read",
    },
    {
        id: "8",
        source: "proton",
        external_id: "pm-008",
        content: "Invoice #2847 for consulting services is attached. Payment due within 30 days. Please process at your earliest convenience.",
        sender: "billing@contractor.io",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        importance_score: 6.8,
        ai_draft_response: "Thank you for the invoice. I've forwarded it to our accounts payable team for processing. Payment will be issued within 15 business days.",
        status: "unread",
    },
];
