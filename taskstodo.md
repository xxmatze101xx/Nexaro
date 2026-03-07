~~In den Einstellungen bei Integrations kann man nicht auf Aktiv, Inaktiv und Custom klicken~~ ✅ Fixed

~~Das Markieren Icon bei den Mails ist falsch und man kann sachen nicht entarchivieren/markieren~~ ✅ Fixed

~~Man kann wenn man in mails auf Reply drückt zwar die mail schreiben aber es kommt ein Fehler und es wird nichts abgeschickt~~ ✅ Fixed

## Remaining Phase 6 Polish (not started)

| Task | Notes |
|------|-------|
| Push Notifications | Firebase Cloud Messaging + service worker required |
| Mobile Responsive | Audit and fix grid layouts for small screens |
| Snooze / Pin | Add `snoozedUntil` Firestore field + cron to re-activate |

## ⚠️ Slack App Config — Action Required

The Slack OAuth redirect URI in `.env.local` is now `http://localhost:3000/api/slack/callback`.
You must add this **exact URL** to the Slack app's OAuth redirect URLs at api.slack.com/apps → OAuth & Permissions → Redirect URLs.
If the redirect URL there currently says `https://localhost:...`, update it to `http://localhost:3000/api/slack/callback`.
