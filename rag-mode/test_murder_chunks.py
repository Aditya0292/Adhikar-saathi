import os
from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("legal-rag-v2")
model = SentenceTransformer('mixedbread-ai/mxbai-embed-large-v1')

results = index.query(
    vector=model.encode("murder legal consequences India punishment").tolist(),
    top_k=5,
    include_metadata=True
)

for r in results['matches']:
    print("SCORE:", r['score'])
    print("METADATA:", r['metadata'])
    print("-" * 50)
