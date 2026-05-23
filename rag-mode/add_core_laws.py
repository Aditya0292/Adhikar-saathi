import json
import os
from datasets import load_dataset
from pinecone import Pinecone
from pinecone_text.sparse import BM25Encoder
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

# Initialize clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = "legal-rag-v2"
index = pc.Index(index_name)

model = SentenceTransformer('mixedbread-ai/mxbai-embed-large-v1')

# Load existing BM25 encoder
bm25 = BM25Encoder().load("bm25_encoder.json")

# Text Splitter setup
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150,
    length_function=len,
    is_separator_regex=False,
)

all_texts = []
all_metadata = []

def process_and_add(text, source, chunk_id_prefix):
    if not text: return
    
    if len(text) > 1000:
        chunks = text_splitter.split_text(text)
    else:
        chunks = [text]
        
    for i, chunk in enumerate(chunks):
        all_texts.append(chunk)
        all_metadata.append({
            "text": chunk,
            "chunk_id": f"{chunk_id_prefix}_{i}",
            "source": source,
            "char_length": len(chunk)
        })

print("1. Loading core_laws.json...")
with open("core_laws.json", "r") as f:
    core_laws = json.load(f)
    
for i, item in enumerate(core_laws):
    all_texts.append(item["text"])
    all_metadata.append({
        "text": item["text"],
        "chunk_id": f"core_{i}",
        "source": item["source"],
        "char_length": len(item["text"])
    })

print("2. Loading DATASET A (legal-nlp-india)...")
try:
    ds_a = load_dataset("Nithish1201/legal-nlp-india")
    for i, item in enumerate(tqdm(ds_a['train'], desc="legal-nlp-india")):
        text_content = item.get('text', '') or item.get('content', '') or str(item)
        process_and_add(text_content, "legal-nlp-india", f"ds_a_{i}")
except Exception as e:
    print(f"Skipping DATASET A due to error: {e}")

print("3. Loading DATASET B (indian-law-dataset)...")
try:
    ds_b = load_dataset("viber1/indian-law-dataset")
    for i, item in enumerate(tqdm(ds_b['train'], desc="indian-law-dataset")):
        text_content = f"Instruction: {item.get('Instruction', '')}\nResponse: {item.get('Response', '')}"
        process_and_add(text_content, "indian-law-dataset", f"ds_b_{i}")
except Exception as e:
    print(f"Skipping DATASET B due to error: {e}")

print(f"\nTotal new chunks to add: {len(all_texts)}")

# Ingest Vectors
print("\nStarting ingestion to Pinecone...")
batch_size = 50
records = []

for i in tqdm(range(0, len(all_texts), batch_size), desc="Upserting"):
    batch_texts = all_texts[i:i+batch_size]
    batch_meta = all_metadata[i:i+batch_size]
    
    dense_embeddings = model.encode(batch_texts, normalize_embeddings=True).tolist()
    sparse_vectors = bm25.encode_documents(batch_texts)
    
    for j, (text, dense_vec, sparse_vec, meta) in enumerate(zip(batch_texts, dense_embeddings, sparse_vectors, batch_meta)):
        records.append({
            "id": meta["chunk_id"],  # Use chunk_id as pinecone vector id to match instructions
            "values": dense_vec,
            "sparse_values": sparse_vec,
            "metadata": meta
        })
        
    if records:
        index.upsert(vectors=records)
        records = []

print("\nIngestion Complete!")
stats = index.describe_index_stats()
print(f"Total vectors in Pinecone index '{index_name}': {stats.total_vector_count}")
