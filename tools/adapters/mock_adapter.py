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
from score_importance import score, get_badge
from write_to_firestore import write_message

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
    
    # Generate 10 mock messages
    num_messages = 10
    logger.info(f"Generating {num_messages} mock messages...")
    
    for _ in range(num_messages):
        raw_msg = generate_mock_message()
        
        # 1. Normalize
        normalized = normalize(raw_msg)
        
        # 2. Score
        importance_score = score(normalized)
        
        # 3. Write to Firestore
        doc_id = write_message(normalized, importance_score)
        if doc_id:
            logger.info(f"Successfully processed mock message from {normalized['source']} with score {importance_score}")
        else:
            logger.error(f"Failed to process message from {normalized['source']}")

    logger.info("Mock generation complete.")

if __name__ == "__main__":
    main()
