from datasets import load_dataset
from pinecone import Pinecone, ServerlessSpec
from pinecone_text.sparse import BM25Encoder
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from tqdm import tqdm
from dotenv import load_dotenv
import os

load_dotenv()

# Initialize clients
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
model = SentenceTransformer('mixedbread-ai/mxbai-embed-large-v1')

index_name = "legal-rag-v2"

# 1. Delete and recreate index for new embeddings
if index_name in pc.list_indexes().names():
    print(f"Deleting existing index '{index_name}' to prevent model mixing...")
    pc.delete_index(index_name)

print(f"Creating index '{index_name}'...")
pc.create_index(
    name=index_name,
    dimension=1024,
    metric="dotproduct",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1"
    )
)
print("Index created successfully.")

index = pc.Index(index_name)

# 2. Text Splitter setup
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150,
    length_function=len,
    is_separator_regex=False,
)

# 3. Load all 4 datasets
all_texts = []
all_metadata = []

def process_dataset(data, text_field, source_name):
    print(f"Processing {source_name}...")
    for i, item in enumerate(tqdm(data, desc=source_name)):
        text = item[text_field]
        if not text: continue
        
        # Chunk if > 1000 chars
        if len(text) > 1000:
            chunks = text_splitter.split_text(text)
        else:
            chunks = [text]
            
        for chunk in chunks:
            all_texts.append(chunk)
            all_metadata.append({
                "text": chunk,
                "chunk_id": str(item.get('chunk_id', i)),
                "source": source_name,
                "char_length": len(chunk)
            })

# Dataset 1: Original
print("\nLoading ShreyasP123...")
ds1 = load_dataset("ShreyasP123/Legal-Dataset-for-india")
process_dataset(ds1['train'], 'text', 'ShreyasP123/Legal-Dataset-for-india')

# Dataset 2: IPC / BNS
print("\nLoading harshitv804...")
ds2 = load_dataset("harshitv804/Indian_Penal_Code")
# Extract text from PDF object
ds2_texts = []
for item in ds2['train']:
    pdf_obj = item['pdf']
    text = ""
    for page in pdf_obj.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    ds2_texts.append({'text': text})
process_dataset(ds2_texts, 'text', 'Indian_Penal_Code_Dataset')

# Dataset 3: Legal Q&A
print("\nLoading Lawyer_GPT_India...")
ds3 = load_dataset("nisaar/Lawyer_GPT_India")
# Combine question + answer (user mentioned instruction+output but keys are question/answer)
ds3_combined = []
for item in ds3['train']:
    combined = f"Question: {item.get('question', '')}\nAnswer: {item.get('answer', '')}"
    ds3_combined.append({'text': combined, 'chunk_id': item.get('id', '')})
process_dataset(ds3_combined, 'text', 'Lawyer_GPT_India')

# Dataset 4: Constitution
print("\nLoading Constitution...")
ds4 = load_dataset("nisaar/Articles_Constitution_3300_Instruction_Set")
ds4_combined = []
for item in ds4['train']:
    combined = item.get('prompt', f"{item.get('instruction', '')} {item.get('output', '')}")
    ds4_combined.append({'text': combined})
process_dataset(ds4_combined, 'text', 'Constitution_Instructions')

print(f"\nTotal chunks prepared: {len(all_texts)}")

# 4. Fit BM25 Encoder
bm25_path = "bm25_encoder.json"
print("\nFitting BM25 Encoder on all combined texts...")
bm25 = BM25Encoder()
bm25.fit(all_texts)
bm25.dump(bm25_path)
print(f"BM25 Encoder saved to {bm25_path}.")

# 5. Ingest Vectors
print("\nStarting ingestion to Pinecone...")
batch_size = 50
records = []
total_upserted = 0

for i in tqdm(range(0, len(all_texts), batch_size), desc="Ingesting Batches"):
    batch_texts = all_texts[i:i+batch_size]
    batch_meta = all_metadata[i:i+batch_size]
    
    # Generate Dense Embeddings
    dense_embeddings = model.encode(batch_texts, normalize_embeddings=True).tolist()
    
    # Generate Sparse Vectors
    sparse_vectors = bm25.encode_documents(batch_texts)
    
    # Prepare batch records
    for j, (text, dense_vec, sparse_vec, meta) in enumerate(zip(batch_texts, dense_embeddings, sparse_vectors, batch_meta)):
        global_idx = i + j
        records.append({
            "id": f"vec_{global_idx}",
            "values": dense_vec,
            "sparse_values": sparse_vec,
            "metadata": meta
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
