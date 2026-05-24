import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.supabase_client import get_service_client

def update_db():
    client = get_service_client()
    res = client.table("lawyers").update({"verification_status": "pending"}).eq("verification_status", "under_review").execute()
    print(f"Updated {len(res.data)} lawyers to pending status.")

if __name__ == "__main__":
    update_db()
