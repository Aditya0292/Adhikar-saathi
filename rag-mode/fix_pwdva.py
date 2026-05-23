import os
from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from pinecone_text.sparse import BM25Encoder

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("legal-rag-v2")
model = SentenceTransformer('mixedbread-ai/mxbai-embed-large-v1')
bm25 = BM25Encoder().load("bm25_encoder.json")

print("Before deletion stats:")
stats_before = index.describe_index_stats()
print(stats_before)

bad_phrases = ["There is no mention", "Not applicable", "no information found", "provided chunk does not"]

ids_to_delete = set()

for phrase in bad_phrases:
    dense_vec = model.encode(phrase, normalize_embeddings=True).tolist()
    sparse_vec = bm25.encode_queries(phrase)
    
    results = index.query(
        vector=dense_vec,
        sparse_vector=sparse_vec,
        top_k=2000,
        include_metadata=True
    )
    
    for r in results.get('matches', []):
        text = r.get('metadata', {}).get('text', '')
        if any(bp.lower() in text.lower() for bp in bad_phrases):
            ids_to_delete.add(r['id'])

print(f"Found {len(ids_to_delete)} garbage chunks to delete using search.")

if ids_to_delete:
    # Delete in batches
    ids_list = list(ids_to_delete)
    for i in range(0, len(ids_list), 1000):
        index.delete(ids=ids_list[i:i+1000])

print("Garbage chunks deleted.")

pwdva_chunks = [
    "Section 3 of the Protection of Women from Domestic Violence Act (PWDVA) 2005 defines domestic violence as any act, omission, or conduct that harms, injures, or endangers the health, safety, life, limb, or well-being (mental or physical) of the aggrieved woman or any child, including physical, sexual, verbal, emotional, and economic abuse.",
    "Section 18 of the Protection of Women from Domestic Violence Act (PWDVA) 2005 states that a Magistrate may pass a protection order in favor of the aggrieved woman, prohibiting the respondent from committing any act of domestic violence, aiding or abetting domestic violence, entering her workplace or child's school, attempting to communicate with her, alienating assets, or causing violence to her dependents.",
    "Section 31 of the Protection of Women from Domestic Violence Act (PWDVA) 2005 provides the penalty for breach of a protection order by the respondent. A breach of a protection order is a cognizable and non-bailable offence, and shall be punishable with imprisonment of either description for a term which may extend to one year, or with a fine which may extend to twenty thousand rupees, or with both.",
    "Section 12 of the Protection of Women from Domestic Violence Act (PWDVA) 2005 provides that an aggrieved person or a Protection Officer or any other person on behalf of the aggrieved person may present an application to the Magistrate seeking one or more reliefs under this Act. The Magistrate shall fix the first date of hearing, which shall not ordinarily be beyond three days from the date of receipt of the application by the court, and endeavor to dispose of every application made under sub-section (1) within a period of sixty days from the date of its first hearing."
]

dense_embeddings = model.encode(pwdva_chunks, normalize_embeddings=True).tolist()
sparse_vectors = bm25.encode_documents(pwdva_chunks)

records = []
for i, text in enumerate(pwdva_chunks):
    records.append({
        "id": f"core_pwdva_violence_{i}",
        "values": dense_embeddings[i],
        "sparse_values": sparse_vectors[i],
        "metadata": {
            "text": text,
            "source": "PWDVA_Core",
            "char_length": len(text)
        }
    })

index.upsert(vectors=records)
print("Injected 4 PWDVA Core chunks.")

print("\nAfter deletion and injection stats:")
stats_after = index.describe_index_stats()
print(stats_after)

# Print count difference
diff = stats_before.total_vector_count - stats_after.total_vector_count
print(f"Total net change in vectors: {-diff} (Deleted {len(ids_to_delete)}, Added 4)")
