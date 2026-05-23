from rag import retrieve, hybrid_search
import requests
import json

candidates = hybrid_search("legal consequences of murder in India", original_query="legal consequences of murder in India", top_k=20, query_type="criminal")
print(f"Got {len(candidates)} candidates from Pinecone")
for c in candidates:
    print(c['score'], c['metadata']['source'], c['metadata']['text'][:60].replace('\n', ' '))

response = requests.post(
    "http://localhost:8000/chat",
    headers={"Content-Type": "application/json"},
    data=json.dumps({"query": "legal consequences of murder in India"})
)
print("API Response:", response.json())
