from fastapi import UploadFile, HTTPException

def validate_file(file: UploadFile, max_size_mb: int = 5):
    # Check file size (Read chunks to determine size without loading entire file in memory, or just read and seek)
    file.file.seek(0, 2) # go to end
    file_size = file.file.tell()
    file.file.seek(0) # rewind
    
    max_size_bytes = max_size_mb * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(status_code=400, detail=f"File {file.filename} exceeds {max_size_mb}MB limit.")
        
    # Magic bytes check
    header = file.file.read(2048)
    file.file.seek(0) # rewind
    
    if header.startswith(b"%PDF"):
        return "application/pdf", "pdf"
    elif header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", "jpg"
    elif header.startswith(b"\x89PNG"):
        return "image/png", "png"
    else:
        raise HTTPException(status_code=400, detail=f"File {file.filename} must be PDF, JPEG, or PNG.")
