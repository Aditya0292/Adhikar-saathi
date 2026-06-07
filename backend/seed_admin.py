import os
import sys

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.supabase_client import get_service_client

def seed_admin():
    client = get_service_client()
    email = "admin@adhikarsathi.com"
    password = "AdminPassword123!"
    
    print(f"Attempting to create admin user: {email}")
    try:
        # Create user
        res = client.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "app_metadata": {"user_role": "admin", "is_admin": True}
        })
        print(f"Success! Admin created with ID: {res.user.id}")
        print(f"Email: {email}")
        print(f"Password: {password}")
    except Exception as e:
        if "already registered" in str(e).lower() or "already exists" in str(e).lower():
            print(f"User {email} already exists. Attempting to update claims...")
            # If user exists, we need to find them and update claims.
            # Unfortunately Supabase python client doesn't easily expose get_user_by_email
            # We'll just print instructions.
            print("To update claims, please delete the user in Supabase dashboard and re-run this script, or use the UI to add the claim.")
        else:
            print(f"Error: {e}")

if __name__ == "__main__":
    seed_admin()
