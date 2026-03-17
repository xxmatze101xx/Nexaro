import os
import json
import uuid
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
import logging
import firebase_admin
from firebase_admin import credentials, firestore

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import other tools
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from normalize_payload import normalize
from score_importance import score as python_score, get_badge
from score_importance_ai import score_with_ai
from write_to_firestore import write_message, update_importance_score

def generate_mock_message():
    """Generates a realistic mock message from various sources."""
    sources = ["slack", "gmail", "gcal", "outlook", "teams", "proton"]
    senders = [
        "sarah.chen@company.com", "legal@company.com", "billing@contractor.io", 
        "Google Calendar", "Alex Thompson", "newsletter@techdigest.com",
        "Mike Johnson", "Emma Davis"
    ]
    
    source = random.choice(sources)
    sender = random.choice(senders)
    
    # Generate content based on sender/source to make it somewhat realistic
    if sender == "legal@company.com":
        content = "URGENT: Please review and sign the updated partnership agreement with Acme Corp. The deadline is this Friday."
    elif sender == "billing@contractor.io":
        content = "Invoice #2847 for consulting services is attached. Payment due within 30 days. Please process at your earliest convenience."
    elif "Calendar" in sender or source == "gcal":
        content = "Reminder: Weekly standup in 30 minutes. Room: Conference A / Zoom link attached."
    elif sender == "newsletter@techdigest.com":
        content = "Hi! Just wanted to share this interesting article about AI trends in enterprise software. Thought you might find it useful."
    else:
        content = f"Hey team, just checked in on the status of project X. Let me know if you need anything from my end. Thanks, {sender.split('@')[0]}"

    now = datetime.utcnow()
    # Random time in the last 24 hours
    timestamp = (now - timedelta(hours=random.randint(0, 24), minutes=random.randint(0, 60))).isoformat() + "Z"

    raw_payload = {
        "source": source,
        "external_id": f"evt_{uuid.uuid4().hex[:12]}",
        "content": content,
        "sender": sender,
        "timestamp": timestamp
    }
    return raw_payload

def main():
    logger.info("Starting Mock Adapter generation...")

    target_uid = os.getenv("FIREBASE_UID", "system")
    if target_uid == "system":
        logger.warning("FIREBASE_UID not set — messages will be written with uid='system' and won't appear in the UI")

    # Generate 10 mock messages
    num_messages = 10
    logger.info(f"Generating {num_messages} mock messages...")

    for _ in range(num_messages):
        raw_msg = generate_mock_message()

        # 1. Normalize
        normalized = normalize(raw_msg)

        # 2a. Python score — fast heuristic, used as immediate placeholder
        quick_score = python_score(normalized)

        # 3. Write to Firestore immediately so the UI can show the message
        doc_id = write_message(normalized, quick_score, user_id=target_uid)
        if not doc_id:
            logger.error(f"Failed to write message from {normalized['source']}")
            continue

        logger.info(
            f"Written message {doc_id} from {normalized['source']} "
            f"(placeholder score: {quick_score})"
        )

        # 2b. AI score — more accurate, overwrites the placeholder in Firestore.
        # Only a minimal anonymised summary is sent to Gemini (no full body,
        # no personal e-mail addresses). See score_importance_ai.py for details.
        ai_score = score_with_ai(normalized, fallback_score=quick_score)
        if ai_score != quick_score:
            update_importance_score(doc_id, ai_score)
            logger.info(
                f"AI score updated for {doc_id}: {quick_score} → {ai_score}"
            )

    logger.info("Mock generation complete.")

if __name__ == "__main__":
    main()
