"""
Adhikar साथी Legal Doc Scanner — API Routes
==========================================
Upload, SSE status, result, share, delete, list
"""

import asyncio
import json
import secrets
import time
from typing import Optional
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.dependencies import require_user
from app.services import doc_service
from app.supabase_client import get_service_client
from app.utils.redis_client import redis_client

import logging

logger = logging.getLogger("documents_api")

router = APIRouter(prefix="/documents", tags=["Legal Doc Scanner"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CONSTANTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
}

MAGIC_BYTES = {
    "application/pdf": [b"%PDF"],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG"],
    "image/tiff": [b"II*\x00", b"MM\x00*"],
    "image/webp": [],  # Check bytes 8-11 for WEBP
}

PROGRESS_LABELS = {
    (0, 10): "Reading document...",
    (10, 25): "Extracting text...",
    (25, 40): "Identifying document type...",
    (40, 75): "Analysing content...",
    (75, 90): "Cross-referencing Indian laws...",
    (90, 99): "Preparing your report...",
    (100, 100): "Done",
}

EXT_MAP = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/tiff": "tiff",
    "image/webp": "webp",
}


def get_progress_label(progress: int) -> str:
    for (lo, hi), label in PROGRESS_LABELS.items():
        if lo <= progress <= hi:
            return label
    return "Processing..."


