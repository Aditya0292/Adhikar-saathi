from datasets import load_dataset
from pinecone import Pinecone
from dotenv import load_dotenv
import os

load_dotenv()
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("legal-rag-v2")

print("Loading dataset...")
dataset = load_dataset("Exploration-Lab/IL-TUR", "summ", token=os.getenv("HF_TOKEN"))
train_data = dataset["train"]

print("Finding where to resume...")
# Binary search or batch check
# Let's just do binary search over the indices
low = 0
high = len(train_data) - 1
last_processed = 0

while low <= high:
    mid = (low + high) // 2
    record_id = train_data[mid]["id"]
    vec_id = f"iltur_train_{record_id}_chunk_0"
    
    resp = index.fetch([vec_id])
    if vec_id in resp.vectors:
        last_processed = mid
        low = mid + 1
    else:
        high = mid - 1

print(f"Last fully/partially processed index is likely: {last_processed}")
print(f"Record ID at {last_processed}: {train_data[last_processed]['id']}")
