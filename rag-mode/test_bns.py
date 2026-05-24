import os
from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

load_dotenv()
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("legal-rag-v2")
model = SentenceTransformer('mixedbread-ai/mxbai-embed-large-v1')

dense_vec = model.encode("murder legal consequences India punishment", normalize_embeddings=True).tolist()

results = index.query(
    vector=dense_vec,
    filter={"source": "BNS_Core"},
    top_k=5,
    include_metadata=True
)

print(f"Got {len(results['matches'])} matches from BNS_Core")
for r in results['matches']:
    print(r['score'], r['metadata']['text'][:100])
