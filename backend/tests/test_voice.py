from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

from app.config import settings

def test_transcribe_voice_mock_english(monkeypatch):
    monkeypatch.setattr(settings, "sarvam_api_key", "")
    monkeypatch.setattr(settings, "openai_api_key", "")
    # Send a mock audio upload
    files = {"file": ("audio.webm", b"dummy_audio_data_here", "audio/webm")}
    response = client.post("/api/v1/voice/transcribe", files=files, data={"language": "en"})
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "What are my rights" in data["text"]
    assert data["lang"] == "en"
    assert data["source"] == "mock"

def test_transcribe_voice_mock_hindi(monkeypatch):
    monkeypatch.setattr(settings, "sarvam_api_key", "")
    monkeypatch.setattr(settings, "openai_api_key", "")
    files = {"file": ("audio.webm", b"dummy_audio_data_here", "audio/webm")}
    response = client.post("/api/v1/voice/transcribe", files=files, data={"language": "hi"})
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "क्या मकान मालिक" in data["text"]
    assert data["lang"] == "hi"
    assert data["source"] == "mock"

def test_tts_without_key(monkeypatch):
    # Mock missing key
    monkeypatch.setattr(settings, "elevenlabs_api_key", "")
    response = client.post("/api/v1/voice/tts", json={"text": "hello", "language": "en"})
    assert response.status_code == 412
    assert response.json()["detail"] == "NO_TTS_KEY"
