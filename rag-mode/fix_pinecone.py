import os
import time
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
print(index.describe_index_stats())

index.delete(filter={"char_length": {"$lt": 50}, "source": "Constitution_Instructions"})
print("Garbage chunks deleted.")

time.sleep(2) # Give it a moment to propagate

new_texts = [
    "Section 103 of the Bharatiya Nyaya Sanhita (BNS) states the punishment for murder. Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.",
    "Section 101 of the Bharatiya Nyaya Sanhita (BNS) defines culpable homicide and murder. Culpable homicide is murder if the act by which the death is caused is done with the intention of causing death, or causing such bodily injury as the offender knows to be likely to cause the death of the person to whom the harm is caused, or with the intention of causing bodily injury to any person and the bodily injury intended to be inflicted is sufficient in the ordinary course of nature to cause death. Mens rea is required. Culpable homicide is not murder if it falls under certain exceptions like grave and sudden provocation or self-defense.",
    "Section 302 of the Indian Penal Code (IPC) states the punishment for murder. Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.",
    "Section 299 of the Indian Penal Code (IPC) defines culpable homicide. Whoever causes death by doing an act with the intention of causing death, or with the intention of causing such bodily injury as is likely to cause death, or with the knowledge that he is likely by such act to cause death, commits the offence of culpable homicide. Mens rea and guilty mind are required."
]

dense_embeddings = model.encode(new_texts, normalize_embeddings=True).tolist()
sparse_vectors = bm25.encode_documents(new_texts)

records = []
for i, text in enumerate(new_texts):
    records.append({
        "id": f"core_bns_ipc_murder_{i}",
        "values": dense_embeddings[i],
        "sparse_values": sparse_vectors[i],
        "metadata": {
            "text": text,
            "source": "BNS_Core",
            "char_length": len(text)
        }
    })

index.upsert(vectors=records)
print("Injected 4 BNS/IPC murder chunks.")

time.sleep(2)
print("After deletion and injection stats:")
print(index.describe_index_stats())
