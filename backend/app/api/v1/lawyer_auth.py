from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
import httpx
import structlog
from gotrue.errors import AuthApiError

from app.models.lawyer import LawyerRegistrationStep1, LawyerVerificationStatus, AdminVerifyLawyerAction, STATE_BAR_COUNCILS
from app.supabase_client import get_service_client, get_anon_client
from app.dependencies import require_user, require_lawyer, require_admin
from app.utils.file_validation import validate_file
from app.services.storage_service import upload_lawyer_document, get_presigned_url
from app.config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/lawyers", tags=["Lawyers"])
admin_router = APIRouter(prefix="/admin/lawyers", tags=["Admin"])

import json

@router.post("/register/complete")
async def register_complete(
    data: str = Form(...),
    enrollment_certificate: UploadFile = File(...),
    certificate_of_practice: Optional[UploadFile] = File(None),
    government_id: UploadFile = File(...)
):
    try:
        parsed_data_dict = json.loads(data)
        lawyer_data = LawyerRegistrationStep1(**parsed_data_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid form data format")
        
    if lawyer_data.state_bar_council not in STATE_BAR_COUNCILS:
        raise HTTPException(status_code=400, detail="Invalid State Bar Council")
        
    client = get_service_client()
    
    # 1. Check uniqueness of enrollment number
    res = client.table("lawyers").select("id").eq("bar_enrollment_number", lawyer_data.bar_enrollment_number).execute()
    if res.data:
        raise HTTPException(status_code=409, detail="This enrollment number is already registered")
        
    if lawyer_data.enrollment_year >= 2010 and not certificate_of_practice:
        raise HTTPException(status_code=400, detail="Certificate of Practice is required for enrollment after 2010")

    # 2. Create Supabase Auth user
    try:
        auth_res = client.auth.admin.create_user({
            "email": lawyer_data.email,
            "password": lawyer_data.password,
            "user_metadata": {"role": "lawyer", "full_name": lawyer_data.full_name},
            "email_confirm": True # In prod, set to False for email verification
        })
        auth_id = auth_res.user.id
    except AuthApiError as e:
        if "already registered" in str(e).lower() or "already exists" in str(e).lower():
            raise HTTPException(status_code=409, detail="Email already registered")
        logger.error("supabase_auth_creation_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Error creating account")
    except Exception as e:
        logger.error("supabase_auth_creation_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Error creating account")

    # 3. Upload documents using the new auth_id
    try:
        mime1, ext1 = validate_file(enrollment_certificate)
        path1 = await upload_lawyer_document(enrollment_certificate, auth_id, "enrollment-certificates", ext1, mime1)
        
        path2 = None
        if certificate_of_practice:
            mime2, ext2 = validate_file(certificate_of_practice)
            path2 = await upload_lawyer_document(certificate_of_practice, auth_id, "certificates-of-practice", ext2, mime2)
            
        mime3, ext3 = validate_file(government_id)
        path3 = await upload_lawyer_document(government_id, auth_id, "government-ids", ext3, mime3)
    except Exception as e:
        logger.error("document_upload_failed", error=str(e))
        client.auth.admin.delete_user(auth_id)
        raise HTTPException(status_code=400, detail=str(e))

    # 4. Insert into public.lawyers
    db_data = lawyer_data.model_dump(exclude={"password"})
    db_data["auth_id"] = auth_id
    db_data["is_verified"] = False
    db_data["verification_status"] = "pending"
    db_data["enrollment_certificate_path"] = path1
    db_data["certificate_of_practice_path"] = path2
    db_data["government_id_path"] = path3
    
    insert_res = client.table("lawyers").insert(db_data).execute()
    
    # 5. Slack Alert
    if settings.slack_webhook_url:
        try:
            async with httpx.AsyncClient() as http_client:
                await http_client.post(settings.slack_webhook_url, json={
                    "text": f"🔔 New lawyer registration: {lawyer_data.full_name}, {lawyer_data.bar_enrollment_number}, {lawyer_data.city}. Review at /admin/lawyers"
                })
        except Exception as e:
            logger.error("slack_alert_failed", error=str(e))
            
    return {"message": "Account created and documents uploaded successfully. Verification takes 24-48 hours. We'll notify you by email."}

@router.get("/me/status", response_model=LawyerVerificationStatus)
async def get_lawyer_status(user: dict = Depends(require_user)): # Use require_user to allow pending lawyers to check status
    if user.get("user_role") != "lawyer":
        raise HTTPException(status_code=403, detail="Only lawyers can check status")
        
    client = get_service_client()
    res = client.table("lawyers").select("verification_status, rejection_reason, is_verified").eq("auth_id", user["sub"]).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Lawyer profile not found")
        
    return res.data[0]

# --- Admin Routes ---

@admin_router.get("/pending")
async def get_pending_lawyers(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    client = get_service_client()
    query = client.table("lawyers").select("*")
    
    if status and status != "all":
        query = query.eq("verification_status", status)
    
    res = query.execute()
    lawyers = res.data
    
    for lawyer in lawyers:
        lawyer["enrollment_certificate_url"] = get_presigned_url("lawyer-documents", lawyer.get("enrollment_certificate_path")) if lawyer.get("enrollment_certificate_path") else None
        lawyer["certificate_of_practice_url"] = get_presigned_url("lawyer-documents", lawyer.get("certificate_of_practice_path")) if lawyer.get("certificate_of_practice_path") else None
        lawyer["government_id_url"] = get_presigned_url("lawyer-documents", lawyer.get("government_id_path")) if lawyer.get("government_id_path") else None
        
    return {"items": lawyers}

@admin_router.patch("/{lawyer_id}/verify")
async def verify_lawyer(lawyer_id: str, action_data: AdminVerifyLawyerAction, admin: dict = Depends(require_admin)):
    client = get_service_client()
    
    if action_data.action == "approve":
        update_data = {
            "is_verified": True,
            "verification_status": "verified",
            "verified_by": admin["sub"]
            # verified_at is handled by Postgres or can be set via NOW() trigger.
            # We'll rely on the default setup or we can pass a timestamp if we want.
        }
    else: # reject
        if not action_data.rejection_reason or len(action_data.rejection_reason) < 10:
            raise HTTPException(status_code=400, detail="Rejection reason is required and must be at least 10 characters")
        update_data = {
            "is_verified": False,
            "verification_status": "rejected",
            "rejection_reason": action_data.rejection_reason
        }
        
    res = client.table("lawyers").update(update_data).eq("id", lawyer_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Lawyer not found")
        
    return res.data[0]

@admin_router.patch("/{lawyer_id}/reset-for-resubmission")
async def reset_lawyer_resubmission(lawyer_id: str, admin: dict = Depends(require_admin)):
    client = get_service_client()
    
    update_data = {
        "verification_status": "pending",
        "enrollment_certificate_path": None,
        "certificate_of_practice_path": None,
        "government_id_path": None,
        "rejection_reason": None
    }
    
    res = client.table("lawyers").update(update_data).eq("id", lawyer_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Lawyer not found")
        
    return {"message": "Lawyer reset for resubmission", "lawyer": res.data[0]}
