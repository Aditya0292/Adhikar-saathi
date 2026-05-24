from rag import retrieve, hybrid_search, embed_query
print("Query: legal consequences of murder in India")
candidates = hybrid_search("legal consequences of murder in India", original_query="legal consequences of murder in India", top_k=20, query_type="criminal")
print(f"Got {len(candidates)} candidates from Pinecone")
for c in candidates[:5]:
    print(c['score'], c['metadata']['text'][:100])

print("\nRetrieving:")
context, sources = retrieve("legal consequences of murder in India", query_type="criminal")
print("Sources:", sources)
