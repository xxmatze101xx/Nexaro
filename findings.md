# findings.md — Raw Data from Analysis & Research

## Phase 2 — A: Competitor Feature Matrix

| Feature | Nexaro | Competitors (Superhuman, Front, Shortwave) | Priorität |
| :--- | :---: | :--- | :--- |
| Unified Inbox | ✅ | ✅ (Texts.com, Beeper) | HIGH |
| AI Drafting | ✅ | ✅ (Superhuman, Shortwave) | HIGH |
| Importance Scoring | 🟡 (Base) | ✅ (SaneBox, Shortwave) | MEDIUM |
| Thread Summerization | ❌ | ✅ (Shortwave, Canary Mail) | HIGH |
| Omnichannel (Slack/Teams) | ✅ | ✅ (Front, Missive) | HIGH |
| Knowledge Base Link | ❌ | ✅ (Notion Mail, Missive) | MEDIUM |

### Gap Analysis
- **🔴 Must-Have**: Thread Summarization. The snippet view is not enough for long conversations.
- **🔴 Must-Have**: Context-aware Importance Scoring (using LLM instead of regex).
- **🟡 Should-Have**: Unified Search across all connected services.

## Phase 3 — S: Self-Ideation

### Ideation Protocol
1. **🧑 User-Linse**: "Action Item" tracking. Automatically extract tasks from emails and show them in a sidebar.
   - **ICE Score**: 8 × 7 × 6 = **336** (5.6)
2. **⚙️ Engineer-Linse**: LLM-based Scoring. Replace regex scoring in `score_importance.py` with a Groq-based analysis.
   - **ICE Score**: 9 × 8 × 7 = **504** (8.4)
3. **📈 Product-Linse**: Proactive follow-up reminders if a "replied" status isn't reached within 24h for High-Prio messages.
   - **ICE Score**: 7 × 6 × 8 = **336** (5.6)
4. **🔮 Visionary-Linse**: Agentic Inbox. AI agents that can actually *execute* actions (e.g., "Schedule this meeting in my calendar") after a user clicks "Approve".
   - **ICE Score**: 10 × 4 × 4 = **160** (2.7) -> *Rejected for now (Score < 5.0)*

### Selected Ideas
- **LLM-based Importance Scoring** (Score 8.4)
- **Action Item Extraction** (Score 5.6)
- **Proactive Follow-up Reminders** (Score 5.6)
