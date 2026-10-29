import os
import sys
import logging
from pathlib import Path
import aiosqlite  # Explicit import forces PyInstaller dependency bundling
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event, engine

# -------------------------------------------------------------
# 1. PERSISTENT APPDATA DIRECTORY GUARANTEE (%LOCALAPPDATA%)
# -------------------------------------------------------------
def get_user_appdata_dir() -> Path:
    """Guarantees a writable user AppData directory even in restricted environments."""
    local_appdata = os.getenv('LOCALAPPDATA')
    if not local_appdata:
        # Fallback to user home directory if LOCALAPPDATA env var is missing or empty
        local_appdata = Path(os.path.expanduser('~')) / "AppData" / "Local"
    
    app_dir = Path(local_appdata) / "DentalAISuite"
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir

# Resolve directories cleanly inside C:\Users\<Username>\AppData\Local\DentalAISuite\
SUITE_DIR = get_user_appdata_dir()
APPDATA_DIR = SUITE_DIR / "data"
APPDATA_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# 2. UNBUFFERED FILE LOGGING INSIDE APPDATA
# -------------------------------------------------------------
LOG_FILE = SUITE_DIR / "debug_app.log"

logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    force=True
)

logger = logging.getLogger("dental_app")

for handler in logging.root.handlers:
    handler.flush()

logger.info("=== Database Engine Initializing ===")
logger.info(f"Logging configured cleanly at: {LOG_FILE}")

DB_PATH = APPDATA_DIR / "dental_app.db"
logger.info(f"Target SQLite database path: {DB_PATH.resolve()}")

# -------------------------------------------------------------
# 3. ASYNC DATABASE ENGINE & PRAGMAS
# -------------------------------------------------------------
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH.resolve()}"

async_engine = create_async_engine(
    DATABASE_URL,
    echo=False,
)

@event.listens_for(engine.Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.execute("PRAGMA busy_timeout=5000;")  # Prevents database lock errors
    cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        yield session