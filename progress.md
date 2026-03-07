# Progress Log

## Phase 1: Blueprint ✅
- Answered 5 discovery questions
- Defined Input/Output data schema in gemini.md
- Researched unified inbox landscape → custom integration layers needed

## Phase 2: Link ✅
- Created Firebase project `nexaro-app-2026`
- Enabled Firestore API, created database
- Handshake test: PASSED (write + read-back)

## Phase 3: Architect ✅
- Defined SOPs (system-overview, firebase, integration, ai-scoring) in `architecture/`.
- Created Python tool pipeline (`normalize_payload`, `score_importance`, `write_to_firestore`).
- Initialized Next.js web application (`src/`).
- Built core UI components (MessageCard, AIDraftPanel, SourceFilter, ImportanceBadge).
- Verified Next.js Dashboard page and routing visually.
- Developed Auth Login and Settings Pages.

## Phase 4: Stylize & Integrations ✅
- Created `mock_adapter.py` to generate sample messages and pump them into Firestore.
- Wired Next.js Dashboard to Firestore with real-time `onSnapshot` listener.
- Generated Firebase Web SDK Config and applied to Next.js `.env.local`.

## CLAUDE.md Backlog — Active Run

### Phase 2: Firebase Auth

#### AUTH-01 ✅
- Created `src/contexts/AuthContext.tsx` — AuthProvider + useAuth hook; creates Firestore user doc on first login
- Created `src/components/AuthGuard.tsx` — redirects unauthenticated users to /login, shows spinner while loading
- Added AuthProvider to `src/app/layout.tsx`
- Protected `/`, `/calendar`, `/contacts`, `/settings` with AuthGuard
- Removed redundant `onAuthStateChanged` from dashboard, calendar, settings pages — all use `useAuth()` now
- Fixed `any` in `user.ts` (FieldValue | Timestamp), `login/page.tsx` (catch blocks), and `user.ts` accounts array

### Phase 1: Critical Bugs

#### BUG-01: Reply-Funktion ✅
- Fixed `sendEmail` to pass `threadId` in Gmail API body (required for threading)
- Fixed `inReplyTo`/`references` headers: now use RFC `Message-ID` header extracted by `parseGmailToNexaroMessage`, not the Gmail message ID
- Added `rfcMessageId` and `threadId` fields to `Message` interface and parser
- Reply now sends to `senderEmail` (not display name)
- Fixed `catch (e: any)` → `catch (e: unknown)` + type guard

#### BUG-03: Settings-Tabs ✅
- Added `activeTab` state and filtering logic to `IntegrationsSection`
- Wired search input (previously no-op)
- Refactored `settings/page.tsx` from 741 lines into 4 components under `src/components/settings/`
- Fixed all `any` violations, `catch (e: any)` → `catch (e: unknown)` throughout settings page

#### BUG-02: Archivieren/Markieren ✅
- Added `archiveEmail()` to `gmail.ts` (removes INBOX label + updates IndexedDB cache)
- Replaced `alert()` stubs in `message-card.tsx` and `ai-draft-panel.tsx` with real API calls
- Replaced inline SVGs with Lucide `Archive`, `Eye`, `EyeOff` icons
- Added `onArchive` / `onToggleRead` callbacks to `MessageCard`
- Added `onArchived` / `onStatusChanged` callbacks to `AIDraftPanel`
- Wired all handlers in `page.tsx` with optimistic local state updates
- Eliminated `any` in `gmail.ts`, `page.tsx` (User type, GmailMessage interfaces)

### Phase 3: AI

#### AI-01: Python Scores in UI ✅
- Added `subscribeToGmailScores()` to `gmail.ts` — real-time Firestore listener mapping `external_id → importance_score`
- Updated `ImportanceBadge` to display 0–100 scale (×10 from Python 0–10) with correct thresholds (80+ red, 50–79 amber, <50 gray)
- Wired score overlay in `page.tsx` `allMessages` memo — Firestore scores override Gmail API heuristic scores by `external_id`

