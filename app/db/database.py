import ssl
import socket
import logging
import asyncio
from typing import Tuple, Optional
from urllib.parse import urlparse, urlunparse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

logger = logging.getLogger("homesync.database")


def get_redacted_url(url: str) -> str:
    """
    Returns the database URL with the password redacted for secure logging.
    """
    if not url:
        return ""
    try:
        if "@" in url:
            parts = url.split("@", 1)
            credentials = parts[0]
            host_db = parts[1]
            if ":" in credentials.split("://")[-1]:
                proto_user, password = credentials.rsplit(":", 1)
                return f"{proto_user}:***@{host_db}"
    except Exception:
        pass
    return url


def get_resolved_db_config(raw_url: str) -> Tuple[str, Optional[str]]:
    """
    Parses connection string, resolves domain host to IPv4 to bypass Windows IPv6 routing issues,
    and returns:
    1. The connection URL with host replaced by IPv4.
    2. The original hostname (for SNI / SSL certificate validation).
    """
    if not raw_url:
        return raw_url, None

    try:
        temp_url = raw_url
        has_asyncpg = False
        if temp_url.startswith("postgresql+asyncpg://"):
            temp_url = temp_url.replace("postgresql+asyncpg://", "postgresql://", 1)
            has_asyncpg = True

        parsed = urlparse(temp_url)
        original_host = parsed.hostname
        port = parsed.port or 5432

        if not original_host:
            return raw_url, None

        # Check if original_host is already an IP address
        resolved_ip = original_host
        try:
            socket.inet_aton(original_host)
        except socket.error:
            # Resolve DNS strictly using IPv4 to avoid Win11 IPv6 routing timeouts
            try:
                addr_info = socket.getaddrinfo(original_host, port, family=socket.AF_INET)
                if addr_info:
                    resolved_ip = addr_info[0][4][0]
                    logger.info(f"Resolved database host '{original_host}' to IPv4 '{resolved_ip}'")
            except Exception as e:
                logger.warning(f"DNS resolution failed for host '{original_host}': {e}. Using original host.")

        # Reconstruct connection URL
        netloc = resolved_ip
        if parsed.port:
            netloc = f"{resolved_ip}:{parsed.port}"
        if parsed.username:
            if parsed.password:
                netloc = f"{parsed.username}:{parsed.password}@{netloc}"
            else:
                netloc = f"{parsed.username}@{netloc}"

        new_parsed = parsed._replace(netloc=netloc)
        reconstructed_url = urlunparse(new_parsed)

        if has_asyncpg:
            reconstructed_url = reconstructed_url.replace("postgresql://", "postgresql+asyncpg://", 1)

        return reconstructed_url, original_host
    except Exception as e:
        logger.error(f"Error parsing database URL: {e}")
        return raw_url, None


# Resolve URL and original host to setup engine
resolved_url, original_host = get_resolved_db_config(settings.DATABASE_URL)

# Configure SSL & connection arguments
connect_args = {
    "server_settings": {"search_path": "homesync"},
    "command_timeout": 30,  # 30 seconds timeout
    "prepared_statement_cache_size": 0,
    "statement_cache_size": 0,
}

# Determine if SSL is required (enable for external hosts like Supabase)
is_local = original_host in ["localhost", "127.0.0.1", "::1"] or not original_host
if not is_local:
    # Set up SSLContext (compatible with sslmode=require to support self-signed certs in chains)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    if original_host:
        ssl_context.server_hostname = original_host
    connect_args["ssl"] = ssl_context
    logger.info(f"Enabling SSL Context (sslmode=require) for server hostname '{original_host}'")

# Create async engine targeting the resolved IPv4 database connection
engine = create_async_engine(
    resolved_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args=connect_args,
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def init_database():
    """
    Auto-creates the database, schemas, and tables if not already present.
    Skips CREATE DATABASE logic on managed cloud databases like Supabase automatically.
    Includes Exponential Backoff retry connection logic.
    """
    url = settings.DATABASE_URL
    if not url:
        logger.error("DATABASE_URL is not set.")
        return

    redacted_url = get_redacted_url(url)
    logger.info(f"Initializing connection to database: {redacted_url}")

    # Auto-detect Supabase to skip database creation
    is_supabase = False
    if original_host and ("supabase" in original_host.lower()):
        is_supabase = True
        logger.info("Supabase database host detected. Skipping CREATE DATABASE command.")

    # Parse database name
    db_name = "postgres"
    try:
        # Get path portion
        _, db_name_part = url.rsplit("/", 1)
        if "?" in db_name_part:
            db_name = db_name_part.split("?", 1)[0]
        else:
            db_name = db_name_part
    except Exception:
        pass

    # Attempt database creation for non-Supabase external databases or localhost
    if not is_supabase:
        try:
            base_url, db_name_part = resolved_url.rsplit("/", 1)
            if "?" in db_name_part:
                postgres_url = f"{base_url}/postgres?{db_name_part.split('?', 1)[1]}"
            else:
                postgres_url = f"{base_url}/postgres"

            logger.info(f"Verifying target database '{db_name}' existence on default Postgres connection...")

            temp_connect_args = connect_args.copy()
            temp_engine = create_async_engine(postgres_url, isolation_level="AUTOCOMMIT", connect_args=temp_connect_args)
            async with temp_engine.connect() as conn:
                result = await conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'"))
                exists = result.scalar()
                if not exists:
                    logger.info(f"Database '{db_name}' not found. Creating database...")
                    await conn.execute(text(f"CREATE DATABASE {db_name}"))
                    logger.info(f"Database '{db_name}' created successfully.")
                else:
                    logger.info(f"Database '{db_name}' verified.")
            await temp_engine.dispose()
        except Exception as e:
            logger.warning(f"Could not automatically create/verify database '{db_name}': {e}. Proceeding with schema/table setup.")

    # Connection retry logic with exponential backoff (3 attempts)
    max_attempts = 3
    backoff_delay = 2
    last_error = None

    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(f"Connecting to database '{db_name}' (Attempt {attempt}/{max_attempts})...")
            # Connect to database using target engine
            async with engine.begin() as conn:
                logger.info("Ensuring schema 'homesync' exists...")
                await conn.execute(text("CREATE SCHEMA IF NOT EXISTS homesync"))

                logger.info("Ensuring all tables exist in 'homesync' schema...")
                from app.db.base import Base
                await conn.run_sync(Base.metadata.create_all)

            logger.info("Database, schema, and table initialization completed successfully.")
            return
        except Exception as e:
            last_error = e
            logger.warning(f"Connection/Initialization attempt {attempt} failed: {e}")
            if attempt < max_attempts:
                logger.info(f"Retrying connection in {backoff_delay} seconds...")
                await asyncio.sleep(backoff_delay)
                backoff_delay *= 2

    logger.critical("Database initialization failed: all connection attempts timed out or failed.")
    raise last_error
