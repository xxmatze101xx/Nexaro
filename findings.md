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

---

## Phase 4 — Competitor Landing Page Analysis (2026-04-29)

### Analyzed competitors
Make (make.com), Zapier (zapier.com), n8n (n8n.io), ThoughtSpot (thoughtspot.com), Microsoft Power BI

---

### Make (make.com)
- **Hero copy:** "The visual AI automation platform." Aspirational, empowerment-focused. No ROI numbers up-front.
- **Sections (order):** Hero → Logo carousel → 3 value props → Department solutions carousel → App showcase (3k+) → Case studies → AI feature section → Enterprise → Security badges → Review ratings → Newsletter
- **CTAs:** Primary "Get started free"; Secondary "Talk to sales"
- **Color/tone:** Light, minimalist, blue accents, corporate-approachable
- **Audience:** Business ops + IT teams; departmental framing signals non-technical users

### Zapier (zapier.com)
- **Hero copy:** "AI automation, governed." Control-oriented, enterprise-trust-focused. Hard pivot toward governance/IT oversight.
- **Sections (order):** Hero → Trust indicators (450K agents, 9K integrations) → Customer logos → Problem statement → 3-pillar solution → Architecture diagram → Key capabilities → Testimonials + metrics → Stat counter → Templates → Customer stories → Governance breakdown → Security → Final CTA
- **CTAs:** Primary "Start free with email / Google" (dual); Mid "Request AI Transformation Consultation"; "Talk to sales"
- **Color/tone:** High-contrast dark/light split. Architecture diagrams, real business photography, monochromatic icons.
- **Audience:** Enterprise IT leaders, CISOs, RevOps; Fortune 500 messaging

### n8n (n8n.io)
- **Hero copy:** "AI agents and workflows you can see and control." Transparency + technical empowerment. Self-hosting signal.
- **Sections (order):** Hero → Social proof (logos, GitHub stars, G2) → 500+ integrations → AI agent capabilities → Code flexibility → Dev workflow → Case studies → Enterprise → Testimonials → Final CTA
- **CTAs:** Primary "Get started for free"; Secondary "Talk to sales"; Tertiary "Start building"
- **Color/tone:** Dark theme, gradient backgrounds, workflow canvas visuals. Developer-loved feel.
- **Audience:** Developers + technical teams primary; IT/Security Ops secondary

### ThoughtSpot (thoughtspot.com)
- **Hero copy:** "Data to Decisions, Powered by Agents." Enterprise-trust + ROI. Uses "trusted" twice — deliberate buyer reassurance.
- **Sections (order):** Hero → Customer logos → "Traditional BI Can't Keep Up" problem → "New Standard" comparison → 6 capability sections → What's New → Platform architecture → Role-based personas → Analyst ratings → Testimonials → CTA footer
- **CTAs:** Primary "Book a Demo" (repeated throughout); Secondary "Free trial" (nav); "Learn more" per feature
- **Color/tone:** Dark navy/black, blue-purple gradients, abstract waves. Premium enterprise.
- **Audience:** Business leaders, data analysts, developers/product teams; Transparent AI addresses compliance anxiety

### Microsoft Power BI
- **Hero copy:** "Uncover powerful insights and turn them into impact." Aspirational, restrained corporate voice. Brand-trust-reliant.
- **Sections (order):** Overview → Use cases → News → Pricing → Interoperability → Security → Customer stories → Resources → FAQ → CTA
- **CTAs:** "Start free", "Try it for free", "Buy now", "Take a guided tour", "Contact Sales"
- **Color/tone:** Clean white + Microsoft blue accents. Corporate, accessible, light theme throughout.
- **Audience:** Broad — business users, executives, data professionals; Microsoft ecosystem assumed

---

### Common Patterns
1. "Get started free" is the universal primary CTA; "Talk to sales / Book a demo" is the universal secondary.
2. Customer logo carousels appear immediately below or within the hero on all five sites.
3. AI is now table-stakes — every product frames itself as "AI-powered."
4. Problem framing ("traditional X can't keep up") precedes the solution on all five pages.
5. Security/compliance callouts appear on every site, even open-source ones.

### Opportunities for Nexaro
1. **Unified positioning gap** — no competitor credibly combines workflow automation + BI/intelligence. Nexaro can own "automate and understand."
2. **Tone gap** — competitors are either corporate, developer-technical, or enterprise-formal. None strike an ambitious-but-human register for ops leaders who are neither pure business users nor engineers.
3. **Outcome-first language** — most lead with capability ("connect apps"); Nexaro should lead with outcome ("close the gap between your data and your next decision").
4. **Persona-specific CTAs** — ThoughtSpot gestures at this but none execute it well. Nexaro could differentiate with role-aware CTAs.
5. **Traceability angle** — only n8n (workflows) and ThoughtSpot (BI) partially own this. End-to-end traceability from automated action to business result is unclaimed.
