from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from tqdm import tqdm
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
import os

load_dotenv()

# Initialize clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("legal-rag-v2")
model = SentenceTransformer("mixedbread-ai/mxbai-embed-large-v1")

print("Initial stats:")
print(index.describe_index_stats())

print("Loading IL-TUR dataset...")
dataset = load_dataset(
    "Exploration-Lab/IL-TUR",
    "summ",
    token=os.getenv("HF_TOKEN")
)

# Text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150
)

BATCH_SIZE = 50

for split in ["train", "test"]:
    if split not in dataset:
        continue
    
    print(f"\nProcessing {split} split...")
    split_data = dataset[split]
    
    vectors_batch = []
    
    for i, record in enumerate(tqdm(split_data, desc=f"Ingesting {split}")):
        if split == "train" and i < 1403:
            continue
            
        doc_text = " ".join(record["document"])
        summ_text = " ".join(record["summary"])
        
        combined_text = f"SUMMARY: {summ_text}\n\nFULL JUDGMENT: {doc_text}"
        
        chunks = text_splitter.split_text(combined_text)
        
        for j, chunk in enumerate(chunks):
            # Extract basic text for embedding
            embedding = model.encode(chunk, normalize_embeddings=True).tolist()
            
            vector_id = f"iltur_{split}_{record['id']}_chunk_{j}"
            
            metadata = {
                "source": "IL-TUR",
                "case_id": record["id"],
                "split": split,
                "num_doc_tokens": record.get("num_doc_tokens", 0),
                "num_summ_tokens": record.get("num_summ_tokens", 0),
                "text": chunk
            }
            
            vectors_batch.append({
                "id": vector_id,
                "values": embedding,
                "metadata": metadata
            })
            
            if len(vectors_batch) >= BATCH_SIZE:
                index.upsert(vectors=vectors_batch)
                vectors_batch = []
                
    # Upsert remaining
    if vectors_batch:
        index.upsert(vectors=vectors_batch)
        vectors_batch = []

print("\nFinal stats:")
print(index.describe_index_stats())
