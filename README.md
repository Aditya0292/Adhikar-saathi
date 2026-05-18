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

## Who Owns What

### Your Scope (Backend Lead)
| Area | Files |
|------|-------|
| FastAPI backend, all routes | `backend/app/` |
| Supabase Auth integration | `backend/app/dependencies.py`, `backend/app/supabase_client.py` |
| Lawyer registration API + admin verification | `backend/app/api/v1/lawyer_auth.py` |
| User profile routes | `backend/app/api/v1/user_auth.py` |
| Rate limiting (Redis) | `backend/app/middleware/rate_limit.py` |
| Storage (Supabase Storage) | `backend/app/services/storage_service.py` |
| Database schema + RLS + triggers | `supabase/migrations/` |
| Frontend auth flows + all UI components | `frontend/src/` |
| CI/CD pipelines | `.github/workflows/` |

### Friend's Scope (AI/RAG Lead)
| Area | Files |
|------|-------|
| Fast Mode AI service | `backend/app/services/fast_mode.py` |
| Verified Mode RAG service | `backend/app/services/verified_mode.py` |
| Document AI processing | `backend/app/services/doc_service.py` |
| pgvector table + embeddings | `backend/app/models/legal_chunk.py` |
| Legal corpus ingestion | `corpus/` |

**Interface contract** — your friend implements these method signatures (do not change signatures without agreement):

```python
# fast_mode.py
class FastModeService:
    async def answer(self, query: str, language: str, session_id: str) -> FastModeResponse: ...
    async def stream(self, query: str, language: str, session_id: str): ...  # yields str tokens

# verified_mode.py
class VerifiedModeService:
    async def answer(self, query: str, language: str, session_id: str) -> VerifiedModeResponse: ...
    async def stream(self, query: str, language: str, session_id: str): ...

# doc_service.py
class DocService:
    async def process(self, document_id: str, storage_path: str) -> None: ...
    # Must update: processing_status, summary, risk_score, risk_flags, key_clauses
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
├── backend/          ← FastAPI backend (your scope)
├── frontend/         ← React frontend (your scope)
├── supabase/         ← DB migrations, RLS, triggers (your scope)
├── corpus/           ← Legal document corpus (friend's scope)
├── .github/          ← CI/CD workflows
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

## Build Order (Day-by-Day)

| Day | Task |
|-----|------|
| Day 1 AM | `git init`, create GitHub repo, share with friend |
| Day 1 PM | Supabase project setup — Auth, storage buckets, run migrations |
| Day 2 | Backend: Supabase client + JWT auth + lawyer registration API |
| Day 3 | Backend: User routes + document upload |
| Day 4 | Frontend: Auth flows (UserSignUp, LawyerRegister wizard) |
| Day 5 | Frontend: All UI components — LawyerCard, QueryBox, AnswerPanel |
| Day 6 | Wire frontend ↔ backend, end-to-end test full flows |
| Day 7 | Deploy to Railway + Vercel, share staging URL with friend |

---

*NyayaSatya — Legal answers for every Indian 🇮🇳*
