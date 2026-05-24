import requests
import json

response = requests.post(
    "http://localhost:8000/chat",
    headers={"Content-Type": "application/json"},
    data=json.dumps({"query": "legal consequences of murder in India"})
)

if response.status_code == 200:
    data = response.json()
    print("FINAL ANSWER:")
    print(data["response"])
    print("\n" + "="*50 + "\n")
    print("TOP CHUNKS USED:")
    for src in data.get("sources", []):
        print(f"Source {src['source_num']} | Score: {src['score']}")
        print(f"Preview: {src['preview'][:200]}...")
        print("-" * 30)
else:
    print("Error:", response.status_code, response.text)
