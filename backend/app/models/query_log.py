from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import json

class QueryLogSummary(BaseModel):
    id: str
    query_text: str
    mode: str
    was_helpful: Optional[bool]
    created_at: datetime
    
    @classmethod
    def from_db(cls, db_row: dict):
        text = db_row.get("query_text", "")
        # Truncate to 100 chars
        truncated = text if len(text) <= 100 else text[:97] + "..."
        return cls(
            id=str(db_row.get("id")),
            query_text=truncated,
            mode=db_row.get("mode"),
            was_helpful=db_row.get("was_helpful"),
            created_at=db_row.get("created_at")
        )

class PaginatedQueryLogResponse(BaseModel):
    items: list[QueryLogSummary]
    total: int
    page: int
    page_size: int
