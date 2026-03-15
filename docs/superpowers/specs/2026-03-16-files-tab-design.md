# Files Tab — Design Spec
**Date:** 2026-03-16
**Status:** Approved

---

## Overview

Replace the "Decisions" sidebar link with a **Files** tab — a unified file management panel for CEOs to access email/message attachments, browse Google Drive and OneDrive, and upload personal files.

---

## 1. Navigation & Layout

- Replace "Decisions" (`/decisions`) sidebar link with **"Files"** using the `FolderOpen` icon (lucide-react)
- Add `showFiles` boolean state to `page.tsx` (same pattern as `showAIChat`)
- Clicking "Files" sets `showFiles = true`, clears `showAIChat`
- `FilesPanel` renders full-width in the main content area, replacing the message list + detail pane
- `FilesPanel` contains four sub-tabs: **Attachments | Drive | OneDrive | Uploads**

---

## 2. Attachments Tab

- **Data source:** Reads from existing Firestore `messages` collection — files already attached to Gmail, Slack, Teams, Outlook messages
- **UI:** Flat list sorted by date descending
- **Each row:** file type icon, filename, source badge (Gmail / Slack / Teams / Outlook), sender name, date, file size
- **Filter bar:** `All | PDF | Images | Docs | Other`
- **Click action:** Opens file via download link or preview in new tab
- **No new backend required** — reads existing message data

---

## 3. Drive Tab (Google Drive)

- **Auth state:** If not connected, show "Connect Google Drive" button
- **OAuth:** Add `drive.readonly` scope to existing Google OAuth flow in `/api/gmail/`
- **Token storage:** `users/{uid}/tokens/google_drive` in Firestore
- **UI:** Folder browser with breadcrumb navigation (`My Drive > Folder > Subfolder`)
- **File/folder row:** icon, name, last modified, size
- **Click folder:** navigate into it (update breadcrumb)
- **Click file:** open in Google Drive in new tab
- **API:** Google Drive REST API v3 (`/drive/v3/files`)

---

## 4. OneDrive Tab

- **Auth state:** If not connected, show "Connect OneDrive" button
- **OAuth:** Add `Files.Read` scope to existing Microsoft OAuth flow in `/api/microsoft/`
- **Token storage:** `users/{uid}/tokens/onedrive` in Firestore (reuses existing Microsoft token pattern)
- **UI:** Same folder browser pattern as Drive tab
- **Click file:** open in OneDrive in new tab
- **API:** Microsoft Graph API (`/v1.0/me/drive/root/children`, `/v1.0/me/drive/items/{id}/children`)

---

## 5. Uploads Tab

- **Storage:** Firebase Storage at `users/{uid}/uploads/{filename}`
- **UI:** Grid view — thumbnail for images, file type icon for others; filename, size, upload date
- **Upload:** File picker button → upload to Firebase Storage via client SDK
- **Actions per file:** Download, Delete (removes from Firebase Storage)
- **No external OAuth** — uses existing Firebase client SDK

---

## Component Structure

```
src/
  components/
    files-panel.tsx          # Main panel with sub-tab state
    files-attachments.tsx    # Attachments tab
    files-drive.tsx          # Google Drive folder browser
    files-onedrive.tsx       # OneDrive folder browser
    files-uploads.tsx        # Upload grid
  app/
    api/
      drive/
        route.ts             # List files/folders (Google Drive REST)
        auth/route.ts        # OAuth initiation
        callback/route.ts    # OAuth callback + token storage
      onedrive/
        route.ts             # List files/folders (MS Graph)
        # Reuses /api/microsoft/ for auth
```

---

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `GOOGLE_DRIVE_CLIENT_ID` | Google Drive OAuth (can reuse existing Google OAuth client if drive scope added) |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Google Drive OAuth |
| `GOOGLE_DRIVE_REDIRECT_URI` | OAuth callback URL |
| Microsoft vars already exist | OneDrive reuses `MICROSOFT_CLIENT_ID/SECRET/REDIRECT_URI` |

---

## Invariants

- TypeScript strict — no `any`
- Tailwind only — no inline CSS
- Responsive layout
- Dark mode compatible
- `npm run build` must pass with zero errors
