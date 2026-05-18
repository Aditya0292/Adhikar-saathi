# NyayaSatya 🏛️

> **Legal answers for every Indian** — AI-powered legal advisory platform with verified lawyer discovery.

NyayaSatya is an Indian legal advisory platform that lets anyone ask legal questions in their language and get AI-generated answers grounded in Indian law, with the option to connect with a verified local lawyer.

---

## What Is This?

| Feature | Description |
|---------|-------------|
| **Ask a Question** | Get instant AI answers in 10 Indian languages (Fast Mode) or citation-verified answers (Verified Mode) |
| **Find a Lawyer** | GPS-aware search for verified advocates filtered by specialisation, fee, language, and location |
| **Document Scanner** | Upload a contract or legal notice — get a risk score, plain-language summary, and key clause highlights |
| **Lawyer Registration** | Full Indian bar verification flow (Enrollment Number + COP + Govt ID) with admin approval |

---

## System Architecture & Modules

The repository is structured as a monorepo consisting of the platform layer, AI service integrations, database schema definitions, and interactive agent adapters.

### Core Application & Platform Layer
| Module / Area | Component / Path |
|---|---|
| **FastAPI Backend** | `backend/app/` — Main API services, endpoints, and utilities |
| **Authentication Service** | `backend/app/dependencies.py`, `backend/app/supabase_client.py` — Supabase Auth tokens & claims verification |
| **Lawyer Directory APIs** | `backend/app/api/v1/lawyer_auth.py`, `lawyer_service.py` — Advocate verification & matching algorithms |
| **Profile Management** | `backend/app/api/v1/user_auth.py` — User preferences and query logs |
| **Platform Protection** | `backend/app/middleware/rate_limit.py` — Redis-backed sliding window rate limiters |
| **Secure Storage Client** | `backend/app/services/storage_service.py` — File upload handling with Supabase Storage |
| **Interactive Client** | `frontend/src/` — React SPA with Zustand state management and Tailwind layout styling |
| **CI/CD Pipelines** | `.github/workflows/` — Automated test validation and deployment workflows |

### AI, RAG & Agentic Layer
| Module / Area | Component / Path |
|---|---|
| **Fast Mode Service** | `backend/app/services/fast_mode.py` — Real-time direct LLM parsing and multi-language streaming responses |
| **Verified Mode Service** | `backend/app/services/verified_mode.py` — Citations-based Retrieval-Augmented Generation pipeline |
| **Document Processing** | `backend/app/services/doc_service.py` — Legal document parser and risk analyzer (OCR + structural evaluation) |
| **Knowledge Base Embeddings** | `backend/app/models/legal_chunk.py`, `vector_store.py` — Vector indices and search routines |
| **Corpus Pipeline** | `corpus/` — Data cleaning, tokenization, and embedding scripts for primary legislative texts |
| **Voice Channel Adapter** | `agents/vapi_voice/` — Vapi.ai webhook handler for phone advisory |
| **Chat Channel Adapter** | `agents/whatsapp_bot/` — Messaging gateway parser for mobile query support |

---

## Integration Contracts

Platform routes leverage abstract service providers to decoupling route controllers from heavy inference jobs. These service contracts must be adhered to for backend extensibility:

```python
# app/services/fast_mode.py
class FastModeService:
    async def answer(self, query: str, language: str, session_id: str) -> FastModeResponse: ...
    async def stream(self, query: str, language: str, session_id: str): ...  # yields streaming text tokens

# app/services/verified_mode.py
class VerifiedModeService:
    async def answer(self, query: str, language: str, session_id: str) -> VerifiedModeResponse: ...
    async def stream(self, query: str, language: str, session_id: str): ...

# app/services/doc_service.py
class DocService:
    async def process(self, document_id: str, storage_path: str) -> None: ...
    # Updates processing status, summary, risk metrics, flagged elements, and critical clauses
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.11), Pydantic v2, structlog |
| Database | Supabase PostgreSQL 16 + pgvector + Row Level Security |
| Auth | Supabase Auth (Email/Password + Google OAuth) |
| Storage | Supabase Storage (private bucket for lawyer docs) |
| Cache / Rate Limit | Redis 7 |
| Frontend | React 18, TypeScript strict, Vite, Tailwind CSS |
| State | Zustand + TanStack Query v5 |
| Deploy | Railway (backend) + Vercel (frontend) |

---

## Project Structure

```
nyayasatya/
├── backend/          ← FastAPI application, routers, services, and tests
├── frontend/         ← React Single Page Application (UI elements & state)
├── supabase/         ← Migration scripts, RLS rules, and auth triggers
├── corpus/           ← Legal knowledge base documents, extraction and embedding tools
├── agents/           ← Specialized conversational channel handlers (Voice & WhatsApp)
├── .github/          ← CI/CD pipeline pipelines
├── docker-compose.yml
└── README.md
```

---

## Running Locally

### Prerequisites
- Docker Desktop
- Python 3.11+
- Node.js 20+
- Supabase CLI (`npm install -g supabase`)

### 1. Start Infrastructure

```bash
# Spin up Postgres (with pgvector) + Redis
docker compose up -d

