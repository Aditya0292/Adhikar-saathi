"""
corpus/scripts/ingest.py

FRIEND IMPLEMENTS THIS FILE.

Corpus ingestion pipeline — Step 1: Parse raw legal PDFs/text files into
structured chunks ready for embedding.

Usage:
    python scripts/ingest.py --input raw/ipc/ --output processed/ipc_chunks.jsonl
    python scripts/ingest.py --input raw/ --output processed/all_chunks.jsonl --all

Output format (JSONL — one JSON object per line):
{
    "chunk_id": "ipc-420-001",
    "source": "Indian Penal Code",
    "section": "420",
    "title": "Cheating and dishonestly inducing delivery of property",
    "text": "Whoever cheats and thereby dishonestly induces...",
    "act_year": 1860,
    "language": "en",
    "metadata": {
        "act_short": "IPC",
        "chapter": "XVII",
        "punishment": "imprisonment up to 7 years"
    }
}

Notes for friend:
- Chunk size: ~512 tokens (overlap ~50 tokens)
- Use langchain RecursiveCharacterTextSplitter or tiktoken
- Preserve section numbers as metadata — critical for citations
- Run OCR on scanned PDFs using pytesseract or Google Document AI
"""


def main():
    raise NotImplementedError("Friend implements this")


if __name__ == "__main__":
    main()
