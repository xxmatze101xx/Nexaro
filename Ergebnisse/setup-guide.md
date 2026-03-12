# FINAL: Setup-Guide — OAuth-Konfiguration & Deployment-Anleitung

*Nexaro — Vollständige Einrichtungsanleitung | Stand: März 2026*

---

## ⚡ Übersicht: Was wird benötigt?

| Service | Was braucht man? | Kostenpflichtig? |
|---------|-----------------|-----------------|
| Firebase | Projekt-Konfiguration | Kostenlos (Spark Plan ausreichend für Entwicklung) |
| Google Cloud | OAuth-App für Gmail + Calendar | Kostenlos |
| Slack | Slack-App | Kostenlos |
| Microsoft Azure | App-Registrierung für Outlook + Teams | Kostenlos |
| Vercel | Deployment | Kostenlos (Hobby Plan) |
| Groq (KI) | API-Key | Kostenlos (bis Limit, dann $0.0001/1k tokens) |

---

## 1. Firebase Setup

### 1.1 Firebase-Projekt erstellen

1. Gehe zu [console.firebase.google.com](https://console.firebase.google.com)
2. Klicke auf **"Projekt erstellen"**
3. Projektname: `nexaro-prod` (oder beliebig)
4. Google Analytics: Optional → Deaktivieren für Entwicklung
5. Klicke **"Weiter"** → **"Projekt erstellen"**

### 1.2 Firebase Web-App registrieren

1. Im Firebase-Dashboard: Klicke auf das Web-Icon `</>`
2. App-Nickname: `nexaro-web`
3. **"App registrieren"** → Firebase SDK-Config erscheint:

```javascript
// Diese Werte in .env.local eintragen:
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nexaro-xxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nexaro-xxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nexaro-xxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 1.3 Firebase Authentication aktivieren

1. Im Firebase-Dashboard: **Authentication** → **"Jetzt starten"**
2. **Sign-in method** → **Google** aktivieren → **Speichern**
3. **E-Mail/Passwort** aktivieren → **Speichern**
4. Autorisierte Domains hinzufügen: `nexaro-9j3h.vercel.app` (deine Vercel-URL)

### 1.4 Firestore-Datenbank einrichten

1. Im Firebase-Dashboard: **Firestore Database** → **"Datenbank erstellen"**
2. Produktionsmodus wählen → **Region:** `eur3 (europe-west)`
3. Security Rules deployen (aus `firestore.rules` im Projekt-Root):

```bash
firebase deploy --only firestore:rules
```

**Oder manuell in der Console:**
Gehe zu Firestore → Regeln → Inhalt aus `firestore.rules` einfügen → Veröffentlichen

### 1.5 Firebase Storage einrichten

1. Im Firebase-Dashboard: **Storage** → **"Jetzt starten"**
2. Produktionsmodus → Region: `eur3`
3. Storage Rules deployen (aus `storage.rules`):

```bash
firebase deploy --only storage:rules
```

---

## 2. Google OAuth (Gmail + Google Calendar)

### 2.1 Google Cloud Console — Projekt einrichten

1. Gehe zu [console.cloud.google.com](https://console.cloud.google.com)
2. Stelle sicher, dass du **dasselbe Google-Konto** wie für Firebase verwendest
3. Wähle oben das **Firebase-Projekt** aus dem Dropdown (es erscheint automatisch als Google Cloud Projekt)

### 2.2 APIs aktivieren

1. Im Burger-Menü: **APIs & Dienste** → **Bibliothek**
2. Suche und aktiviere:
   - ✅ **Gmail API**
   - ✅ **Google Calendar API**
   - ✅ **Google+ API** (für Userinfo)

### 2.3 OAuth Consent Screen konfigurieren

1. **APIs & Dienste** → **OAuth-Zustimmungsbildschirm**
2. **Nutzertyp:** Extern → **"Erstellen"**
3. Ausfüllen:
   - App-Name: `Nexaro`
   - Support-E-Mail: deine E-Mail
   - App-Logo: optional
   - Autorisierte Domains: `vercel.app`, `nexaro-9j3h.vercel.app`
4. **Weiter** → Scopes hinzufügen:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
5. **Weiter** → Testnutzer: matteo@cacic.at (und alle Tester)
6. **Speichern**

> ⚠️ **WICHTIG:** Solange die App im "Test"-Modus ist, können nur eingetragene Testnutzer OAuth verwenden. Für Production: Verification-Antrag bei Google stellen (dauert 1-4 Wochen).

### 2.4 OAuth-Client erstellen

1. **APIs & Dienste** → **Anmeldedaten** → **"Anmeldedaten erstellen"** → **OAuth-Client-ID**
2. **Anwendungstyp:** Webanwendung
3. **Name:** `Nexaro Web Client`
4. **Autorisierte Weiterleitungs-URIs** hinzufügen:
   ```
   https://nexaro-9j3h.vercel.app/settings
   https://nexaro-9j3h.vercel.app/settings?service=calendar
   http://localhost:3000/settings
   http://localhost:3000/settings?service=calendar
   ```
5. **"Erstellen"** → Client-ID und Client-Secret erscheinen:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
```

---

## 3. Slack-App einrichten

### 3.1 Slack-App erstellen

1. Gehe zu [api.slack.com/apps](https://api.slack.com/apps)
2. **"Create New App"** → **"From scratch"**
3. App-Name: `Nexaro`
4. Workspace: Deinen Workspace auswählen
5. **"Create App"**

### 3.2 OAuth & Permissions konfigurieren

1. Im App-Dashboard: **OAuth & Permissions**
2. **Redirect URLs** hinzufügen:
   ```
   https://nexaro-9j3h.vercel.app/api/slack/callback
   http://localhost:3000/api/slack/callback
   ```
3. **Bot Token Scopes** hinzufügen:
   - `channels:history` — Nachrichten aus öffentlichen Channels lesen
   - `channels:read` — Öffentliche Channels auflisten
   - `chat:write` — Nachrichten senden
   - `groups:history` — Nachrichten aus privaten Channels lesen
   - `groups:read` — Private Channels auflisten
   - `im:history` — DM-Nachrichten lesen
   - `im:read` — DMs auflisten
   - `mpim:history` — Gruppen-DMs lesen
   - `users:read` — User-Profile auflösen (für Display-Namen)

4. **User Token Scopes** hinzufügen:
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `chat:write`
   - `users.profile:read`

5. Oben auf der Seite: **"Install to Workspace"** → Berechtigungen bestätigen
6. **Bot User OAuth Token** kopieren (beginnt mit `xoxb-`):

```env
SLACK_CLIENT_ID=12345678.987654321
SLACK_CLIENT_SECRET=abc123def456...
SLACK_REDIRECT_URI=https://nexaro-9j3h.vercel.app/api/slack/callback
SLACK_BOT_TOKEN=xoxb-...
```

---

## 4. Microsoft Azure (Outlook + Teams)

### 4.1 App-Registrierung erstellen

1. Gehe zu [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** (oder "Microsoft Entra ID")
3. **App-Registrierungen** → **"Neue Registrierung"**
4. Name: `Nexaro`
5. Unterstützte Kontotypen: **"Konten in beliebigen Organisationsverzeichnissen und persönliche Microsoft-Konten"**
6. Redirect URI: Web →
   ```
   https://nexaro-9j3h.vercel.app/api/microsoft/callback
   http://localhost:3000/api/microsoft/callback
   ```
7. **"Registrieren"**

### 4.2 API-Berechtigungen hinzufügen

1. Im App-Dashboard: **API-Berechtigungen** → **"Berechtigung hinzufügen"**
2. **Microsoft Graph** → **Delegierte Berechtigungen:**
   - `Mail.Read`
   - `Mail.Send`
   - `Calendars.Read`
   - `Chat.Read`
   - `User.Read`
   - `offline_access`
3. **"Berechtigungen hinzufügen"** → **"Administratorzustimmung erteilen"** (falls Admin-Account)

### 4.3 Client-Secret erstellen

1. **Zertifikate & Geheimnisse** → **"Neuer geheimer Client-Schlüssel"**
2. Beschreibung: `nexaro-prod`
3. Ablauf: 24 Monate
4. **"Hinzufügen"** → **Wert sofort kopieren** (wird nach Verlassen der Seite nicht mehr angezeigt!)

```env
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_REDIRECT_URI=https://nexaro-9j3h.vercel.app/api/microsoft/callback
```

---

## 5. Groq API-Key (KI-Features)

1. Gehe zu [console.groq.com](https://console.groq.com)
2. **"API Keys"** → **"Create API Key"**
3. Name: `nexaro-prod`

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

---

## 6. Vollständige `.env.local`-Datei

```env
# ─── App URL ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://nexaro-9j3h.vercel.app

# ─── Firebase Client SDK ───────────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nexaro-xxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nexaro-xxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nexaro-xxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# ─── Google OAuth (Gmail + Calendar) ──────────────────────────────────────────
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx

# ─── Slack OAuth ───────────────────────────────────────────────────────────────
SLACK_CLIENT_ID=12345678.987654321
SLACK_CLIENT_SECRET=abc123def456...
SLACK_REDIRECT_URI=https://nexaro-9j3h.vercel.app/api/slack/callback
SLACK_BOT_TOKEN=xoxb-...

# ─── Microsoft OAuth (Outlook + Teams) ────────────────────────────────────────
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_REDIRECT_URI=https://nexaro-9j3h.vercel.app/api/microsoft/callback

# ─── AI (Groq) ─────────────────────────────────────────────────────────────────
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

---

## 7. Vercel Deployment

### 7.1 Vercel-Projekt verbinden

```bash
# In /src (Next.js-App-Verzeichnis)
npx vercel --prod
```

Oder über Vercel Dashboard:
1. [vercel.com/new](https://vercel.com/new) → GitHub-Repo importieren
2. **Framework Preset:** Next.js (wird automatisch erkannt)
3. **Root Directory:** `src` (wichtig! Next.js ist im `src/` Ordner)

### 7.2 Environment Variables in Vercel setzen

1. Vercel Dashboard → Projekt-Einstellungen → **Environment Variables**
2. Alle Variablen aus `.env.local` eintragen (jeweils für Production, Preview, Development)
3. **Deploy** triggern nach dem Setzen der Variablen

### 7.3 Domain-Setup (nexaro-9j3h.vercel.app oder Custom Domain)

Für Custom Domain:
1. Vercel Dashboard → Settings → Domains
2. Domain hinzufügen: `nexaro.matteo-cacic.at` (falls gewünscht)
3. DNS bei Domain-Provider anpassen: CNAME `cname.vercel-dns.com`
4. Alle Redirect-URIs (Google, Slack, Microsoft) auf neue Domain aktualisieren

---

## 8. Post-Deployment Checkliste

### ✅ Firebase Auth:
- [ ] Google Login funktioniert
- [ ] Redirect-URL in Firebase Auth autorisiert

### ✅ Gmail:
- [ ] "Gmail verbinden" in Settings → Authorization-Screen erscheint
- [ ] Nach OAuth: Gmail-Mails erscheinen in der Inbox
- [ ] E-Mail senden funktioniert
- [ ] Anhänge werden korrekt gesendet

### ✅ Google Calendar:
- [ ] "Google Calendar verbinden" in Settings
- [ ] Termine erscheinen in der Kalender-Ansicht
- [ ] Neuen Termin erstellen funktioniert

### ✅ Slack:
- [ ] "Slack verbinden" in Settings → Slack Authorize-Screen
- [ ] Channels erscheinen in der Sidebar
- [ ] Nachrichten in Channels werden angezeigt
- [ ] Nachrichten senden funktioniert
- [ ] DMs werden angezeigt

### ✅ Microsoft Teams / Outlook:
- [ ] "Microsoft verbinden" in Settings → Microsoft Azure Login
- [ ] Outlook-Mails erscheinen (falls implementiert)
- [ ] Teams-Nachrichten erscheinen (falls implementiert)

### ✅ Allgemein:
- [ ] Dark Mode funktioniert
- [ ] Keyboard Shortcuts (e, r, d, u, s, ?) funktionieren
- [ ] Benachrichtigungseinstellungen speichern korrekt
- [ ] Todo-Erstellung und -Verwaltung funktioniert
- [ ] Profil-Bild Upload funktioniert

---

## 9. Häufige Fehler & Lösungen

### "redirect_uri_mismatch" bei Google OAuth
**Problem:** Die Redirect-URI im Code stimmt nicht mit der in Google Cloud Console registrierten überein.
**Lösung:** In Google Cloud Console → Anmeldedaten → OAuth-Client → Exakt diese URIs eintragen:
```
https://nexaro-9j3h.vercel.app/settings
https://nexaro-9j3h.vercel.app/settings?service=calendar
```

### "invalid_client" bei Google OAuth
**Problem:** `GOOGLE_CLIENT_SECRET` fehlt oder ist falsch.
**Lösung:** In Vercel Environment Variables prüfen. Client Secret beginnt mit `GOCSPX-`.

### Slack: "missing_scope" beim Nachrichten-Laden
**Problem:** Der Bot-Token hat nicht alle nötigen Scopes.
**Lösung:** In Slack App → OAuth & Permissions → Scopes prüfen. User muss die App neu autorisieren (Trennen + Neu verbinden in Settings).

### Firebase: "permission-denied" beim Schreiben
**Problem:** Firestore Security Rules zu restriktiv.
**Lösung:** `firestore.rules` prüfen. `firebase deploy --only firestore:rules` ausführen.

### "Cannot read property of undefined" in Gmail
**Problem:** Gmail-Token ist abgelaufen und kein Refresh möglich.
**Lösung:** Gmail trennen und neu verbinden in Settings. Token wird automatisch über Refresh-Token erneuert, wenn `offline_access` Scope vorhanden.

### Vercel: Build-Fehler "Module not found"
**Problem:** Root Directory ist nicht korrekt gesetzt.
**Lösung:** Vercel → Settings → General → Root Directory auf `src` setzen.

---

## 10. Firebase Security Rules (aktueller Stand)

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /gmail_scores/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
