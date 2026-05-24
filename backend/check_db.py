import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.supabase_client import get_service_client

def check_db():
    client = get_service_client()
    res = client.table("lawyers").select("*").execute()
    print("Lawyers in DB:")
    for lawyer in res.data:
        print(f"- {lawyer.get('full_name')} | Status: {lawyer.get('verification_status')} | AuthID: {lawyer.get('auth_id')}")

if __name__ == "__main__":
    check_db()
