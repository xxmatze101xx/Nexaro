# Findings

## Discovery Answers
1. **North Star:** An overarching application combining business software (Slack, Gmail, Google Calendar, Outlook, Teams, etc.) into one unified interface. It features an integrated AI that learns from replies, drafts emails, and ranks messages by importance to simplify the lives of CEOs/executives.
2. **Integrations:** Slack, Gmail, Google Calendar, Outlook, Proton Mail, Teams, Apple Calendar, and potentially other business apps. (API keys need to be set up).
3. **Source of Truth:** Firebase Database.
4. **Delivery Payload:** Results/code should be committed to a GitHub repository for version control.
5. **Behavioral Rules:** Always use available agent skills.

## Research
- **Unified Inboxes:** There is no single open-source unified inbox that natively handles Slack, Teams, Email, and Calendars out-of-the-box (like InboxZero or Thunderbird do for just email/calendars). 
- **Conclusion:** We will need to build custom integration layers (API pollers/webhooks) for each service to aggregate the data into our standard Nexaro Payload format in Firebase.
