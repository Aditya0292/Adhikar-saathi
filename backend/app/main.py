import sys
# Dynamic virtualenv isolation: remove global AppData user-site packages from sys.path
# to prevent global package conflicts (like Keras 3 / transformers clash on Windows)
sys.path = [
    p for p in sys.path 
    if not (("AppData" in p or "Roaming" in p) and "site-packages" in p and ".venv" not in p)
]

import os
os.environ["TRANSFORMERS_NO_TF"] = "1"

import time
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import lawyer_auth, lawyer, user_auth, voice, admin, query, documents, maps
from app.config import settings

app = FastAPI(
    title="Adhikar साथी API",
    description="Backend API engine for Adhikar साथी Platform",
    version="1.0.0"
)

# Enable CORS for frontend on port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_origin_regex="http://localhost:.*",  # Fallback wildcard for local ports
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID & Process Time Middleware
@app.middleware("http")
async def add_request_id_and_process_time(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

# Mount routers
app.include_router(lawyer_auth.router, prefix="/api/v1", tags=["Lawyer Portal"])
app.include_router(lawyer_auth.admin_router, prefix="/api/v1", tags=["Admin"])
app.include_router(lawyer.router, prefix="/api/v1", tags=["Lawyer Dashboard"])
app.include_router(user_auth.router, prefix="/api/v1", tags=["User Portal"])
app.include_router(admin.router, prefix="/api/v1")
app.include_router(voice.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1/query", tags=["Query"])
app.include_router(documents.router, prefix="/api/v1")
app.include_router(maps.router, prefix="/api/v1")

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment,
        "version": "1.0.0"
    }
