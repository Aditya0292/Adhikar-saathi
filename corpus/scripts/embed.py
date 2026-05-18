"""
corpus/scripts/embed.py

FRIEND IMPLEMENTS THIS FILE.

Corpus ingestion pipeline — Step 2: Generate embeddings for all chunks
and insert them into the pgvector table (legal_chunks) in Supabase.

Usage:
    python scripts/embed.py --input processed/all_chunks.jsonl
    python scripts/embed.py --input processed/ipc_chunks.jsonl --dry-run

What this script does:
1. Reads processed/*.jsonl files (output of ingest.py)
2. Calls EmbeddingService.embed_batch() in batches of 100
3. Inserts into Supabase public.legal_chunks table via service role client
4. Tracks progress (can resume from last checkpoint)

Supabase connection:
    Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env
    Table: public.legal_chunks (see backend/app/models/legal_chunk.py)

Notes for friend:
- Rate limit: OpenAI embeds ~2000 texts/min — add sleep between batches
- Checkpoint file: processed/.embed_checkpoint.json (tracks last inserted chunk_id)
- Run this ONCE during setup, then incrementally as new laws are added
"""


def main():
    raise NotImplementedError("Friend implements this")


if __name__ == "__main__":
    main()
