# corpus/

> **This entire directory belongs to the AI/RAG lead (friend's scope).**

This is where the Indian legal knowledge base lives — raw statutes, case law, and processed embeddings that power Adhikar साथी's Fast Mode and Verified Mode AI answers.

---

## Directory Structure

```
corpus/
│
├── raw/                        ← Raw legal documents (PDFs, text)
│   ├── ipc/                    ← Indian Penal Code (1860)
│   ├── crpc/                   ← Code of Criminal Procedure (1973)
│   ├── cpc/                    ← Code of Civil Procedure (1908)
│   ├── consumer/               ← Consumer Protection Act (2019)
│   ├── labour/                 ← Industrial Disputes Act + others
│   ├── property/               ← Transfer of Property Act, RERA
│   ├── family/                 ← Hindu Marriage Act, Muslim Personal Law
│   └── cyber/                  ← IT Act (2000) + amendments
│
├── processed/                  ← Chunked + cleaned JSONL files (output of ingest.py)
│   └── .gitkeep
│
├── embeddings/                 ← Optional: cached embedding files
│   └── .gitkeep
│
└── scripts/
    ├── ingest.py               ← Parse PDFs → structured text chunks (JSONL)
    ├── chunk.py                ← Chunking utilities (token-aware splitter)
    ├── clean.py                ← Text cleaning (remove headers, page numbers)
    ├── embed.py                ← Generate embeddings → insert into Supabase pgvector
    ├── run_pipeline.sh         ← Run full pipeline: ingest → clean → chunk → embed
    └── requirements.txt        ← Python deps for corpus scripts
```

---

## Ingestion Pipeline

```
raw/*.pdf  →  ingest.py  →  processed/*.jsonl
                                  ↓
                            embed.py  →  Supabase public.legal_chunks (pgvector)
                                  ↓
                   FastModeService + VerifiedModeService search this at query time
```

### Step 1: Ingest
```bash
cd corpus
python scripts/ingest.py --input raw/ipc/ --output processed/ipc_chunks.jsonl
python scripts/ingest.py --input raw/ --output processed/all_chunks.jsonl --all
```

### Step 2: Embed + Insert
```bash
python scripts/embed.py --input processed/all_chunks.jsonl
# Or run everything at once:
bash scripts/run_pipeline.sh
```

---

## Chunk Output Format (JSONL)

Each line in `processed/*.jsonl`:
```json
{
    "chunk_id": "ipc-420-001",
    "source": "Indian Penal Code",
    "section": "420",
    "title": "Cheating and dishonestly inducing delivery of property",
    "text": "Whoever cheats and thereby dishonestly induces...",
    "act_year": 1860,
    "language": "en",
    "metadata": {
        "act_short": "IPC",
        "chapter": "XVII",
        "punishment": "imprisonment up to 7 years"
    }
}
```

---

## Database Table

See `backend/app/models/legal_chunk.py` — the schema stub is there.  
**Friend fills in the pgvector column and HNSW index.**

Expected schema:
```sql
CREATE TABLE public.legal_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chunk_id TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    section TEXT,
    title TEXT,
    text TEXT NOT NULL,
    embedding vector(1536),          -- dimension matches your embedding model
    act_year INTEGER,
    language TEXT NOT NULL DEFAULT 'en',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.legal_chunks USING hnsw (embedding vector_cosine_ops);
```

---

## Service Interfaces (do not change signatures)

```python
# backend/app/services/fast_mode.py
class FastModeService:
    async def answer(self, query: str, language: str, session_id: str) -> FastModeResponse: ...
    async def stream(self, query: str, language: str, session_id: str): ...  # yields str tokens

# backend/app/services/verified_mode.py
class VerifiedModeService:
    async def answer(self, query: str, language: str, session_id: str) -> VerifiedModeResponse: ...
    async def stream(self, query: str, language: str, session_id: str): ...

# backend/app/services/doc_service.py
class DocService:
    async def process(self, document_id: str, storage_path: str) -> None: ...
    # Must update: processing_status, summary, risk_score, risk_flags, key_clauses

# backend/app/services/vector_store.py
class VectorStore:
    async def search(self, query_embedding, top_k, filter_specialisation, filter_jurisdiction): ...
    async def upsert(self, chunk_id, embedding, text, metadata): ...

# backend/app/services/embeddings.py
class EmbeddingService:
    async def embed(self, text: str) -> list[float]: ...
    async def embed_batch(self, texts: list[str]) -> list[list[float]]: ...

# backend/app/services/hallucination_guard/guard.py
class HallucinationGuard:
    async def check(self, answer, citations, original_query) -> GuardResult: ...

# backend/app/services/case_predictor/predictor.py
class CaseOutcomePredictor:
    async def predict(self, query, specialisation, jurisdiction, language) -> OutcomePrediction: ...
```

---

## Agreed Response Schemas

```python
class FastModeResponse(BaseModel):
    answer: str
    language: str
    latency_ms: int

class Citation(BaseModel):
    source: str          # e.g. "IPC Section 420"
    text: str            # relevant excerpt
    url: str | None      # link to bare acts if available

class VerifiedModeResponse(BaseModel):
    answer: str
    citations: list[Citation]
    hallucination_guard_passed: bool
    latency_ms: int
```

---

## Laws to Include (Priority Order for MVP)

| Priority | Act | File in raw/ |
|----------|-----|-------------|
| P0 | Indian Penal Code 1860 | `raw/ipc/` |
| P0 | Consumer Protection Act 2019 | `raw/consumer/` |
| P0 | Code of Criminal Procedure 1973 | `raw/crpc/` |
| P1 | Transfer of Property Act 1882 + RERA 2016 | `raw/property/` |
| P1 | Hindu Marriage Act 1955 | `raw/family/` |
| P1 | Industrial Disputes Act 1947 | `raw/labour/` |
| P2 | Information Technology Act 2000 | `raw/cyber/` |
| P2 | Code of Civil Procedure 1908 | `raw/cpc/` |

Source for bare acts: [indiankanoon.org](https://indiankanoon.org) or [legislative.gov.in](https://legislative.gov.in)

---

## Environment Variables Needed

```env
# In backend/.env or corpus/.env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # For inserting into legal_chunks

# Embedding model
OPENAI_API_KEY=                    # If using OpenAI embeddings
# OR
GOOGLE_API_KEY=                    # If using Google text-embedding-004
```
