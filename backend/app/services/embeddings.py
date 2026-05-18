"""
embeddings.py

FRIEND IMPLEMENTS THIS FILE.

Interface stub for generating text embeddings.
Used by:
  - corpus/scripts/embed.py  (during ingestion)
  - fast_mode.py / verified_mode.py  (at query time)

Do not change method signatures without coordinating with backend lead.
"""


class EmbeddingService:
    """
    Converts text into vector embeddings for semantic search.

    Friend implements using:
        - OpenAI text-embedding-3-small (1536 dims), OR
        - Google text-embedding-004, OR
        - sentence-transformers/paraphrase-multilingual-mpnet (for Indian language support)

    IMPORTANT: Must support all 10 Indian languages supported by the platform.
    Multilingual model strongly recommended.

    Embedding dimensions must match pgvector column size in legal_chunk.py.
    """

    async def embed(self, text: str) -> list[float]:
        """
        Embed a single text string.
        Returns: list of floats (embedding vector)
        """
        raise NotImplementedError("Friend implements this")

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Embed multiple texts in one API call (more efficient).
        Returns: list of embedding vectors, same order as input.
        """
        raise NotImplementedError("Friend implements this")
