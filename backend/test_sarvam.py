import asyncio
import httpx
import os

from dotenv import load_dotenv
load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

async def test_sarvam():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={
                "api-subscription-key": SARVAM_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "inputs": ["Hello, how are you?"],
                "target_language_code": "en-IN",
                "speaker": "priya",
                "pace": 1.0,
                "speech_sample_rate": 22050,
                "enable_preamble": False,
                "model": "bulbul:v3"
            }
        )
        print("Status:", response.status_code)
        print("Response:", response.text)

if __name__ == "__main__":
    asyncio.run(test_sarvam())
