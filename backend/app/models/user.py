from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UpdateUserRequest(BaseModel):
    preferred_language: Optional[str] = None
