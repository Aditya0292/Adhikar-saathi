import redis.asyncio as aioredis
from app.config import settings
import logging
import time

logger = logging.getLogger("redis_client")

class FakeRedis:
    def __init__(self):
        self._store = {}
        self._expires = {}

    def _check_expire(self, key):
        if key in self._expires:
            expire_at = self._expires[key]
            if time.time() > expire_at:
                del self._store[key]
                del self._expires[key]

    async def get(self, key: str):
        self._check_expire(key)
        return self._store.get(key)

    async def set(self, key: str, value: str):
        self._store[key] = value
        if key in self._expires:
            del self._expires[key]
        return True

    async def setex(self, key: str, seconds: int, value: str):
        self._store[key] = value
        self._expires[key] = time.time() + seconds
        return True

    async def delete(self, key: str):
        if key in self._store:
            del self._store[key]
        if key in self._expires:
            del self._expires[key]
        return True

    async def ping(self):
        return True

    async def close(self):
        pass

class RedisClientFacade:
    def __init__(self, real_client):
        self._real = real_client
        self._fake = None
        self._use_fake = False

    def _get_client(self):
        if self._use_fake:
            return self._fake
        return self._real

    async def get(self, key: str):
        try:
            return await self._get_client().get(key)
        except Exception:
            self._fallback()
            return await self._fake.get(key)

    async def set(self, key: str, value: str):
        try:
            return await self._get_client().set(key, value)
        except Exception:
            self._fallback()
            return await self._fake.set(key, value)

    async def setex(self, key: str, seconds: int, value: str):
        try:
            return await self._get_client().setex(key, seconds, value)
        except Exception:
            self._fallback()
            return await self._fake.setex(key, seconds, value)

    async def delete(self, key: str):
        try:
            return await self._get_client().delete(key)
        except Exception:
            self._fallback()
            return await self._fake.delete(key)

    async def ping(self):
        try:
            return await self._get_client().ping()
        except Exception:
            self._fallback()
            return await self._fake.ping()

    def _fallback(self):
        if not self._use_fake:
            logger.warning("Redis connection failed. Falling back to in-memory FakeRedis.")
            self._fake = FakeRedis()
            self._use_fake = True

# Initialize client
real_client = aioredis.from_url(settings.redis_url, decode_responses=True)
redis_client = RedisClientFacade(real_client)
