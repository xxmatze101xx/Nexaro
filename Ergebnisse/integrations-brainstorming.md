# Nexaro Integrations-Brainstorming

**Datum:** 12. Maerz 2026
**Autor:** Nexaro Engineering
**Status:** Entwurf / Planungsphase
**Zielgruppe:** CEOs und C-Level Executives

---

## Inhaltsverzeichnis

1. [Uebersicht und Kontext](#1-uebersicht-und-kontext)
2. [Bestehendes Nexaro Message-Schema](#2-bestehendes-nexaro-message-schema)
3. [Integration 1: Microsoft Outlook (Vervollstaendigung)](#3-integration-1-microsoft-outlook)
4. [Integration 2: Microsoft Teams (Vervollstaendigung)](#4-integration-2-microsoft-teams)
5. [Integration 3: Proton Mail](#5-integration-3-proton-mail)
6. [Integration 4: HubSpot CRM](#6-integration-4-hubspot-crm)
7. [Integration 5: Jira](#7-integration-5-jira)
8. [Integration 6: Linear](#8-integration-6-linear)
9. [Integration 7: Salesforce CRM](#9-integration-7-salesforce-crm)
10. [Priorisierte Implementierungsreihenfolge](#10-priorisierte-implementierungsreihenfolge)

---

## 1. Uebersicht und Kontext

Nexaro ist eine Unified Inbox fuer CEOs, die Kommunikation aus verschiedenen Kanaelen auf einer KI-priorisierten Oberflaeche buendelt. Aktuell unterstuetzt Nexaro:

- **Gmail** (voll funktionsfaehig via Gmail API)
- **Slack** (implementiert, blockiert durch fehlende Credentials)
- **Google Calendar** (OAuth-Routen vorhanden)
- **Microsoft Outlook** (teilweise implementiert via MS Graph)
- **Microsoft Teams** (teilweise implementiert via MS Graph)

Dieses Dokument analysiert die Vervollstaendigung der beiden Microsoft-Integrationen sowie fuenf neue Integrationen: Proton Mail, HubSpot, Jira, Linear und Salesforce.

### Bestehende Architektur-Patterns

Die aktuelle Nexaro-Pipeline verarbeitet Nachrichten in drei Schritten:

1. **Adapter** (Python): Holt Rohdaten von der externen API (`tools/adapters/*.py`)
2. **Normalisierung** (`tools/normalize_payload.py`): Konvertiert in das einheitliche Nexaro-Schema
3. **Scoring** (`tools/score_importance.py`): Bewertet Wichtigkeit (0.0-10.0)
4. **Firestore** (`tools/write_to_firestore.py`): Schreibt in die `messages`-Collection

Auf der Frontend-Seite existiert ein OAuth-Flow-Pattern:
- `/api/{service}/connect` — Leitet zum OAuth-Provider weiter
- `/api/{service}/callback` — Empfaengt den Authorization Code, tauscht ihn gegen Tokens
- `/api/{service}/refresh` — Erneuert abgelaufene Access Tokens
- Token-Speicherung in Firestore: `users/{uid}/tokens/{service}`

---

## 2. Bestehendes Nexaro Message-Schema

### TypeScript Interface (Frontend)

```typescript
interface Message {
    id: string;                    // Eindeutige Nexaro-ID (UUID)
    source: "slack" | "gmail" | "gcal" | "outlook" | "teams" | "proton" | "apple";
    external_id: string;           // Originale ID beim Quelldienst
    content: string;               // Klartextinhalt / Snippet
    htmlContent?: string | null;   // HTML-Body (bei E-Mails)
    subject?: string;              // Betreffzeile (bei E-Mails)
    sender: string;                // Absendername
    senderEmail?: string;          // Absender-E-Mail
    timestamp: string;             // ISO8601-Zeitstempel
    importance_score: number;      // 0.0-10.0 (UI zeigt x10 = 0-100)
    ai_draft_response: string | null; // KI-generierter Antwortentwurf
    accountId?: string;            // Zugehoeriges Konto
    labels?: string[];             // Gmail-Labels o.ae.
    status: "unread" | "read" | "replied" | "archived";
    threadId?: string;             // Thread/Konversations-ID
    rfcMessageId?: string;         // RFC Message-ID (fuer E-Mail-Threading)
}
```

### Python Normalized Payload (Backend)

```python
{
    "id": "uuid4",
    "source": "gmail|slack|outlook|teams|...",
    "external_id": "provider_spezifische_id",
    "content": "Nachrichtentext",
    "sender": "Absendername",
    "recipient": "Empfaenger",
    "timestamp": "ISO8601",
    "metadata": {
        "thread_id": "thread_xyz",
        "attachments": [],
    },
}
```

### Schema-Erweiterung fuer neue Integrationen

Fuer die neuen Integrationen (HubSpot, Jira, Linear, Salesforce) muss das `source`-Feld um folgende Werte erweitert werden:

```typescript
type Source = "slack" | "gmail" | "gcal" | "outlook" | "teams"
            | "proton" | "hubspot" | "jira" | "linear" | "salesforce";
```

Entsprechend muss `VALID_SOURCES` in `normalize_payload.py` erweitert werden.

---

## 3. Integration 1: Microsoft Outlook

### Status: Teilweise implementiert — Vervollstaendigung erforderlich

### API-Typ und Authentifizierung

| Eigenschaft | Wert |
|---|---|
| API | Microsoft Graph REST API v1.0 |
| Auth-Flow | OAuth 2.0 Authorization Code Flow |
| Token-Endpoint | `https://login.microsoftonline.com/common/oauth2/v2.0/token` |
| Base URL | `https://graph.microsoft.com/v1.0` |

### Was bereits existiert

- **OAuth-Routen:** `/api/microsoft/connect`, `/api/microsoft/callback`, `/api/microsoft/refresh`
- **Python-Adapter:** `tools/adapters/outlook_adapter.py` — Liest Inbox-Nachrichten via `/me/mailFolders/inbox/messages`
- **Token-Speicherung:** `users/{uid}/tokens/microsoft` in Firestore
- **Scopes:** `offline_access User.Read Mail.Read Mail.Send Calendars.Read Chat.Read`

### Was fehlt / verbessert werden muss

#### a) Frontend-Integration (Client-seitiger Fetch)

Aktuell existiert nur der Python-Adapter fuer serverseitiges Polling. Es fehlt ein `src/lib/outlook.ts` (analog zu `src/lib/gmail.ts`), das:
- Access Tokens aus Firestore liest und bei Bedarf ueber `/api/microsoft/refresh` erneuert
- E-Mails direkt via Graph API im Browser fetcht (`/me/messages`)
- Progressive Batch-Loading implementiert (wie `fetchEmailsProgressively` bei Gmail)
- Nachrichten in das `Message`-Interface parsed

#### b) Vollstaendige Ordnerstruktur

Der Adapter fetcht nur aus der Inbox. Fuer Paritaet mit Gmail muessen folgende Ordner unterstuetzt werden:
- Posteingang (`/me/mailFolders/inbox/messages`)
- Gesendete Elemente (`/me/mailFolders/sentitems/messages`)
- Entwuerfe (`/me/mailFolders/drafts/messages`)
- Geloeschte Elemente (`/me/mailFolders/deleteditems/messages`)
- Archiv (`/me/mailFolders/archive/messages`)

#### c) E-Mail-Versand

- `Mail.Send`-Scope ist bereits angefordert
- Implementierung von `/me/sendMail` fuer Antworten und neue E-Mails
- MIME-kompatibles Threading via `conversationId`

#### d) HTML-Body-Rendering

Der Adapter holt aktuell nur `bodyPreview`. Fuer die Detail-Ansicht wird der vollstaendige HTML-Body benoetigt:
```
/me/messages/{id}?$select=id,subject,from,body,receivedDateTime,...
```

#### e) Webhook-basierte Echtzeit-Updates

Statt Polling: Microsoft Graph Subscriptions (`/subscriptions`) fuer Push-Benachrichtigungen bei neuen E-Mails.

### Mapping auf Nexaro-Schema

| Outlook (Graph API) | Nexaro Message |
|---|---|
| `id` | `external_id` (Prefix: `outlook_`) |
| `subject` | `subject` |
| `from.emailAddress.name` | `sender` |
| `from.emailAddress.address` | `senderEmail` |
| `bodyPreview` / `body.content` | `content` / `htmlContent` |
| `receivedDateTime` | `timestamp` |
| `isRead` | `status` ("read" / "unread") |
| `conversationId` | `threadId` |
| `internetMessageId` | `rfcMessageId` |

### Erforderliche OAuth-Scopes

```
offline_access
User.Read
Mail.Read
Mail.ReadWrite      (NEU — fuer Archivieren, Status-Aenderung)
Mail.Send
Calendars.Read
```

### Herausforderungen und Limitierungen

- **Rate Limits:** 10.000 Requests pro 10 Minuten pro Mailbox. Exponential Backoff ist im Adapter bereits implementiert.
- **Delta Queries:** Graph API unterstuetzt `/me/mailFolders/inbox/messages/delta` fuer inkrementelle Synchronisation — deutlich effizienter als Full-Fetch.
- **Batching:** Graph API erlaubt JSON-Batching (`$batch`-Endpoint) fuer bis zu 20 Requests in einem Aufruf — sollte fuer Multi-Message-Fetch genutzt werden.
- **Tenant-Konfiguration:** Manche Unternehmen schraenken OAuth-Consent auf von Admins genehmigte Apps ein. Nexaro muss als verifizierter Publisher registriert werden.
- **Webhook-Lifecycle:** Graph Subscriptions laufen nach max. 3 Tagen ab und muessen aktiv erneuert werden.

### Prioritaet fuer CEO-Zielgruppe

**HOCH** — Viele Executives nutzen Microsoft 365 als primaere E-Mail-Loesung. Die Outlook-Integration muss gleichwertig zur Gmail-Integration sein (volle Lese-/Schreib-/Antwort-Funktionalitaet).

### Geschaetzter Aufwand

**M (Medium)** — Das Grundgeruest (OAuth, Adapter, API-Routen) existiert bereits. Hauptaufwand: Frontend-Library (`outlook.ts`), HTML-Body-Fetch, Ordnerstruktur, Send-Funktion, und Delta-Sync.

---

## 4. Integration 2: Microsoft Teams

### Status: Teilweise implementiert — Vervollstaendigung erforderlich

### API-Typ und Authentifizierung

| Eigenschaft | Wert |
|---|---|
| API | Microsoft Graph REST API v1.0 |
| Auth-Flow | OAuth 2.0 (geteilter Flow mit Outlook) |
| Token-Endpoint | Identisch mit Outlook |
| Base URL | `https://graph.microsoft.com/v1.0` |

### Was bereits existiert

- **OAuth:** Teilt sich den Microsoft-OAuth-Flow mit Outlook (`Chat.Read`-Scope ist bereits angefordert)
- **Python-Adapter:** `tools/adapters/teams_adapter.py` — Liest 1:1-DMs und Gruppen-Chats via `/me/chats/{chatId}/messages`
- **Slack Channel View:** `src/components/slack-channel-view.tsx` koennte als Vorlage fuer eine Teams-Chat-Ansicht dienen

### Was fehlt / verbessert werden muss

#### a) Kanal-Nachrichten (Channel Messages)

Der Adapter liest nur DMs. Teams-Kanaele sind fuer CEOs wichtig:
```
/teams/{teamId}/channels/{channelId}/messages
```
Erfordert zusaetzlichen Scope: `ChannelMessage.Read.All`

#### b) @Mentions-Filter

CEOs wollen nicht alle Kanal-Nachrichten sehen, sondern nur solche, in denen sie erwaehnt werden. Der Graph API `$filter` auf `mentions` ist auf dem v1.0-Endpoint limitiert. Alternative:
- Lokal filtern nach `mentions[].mentioned.user.id` im Message-Body
- Oder den `/me/chats`-Endpoint nutzen, der bereits @mentions in DMs abdeckt

#### c) Frontend Chat-Ansicht

Aehnlich wie `slack-channel-view.tsx` wird eine `teams-channel-view.tsx` benoetigt:
- Liste der Teams und Kanaele links
- Nachrichtenverlauf rechts
- Antwort-Funktion (`POST /me/chats/{chatId}/messages`)

#### d) Presence und Verfuegbarkeit

Optional: Status-Anzeige der Kontakte via `/users/{userId}/presence`.

#### e) Echtzeit-Updates

Graph Subscriptions auf `/chats/getAllMessages` fuer neue Nachrichten (erfordert `ChatMessage.Read.All` Application Permission).

### Mapping auf Nexaro-Schema

| Teams (Graph API) | Nexaro Message |
|---|---|
| `{chatId}_{messageId}` | `external_id` (Prefix: `teams_`) |
| Chat-Name / Kanal-Name | `subject` |
| `from.user.displayName` | `sender` |
| `from.user.mail` | `senderEmail` |
| `body.content` (HTML-stripped) | `content` |
| `createdDateTime` | `timestamp` |
| — | `status` (immer "unread" bei neuen Nachrichten) |
| `replyToId` oder `id` | `threadId` |

### Erforderliche OAuth-Scopes

```
offline_access
User.Read
Chat.Read
Chat.ReadWrite           (NEU — fuer Antworten)
ChannelMessage.Read.All  (NEU — fuer Kanal-Nachrichten)
Team.ReadBasic.All       (NEU — fuer Team-/Kanallisten)
Presence.Read            (OPTIONAL — fuer Status-Anzeige)
```

### Herausforderungen und Limitierungen

- **Application vs. Delegated Permissions:** Channel-Nachrichten lesen erfordert teilweise Application Permissions, die Admin-Consent voraussetzen.
- **Rate Limits:** Strenger als Outlook — 30 Requests/Sekunde pro App, 2 Requests/Sekunde pro Chat-Thread. Batching ist nicht verfuegbar fuer Chat-Endpoints.
- **HTML-Body:** Teams-Nachrichten kommen als HTML (`<p>`, `<at>`, `<attachment>`-Tags). Robustes HTML-Stripping ist noetig.
- **Nachrichten-Volumen:** Teams-Kanaele koennen extrem hohe Nachrichtenraten haben. Intelligentes Filtern (nur @mentions, nur DMs) ist essentiell fuer die CEO-Inbox.
- **Beta-Endpoints:** Manche Features (z.B. `sendActivityNotification`) sind nur im Beta-Endpoint verfuegbar und koennen sich aendern.
- **Reactions und Attachments:** Teams-Nachrichten koennen Reactions, Adaptive Cards und Inline-Bilder enthalten — komplexes Rendering im Frontend.

### Prioritaet fuer CEO-Zielgruppe

**HOCH** — Microsoft Teams ist in vielen Unternehmen die primaere Kollaborationsplattform. CEOs empfangen kritische DMs und @mentions in Kanaelen. Die Kombination Outlook + Teams macht Nexaro zu einem vollstaendigen Microsoft-365-Hub.

### Geschaetzter Aufwand

**M (Medium)** — Basis-OAuth und DM-Fetch existieren. Hauptaufwand: Kanal-Nachrichten, @mention-Filterung, Frontend-Chat-View, Antwort-Funktion, HTML-Rendering.

---

## 5. Integration 3: Proton Mail

### Status: Neu — Noch nicht implementiert

### API-Typ und Authentifizierung

| Eigenschaft | Wert |
|---|---|
| API | Proton Mail REST API (inoffiziell) / Proton Bridge (IMAP/SMTP) |
| Auth-Flow | SRP-basierte Authentifizierung (kein Standard-OAuth) |
| Encryption | Ende-zu-Ende-verschluesselt (OpenPGP) |
| Base URL | `https://mail.proton.me/api` (undokumentiert) |

### Technischer Hintergrund

Proton Mail unterscheidet sich grundlegend von Gmail und Outlook:

1. **Keine oeffentliche API:** Proton hat keine offizielle REST API mit OAuth-Flow fuer Drittanbieter. Die interne Web-API unter `https://mail.proton.me/api` ist undokumentiert und kann sich jederzeit aendern.

2. **Proton Bridge:** Die offizielle Loesung fuer Drittanbieter-Clients ist Proton Bridge — eine Desktop-Applikation, die einen lokalen IMAP/SMTP-Server bereitstellt. Das entschluesselt die E-Mails lokal und macht sie ueber Standard-Protokolle verfuegbar.

3. **Ende-zu-Ende-Verschluesselung:** Alle E-Mails sind mit dem privaten Schluessel des Users verschluesselt. Serverseitige Verarbeitung (z.B. in der Python-Pipeline) ist ohne den privaten Schluessel nicht moeglich.

### Moegliche Implementierungsansaetze

#### Ansatz A: Proton Bridge + IMAP (empfohlen)

- User installiert Proton Bridge lokal
- Nexaro verbindet sich per IMAP (Hostname: `127.0.0.1`, Port: `1143`)
- Nachrichten werden ueber Standard-IMAP gelesen
- Versand ueber SMTP (Port: `1025`)

**Vorteil:** Nutzt offizielle, stabile Infrastruktur
**Nachteil:** Erfordert laufende Desktop-App beim User; kein reiner Cloud-Ansatz

#### Ansatz B: Proton Mail Web-API (riskant)

- Reverse-Engineering der internen API
- SRP-Authentifizierung implementieren
- OpenPGP-Entschluesselung im Client (mit `openpgp.js`)

**Vorteil:** Keine Desktop-App noetig
**Nachteil:** API kann sich aendern; potenzielle ToS-Verletzung; hohe Komplexitaet

#### Ansatz C: ProtonMail-Go-Bridge als Service

- Eigene Instanz der Open-Source Proton Bridge deployen
- REST-Wrapper um den IMAP-Zugriff bauen

**Vorteil:** Server-seitig; kein User-Setup
**Nachteil:** Erfordert Proton-Credentials im Backend; Sicherheitsrisiko

### Mapping auf Nexaro-Schema

| Proton Mail (IMAP) | Nexaro Message |
|---|---|
| `Message-ID` Header | `external_id` (Prefix: `proton_`) |
| `Subject` Header | `subject` |
| `From` Header (Name-Teil) | `sender` |
| `From` Header (Adress-Teil) | `senderEmail` |
| Body (text/plain oder text/html) | `content` / `htmlContent` |
| `Date` Header | `timestamp` |
| `\Seen`-Flag | `status` ("read" / "unread") |
| `In-Reply-To` / `References` | `threadId`, `rfcMessageId` |

### Erforderliche Authentifizierung

**Proton Bridge:**
- IMAP-Benutzername: Proton-E-Mail-Adresse
- IMAP-Passwort: Bridge-generiertes App-Passwort (nicht das Login-Passwort)
- Kein OAuth — Credentials muessen sicher in Nexaro gespeichert werden (`users/{uid}/tokens/proton`)

### Herausforderungen und Limitierungen

- **Keine oeffentliche API:** Groesstes Hindernis. Proton Mail bietet bewusst keine Drittanbieter-API, um maximale Privatsphaere zu gewaehrleisten.
- **Bridge-Abhaengigkeit:** Ansatz A setzt voraus, dass der User Proton Bridge installiert hat und die Anwendung laeuft. Fuer eine rein cloud-basierte SaaS problematisch.
- **Verschluesselungshandling:** E-Mails sind OpenPGP-verschluesselt. Fuer die KI-Priorisierung (`score_importance.py`) muss der Klartext verfuegbar sein, was nur nach Entschluesselung funktioniert.
- **Kein Webhook/Push:** IMAP bietet IDLE fuer Echtzeit-Updates, aber das erfordert eine persistente Verbindung pro User.
- **Proton-Plan-Beschraenkung:** Proton Bridge ist nur fuer zahlende Nutzer (Plus/Unlimited) verfuegbar.
- **Skalierbarkeit:** IMAP-Verbindungen pro User sind ressourcenintensiv (ein Socket pro User).

### Prioritaet fuer CEO-Zielgruppe

**NIEDRIG bis MITTEL** — Proton Mail hat eine kleine, aber wachsende Nutzerbasis unter datenschutzbewussten Executives. In Europa (insbesondere DACH-Region) ist Proton populaerer als in den USA. Die technische Komplexitaet ist hoch, die Nutzerzahl relativ gering.

**Empfehlung:** Auf die offizielle Proton API warten (Proton hat eine API-Roadmap angekuendigt) oder Ansatz A als optionales Power-User-Feature implementieren.

### Geschaetzter Aufwand

**XL (Extra Large)** — IMAP-Integration, Verschluesselungshandling, Bridge-Erkennung, kein Standard-OAuth, persistente Verbindungen. Deutlich hoeherer Aufwand als REST-API-basierte Integrationen.

---

## 6. Integration 4: HubSpot CRM

### Status: Neu — Noch nicht implementiert

### API-Typ und Authentifizierung

| Eigenschaft | Wert |
|---|---|
| API | HubSpot REST API v3 |
| Auth-Flow | OAuth 2.0 Authorization Code Flow |
| Token-Endpoint | `https://api.hubapi.com/oauth/v1/token` |
| Authorize-URL | `https://app.hubspot.com/oauth/authorize` |
| Base URL | `https://api.hubapi.com` |

### Daten die in die Nexaro-Inbox fliessen

HubSpot ist kein reiner Messaging-Dienst, sondern ein CRM. Fuer die CEO-Inbox sind folgende Events relevant:

1. **Neue E-Mails im CRM:** `/crm/v3/objects/emails` — E-Mails die mit Kontakten/Deals verknuepft sind
2. **Deal-Statusaenderungen:** `/crm/v3/objects/deals` — Wenn ein Deal die Stage wechselt (z.B. "Proposal Sent" zu "Closed Won")
3. **Neue Kontakt-Aktivitaeten:** `/crm/v3/objects/contacts` mit Timeline-Events
4. **Task-Zuweisungen:** `/crm/v3/objects/tasks` — Aufgaben, die dem CEO zugewiesen werden
5. **Notifikationen:** `/integrations/v1/notifications` — System-Benachrichtigungen

### Mapping auf Nexaro-Schema

#### Deal-Updates

| HubSpot Deal | Nexaro Message |
|---|---|
| `deal.id` | `external_id` (Prefix: `hubspot_deal_`) |
| `Deal: {dealname} — Stage: {dealstage}` | `subject` |
| `deal.properties.hubspot_owner_id` (aufgeloest) | `sender` |
| Deal-Owner-E-Mail | `senderEmail` |
| `Pipeline-Update: {old_stage} -> {new_stage}, Wert: {amount}` | `content` |
| `deal.properties.hs_lastmodifieddate` | `timestamp` |
| — | `status`: "unread" |

#### CRM-E-Mails

| HubSpot Email | Nexaro Message |
|---|---|
| `email.id` | `external_id` (Prefix: `hubspot_email_`) |
| `email.properties.hs_email_subject` | `subject` |
| `email.properties.hs_email_from` | `sender`, `senderEmail` |
| `email.properties.hs_email_text` | `content` |
| `email.properties.hs_email_html` | `htmlContent` |
| `email.properties.hs_timestamp` | `timestamp` |

#### Task-Zuweisungen

| HubSpot Task | Nexaro Message |
|---|---|
| `task.id` | `external_id` (Prefix: `hubspot_task_`) |
| `Aufgabe: {subject}` | `subject` |
| Ersteller-Name | `sender` |
| `task.properties.hs_task_body` | `content` |
| `task.properties.hs_timestamp` | `timestamp` |
| — | `importance_score`: Hoher Baseline-Score (7.0+) fuer CEO-zugewiesene Tasks |

### Erforderliche OAuth-Scopes

```
crm.objects.contacts.read
crm.objects.deals.read
crm.objects.emails.read
crm.objects.tasks.read
crm.objects.owners.read
timeline
```

### Herausforderungen und Limitierungen

- **Rate Limits:** 100 Requests pro 10 Sekunden (Free/Starter), 150/10s (Professional), 200/10s (Enterprise). Fuer CEOs mit grossen CRM-Instanzen relevant.
- **Webhook vs. Polling:** HubSpot bietet Webhooks fuer CRM-Events (erstellt/aktualisiert/geloescht). Empfohlen gegenueber Polling. Webhook-URL muss oeffentlich erreichbar sein.
- **Datenvolumen:** Ein aktives CRM kann hunderte Deals und tausende Kontakte haben. Intelligentes Filtern ist noetig: Nur Deals ab einem bestimmten Wert, nur dem CEO zugewiesene Tasks, nur E-Mails mit VIP-Kontakten.
- **API-Versionen:** HubSpot migriert aktiv von v1/v2 zu v3. Aeltere Endpoints werden abgekuendigt. Nur v3 verwenden.
- **Kosten:** HubSpot API-Zugriff ist in allen Plaenen verfuegbar (auch Free). Private Apps benoetigen einen Developer-Account.
- **Owner-Aufloesung:** Deal- und Task-Owner sind nur als IDs gespeichert. Separater API-Call noetig um Namen/E-Mail aufzuloesen (`/crm/v3/owners/{ownerId}`).
- **Association-API:** Um E-Mails mit Kontakten/Deals zu verknuepfen, ist die Associations-API noetig, was zusaetzliche Requests erfordert.

### Prioritaet fuer CEO-Zielgruppe

**HOCH** — CEOs, die aktiv im Vertrieb involviert sind oder Sales-Teams fuehren, wollen Deal-Updates in Echtzeit sehen. Ein Deal der von "Negotiation" zu "Closed Won" wechselt, ist eine der wichtigsten Nachrichten des Tages. HubSpot ist das meistgenutzte CRM fuer mittelstaendische Unternehmen.

### Geschaetzter Aufwand

**L (Large)** — OAuth-Flow ist Standard, aber die Vielfalt der CRM-Objekte (Deals, Contacts, Emails, Tasks) und die noetige Filterlogik machen die Integration komplex. Webhook-Setup erfordert oeffentlichen Endpoint. Owner-Aufloesung und intelligentes Scoring sind zusaetzlicher Aufwand.

### Adapter-Konzept

```python
# tools/adapters/hubspot_adapter.py (Pseudocode)

def fetch_messages(credentials: dict, since: str) -> list[dict]:
    token = credentials["access_token"]

    messages = []

    # 1. Deal-Stage-Aenderungen
    deals = hubspot_get("/crm/v3/objects/deals", {
        "filterGroups": [{"filters": [{
            "propertyName": "hs_lastmodifieddate",
            "operator": "GTE",
            "value": since_to_unix_ms(since)
        }]}],
        "properties": ["dealname", "dealstage", "amount",
                        "hubspot_owner_id", "pipeline"]
    })
    for deal in deals:
        messages.append(normalize_deal(deal))

    # 2. CEO-zugewiesene Tasks
    tasks = hubspot_get("/crm/v3/objects/tasks", {
        "filterGroups": [{"filters": [{
            "propertyName": "hubspot_owner_id",
            "operator": "EQ",
            "value": ceo_owner_id
        }]}]
    })
    for task in tasks:
        messages.append(normalize_task(task))

    return messages
```

---

## 7. Integration 5: Jira

### Status: Neu — Noch nicht implementiert

### API-Typ und Authentifizierung

| Eigenschaft | Wert |
|---|---|
| API | Atlassian REST API v3 (Jira Cloud) |
| Auth-Flow | OAuth 2.0 (3LO — Three-Legged OAuth) |
| Token-Endpoint | `https://auth.atlassian.com/oauth/token` |
| Authorize-URL | `https://auth.atlassian.com/authorize` |
| Base URL | `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3` |
| Audience | `api.atlassian.com` |

### Daten die in die Nexaro-Inbox fliessen

1. **Ticket-Zuweisungen:** Issues die dem CEO zugewiesen werden
2. **Kommentare auf eigene Tickets:** Neue Kommentare auf Tickets die der CEO erstellt hat oder denen er folgt
3. **@Mentions in Kommentaren:** Wenn der CEO in einem Jira-Kommentar erwaehnt wird
4. **Status-Aenderungen kritischer Tickets:** Wenn ein Epic oder eine Story den Status wechselt (z.B. "In Review" zu "Done")
5. **Sprint-Events:** Sprint-Start, Sprint-Ende, Velocity-Reports

### Mapping auf Nexaro-Schema

| Jira Issue / Event | Nexaro Message |
|---|---|
| `issue.id` | `external_id` (Prefix: `jira_`) |
| `[{project.key}-{issue.key}] {summary}` | `subject` |
| `issue.fields.reporter.displayName` | `sender` |
| `issue.fields.reporter.emailAddress` | `senderEmail` |
| Kommentartext oder Status-Beschreibung | `content` |
| `issue.fields.updated` | `timestamp` |
| — | `status`: "unread" |
| `issue.key` | `threadId` |

#### Spezial-Mapping fuer Kommentare

| Jira Comment | Nexaro Message |
|---|---|
| `comment.id` | `external_id` (Prefix: `jira_comment_`) |
| `Kommentar zu [{issue.key}] {summary}` | `subject` |
| `comment.author.displayName` | `sender` |
| `comment.body` (ADF zu Plaintext) | `content` |
| `comment.updated` | `timestamp` |
| `issue.key` | `threadId` |

### Erforderliche OAuth-Scopes

```
read:jira-work          # Issues, Projekte, Boards lesen
read:jira-user          # User-Profile aufloesen
write:jira-work         # Kommentare schreiben (fuer Antwort-Feature)
read:me                 # Eigenes Profil (Account-ID ermitteln)
```

### Besonderheit: Atlassian Document Format (ADF)

Jira v3 verwendet ADF (Atlassian Document Format) fuer Issue-Beschreibungen und Kommentare — ein JSON-basiertes Dokumentformat aehnlich wie ProseMirror:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {"type": "text", "text": "Bitte den Vertrag "},
        {"type": "mention", "attrs": {"id": "account-id", "text": "@CEO"}},
        {"type": "text", "text": " pruefen."}
      ]
    }
  ]
}
```

Ein ADF-zu-Plaintext-Konverter wird benoetigt (`adf_to_text(doc)`) fuer das `content`-Feld.

### Herausforderungen und Limitierungen

- **Cloud-ID-Ermittlung:** Vor jedem API-Call muss die `cloudId` der Jira-Instanz ermittelt werden: `GET https://api.atlassian.com/oauth/token/accessible-resources`
- **Rate Limits:** Variabel — abhaengig von der Instanzgroesse. Typisch: 100 Requests pro Minute (Burst: 10/s). `X-RateLimit-*`-Headers auswerten.
- **ADF-Parsing:** Das Atlassian Document Format muss zuverlaessig in Plaintext konvertiert werden. Besonders `mention`-Nodes und `mediaGroup`-Nodes sind komplex.
- **JQL-Abfragen:** Fuer effizientes Filtern (nur zugewiesene Tickets, nur erwaehnte) ist JQL unverzichtbar: `assignee = currentUser() AND updated >= -24h ORDER BY updated DESC`
- **Webhooks:** Jira Cloud bietet Webhooks fuer Issue-Events. Erfordert Atlassian Connect App oder Forge App — deutlich aufwaendiger als ein einfacher Webhook-Endpoint.
- **Pagination:** Die Search-API paginiert mit `startAt` und `maxResults` (max 100 pro Seite). Grosse Projekte erfordern mehrere Seiten.
- **Jira Server vs. Cloud:** Diese Analyse gilt fuer Jira Cloud. Jira Server/Data Center verwendet Basic Auth und hat eine andere API-Struktur.

### Prioritaet fuer CEO-Zielgruppe

**MITTEL** — CEOs, die tech-nahe sind oder in Software-Unternehmen arbeiten, nutzen Jira aktiv. Fuer klassische Branchen-CEOs eher irrelevant. Besonders wertvoll wenn der CEO Release-Zyklen und Sprint-Fortschritt verfolgt.

### Geschaetzter Aufwand

**L (Large)** — Atlassian OAuth 3LO ist komplexer als Standard-OAuth (Cloud-ID-Lookup, Audience-Parameter). ADF-Parsing ist nichttrivial. Webhook-Setup via Atlassian Connect oder Forge erhoeht den Aufwand.

---

## 8. Integration 6: Linear

### Status: Neu — Noch nicht implementiert

### API-Typ und Authentifizierung

| Eigenschaft | Wert |
|---|---|
| API | Linear GraphQL API |
| Auth-Flow | OAuth 2.0 Authorization Code Flow |
| Token-Endpoint | `https://api.linear.app/oauth/token` |
| Authorize-URL | `https://linear.app/oauth/authorize` |
| GraphQL-Endpoint | `https://api.linear.app/graphql` |

### Warum Linear statt (nur) Jira?

Linear hat sich als modernes Projektmanagement-Tool fuer Tech-Startups und schnell wachsende Unternehmen etabliert. Viele Nexaro-Zielkunden (CEOs von Scale-ups und Tech-Unternehmen) nutzen Linear statt Jira. Die API ist deutlich entwicklerfreundlicher als die von Atlassian.

### Daten die in die Nexaro-Inbox fliessen

1. **Issue-Zuweisungen:** Issues die dem CEO zugewiesen werden
2. **Kommentare auf eigene Issues:** Neue Kommentare
3. **@Mentions:** Wenn der CEO in einem Kommentar oder Issue erwaehnt wird
4. **Projekt-Updates:** Status-Aenderungen von Projekten und Cycles
5. **SLA-Verletzungen:** Issues die ihre Deadline ueberschreiten
6. **Inbox-Notifications:** Linears eigene Notifications-API

### GraphQL-Queries

#### Zugewiesene Issues (aktualisiert in den letzten 24h)

```graphql
query {
  issues(
    filter: {
      assignee: { isMe: { eq: true } }
      updatedAt: { gte: "2026-03-11T00:00:00Z" }
    }
    orderBy: updatedAt
  ) {
    nodes {
      id
      identifier    # z.B. "NEX-142"
      title
      description
      state { name }
      priority       # 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low
      creator { name email }
      assignee { name email }
      updatedAt
      comments {
        nodes {
          id
          body
          user { name email }
          createdAt
        }
      }
    }
  }
}
```

#### Notifications (Inbox des Users)

```graphql
query {
  notifications(
    filter: { readAt: { null: true } }
    orderBy: createdAt
  ) {
    nodes {
      id
      type             # "issueAssignment", "issueComment", "issueMention", ...
      createdAt
      readAt
      ... on IssueNotification {
        issue { id identifier title }
        comment { body user { name } }
      }
    }
  }
}
```

### Mapping auf Nexaro-Schema

| Linear Issue/Notification | Nexaro Message |
|---|---|
| `issue.id` | `external_id` (Prefix: `linear_`) |
| `[{issue.identifier}] {issue.title}` | `subject` |
| `issue.creator.name` oder `comment.user.name` | `sender` |
| `issue.creator.email` | `senderEmail` |
| Issue-Beschreibung oder Kommentartext | `content` |
| `issue.updatedAt` | `timestamp` |
| — | `status`: "unread" |
| `issue.identifier` | `threadId` |

#### Priority-Mapping fuer importance_score

```python
LINEAR_PRIORITY_BOOST = {
    0: 0.0,   # None
    1: 3.0,   # Urgent
    2: 2.0,   # High
    3: 1.0,   # Medium
    4: 0.0,   # Low
}
```

### Erforderliche OAuth-Scopes

```
read        # Issues, Projekte, Kommentare lesen
write       # Kommentare schreiben (fuer Antwort-Feature)
issues:read # Issues und deren Relationen
```

Linear verwendet ein vereinfachtes Scope-Modell mit nur wenigen granularen Scopes.

### Herausforderungen und Limitierungen

- **GraphQL-Komplexitaet:** Anders als REST erfordert GraphQL sorgfaeltige Query-Konstruktion. Zu tiefe Verschachtelungen koennen Rate-Limit-Probleme verursachen (Complexity-Limit: 10.000 Punkte pro Query).
- **Rate Limits:** 1.500 Requests pro Stunde. GraphQL-Queries zaehlen nach Komplexitaet, nicht nach Anzahl. Einfache Queries sind guenstig, verschachtelte teuer.
- **Webhooks:** Linear bietet Webhooks fuer alle Event-Typen (Issue created/updated, Comment created, etc.). Einfach einzurichten ueber das Linear Settings-UI oder per API. Signatur-Verifizierung via HMAC-SHA256.
- **Markdown-Body:** Linear verwendet Markdown fuer Beschreibungen und Kommentare — einfacher zu handhaben als Jiras ADF.
- **Keine Self-Hosted-Option:** Linear ist ausschliesslich Cloud-basiert. Kein On-Premise-Support.
- **API-Stabilitaet:** Linear versioned seine API nicht aggressiv. Breaking Changes werden angekuendigt und sind selten.

### Prioritaet fuer CEO-Zielgruppe

**MITTEL** — Sehr relevant fuer Tech-CEOs und Startup-Gruender. Weniger relevant fuer traditionelle Branchen. Linear waechst schnell und hat eine loyale Nutzerbasis unter der Nexaro-Zielgruppe.

### Geschaetzter Aufwand

**M (Medium)** — Linears API ist sauber dokumentiert und entwicklerfreundlich. OAuth ist Standard. GraphQL erfordert etwas Einarbeitung, aber die Markdown-Bodies sind leichter zu verarbeiten als Jiras ADF. Webhooks sind einfach einzurichten.

---

## 9. Integration 7: Salesforce CRM

### Status: Neu — Noch nicht implementiert

### API-Typ und Authentifizierung

| Eigenschaft | Wert |
|---|---|
| API | Salesforce REST API (v60.0+) und SOQL |
| Auth-Flow | OAuth 2.0 (Web Server Flow / JWT Bearer Flow) |
| Token-Endpoint | `https://login.salesforce.com/services/oauth2/token` |
| Authorize-URL | `https://login.salesforce.com/services/oauth2/authorize` |
| Base URL | `https://{instance}.salesforce.com/services/data/v60.0` |

### Daten die in die Nexaro-Inbox fliessen

Salesforce ist das umfangreichste CRM und bietet eine Fuelle von CEO-relevanten Daten:

1. **Opportunity-Updates:** Wenn sich der Stage einer Opportunity aendert (besonders "Closed Won" / "Closed Lost")
2. **Lead-Zuweisungen:** Neue Leads die dem CEO oder seinen Direct Reports zugewiesen werden
3. **Task-Zuweisungen:** Salesforce Tasks (Anrufe, Follow-ups) die dem CEO zugewiesen werden
4. **Chatter-Posts:** Interne Kommunikation im Salesforce Chatter-Feed
5. **Dashboard-Alerts:** Wenn KPIs Schwellenwerte ueber- oder unterschreiten
6. **Approval-Requests:** Genehmigungsanfragen die auf den CEO warten
7. **Case-Eskalationen:** Supportfaelle die zum CEO eskaliert wurden

### SOQL-Queries fuer relevante Daten

#### Opportunity-Updates der letzten 24 Stunden

```sql
SELECT Id, Name, StageName, Amount, CloseDate,
       Owner.Name, Owner.Email,
       LastModifiedDate, Account.Name
FROM Opportunity
WHERE LastModifiedDate >= LAST_N_HOURS:24
  AND StageName IN ('Negotiation/Review', 'Closed Won', 'Closed Lost')
ORDER BY LastModifiedDate DESC
LIMIT 50
```

#### Ausstehende Genehmigungen

```sql
SELECT Id, TargetObject.Name, TargetObject.Type,
       CreatedBy.Name, CreatedDate, Status
FROM ProcessInstanceWorkitem
WHERE ActorId = '{currentUserId}'
  AND Status = 'Pending'
ORDER BY CreatedDate DESC
```

#### Zugewiesene Tasks

```sql
SELECT Id, Subject, Description, Status, Priority,
       Who.Name, What.Name, ActivityDate,
       CreatedBy.Name, CreatedBy.Email
FROM Task
WHERE OwnerId = '{currentUserId}'
  AND Status != 'Completed'
  AND CreatedDate >= LAST_N_HOURS:24
ORDER BY CreatedDate DESC
```

### Mapping auf Nexaro-Schema

#### Opportunity-Updates

| Salesforce Opportunity | Nexaro Message |
|---|---|
| `opportunity.Id` | `external_id` (Prefix: `sf_opp_`) |
| `Opportunity: {Name} — {StageName}` | `subject` |
| `Owner.Name` | `sender` |
| `Owner.Email` | `senderEmail` |
| `{Account.Name}: Stage {StageName}, Wert: {Amount}, Close: {CloseDate}` | `content` |
| `LastModifiedDate` | `timestamp` |
| — | `status`: "unread" |

#### Approval-Requests

| Salesforce Approval | Nexaro Message |
|---|---|
| `workitem.Id` | `external_id` (Prefix: `sf_approval_`) |
| `Genehmigung erforderlich: {TargetObject.Name}` | `subject` |
| `CreatedBy.Name` | `sender` |
| Genehmigungsdetails | `content` |
| `CreatedDate` | `timestamp` |
| — | `importance_score`: Sehr hoch (8.0+), da CEO-Aktion erforderlich |

### Erforderliche OAuth-Scopes

```
api                     # Vollstaendiger API-Zugriff
refresh_token           # Offline-Zugriff
chatter_api             # Chatter-Feed lesen/schreiben
```

Salesforce verwendet ein anderes Scope-Modell als die meisten APIs. Der `api`-Scope gewaehrt breiten Zugriff; feinere Einschraenkungen erfolgen ueber das Salesforce Permission Set des Users.

### Herausforderungen und Limitierungen

- **Instanz-spezifische URLs:** Jede Salesforce-Org hat ihre eigene Instanz-URL (`na1.salesforce.com`, `eu2.salesforce.com`, etc.). Nach dem OAuth-Flow muss die `instance_url` aus der Token-Response gespeichert werden.
- **Rate Limits:** Abhaengig von der Edition:
  - Enterprise: 100.000 API-Calls / 24h
  - Unlimited: 500.000 API-Calls / 24h
  - Fuer ein einzelnes CEO-Konto mehr als ausreichend, aber bei Multi-User-Szenario relevant.
- **SOQL-Komplexitaet:** SOQL ist maechtig aber hat Einschraenkungen (keine Subqueries auf bestimmte Objekte, keine JOINs im SQL-Sinne). Relationship Queries und SOSL fuer Volltextsuche sind Alternativen.
- **Kosten:** Salesforce API-Zugriff ist in allen Editionen (ab Professional) enthalten. Einige Features (z.B. Platform Events) erfordern Enterprise Edition.
- **Streaming API / Platform Events:** Fuer Echtzeit-Updates bietet Salesforce die Streaming API (CometD/Bayeux-Protokoll) und Platform Events. Komplexer einzurichten als REST-Webhooks, aber leistungsfaehiger.
- **Sandbox vs. Production:** Testing sollte immer in einer Sandbox-Org erfolgen (`https://test.salesforce.com`). Separater Login-Flow noetig.
- **Custom Objects:** Viele Salesforce-Orgs nutzen Custom Objects. Nexaro muss entweder nur Standard-Objekte unterstuetzen oder eine konfigurierbare Objekt-Liste anbieten.
- **Connected App Setup:** Der Salesforce-Admin muss eine Connected App erstellen und den OAuth-Consumer-Key/Secret konfigurieren. Zusaetzlicher Onboarding-Aufwand.
- **Lightning vs. Classic:** API-Zugriff ist identisch, aber Deep-Links in Salesforce-Records muessen den richtigen UI-Kontext beruecksichtigen.

### Prioritaet fuer CEO-Zielgruppe

**HOCH** — Salesforce ist das mit Abstand meistgenutzte CRM im Enterprise-Segment. CEOs grosser Unternehmen haben fast immer Salesforce-Zugang. Besonders wertvoll: Approval Requests (CEOs muessen oft Deals, Rabatte oder Budgets genehmigen) und Opportunity-Pipeline-Updates.

### Geschaetzter Aufwand

**XL (Extra Large)** — Salesforce hat das komplexeste API-Oekosystem aller hier betrachteten Integrationen. Instanz-spezifische URLs, SOQL-Queries, die Vielfalt der Objekte (Opportunities, Leads, Tasks, Cases, Approvals, Chatter), Streaming API fuer Echtzeit, und der Connected-App-Setup-Prozess machen dies zur aufwaendigsten Integration.

---

## 10. Priorisierte Implementierungsreihenfolge

### Bewertungsmatrix

| # | Integration | CEO-Relevanz | Aufwand | API-Qualitaet | Nutzer-Reichweite | Gesamt-Prioritaet |
|---|---|---|---|---|---|---|
| 1 | **Outlook (Vervollst.)** | Hoch | M | Sehr gut | Sehr hoch | **P0 — Sofort** |
| 2 | **Teams (Vervollst.)** | Hoch | M | Gut | Sehr hoch | **P0 — Sofort** |
| 3 | **HubSpot** | Hoch | L | Sehr gut | Hoch | **P1 — Naechste Phase** |
| 4 | **Salesforce** | Hoch | XL | Komplex | Sehr hoch | **P1 — Naechste Phase** |
| 5 | **Linear** | Mittel | M | Exzellent | Mittel | **P2 — Spaetere Phase** |
| 6 | **Jira** | Mittel | L | Mittel | Hoch | **P2 — Spaetere Phase** |
| 7 | **Proton Mail** | Niedrig-Mittel | XL | Schlecht | Gering | **P3 — Zukunft** |

### Empfohlene Implementierungsreihenfolge

#### Phase A: Microsoft-Paritaet (Wochen 1-3)

**1. Microsoft Outlook — Vervollstaendigung**
- Frontend-Library `outlook.ts` analog zu `gmail.ts`
- Vollstaendige Ordnerstruktur (Inbox, Sent, Drafts, Archive, Trash)
- E-Mail-Versand via Graph API
- HTML-Body-Rendering in der Detail-Ansicht
- Delta-Sync fuer effiziente Synchronisation

**2. Microsoft Teams — Vervollstaendigung**
- Kanal-Nachrichten mit @mention-Filterung
- Frontend Chat-View (`teams-channel-view.tsx`)
- Antwort-Funktion in DMs und Kanaelen
- Webhook-basierte Echtzeit-Updates

**Begruendung:** Outlook und Teams teilen sich den OAuth-Flow und sind bereits teilweise implementiert. Maximaler Kundennutzen bei minimalem Zusatzaufwand. Viele Enterprise-CEOs nutzen Microsoft 365 exklusiv.

#### Phase B: CRM-Integrationen (Wochen 4-8)

**3. HubSpot CRM**
- Standard-OAuth-Flow
- Deal-Updates, Task-Zuweisungen, CRM-E-Mails
- Webhook-basierte Echtzeit-Benachrichtigungen
- Intelligentes Scoring (Deals > Tasks > allgemeine E-Mails)

**4. Salesforce CRM**
- OAuth mit instanz-spezifischen URLs
- Opportunity-Updates, Approval Requests, Task-Zuweisungen
- SOQL-basiertes Daten-Fetching
- Priority-Scoring basierend auf Deal-Wert und Urgency

**Begruendung:** CRM-Daten sind fuer CEOs geschaeftskritisch. HubSpot zuerst, da die API entwicklerfreundlicher ist und als Vorlage fuer das CRM-Pattern dient. Salesforce danach, da komplexer aber mit hoeherer Enterprise-Reichweite.

#### Phase C: Projektmanagement (Wochen 9-12)

**5. Linear**
- GraphQL-Integration
- Issue-Zuweisungen, Kommentare, Mentions
- Webhook-Setup
- Markdown-zu-Plaintext-Konvertierung

**6. Jira**
- Atlassian OAuth 3LO
- Issue-Zuweisungen, Kommentare, Sprint-Events
- ADF-zu-Plaintext-Konverter
- JQL-basiertes Filtern

**Begruendung:** Linear vor Jira, da die API moderner und der Aufwand geringer ist. Linear kann als Proof-of-Concept fuer PM-Integrationen dienen. Jira danach fuer breitere Enterprise-Abdeckung.

#### Phase D: Nischen-Integrationen (Zukunft)

**7. Proton Mail**
- Abwarten auf offizielle Proton API
- Falls noetig: Bridge-basierter IMAP-Ansatz als optionales Feature
- Nur implementieren wenn signifikante Nutzernachfrage besteht

**Begruendung:** Der Aufwand steht in keinem Verhaeltnis zur Nutzerbasis. Proton Mail sollte nur implementiert werden, wenn eine offizielle API verfuegbar wird oder mehrere zahlende Kunden die Integration explizit verlangen.

### Schema-Erweiterungen (Querschnittsaufgabe)

Unabhaengig von der Implementierungsreihenfolge muessen folgende Aenderungen vorgenommen werden:

1. **`source`-Typ erweitern** in `src/lib/mock-data.ts`:
   ```typescript
   type Source = "gmail" | "slack" | "gcal" | "outlook" | "teams"
               | "proton" | "hubspot" | "jira" | "linear" | "salesforce";
   ```

2. **`VALID_SOURCES` erweitern** in `tools/normalize_payload.py`:
   ```python
   VALID_SOURCES = {
       "slack", "gmail", "gcal", "outlook", "teams",
       "proton", "hubspot", "jira", "linear", "salesforce"
   }
   ```

3. **`SOURCE_PRIORITY` erweitern** in `tools/score_importance.py`:
   ```python
   SOURCE_PRIORITY = {
       "gmail": 1.5,
       "outlook": 1.5,
       "salesforce": 1.4,  # CRM-Daten sind geschaeftskritisch
       "hubspot": 1.4,
       "proton": 1.3,
       "gcal": 1.2,
       "jira": 1.1,
       "linear": 1.1,
       "slack": 1.0,
       "teams": 1.0,
   }
   ```

4. **Source-Icons und -Farben** im Frontend fuer jede neue Integration definieren.

5. **Settings-UI** (`src/app/settings/page.tsx`): Neue Integrationsabschnitte fuer jede Quelle.

---

### Zusammenfassung

Die priorisierte Reihenfolge maximiert den Kundennutzen bei geringstem Risiko:

- **Sofort (P0):** Outlook und Teams vervollstaendigen — nutzt bestehende Infrastruktur, deckt den Microsoft-365-Markt vollstaendig ab
- **Naechste Phase (P1):** HubSpot und Salesforce — CRM-Integrationen sind das staerkste Differenzierungsmerkmal fuer eine CEO-Inbox
- **Spaetere Phase (P2):** Linear und Jira — wertvoll fuer Tech-CEOs, aber engere Zielgruppe
- **Zukunft (P3):** Proton Mail — erst bei offizieller API oder nachgewiesener Nachfrage

Der geschaetzte Gesamtaufwand fuer alle 7 Integrationen betraegt ca. 10-14 Entwicklerwochen. Die Phasen A und B (Outlook, Teams, HubSpot, Salesforce) allein wuerden ca. 6-8 Wochen dauern und den groessten Geschaeftswert liefern.
