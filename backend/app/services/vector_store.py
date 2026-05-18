"""
vector_store.py

FRIEND IMPLEMENTS THIS FILE.

Interface stub for the Pinecone / pgvector vector store.
Used by fast_mode.py and verified_mode.py for semantic search.

Do not change method signatures without coordinating with backend lead.
"""
from dataclasses import dataclass


@dataclass
class SearchResult:
    chunk_id: str
    source: str           # e.g. "IPC Section 420"
    text: str             # the legal text chunk
    score: float          # cosine similarity score 0.0–1.0
    metadata: dict        # { act, section, year, court, ... }


class VectorStore:
    """
    Semantic search over the Indian legal corpus.

    Friend implements using:
        - Pinecone (cloud vector DB), OR
        - pgvector (already in Supabase Postgres — preferred for MVP)

    Index name / table: legal_chunks (see backend/app/models/legal_chunk.py)
    """

    async def search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        filter_specialisation: str | None = None,   # e.g. "criminal"
        filter_jurisdiction: str | None = None,
    ) -> list[SearchResult]:
        """
        Returns top_k most semantically similar legal chunks.
        """
        raise NotImplementedError("Friend implements this")

    async def upsert(
        self,
        chunk_id: str,
        embedding: list[float],
        text: str,
        metadata: dict,
    ) -> None:
        """
        Inserts or updates a legal chunk embedding.
        Called by corpus/scripts/embed.py during ingestion.
        """
        raise NotImplementedError("Friend implements this")
