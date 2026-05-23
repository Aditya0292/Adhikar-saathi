import requests
import json
import time

queries = [
    "legal consequences of murder in India",
    "what is culpable homicide",
    "punishment for murder under BNS"
]

time.sleep(2)

for query in queries:
    print(f"==================================================")
    print(f"QUERY: {query}")
    print(f"==================================================")
    try:
        response = requests.post(
            "http://127.0.0.1:8000/chat",
            headers={"Content-Type": "application/json"},
            data=json.dumps({"query": query}),
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            
            print(f"FINAL ANSWER:\n{data.get('response')}\n")
            print(f"Verified Accuracy Score: {data.get('faithfulness_score')}\n")
            print(f"TOP 3 CHUNKS:")
            sources = data.get("sources", [])[:3]
            if not sources:
                print("No sources found/used.")
            for src in sources:
                score = src.get('score', 0)
                text = src.get('preview', '').replace('\n', ' ')
                print(f"  - Source {src['source_num']} | Score: {score:.4f}")
                print(f"    Preview: {text[:150]}...")
        else:
            print(f"API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error querying API: {e}")
    print("\n")
