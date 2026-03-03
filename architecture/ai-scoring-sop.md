# AI Scoring & Draft Response SOP

## Importance Scoring (0.0–10.0)

### Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| **Sender Frequency** | 2.0 | Senders the user replies to often score higher |
| **Keywords** | 2.0 | Urgent, deadline, ASAP, meeting, invoice, contract |
| **Recency** | 1.5 | Messages from the last hour score higher than older ones |
| **Source Priority** | 1.5 | User-configurable per integration (e.g., email > Slack) |
| **Thread Depth** | 1.0 | Multi-reply threads indicate ongoing importance |
| **Time Sensitivity** | 2.0 | Calendar events within 24h, messages with date mentions |

### Score Calculation
```
raw_score = sum(factor_value * weight for each factor)
importance_score = min(10.0, max(0.0, raw_score))
```

### Badge Mapping
| Score Range | Badge | Color |
|------------|-------|-------|
| 7.0–10.0 | 🔴 High | `#EF4444` (destructive) |
| 4.0–6.9 | 🟡 Medium | `#F59E0B` |
| 0.0–3.9 | 🟢 Low | `#10B981` (success) |

## AI Draft Response

### When to Generate
- Automatically for messages with `importance_score >= 5.0`.
- On-demand when user clicks "Draft Reply."

### Tone
- Professional, concise, and friendly.
- Matches the user's historical reply patterns (learned over time).

### Learning Loop
1. User sends a reply → store the reply alongside the original message.
2. Periodically analyze reply patterns (tone, length, formality).
3. Update the user's `preferences.ai_tone` profile in Firestore.

### Constraints
- Never auto-send. Always present as a draft for user review.
- Max draft length: 500 characters (to keep responses concise).
- Include a "Regenerate" option with different tone presets.
