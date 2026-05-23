from rag import retrieve, hybrid_search
import requests
import json

candidates = hybrid_search("legal consequences of murder in India", original_query="legal consequences of murder in India", top_k=5, query_type="criminal")
print(f"Top 5 chunks directly from Pinecone:")
for c in candidates:
    text_preview = c['metadata'].get('text', '')[:100].replace('\n', ' ')
    print(f"Score: {c['score']:.4f} | Source: {c['metadata'].get('source')} | Preview: {text_preview}")

response = requests.post(
    "http://localhost:8000/chat",
    headers={"Content-Type": "application/json"},
    data=json.dumps({"query": "legal consequences of murder in India"})
)
data = response.json()
print("\nFINAL ANSWER:")
print(data.get("response"))
print("\nRERANKED CHUNKS USED:")
for src in data.get("sources", []):
    print(f"Source {src['source_num']} | Score: {src['score']:.4f}")
    print(f"Preview: {src['preview'][:100]}...")
