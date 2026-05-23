from datasets import load_dataset
from pinecone import Pinecone, ServerlessSpec
from pinecone_text.sparse import BM25Encoder
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
from dotenv import load_dotenv
import os

load_dotenv()

# Initialize clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
model = SentenceTransformer('BAAI/bge-large-en-v1.5')

index_name = "legal-rag-v2"

# 1. Create Pinecone Index if it doesn't exist
if index_name not in pc.list_indexes().names():
    print(f"Creating index '{index_name}'...")
    pc.create_index(
        name=index_name,
        dimension=1024,  # BAAI/bge-large-en-v1.5
        metric="dotproduct",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )
    print("Index created successfully.")
else:
    print(f"Index '{index_name}' already exists.")

index = pc.Index(index_name)

# 2. Load Dataset
print("Loading dataset...")
dataset = load_dataset("ShreyasP123/Legal-Dataset-for-india")
data = dataset['train']

texts = [item['text'] for item in data]
chunk_ids = [item.get('chunk_id', i) for i, item in enumerate(data)]

# 3. Fit BM25 Encoder
bm25_path = "bm25_encoder.json"
print("Fitting BM25 Encoder on corpus...")
bm25 = BM25Encoder()
bm25.fit(texts)
bm25.dump(bm25_path)
print(f"BM25 Encoder saved to {bm25_path}.")

# 4. Ingest Vectors
print("Starting ingestion to Pinecone...")
batch_size = 50
records = []
total_upserted = 0

for i in tqdm(range(0, len(texts), batch_size), desc="Ingesting Batches"):
    batch_texts = texts[i:i+batch_size]
    batch_ids = chunk_ids[i:i+batch_size]
    
    # Generate Dense Embeddings
    dense_embeddings = model.encode(batch_texts, normalize_embeddings=True).tolist()
    
    # Generate Sparse Vectors
    sparse_vectors = bm25.encode_documents(batch_texts)
    
    # Prepare batch records
    for j, (text, dense_vec, sparse_vec, chunk_id) in enumerate(zip(batch_texts, dense_embeddings, sparse_vectors, batch_ids)):
        global_idx = i + j
        records.append({
            "id": f"vec_{global_idx}",
            "values": dense_vec,
            "sparse_values": sparse_vec,
            "metadata": {
                "text": text,
                "chunk_id": str(chunk_id),
                "source": "ShreyasP123/Legal-Dataset-for-india",
                "char_length": len(text)
            }
        })
        
    # Upsert batch
    if records:
        index.upsert(vectors=records)
        total_upserted += len(records)
        records = []

# Output total stats
print(f"\nIngestion Complete!")
stats = index.describe_index_stats()
print(f"Total vectors in Pinecone index '{index_name}': {stats.total_vector_count}")