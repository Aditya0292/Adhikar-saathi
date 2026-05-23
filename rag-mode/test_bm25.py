from rag import retrieve, hybrid_search

candidates = hybrid_search("legal consequences of murder in India", original_query="legal consequences of murder in India", top_k=50, query_type="criminal")
found = False
for i, c in enumerate(candidates):
    if c['metadata'].get('source') == 'BNS_Core':
        print(f"BNS_Core found at rank {i+1} with score {c['score']}")
        found = True
if not found:
    print("BNS_Core not found in top 50")