#### AI-02: Echtes AI Smart Reply ✅
- Created `/api/ai/draft/route.ts` — Gemini `gemini-2.0-flash` call, `maxOutputTokens: 400`, professional reply prompt
- Wired `handleGenerateDraft` in `ai-draft-panel.tsx` — calls `/api/ai/draft`, sets draft text, opens reply textarea
- Wired "Generate Draft" empty-state button and "Regenerate" button to `handleGenerateDraft` with `isGenerating` loading state
- Requires `GEMINI_API_KEY` in `.env.local`

### Phase 4: Slack

#### SLACK-01 ✅
- Created `tools/adapters/slack_adapter.py` — fetches DMs (conversations.list + conversations.history) and @mentions (search.messages) newer than `since`
- Implements integration-sop.md contract: `fetch_messages(credentials, since) → list[dict]`
- Exponential back-off on rate limits, user ID → display name cache
- Normalize → score → Firestore pipeline in `main()`

#### SLACK-02 ✅
- Created `/api/slack/connect` — redirects to Slack OAuth with scopes: channels:history, im:history, im:read, users:read, search:read, chat:write
- Created `/api/slack/callback` — exchanges code, writes token to Firestore via REST API (no firebase-admin dep)
- Token stored at: `users/{uid}/tokens/slack`

#### SLACK-03 ✅
- Added `getSlackConnection()` / `disconnectSlack()` to `user.ts`
- Settings page checks actual Slack token status from Firestore
- `handleConnectProvider("Slack")` redirects to `/api/slack/connect?uid=...`
- Slack already present in `SOURCE_CONFIG` (source-filter.tsx); messages with `source: "slack"` show Slack icon automatically

### Phase 5: Microsoft

#### MS-01 ✅
- Created `/api/microsoft/connect` — redirects to Microsoft OAuth with scopes: User.Read, Mail.Read, Mail.Send, Calendars.Read, Chat.Read
- Created `/api/microsoft/callback` — exchanges code, fetches Graph profile, writes token to Firestore via REST
- Created `/api/microsoft/refresh` — refreshes access token via refresh_token
- Token stored at: `users/{uid}/tokens/microsoft`

#### MS-02 ✅
- Created `tools/adapters/outlook_adapter.py` — fetches inbox messages via Microsoft Graph `/me/mailFolders/inbox/messages`
- OData filter for `receivedDateTime >= since`, extracts from/subject/bodyPreview
- Auto-refreshes access token via MICROSOFT_CLIENT_ID/SECRET/REDIRECT_URI env vars
- Normalize → score → Firestore pipeline

#### MS-03 ✅
- Created `tools/adapters/teams_adapter.py` — fetches Teams DMs (1:1 + group chats) via `/me/chats` + `/me/chats/{id}/messages`
- HTML body stripping, skip deleted/system messages
- Source: "teams" — matches SOURCE_CONFIG in source-filter.tsx

### Phase 6: Polish

#### Dark/Light Mode ✅
- Preference persisted in `localStorage` ("nexaro-dark-mode")
- Restored on next load in DashboardContent useEffect
- Sun/Moon toggle button added to header

#### Keyboard Shortcuts ✅
- `e` → archive selected message
- `r` → reply (triggers `nexaro:reply` custom event, AIDraftPanel listens)
- `?` → toggle shortcuts overlay
- `Esc` → close overlay
- Inputs/textareas are excluded from shortcut handling
- Shortcuts overlay modal with keyboard legend

#### Global Search ✅
- Sidebar search input wired to `searchQuery` state (previously disconnected)
- Header search bar and sidebar search bar both filter `filteredMessages`
- Searches: message content + sender name

## Phase 5: Trigger ✅
- Created `daemon.py` to automate mock message generation at random intervals.
- Established `.gitignore` for Python and Node environments.
- Initialized and committed total project state to local Git repository.
