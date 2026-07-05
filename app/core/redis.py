import logging
from redis.asyncio import Redis, ConnectionError
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize async Redis client
redis_client = None
if settings.USE_REDIS:
    redis_client = Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_timeout=2.0,
        socket_connect_timeout=2.0,
    )


from redis.exceptions import RedisError

async def check_redis_connection() -> bool:
    """
    Check if Redis server is available.
    """
    if not settings.USE_REDIS or redis_client is None:
        return False
    try:
        await redis_client.ping()
        return True
    except RedisError as e:
        logger.error(f"Redis connection failed: {e}")
        return False