def validate_magic_bytes(file_bytes: bytes, content_type: str) -> bool:
    """Verify file content matches declared content type via magic bytes."""
    if content_type == "image/webp":
        return len(file_bytes) > 11 and file_bytes[8:12] == b"WEBP"

    expected = MAGIC_BYTES.get(content_type, [])
    if not expected:
        return True  # No check available

    for magic in expected:
        if file_bytes[:len(magic)] == magic:
            return True
    return False


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ROUTE 1: Upload Document
#  POST /api/v1/documents/upload
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/upload", status_code=202)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(require_user),
):
    """Upload a legal document for AI-powered analysis."""
    user_auth_id = user["sub"]

    # 1. Content type check
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{content_type}'. Accepted: PDF, JPEG, PNG, TIFF, WebP.",
        )

    # 2. Read file
    file_bytes = await file.read()

    # 3. File size check
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum {settings.max_upload_size_mb}MB allowed.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty file uploaded.",
        )

    # 4. Magic bytes validation
    if not validate_magic_bytes(file_bytes, content_type):
        raise HTTPException(
            status_code=422,
            detail="File content does not match the declared file type.",
        )

    # 5. Upload to Supabase Storage
    ext = EXT_MAP.get(content_type, "bin")
    file_uuid = str(uuid4())
    storage_path = f"user-documents/{user_auth_id}/{file_uuid}.{ext}"

    try:
        client = get_service_client()
        try:
            client.storage.from_("user-documents").upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": content_type, "x-upsert": "false"},
            )
        except Exception as upload_err:
            err_str = str(upload_err)
            if "Bucket not found" in err_str or "404" in err_str:
                logger.info("Bucket 'user-documents' not found. Attempting to create it dynamically...")
                try:
                    client.storage.create_bucket("user-documents", options={"public": False})
                    # Retry upload
                    client.storage.from_("user-documents").upload(
                        path=storage_path,
                        file=file_bytes,
                        file_options={"content-type": content_type, "x-upsert": "false"},
                    )
                except Exception as create_err:
                    logger.error(f"Failed to create bucket dynamically: {create_err}")
                    raise upload_err
            else:
                raise upload_err
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to upload document to storage.",
        )

    # 6. Create documents DB row
    doc_id = str(uuid4())
    insert_data = {
        "id": doc_id,
        "user_auth_id": user_auth_id,
        "original_filename": file.filename or "document",
        "storage_path": storage_path,
        "file_size_bytes": len(file_bytes),
        "content_type": content_type,
        "processing_status": "pending",
        "processing_progress": 0,
    }

    try:
        client.table("documents").insert(insert_data).execute()
    except Exception as e:
        logger.error(f"DB insert failed: {e}")
        # Clean up storage
        try:
            client.storage.from_("user-documents").remove([storage_path])
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail="Failed to create document record.",
        )

    # 7. Trigger background processing
    background_tasks.add_task(
        doc_service.process,
        document_id=doc_id,
        storage_path=storage_path,
        content_type=content_type,
    )

    return {
        "document_id": doc_id,
        "status": "processing",
        "message": "Document uploaded. Analysis will complete in 30-60 seconds.",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ROUTE 2: Stream Processing Status (SSE)
#  GET /api/v1/documents/{document_id}/status
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/{document_id}/status")
async def stream_document_status(
    document_id: str,
    user: dict = Depends(require_user),
):
    """Stream processing progress via Server-Sent Events."""
    user_auth_id = user["sub"]

    # Verify document ownership
    client = get_service_client()
    res = client.table("documents").select("id, user_auth_id, processing_status").eq("id", document_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc = res.data[0]
    if doc["user_auth_id"] != user_auth_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    async def event_stream():
        max_duration = 120  # seconds
        start = time.time()
        last_progress = -1

        while (time.time() - start) < max_duration:
            try:
                res = client.table("documents").select(
                    "processing_status, processing_progress, error_message"
                ).eq("id", document_id).execute()

                if not res.data:
                    yield f"data: {json.dumps({'status': 'failed', 'error': 'Document not found'})}\n\n"
                    break

                doc = res.data[0]
                progress = doc.get("processing_progress", 0)
                doc_status = doc.get("processing_status", "pending")

                if progress != last_progress:
                    last_progress = progress
                    event_data = {
                        "progress": progress,
                        "label": get_progress_label(progress),
                        "status": doc_status,
                    }

                    if doc_status == "done":
                        event_data["result_url"] = f"/api/v1/documents/{document_id}/result"
                        yield f"data: {json.dumps(event_data)}\n\n"
                        break

                    if doc_status == "failed":
                        event_data["error"] = doc.get("error_message", "Processing failed. Please try again.")
                        event_data["progress"] = 0
                        yield f"data: {json.dumps(event_data)}\n\n"
                        break

                    yield f"data: {json.dumps(event_data)}\n\n"

            except Exception as e:
                logger.error(f"SSE polling error: {e}")

            await asyncio.sleep(2)

        # Timeout
        yield f"data: {json.dumps({'status': 'timeout', 'error': 'Processing is taking longer than expected. Check back shortly.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ROUTE 3: Get Full Analysis Result
#  GET /api/v1/documents/{document_id}/result
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/{document_id}/result")
async def get_document_result(
    document_id: str,
    user: dict = Depends(require_user),
):
    """Get the complete analysis result for a processed document."""
    user_auth_id = user["sub"]

    client = get_service_client()
    res = client.table("documents").select("*").eq("id", document_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc = res.data[0]
    if doc["user_auth_id"] != user_auth_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    if doc.get("processing_status") != "done":
        raise HTTPException(
            status_code=425,
            detail={
                "status": doc.get("processing_status", "processing"),
                "progress": doc.get("processing_progress", 0),
            },
        )

    doc_type = doc.get("document_type", "other")
    return {
        "document_id": doc["id"],
        "original_filename": doc.get("original_filename", ""),
        "document_type": doc_type,
        "document_type_label": doc_service.DOC_TYPE_LABELS.get(doc_type, "Legal Document"),
        "language": doc.get("document_language", "en"),
        "ocr_confidence": doc.get("ocr_confidence", 1.0),
        "is_handwritten": doc.get("is_handwritten", False),
        "processing_time_ms": doc.get("processing_time_ms", 0),
        "summary": doc.get("summary", ""),
        "key_clauses": doc.get("key_clauses", []),
        "risk_score": doc.get("risk_score", 0.0),
        "risk_tier": doc.get("risk_tier", "low"),
        "risk_summary": doc.get("risk_summary", ""),
        "risk_flags": doc.get("risk_flags", []),
        "critical_dates": doc.get("critical_dates", []),
        "legal_references": doc.get("legal_references", []),
        "suggest_lawyer": doc.get("suggest_lawyer", False),
        "created_at": doc.get("created_at", ""),
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ROUTE 4: Share Document
#  POST /api/v1/documents/{document_id}/share
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/{document_id}/share")
async def share_document(
    document_id: str,
    user: dict = Depends(require_user),
):
    """Generate a shareable link (48hr expiry) for a document analysis."""
    user_auth_id = user["sub"]

    client = get_service_client()
    res = client.table("documents").select("id, user_auth_id, processing_status").eq("id", document_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc = res.data[0]
    if doc["user_auth_id"] != user_auth_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if doc.get("processing_status") != "done":
        raise HTTPException(status_code=400, detail="Document analysis is not yet complete.")

    share_token = secrets.token_urlsafe(32)
    await redis_client.setex(
        f"doc_share:{share_token}",
        48 * 3600,  # 48 hours
        document_id,
    )

    return {
        "share_url": f"/shared/doc/{share_token}",
        "share_token": share_token,
        "expires_in_hours": 48,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ROUTE 4b: Access Shared Document (No Auth)
#  GET /api/v1/documents/shared/{share_token}
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/shared/{share_token}")
async def get_shared_document(share_token: str):
    """Access a shared document analysis (no auth required)."""
    document_id = await redis_client.get(f"doc_share:{share_token}")
    if not document_id:
        raise HTTPException(status_code=404, detail="Share link expired or invalid.")

    client = get_service_client()
    res = client.table("documents").select("*").eq("id", document_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc = res.data[0]
    doc_type = doc.get("document_type", "other")

    # Return analysis without PII
    return {
        "document_id": doc["id"],
        "original_filename": doc.get("original_filename", ""),
        "document_type": doc_type,
        "document_type_label": doc_service.DOC_TYPE_LABELS.get(doc_type, "Legal Document"),
        "language": doc.get("document_language", "en"),
        "ocr_confidence": doc.get("ocr_confidence", 1.0),
        "is_handwritten": doc.get("is_handwritten", False),
        "summary": doc.get("summary", ""),
        "key_clauses": doc.get("key_clauses", []),
        "risk_score": doc.get("risk_score", 0.0),
        "risk_tier": doc.get("risk_tier", "low"),
        "risk_summary": doc.get("risk_summary", ""),
        "risk_flags": doc.get("risk_flags", []),
        "critical_dates": doc.get("critical_dates", []),
        "legal_references": doc.get("legal_references", []),
        "suggest_lawyer": doc.get("suggest_lawyer", False),
        "shared": True,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ROUTE 5: Delete Document
#  DELETE /api/v1/documents/{document_id}
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    user: dict = Depends(require_user),
):
    """Delete a document and its analysis."""
    user_auth_id = user["sub"]

    client = get_service_client()
    res = client.table("documents").select("id, user_auth_id, storage_path").eq("id", document_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc = res.data[0]
    if doc["user_auth_id"] != user_auth_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Delete from storage
    storage_path = doc.get("storage_path", "")
    if storage_path:
        try:
            client.storage.from_("user-documents").remove([storage_path])
        except Exception as e:
            logger.warning(f"Storage delete failed (continuing): {e}")

    # Delete from DB
    client.table("documents").delete().eq("id", document_id).execute()
    return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ROUTE 6: List My Documents
#  GET /api/v1/documents/my
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/my")
async def list_my_documents(
    user: dict = Depends(require_user),
):
    """List the authenticated user's uploaded documents."""
    user_auth_id = user["sub"]

    client = get_service_client()
    res = (
        client.table("documents")
        .select(
            "id, original_filename, document_type, risk_tier, risk_score, "
            "processing_status, processing_progress, created_at, suggest_lawyer"
        )
        .eq("user_auth_id", user_auth_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    documents = []
    for doc in (res.data or []):
        doc_type = doc.get("document_type", "other")
        documents.append({
            "id": doc["id"],
            "original_filename": doc.get("original_filename", ""),
            "document_type": doc_type,
            "document_type_label": doc_service.DOC_TYPE_LABELS.get(doc_type, "Legal Document"),
            "risk_tier": doc.get("risk_tier"),
            "risk_score": doc.get("risk_score"),
            "processing_status": doc.get("processing_status", "pending"),
            "processing_progress": doc.get("processing_progress", 0),
            "suggest_lawyer": doc.get("suggest_lawyer", False),
            "created_at": doc.get("created_at", ""),
        })

    return {"documents": documents}
