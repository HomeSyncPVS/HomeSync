from fastapi import Request
from app.core.redis import redis_client, check_redis_connection
from app.exceptions.custom import RateLimitError


class RateLimiter:
    def __init__(self, times: int = 60, seconds: int = 60, key_prefix: str = "rl"):
        """
        Configure a rate limiter.
        :param times: Number of allowed requests.
        :param seconds: Sliding/fixed window duration in seconds.
        :param key_prefix: Cache key namespace prefix.
        """
        self.times = times
        self.seconds = seconds
        self.key_prefix = key_prefix

    async def __call__(self, request: Request):
        """
        Enforce rate limiting by Client IP and URL path.
        """
        # Fallback gracefully if Redis is unavailable
        if not await check_redis_connection():
            return

        client_ip = request.client.host if request.client else "unknown"
        # Construct key e.g., rl:127.0.0.1:/api/v1/auth/login
        key = f"{self.key_prefix}:{client_ip}:{request.url.path}"

        current_count = await redis_client.get(key)
        if current_count and int(current_count) >= self.times:
            raise RateLimitError(
                detail=f"Rate limit exceeded. Limit is {self.times} requests per {self.seconds} seconds."
            )

        # Increment count and set expiration atomically in a transaction pipeline
        async with redis_client.pipeline(transaction=True) as pipe:
            await pipe.incr(key)
            await pipe.expire(key, self.seconds)
            await pipe.execute()
