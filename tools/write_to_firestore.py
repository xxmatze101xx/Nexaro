"""
write_to_firestore.py
Writes a normalized, scored message payload to Firestore.
See: architecture/firebase-sop.md and gemini.md
"""
import os
import firebase_admin
from firebase_admin import firestore
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "nexaro-app-2026")

# Initialize Firebase if not already done
if not firebase_admin._apps:
    firebase_admin.initialize_app(options={"projectId": PROJECT_ID})

db = firestore.client()


def write_message(payload: dict, importance_score: float, user_id: str = "system") -> str:
    """
    Writes a scored message to the 'messages' Firestore collection.
    
    Args:
        payload: Normalized Input Payload from normalize_payload.py
        importance_score: Float 0.0–10.0 from score_importance.py
        user_id: Firebase Auth UID of the message owner
    
    Returns:
        The document ID of the written message.
    """
    doc = {
        "id": payload["id"],
        "source": payload["source"],
        "external_id": payload["external_id"],
        "content": payload["content"],
        "sender": payload["sender"],
        "timestamp": payload["timestamp"],
        "importance_score": importance_score,
        "ai_draft_response": None,
        "status": "unread",
        "uid": user_id,
        "created_at": firestore.SERVER_TIMESTAMP,
    }

    doc_ref = db.collection("messages").document(payload["id"])
    doc_ref.set(doc)
    return payload["id"]


def update_importance_score(doc_id: str, importance_score: float) -> None:
    """
    Overwrites only the importance_score field of an existing message document.
    Called after AI scoring completes to replace the quick Python placeholder.
    """
    db.collection("messages").document(doc_id).update({
        "importance_score": importance_score,
    })


def read_message(doc_id: str) -> dict:
    """Reads a message document by ID."""
    doc = db.collection("messages").document(doc_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


def list_messages(user_id: str, limit: int = 20) -> list:
    """Lists messages for a user, sorted by importance (highest first)."""
    query = (
        db.collection("messages")
        .where("uid", "==", user_id)
        .order_by("importance_score", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )
    return [doc.to_dict() for doc in query.stream()]


# --- Self-test ---
if __name__ == "__main__":
    from normalize_payload import normalize
    from score_importance import score
    from datetime import datetime, timezone

    # Create a test message
    raw = {
        "source": "gmail",
        "external_id": "test-write-001",
        "content": "Please review the quarterly report before tomorrow's meeting.",
        "sender": "manager@company.com",
        "recipient": "ceo@nexaro.com",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metadata": {"thread_id": "thread-quarterly"},
    }

    # Pipeline: normalize → score → write
    normalized = normalize(raw)
    importance = score(normalized)
    doc_id = write_message(normalized, importance)

    print(f"✅ Wrote message to Firestore: {doc_id}")
    print(f"   Importance: {importance}")

    # Read it back
    stored = read_message(doc_id)
    if stored and stored["content"] == normalized["content"]:
        print("✅ Read-back verification: PASSED")
    else:
        print("❌ Read-back verification: FAILED")

    # Cleanup
    db.collection("messages").document(doc_id).delete()
    print("✅ Cleanup: test document deleted")

    print("\nAll write_to_firestore tests PASSED.")