# Verify both services are healthy
docker compose ps
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate    # Mac/Linux

# Install dependencies
pip install -e ".[dev]"

# Copy and fill in your Supabase credentials
cp .env.example .env
# Edit .env with your SUPABASE_URL, SUPABASE_ANON_KEY, etc.

# Run database migrations (Supabase)
# Option A: Supabase CLI (recommended)
supabase db push

# Option B: Paste SQL manually in Supabase SQL editor
# Run: supabase/migrations/001_schema.sql
#      supabase/migrations/002_rls.sql
#      supabase/migrations/003_triggers.sql

# Start FastAPI dev server
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and fill in Supabase keys
cp .env.example .env.local
# Edit .env.local with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL

# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

# Start dev server
npm run dev
```

Frontend: http://localhost:5173

---

## Running Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage report
pytest --cov=app --cov-report=term-missing

# Run specific test files
pytest tests/test_lawyer.py -v
pytest tests/test_auth.py -v
pytest tests/test_query_routes.py -v   # AI services are mocked here
```

---

## Supabase Setup (One-Time)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** → copy `URL`, `anon key`, `service_role key`, `JWT secret`
3. Go to **Authentication → Providers** → enable Email, Google OAuth
4. Go to **Storage** → create these buckets:
   - `lawyer-documents` — **Private**
   - `lawyer-photos` — **Public**
   - `user-documents` — **Private**
5. Run all 3 migration files in the **SQL Editor**
6. Seed sample data: run `supabase/seed.sql`

---

## Lawyer Verification Flow

```
Lawyer fills form (Step 1: text details)
         ↓
Supabase Auth account created
         ↓
Lawyer uploads 3 documents (Step 2):
  • Bar Council Enrollment Certificate
  • Certificate of Practice (AIBE) — if enrolled after 2010
  • Government Photo ID (Aadhaar / Voter ID / Passport)
         ↓
Documents stored in private Supabase Storage bucket
         ↓
Admin receives Slack notification
         ↓
Admin reviews → Approve or Reject (with reason)
         ↓
Lawyer gets email notification
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # never expose this
SUPABASE_JWT_SECRET=                  # Settings → API → JWT Secret
REDIS_URL=redis://localhost:6379/0
MAX_FREE_QUERIES_PER_DAY=5
FAST_MODE_ENABLED=true
VERIFIED_MODE_ENABLED=false
DOC_SCANNER_ENABLED=false
SLACK_WEBHOOK_URL=
```

### Frontend (`frontend/.env.local`)
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_MAPS_KEY=
```

---

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | Push to any branch | Lint + type-check + run tests |
| `deploy.yml` | Push to `main` | Deploy backend to Railway, frontend to Vercel |

---

## Development Roadmap

| Stage / Phase | Task Description |
|---|---|
| **Phase 1: Setup** | Repository initialization, local infrastructure configurations, and schema provisioning |
| **Phase 2: Auth & DB** | Supabase project establishment: Auth providers setup, private/public storage buckets provisioning, and SQL schema migrations |
| **Phase 3: Core API** | Backend client integration: JWT token verification dependencies, internal rate-limiting middleware, and Lawyer Registration APIs |
| **Phase 4: Integrations** | User profiles routing, document parsing hooks, and abstract legal query service structures |
| **Phase 5: Client App** | React SPA implementation: Authentication interfaces, multiphase registration wizards, and responsive views |
| **Phase 6: UI Blocks** | Dynamic responsive elements creation: Query inputs, live citation viewers, maps matching layouts, and admin review boards |
| **Phase 7: End-to-End** | Cross-linking front and back channels, validation workflows testing, RAG stubs wiring, and environment deployments (Vercel & Railway) |

---

*NyayaSatya — Legal answers for every Indian 🇮🇳*

