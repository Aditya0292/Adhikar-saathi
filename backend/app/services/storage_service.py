from app.supabase_client import get_service_client
from fastapi import UploadFile
import uuid
import structlog

logger = structlog.get_logger()

async def upload_lawyer_document(file: UploadFile, auth_id: str, document_type: str, ext: str, mime_type: str = None) -> str:
    """
    Uploads a document to the lawyer-documents bucket (private).
    Returns the storage path.
    """
    client = get_service_client()
    file_uuid = str(uuid.uuid4())
    path = f"{document_type}/{auth_id}/{file_uuid}.{ext}"
    
    file_bytes = await file.read()
    content_type = mime_type if mime_type else getattr(file, "content_type", None)
    
    try:
        res = client.storage.from_("lawyer-documents").upload(
            path=path,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        return path
    except Exception as e:
        logger.error("storage_upload_failed", error=str(e), path=path)
        raise e

def get_presigned_url(bucket: str, path: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned URL for a private file.
    """
    client = get_service_client()
    try:
        res = client.storage.from_(bucket).create_signed_url(path, expires_in)
        return res.get('signedURL', '')
    except Exception as e:
        logger.error("signed_url_generation_failed", error=str(e), path=path)
        return ""
