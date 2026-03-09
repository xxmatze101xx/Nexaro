# audit_log.md — Protocol of Found Issues

## [ERR-001] Slack OAuth Mismatch
- Kategorie: 🟡 Config
- Datei: `.env` : 17
- Problem: `SLACK_REDIRECT_URI` uses `https` while `NEXT_PUBLIC_APP_URL` uses `http`. Local redirect will fail.
- Fix: Change to `http://localhost:3000/api/slack/callback`.
- Priorität: HIGH

## [ERR-002] Inefficient Cache Update
- Kategorie: 🔵 Qualität
- Datei: `src/lib/gmail.ts` : 392, 443
- Problem: `getCachedEmails()` fetches all stored emails from IndexedDB just to update a single record.
- Fix: Use IndexDB `get(messageId)` or direct store access for updates.
- Priorität: MEDIUM

## [ERR-003] Hardcoded Firebase Defaults
- Kategorie: 🔵 Qualität
- Datei: `tools/write_to_firestore.py` : 13
- Problem: Hardcoded `nexaro-app-2026` as default Project ID.
- Fix: Force error if `FIREBASE_PROJECT_ID` is missing instead of defaulting to a specific project.
- Priorität: LOW

## [ERR-004] Generic Documentation
- Kategorie: ⚪ Docs
- Datei: `src/README.md`
- Problem: README is the default Next.js template and provides no project-specific information.
- Fix: Update with project goals, setup instructions, and feature overview.
- Priorität: MEDIUM
