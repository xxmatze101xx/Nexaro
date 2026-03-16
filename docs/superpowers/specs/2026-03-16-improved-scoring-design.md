# Improved Message Scoring System — Design Spec
**Date:** 2026-03-16
**Status:** Approved

## Problem

High-priority emails are being scored too low. Root cause: `score_importance_ai.py` truncates message content to 150 characters before sending to Gemini, which means the AI only reads boilerplate intros ("Hope this finds you well...") and misses the actual urgent content buried in the message body. Additionally, sender identity — a top signal for CEO importance — is stripped to domain-only.

## Solution

Two targeted changes to fix the root cause:

### 1. Expanded AI Context Window

**File:** `tools/score_importance_ai.py`

Increase the information sent to Gemini per message:

| Field | Before | After |
|-------|--------|-------|
| Sender name | Not sent | Abbreviated first initial + last name (`M. Cacic`) |
| Sender email | Domain only (`company.com`) | Full email (`m.cacic@company.com`) |
| Subject | Not sent | Full subject line |
| Content preview | First 150 chars | First 600 chars |

Revised Gemini prompt structure:
```
You are scoring email importance for a CEO (0–10).
Sender: M. Cacic <m.cacic@company.com>
Subject: Q2 board report — sign-off needed by Friday
Preview: [first 600 chars of body]
Reply with a single integer 0–10.
```

**Privacy rationale:** Full email addresses are processed within the user's own pipeline (legitimate interest). First names are abbreviated to initials (`Matteo` → `M.`) to limit identity exposure while preserving sender context for Gemini.

### 2. VIP Sender List

A user-managed list of high-priority senders that applies a local score boost — never sent to Gemini.

**Storage:** Firestore at `users/{uid}/preferences/vip_senders` — array of email addresses.

**Score boost:** `+3.0` applied in `tools/score_importance.py`, capped at 10.0. Applied locally, before or after AI scoring.

**API routes:**
- `GET /api/user/vip` — fetch VIP list for current user
- `POST /api/user/vip` — add email to VIP list
- `DELETE /api/user/vip` — remove email from VIP list

**Settings UI:** Input field + list in the existing Settings panel (alongside existing integration settings).

## Files Changed

| File | Change |
|------|--------|
| `tools/score_importance_ai.py` | Expand preview to 600 chars, add subject + abbreviated sender name + full email |
| `tools/score_importance.py` | Add VIP list boost logic (+3.0, capped at 10) |
| `src/app/api/user/vip/route.ts` | New GET/POST/DELETE API route for VIP management |
| `src/components/settings-panel.tsx` | Add VIP sender input UI |

## Non-Goals

- Behavior feedback loop (track opens/replies to adjust weights) — deferred to future phase
- Changing the heuristic keyword list
- Modifying the 0–10 score scale or badge thresholds
