import os
import sys

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.supabase_client import get_service_client

def create_bucket():
    client = get_service_client()
    bucket_name = "lawyer-documents"
    
    print(f"Attempting to create storage bucket: {bucket_name}")
    try:
        # Create a private bucket
        res = client.storage.create_bucket(bucket_name, {"public": False})
        print(f"Success! Bucket '{bucket_name}' created.")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            print(f"Bucket '{bucket_name}' already exists.")
        else:
            print(f"Error: {e}")

if __name__ == "__main__":
    create_bucket()
