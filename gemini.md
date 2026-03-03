# Gemini - Project Law

## Data Schema (Input/Output shapes)

### Input Payload (from Integrations to System)
```json
{
  "source": "slack|gmail|gcal|outlook|teams|proton|apple",
  "external_id": "string",
  "content": "string",
  "sender": "string",
  "recipient": "string",
  "timestamp": "ISO8601",
  "metadata": {
    "thread_id": "string?",
    "attachments": "array?"
  }
}
```

### Output Payload / Source of Truth (Firebase Document)
```json
{
  "id": "uuid",
  "source": "slack|gmail|gcal|outlook|teams|proton|apple",
  "external_id": "string",
  "content": "string",
  "sender": "string",
  "timestamp": "ISO8601",
  "importance_score": 0.0,
  "ai_draft_response": "string?",
  "status": "unread|read|replied|archived"
}
```

## Behavioral Rules
*(To be defined)*

## Architecture Specs
*(To be defined)*

## Maintenance Log
*(To be defined)*
