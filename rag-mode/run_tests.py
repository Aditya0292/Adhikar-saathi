import requests
import json

queries = [
    ("test1.json", "What are my rights if police arrest me?"),
    ("test2.json", "Amazon delivered damaged phone refusing refund"),
    ("test3.json", "What is the capital of France?"),
    ("test4.json", "My landlord is not returning security deposit"),
    ("test5.json", "Boss fired me without notice what can I do")
]

for filename, query in queries:
    response = requests.post(
        "http://localhost:8001/chat",
        json={"query": query}
    )
    with open(filename, "w") as f:
        json.dump(response.json(), f, indent=2)
    print(f"Saved {filename}")
