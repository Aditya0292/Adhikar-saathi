# NyayaSatya — RAG Mode Backend

Deep Mode legal research backend powered by Pinecone hybrid search, Cohere reranking, HyDE query expansion, and Groq LLM.

---

## Tech Stack

- **FastAPI** — API server
- **Pinecone** — Vector database (hybrid search, 92k+ vectors)
- **Groq** — LLM (llama-3.3-70b-versatile)
- **Cohere** — Reranking
- **SentenceTransformers** — Dense embeddings (mxbai-embed-large-v1)
- **BM25** — Sparse vectors for hybrid search

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat` | Main RAG query endpoint |
| GET | `/health` | Health check |

### `/chat` Request Format
```json
{
  "query": "What is the punishment for murder under BNS?"
}
```

### `/chat` Response Format
```json
{
  "answer": "...",
  "sources": [...],
  "faithfulness_score": 95,
  "verified": true,
  "query_type": "criminal"
}
```

---

## Local Setup

### 1. Clone the repo
```bash
git clone https://github.com/Aditya0292/NyayaSatya.git
cd NyayaSatya/rag-mode
```

### 2. Create virtual environment
```bash
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up environment variables
```bash
cp .env.example .env
# Fill in your API keys in .env
```

### 5. Run the server
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PINECONE_API_KEY` | Pinecone API key |
| `GROQ_API_KEY` | Groq API key |
| `COHERE_API_KEY` | Cohere API key |
| `HF_TOKEN` | HuggingFace token |

---

## Deployment

### Option A — Render

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Set **Root Directory** to `rag-mode`
4. Set **Build Command**:
   ```
   pip install -r requirements.txt
   ```
5. Set **Start Command**:
   ```
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```
6. Add all environment variables under **Environment** tab
7. Select instance type — minimum **Standard** (RAG needs RAM)
8. Click Deploy

---

### Option B — Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select `NyayaSatya` repo
3. Set **Root Directory** to `rag-mode`
4. Add all environment variables under **Variables** tab
5. Railway auto-detects the `Procfile` and deploys
6. Your URL will be shown in the dashboard

---

## Important Notes

- `bm25_encoder.json` **must be committed** to the repo — it is the trained sparse vector index and cannot be regenerated without re-running the full refit script
- Do NOT commit `.env` — use environment variables on the platform
- Minimum RAM recommended: **1GB** (embedding model is large)
- First cold start may take 30-60 seconds to load the embedding model
