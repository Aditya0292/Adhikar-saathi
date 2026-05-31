import httpx
import logging
from typing import List, Dict, Any, Optional

from app.config import settings

logger = logging.getLogger("llm_client")

class LLMProvider:
    GROQ = "groq"
    CEREBRAS = "cerebras"
    OPENROUTER = "openrouter"
    OLLAMA = "ollama"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"

async def generate_chat_completion(
    messages: List[Dict[str, str]],
    system_prompt: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    max_tokens: int = 1000,
    temperature: float = 0.7,
    response_format: Optional[Dict[str, str]] = None
) -> str:
    """
    Universal factory for generating chat completions across multiple LLM providers.
    Uses the OpenAI-compatible REST API format wherever possible.
    """
    provider = provider or settings.default_llm_provider
    model = model or settings.default_llm_model

    full_messages = []
    if system_prompt:
        full_messages.append({"role": "system", "content": system_prompt})
    full_messages.extend(messages)

    try:
        if provider == LLMProvider.GROQ:
            return await _call_openai_compatible(
                base_url="https://api.groq.com/openai/v1/chat/completions",
                api_key=settings.groq_api_key,
                model=model if model else "llama-3.3-70b-versatile",
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format=response_format
            )
        elif provider == LLMProvider.CEREBRAS:
            return await _call_openai_compatible(
                base_url="https://api.cerebras.ai/v1/chat/completions",
                api_key=settings.cerebras_api_key,
                model=model if model else "llama3.1-8b",
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format=response_format
            )
        elif provider == LLMProvider.OPENROUTER:
            return await _call_openai_compatible(
                base_url="https://openrouter.ai/api/v1/chat/completions",
                api_key=settings.openrouter_api_key,
                model=model if model else "meta-llama/llama-3-8b-instruct",
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format=response_format
            )
        elif provider == LLMProvider.OLLAMA:
            return await _call_openai_compatible(
                base_url=f"{settings.ollama_base_url.rstrip('/')}/v1/chat/completions",
                api_key="ollama", # Ollama doesn't require a real API key
                model=model if model else "llama3",
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format=response_format
            )
        elif provider == LLMProvider.OPENAI:
            return await _call_openai_compatible(
                base_url="https://api.openai.com/v1/chat/completions",
                api_key=settings.openai_api_key,
                model=model if model else "gpt-4o-mini",
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format=response_format
            )
        elif provider == LLMProvider.ANTHROPIC:
            return await _call_anthropic(
                api_key=settings.anthropic_api_key,
                model=model if model else "claude-3-haiku-20240307",
                system_prompt=system_prompt,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
    except Exception as e:
        # Check if a fallback is configured and we aren't already using the fallback
        if settings.fallback_llm_provider and provider != settings.fallback_llm_provider:
            logger.warning(f"Primary provider {provider} failed: {e}. Falling back to {settings.fallback_llm_provider}...")
            return await generate_chat_completion(
                messages=messages,
                system_prompt=system_prompt,
                provider=settings.fallback_llm_provider,
                model=settings.fallback_llm_model,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format=response_format
            )
        raise e


async def _call_openai_compatible(
    base_url: str,
    api_key: str,
    model: str,
    messages: List[Dict[str, str]],
    max_tokens: int,
    temperature: float,
    response_format: Optional[Dict[str, str]] = None
) -> str:
    if not api_key and base_url.find("localhost") == -1 and base_url.find("127.0.0.1") == -1:
        raise ValueError(f"API key missing for provider hitting {base_url}")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # OpenRouter specific headers
    if "openrouter" in base_url:
        headers["HTTP-Referer"] = "http://localhost:3000"
        headers["X-Title"] = "NyayaSatya"

    body = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature
    }

    if response_format:
        body["response_format"] = response_format

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(base_url, headers=headers, json=body, timeout=120.0)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from {base_url}: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error calling {base_url}: {e}")
            raise


async def _call_anthropic(
    api_key: str,
    model: str,
    system_prompt: Optional[str],
    messages: List[Dict[str, str]],
    max_tokens: int,
    temperature: float
) -> str:
    if not api_key:
        raise ValueError("Anthropic API key missing")

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    anthropic_messages = []
    for msg in messages:
        if msg["role"] in ["user", "assistant"]:
            anthropic_messages.append({"role": msg["role"], "content": msg["content"]})

    body = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": anthropic_messages
    }
    if system_prompt:
        body["system"] = system_prompt

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body, timeout=120.0)
            res.raise_for_status()
            data = res.json()
            return data["content"][0]["text"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from Anthropic: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error calling Anthropic: {e}")
            raise
