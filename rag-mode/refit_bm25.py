import socket
import time
from pinecone import Pinecone
from pinecone_text.sparse import BM25Encoder
from dotenv import load_dotenv
import os
import json

# Set a global socket timeout so that urllib3 connection/read operations won't hang forever
socket.setdefaulttimeout(30)

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("legal-rag-v2")

def fetch_with_retry(index_obj, ids, retries=5, backoff=2):
    for attempt in range(retries):
        try:
            return index_obj.fetch(ids=ids)
        except Exception as e:
            if attempt == retries - 1:
                raise e
            print(f"\nFetch failed on attempt {attempt + 1}: {e}. Retrying in {backoff}s...", flush=True)
            time.sleep(backoff)
            backoff *= 2

# Fetch all vectors metadata to get all texts
all_texts = []

print("Fetching all texts from Pinecone...", flush=True)

# Query to list all IDs
all_ids = []
batch_count = 0
for id_batch in index.list():
    all_ids.extend(id_batch)
    batch_count += 1
    if len(all_ids) % 5000 == 0 or len(all_ids) < 5000:
        print(f"Found {len(all_ids)} IDs so far (batch {batch_count})...", flush=True)

print(f"Total IDs found: {len(all_ids)}", flush=True)

# Fetch in batches of 100
print("Starting metadata fetch...", flush=True)
total_ids = len(all_ids)
for i in range(0, total_ids, 100):
    batch_ids = all_ids[i:i+100]
    
    # Use robust retry fetch
    fetch_response = fetch_with_retry(index, batch_ids)
    
    if fetch_response and fetch_response.vectors:
        for vec_id, vec_data in fetch_response.vectors.items():
            text = vec_data.metadata.get("text", "")
            if text:
                all_texts.append(text)
    
    current_count = min(i + 100, total_ids)
    if current_count % 5000 == 0 or current_count == total_ids:
        print(f"Fetched {current_count} / {total_ids} texts...", flush=True)

print(f"Total texts collected: {len(all_texts)}", flush=True)

# Refit BM25 on complete corpus
print("Refitting BM25 encoder on the complete corpus...", flush=True)
bm25 = BM25Encoder()
bm25.fit(all_texts)
bm25.dump("bm25_encoder.json")

print("BM25 refitted and saved to bm25_encoder.json", flush=True)
print("Done — hybrid search will now work correctly for all vectors", flush=True)
