import time
import subprocess
import os
import sys
import logging
import random

# Setup logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - [DAEMON] %(message)s'
)
logger = logging.getLogger(__name__)

# Ensure we run from the project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADAPTER_SCRIPT = os.path.join(PROJECT_ROOT, "tools", "adapters", "mock_adapter.py")

def main():
    logger.info("Starting Nexaro Mock Adapter Daemon...")
    logger.info("This daemon will generate new test messages at random intervals to simulate a live inbox.")
    
    try:
        while True:
            # Random wait time between 30 seconds and 3 minutes
            wait_seconds = random.randint(30, 180)
            logger.info(f"Waiting {wait_seconds} seconds before next batch...")
            time.sleep(wait_seconds)
            
            logger.info("Triggering mock adapter run...")
            
            # Setup environment to ensure imports work
            env = os.environ.copy()
            env["PYTHONPATH"] = os.path.join(PROJECT_ROOT, "tools")
            
            result = subprocess.run(
                [sys.executable, ADAPTER_SCRIPT],
                cwd=PROJECT_ROOT,
                env=env,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("Mock adapter successfully generated new messages.")
            else:
                logger.error(f"Mock adapter failed with exit code {result.returncode}")
                logger.error(f"Stderr: {result.stderr}")
                
    except KeyboardInterrupt:
        logger.info("Daemon stopped by user.")

if __name__ == "__main__":
    main()
