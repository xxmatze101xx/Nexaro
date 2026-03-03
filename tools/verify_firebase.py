import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = "nexaro-app-2026"

def verify_connection():
    print("Initiating Firebase Handshake...")
    try:
        # Set project explicitly so ADC knows which project to target
        options = {"projectId": PROJECT_ID}
        firebase_admin.initialize_app(options=options)
        
        db = firestore.client()
        # Attempt a test write/read
        test_ref = db.collection('system_tests').document('connection_test')
        test_ref.set({'status': 'connected', 'timestamp': firestore.SERVER_TIMESTAMP})
        
        doc = test_ref.get()
        if doc.exists and doc.to_dict().get('status') == 'connected':
            print("✅ Successfully connected to Firebase Firestore!")
            print(f"   Project: {PROJECT_ID}")
            print("   Source of Truth Handshake: PASSED")
            return True
        else:
            print("❌ Failed verification read/write mismatch.")
            return False
            
    except Exception as e:
        print(f"❌ Failed to connect to Firebase: {e}")
        return False

if __name__ == "__main__":
    verify_connection()
