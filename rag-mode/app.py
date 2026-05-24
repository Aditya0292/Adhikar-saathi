from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
from collections import deque, defaultdict
import os
import json
import logging
from dotenv import load_dotenv

from groq import Groq
from pinecone import Pinecone

from rag import retrieve, index, index_name
from prompt import build_prompt, build_no_context_prompt, build_faithfulness_prompt

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize clients
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiter Setup
RATE_LIMIT = 30
TIME_WINDOW = 60 # seconds
request_tracker = defaultdict(deque)

def check_rate_limit(ip: str):
    current_time = time.time()
    tracker = request_tracker[ip]
    
    # Remove timestamps older than the time window
    while tracker and current_time - tracker[0] > TIME_WINDOW:
        tracker.popleft()
        
    if len(tracker) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too Many Requests")
        
    tracker.append(current_time)

class QueryRequest(BaseModel):
    query: str

def classify_query(query: str) -> str:
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Classify the following Indian legal query into ONE of these exact categories: criminal, civil, consumer, constitutional, labour, women, other. If the query is about domestic violence, PWDVA, women's rights, or harassment of wife, output 'women'. Output ONLY the category word."},
                {"role": "user", "content": query}
            ],
            temperature=0.1,
            max_tokens=20
        )
        return completion.choices[0].message.content.strip().lower()
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return "other"

def check_faithfulness(answer: str, context: str) -> dict:
    prompt = build_faithfulness_prompt(answer, context)
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=300,
            response_format={"type": "json_object"}
        )
        result = json.loads(completion.choices[0].message.content)
        return {
            "faithful": result.get("faithful", True),
            "score": result.get("score", 50),
            "hallucinated_claims": result.get("hallucinated_claims", [])
        }
    except Exception as e:
        logger.error(f"Faithfulness check error: {e}")
        # Default fallback
        return {"faithful": True, "score": 50, "hallucinated_claims": []}

@app.get("/health")
def health_check():
    try:
        stats = index.describe_index_stats()
        return {
            "status": "healthy",
            "pinecone_index": index_name,
            "pinecone_vector_count": stats.total_vector_count,
            "models_used": {
                "embeddings": "text-embedding-3-large",
                "reranker": "rerank-multilingual-v3.0",
                "llm": "llama-3.3-70b-versatile"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
def chat(request: QueryRequest, req: Request):
    client_ip = req.client.host
    check_rate_limit(client_ip)
    
    query = request.query
    logger.info(f"Query received: {query}")
    
    try:
        # 1. Classify
        query_type = classify_query(query)
        
        if query_type == "other":
            return {
                "query": query,
                "response": "I can only answer questions related to Indian law. \n               Please ask about your legal rights, applicable laws, \n               or legal procedures in India.",
                "verified": False,
                "faithfulness_score": 100,
                "sources_used": 0,
                "sources": [],
                "query_type": "other"
            }
        
        # 2. Retrieve
        context_string, sources_list = retrieve(query, query_type)
        logger.info(f"Retrieved {len(sources_list)} sources")
        
        # 3. Generate Answer
        if not context_string:
            prompt = build_no_context_prompt(query)
            final_response = "No verified legal information found for your query. I can only provide answers based on verified sources."
            is_verified = False
            faith_score = 100
        else:
            prompt = build_prompt(context_string, query)
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1024
            )
            final_response = completion.choices[0].message.content.strip()
            
            faithfulness_result = check_faithfulness(final_response, context_string)
            faith_score = faithfulness_result["score"]
            
            if faith_score < 35:
                final_response = "⚠️ Low confidence answer — please verify with a lawyer.\n\n" + final_response
                
            irrelevance_threshold = 0.001 if query_type == "consumer" else 0.01
            sources_are_irrelevant = all(
                s.get("score", 0) < irrelevance_threshold for s in sources_list
            ) if sources_list else True
            
            is_verified = (
                len(sources_list) > 0
                and not sources_are_irrelevant
                and "No verified legal information found" not in final_response
                and query_type != "other"
            )
                
            logger.info(f"Faithfulness Score: {faith_score}")
            
        return {
            "query": query,
            "response": final_response,
            "verified": is_verified,
            "faithfulness_score": faith_score,
            "sources_used": len(sources_list),
            "sources": sources_list,
            "query_type": query_type
        }
        
    except Exception as e:
        logger.error(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")