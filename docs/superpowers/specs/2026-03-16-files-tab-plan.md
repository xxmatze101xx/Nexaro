# Files Tab — Implementation Plan
**Date:** 2026-03-16
**Spec:** 2026-03-16-files-tab-design.md

Each step is independently shippable and testable.

---

## Step 1 — Navigation: Replace Decisions with Files

**File:** `src/app/page.tsx`

- Add `showFiles` boolean state (default `false`)
- Add `setShowFiles` to the cascading panel logic (clears `showAIChat`, `showDecisions`)
- Replace "Decisions" sidebar link with "Files" button (same style as AI Chat button)
  - Icon: `FolderOpen` from lucide-react
  - Label: "Files"
  - onClick: `setShowFiles(true)`, `setShowAIChat(false)`
- Add `FilesPanel` to the conditional render block:
  ```
  showFiles ? <FilesPanel userId={user.uid} />
  : showAIChat ? <AIChatPanel />
  : ...
  ```
- Remove Decisions link from sidebar (keep `/decisions` page route intact for now)

**Done when:** Clicking "Files" in sidebar renders an empty `FilesPanel` placeholder. Build passes.

---

## Step 2 — FilesPanel Shell with Sub-tabs

**New file:** `src/components/files-panel.tsx`

- Props: `userId: string`
- Sub-tab state: `activeTab: 'attachments' | 'drive' | 'onedrive' | 'uploads'` (default `'attachments'`)
- Tab bar at top: Attachments | Drive | OneDrive | Uploads
- Each tab renders its own component (stubbed initially)
- Full-height flex column layout matching `AIChatPanel` style
- Dark mode compatible

**Done when:** Tab bar renders, switching tabs shows placeholder content for each. Build passes.

---

## Step 3 — Attachments Tab

**New file:** `src/components/files-attachments.tsx`

- Props: `userId: string`
- Query Firestore `messages` collection for docs with non-empty `attachments` array
- Each attachment row: file type icon (based on MIME/extension), filename, source badge, sender, date, size
- Filter chips: `All | PDF | Images | Docs | Other`
- Click → `window.open(attachment.url, '_blank')`
- Loading skeleton + empty state ("No attachments found")

**Firestore query:**
```
collection('messages')
  .where('userId', '==', userId)
  .where('hasAttachments', '==', true)
  .orderBy('date', 'desc')
```

**Done when:** Attachments tab shows real attachment data from existing messages. Build passes.

---

## Step 4 — Uploads Tab

**New file:** `src/components/files-uploads.tsx`

- Props: `userId: string`
- Firebase Storage path: `users/{userId}/uploads/`
- List all files via `listAll(ref)` → display in grid
- Each item: thumbnail (images) or file icon, filename, size, upload date
- "Upload File" button → hidden `<input type="file">` → `uploadBytesResumable()` with progress bar
- Delete button per file → `deleteObject(ref)` + refresh list
- Download button → `getDownloadURL(ref)` → `window.open(url)`

**Done when:** Can upload, list, download, and delete files. Build passes.

---

## Step 5 — Google Drive OAuth + API Routes

**New files:**
- `src/app/api/drive/auth/route.ts` — initiates OAuth (redirects to Google)
- `src/app/api/drive/callback/route.ts` — handles callback, stores token to `users/{uid}/tokens/google_drive`
- `src/app/api/drive/route.ts` — lists files/folders (`GET ?folderId=root`)

**OAuth scopes to add:** `https://www.googleapis.com/auth/drive.readonly`

**Token storage pattern** (matches existing Slack/Microsoft):
```typescript
// users/{uid}/tokens/google_drive
{ access_token, refresh_token, expiry }
```

**Drive API calls:**
```
GET https://www.googleapis.com/drive/v3/files
  ?q='${folderId}' in parents
  &fields=files(id,name,mimeType,size,modifiedTime,webViewLink)
```

**Environment variables needed:**
```
GOOGLE_DRIVE_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET
GOOGLE_DRIVE_REDIRECT_URI
```

**Done when:** OAuth flow completes, token stored, `/api/drive?folderId=root` returns file list. Build passes.

---

## Step 6 — Drive Tab UI

**New file:** `src/components/files-drive.tsx`

- Props: `userId: string`
- On mount: check `users/{uid}/tokens/google_drive` in Firestore
  - Not connected → show "Connect Google Drive" button (links to `/api/drive/auth`)
  - Connected → fetch `/api/drive?folderId=root`
- Breadcrumb: `My Drive > Folder > Subfolder` (array of `{id, name}`)
- File/folder list: folder icon or file icon, name, modified date, size
- Click folder → push to breadcrumb, fetch children
- Click breadcrumb segment → navigate back
- Click file → `window.open(file.webViewLink, '_blank')`
- Loading state + empty state

**Done when:** Can browse Google Drive folder tree. Build passes.

---

## Step 7 — OneDrive Tab UI + Extended Microsoft OAuth

**Extend:** `src/app/api/microsoft/callback/route.ts`
- Add `Files.Read` to Microsoft OAuth scope request

**New file:** `src/app/api/onedrive/route.ts`
- Lists OneDrive files: `GET /v1.0/me/drive/items/{itemId}/children`
- Uses token from `users/{uid}/tokens/onedrive` (same as Microsoft token)
- Token storage key: `users/{uid}/tokens/onedrive` (alias to existing Microsoft token)

**New file:** `src/components/files-onedrive.tsx`
- Same folder browser pattern as `files-drive.tsx`
- On mount: check `users/{uid}/tokens/onedrive`
  - Not connected → "Connect OneDrive" button (links to `/api/microsoft/auth?service=onedrive`)
  - Connected → fetch `/api/onedrive?itemId=root`
- Same breadcrumb + file list + click-to-open pattern

**Done when:** Can browse OneDrive folder tree (pending credentials). Build passes.

---

## Step 8 — Polish & Invariants Check

- Dark mode audit across all new components
- Responsive check (1080p, 1440p)
- Remove any `any` types — strict TypeScript throughout
- `npm run build` zero errors
- Update `taskstodo.md` and `progress.md`

---

## Environment Variables Summary

| Variable | Used By | Status |
|----------|---------|--------|
| `GOOGLE_DRIVE_CLIENT_ID` | Drive OAuth | New |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Drive OAuth | New |
| `GOOGLE_DRIVE_REDIRECT_URI` | Drive OAuth | New |
| `MICROSOFT_CLIENT_ID` | OneDrive OAuth | Already exists |
| `MICROSOFT_CLIENT_SECRET` | OneDrive OAuth | Already exists |
| `MICROSOFT_REDIRECT_URI` | OneDrive OAuth | Already exists |

---

## File Checklist

```
src/
  app/
    page.tsx                          # MODIFY — add showFiles state + FilesPanel
    api/
      drive/
        auth/route.ts                 # NEW
        callback/route.ts             # NEW
        route.ts                      # NEW
      onedrive/
        route.ts                      # NEW
      microsoft/
        callback/route.ts             # MODIFY — add Files.Read scope
  components/
    files-panel.tsx                   # NEW — shell + sub-tabs
    files-attachments.tsx             # NEW
    files-drive.tsx                   # NEW
    files-onedrive.tsx                # NEW
    files-uploads.tsx                 # NEW
```
