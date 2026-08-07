# ==============================================================================
#  db.py  —  PostgreSQL / SQLite with runtime hot-switch
#  DB engine is controlled by:
#    1. DB_ENGINE env var ("sqlite" | "postgres")  — checked first
#    2. db_config.json file                        — runtime toggle from Settings UI
#    3. Auto: if PG_HOST + PG_DATABASE are set → postgres, else sqlite
# ==============================================================================
import os
import sqlite3
import logging
import json
from contextlib import contextmanager

logger = logging.getLogger("AuditBackend.DB")

# ── Load .env if available ────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

PG_HOST     = os.getenv("PG_HOST", "")
PG_PORT     = int(os.getenv("PG_PORT", "5432"))
PG_USER     = os.getenv("PG_USER", "postgres")
PG_PASSWORD = os.getenv("PG_PASSWORD", "")
PG_DATABASE = os.getenv("PG_DATABASE", "")

# ── Runtime config file (written by Settings UI toggle) ───────────────────────
DB_CONFIG_FILE = "db_config.json"

def _read_db_config() -> dict:
    """Read the runtime db config file. Returns defaults if not found."""
    try:
        if os.path.exists(DB_CONFIG_FILE):
            with open(DB_CONFIG_FILE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return {"engine": "auto"}

def write_db_config(engine: str):
    """Write the DB engine choice to config file. engine = 'sqlite' | 'postgres' | 'auto'"""
    with open(DB_CONFIG_FILE, "w") as f:
        json.dump({"engine": engine}, f)
    logger.info(f"DB engine switched to: {engine}")

def get_active_engine() -> str:
    """
    Determine active DB engine. Priority:
    1. DB_ENGINE env var (set 'postgres' on AWS deployment, overrides everything)
    2. db_config.json (set by Settings UI toggle)
    3. Auto-detect: if PG creds in .env → postgres, else sqlite
    Returns: 'postgres' or 'sqlite'
    """
    env_engine = os.getenv("DB_ENGINE", "").lower()
    if env_engine in ("postgres", "postgresql", "pg"):
        return "postgres"
    if env_engine == "sqlite":
        return "sqlite"

    # Check runtime config file
    cfg = _read_db_config()
    cfg_engine = cfg.get("engine", "auto").lower()
    if cfg_engine == "postgres":
        return "postgres"
    if cfg_engine == "sqlite":
        return "sqlite"

    # Auto-detect from .env credentials
    if PG_HOST and PG_DATABASE:
        return "postgres"
    return "sqlite"

# Try to import psycopg2 (needed for postgres mode)
_psycopg2_available = False
try:
    import psycopg2
    import psycopg2.extras
    _psycopg2_available = True
except ImportError:
    logger.warning("psycopg2 not installed — PostgreSQL mode will not be available")

# For backward compatibility
USE_POSTGRES = (get_active_engine() == "postgres") and _psycopg2_available
logger.info(f"DB engine at startup: {get_active_engine()} (psycopg2: {_psycopg2_available})")



# ── Compatibility cursor wrapper ───────────────────────────────────────────────
class _DictRow(dict):
    """A dict subclass that also supports column-index access like sqlite3.Row."""
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)


class CompatCursor:
    """
    Wraps a psycopg2 RealDictCursor to behave like sqlite3's Row-factory cursor.
    """
    def __init__(self, cur):
        self._cur = cur
        self.lastrowid = None

    def execute(self, sql, params=()):
        pg_sql = _to_pg(sql)
        self._cur.execute(pg_sql, params)
        # Attempt to grab lastrowid if INSERT … RETURNING id was used
        if re.match(r"^\s*INSERT", pg_sql, re.IGNORECASE) and "RETURNING" in pg_sql.upper():
            try:
                row = self._cur.fetchone()
                if row and "id" in row:
                    self.lastrowid = row["id"]
            except Exception:
                pass
        return self

    def fetchone(self):
        row = self._cur.fetchone()
        if row is None:
            return None
        return _DictRow(dict(row)) if isinstance(row, dict) else row

    def fetchall(self):
        rows = self._cur.fetchall()
        return [_DictRow(dict(r)) if isinstance(r, dict) else r for r in rows]

    def __iter__(self):
        for row in self._cur:
            yield _DictRow(dict(row)) if isinstance(row, dict) else row


import re  # needs to be after class defs for _to_pg reference in execute


class CompatConn:
    """
    Wraps a psycopg2 connection to look like sqlite3's context-manager connection.
    """
    def __init__(self, pg_conn):
        self._conn = pg_conn
        self.row_factory = None  # accepted but ignored
        self.lastrowid = None

    def cursor(self):
        raw = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return CompatCursor(raw)

    def execute(self, sql, params=()):
        cur = self.cursor()
        cur.execute(sql, params)
        self.lastrowid = cur.lastrowid
        return cur

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()
        return False


# ── Public API ─────────────────────────────────────────────────────────────────
@contextmanager
def get_db(sqlite_path: str = "audits.db"):
    """
    Context manager — drop-in replacement for `with sqlite3.connect(DB_PATH) as conn:`
    Engine is determined dynamically on every call via get_active_engine().

    Usage:
        with get_db() as conn:
            conn.row_factory = ...   # accepted, ignored for PG
            cursor = conn.execute("SELECT ...", (params,))
            rows = cursor.fetchall()
    """
    engine = get_active_engine()
    if engine == "postgres" and _psycopg2_available:
        pg_conn = psycopg2.connect(
            host=PG_HOST, port=PG_PORT,
            user=PG_USER, password=PG_PASSWORD,
            dbname=PG_DATABASE
        )
        wrapper = CompatConn(pg_conn)
        try:
            yield wrapper
        except Exception:
            wrapper.rollback()
            raise
        finally:
            try:
                wrapper.commit()
            except Exception:
                pass
            wrapper.close()
    else:
        with sqlite3.connect(sqlite_path) as conn:
            yield conn


def _guess_pk(table: str) -> str:
    """Return the primary key column name for known tables."""
    pks = {
        "portal_settings": "key",
        "wifi_credentials": "ssid",
        "asset_lifecycle": "mac_address",
    }
    return pks.get(table.lower(), "id")


def _to_pg(sql: str) -> str:
    """Convert SQLite-dialect SQL to PostgreSQL-compatible SQL."""
    # 1. ? → %s
    sql = sql.replace("?", "%s")

    # 2. INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL PRIMARY KEY
    sql = re.sub(
        r"INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT",
        "SERIAL PRIMARY KEY",
        sql, flags=re.IGNORECASE
    )

    # 3. INSERT OR IGNORE → INSERT … ON CONFLICT DO NOTHING
    had_or_ignore = bool(re.search(r"INSERT\s+OR\s+IGNORE", sql, re.IGNORECASE))
    sql = re.sub(r"INSERT\s+OR\s+IGNORE\s+INTO", "INSERT INTO", sql, flags=re.IGNORECASE)

    # 4. INSERT OR REPLACE → INSERT … ON CONFLICT DO UPDATE
    def _replace_handler(m):
        table = m.group(1)
        cols  = m.group(2)
        vals  = m.group(3)
        pk    = _guess_pk(table)
        set_clause = ", ".join(
            f"{c.strip()} = EXCLUDED.{c.strip()}"
            for c in cols.split(",")
            if c.strip() and c.strip() != pk
        )
        return (
            f"INSERT INTO {table} ({cols}) VALUES ({vals}) "
            f"ON CONFLICT ({pk}) DO UPDATE SET {set_clause}"
        )

    sql = re.sub(
        r"INSERT\s+OR\s+REPLACE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)",
        _replace_handler,
        sql, flags=re.IGNORECASE
    )

    # 5. Add RETURNING id to INSERT (so lastrowid works)
    #    Only for tables that have an auto-increment integer 'id' column
    #    (i.e. NOT for portal_settings, wifi_credentials, asset_lifecycle)
    TEXT_PK_TABLES = {"portal_settings", "wifi_credentials", "asset_lifecycle"}

    def _should_add_returning(sql_str):
        m = re.match(r"^\s*INSERT\s+INTO\s+(\w+)", sql_str, re.IGNORECASE)
        if not m:
            return False
        table = m.group(1).lower()
        return table not in TEXT_PK_TABLES

    if re.match(r"^\s*INSERT\s+INTO", sql, re.IGNORECASE):
        if "RETURNING" not in sql.upper() and _should_add_returning(sql):
            if "ON CONFLICT" not in sql.upper():
                sql = sql.rstrip().rstrip(";") + " RETURNING id"
            else:
                # ON CONFLICT ... DO UPDATE or DO NOTHING — still add RETURNING
                sql = sql.rstrip().rstrip(";") + " RETURNING id"

    # 6. Add ON CONFLICT DO NOTHING for converted INSERT OR IGNORE
    if had_or_ignore and "ON CONFLICT" not in sql.upper():
        sql = sql.rstrip().rstrip(";").replace(" RETURNING id", "")
        sql += " ON CONFLICT DO NOTHING"

    # 7. Remove SQLite-specific COLLATE NOCASE
    sql = re.sub(r"\s+COLLATE\s+NOCASE", "", sql, flags=re.IGNORECASE)

    return sql


def init_db(sqlite_path: str = "audits.db"):
    """Create all tables. Works for both SQLite and PostgreSQL."""
    with get_db(sqlite_path) as conn:
        if USE_POSTGRES:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS device_audits (
                    id SERIAL PRIMARY KEY,
                    mac_address TEXT,
                    computer_name TEXT,
                    os_name TEXT,
                    execution_datetime TEXT,
                    audit_data TEXT
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS wifi_credentials (
                    ssid TEXT PRIMARY KEY,
                    password TEXT NOT NULL,
                    updated_at TEXT
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS asset_lifecycle (
                    mac_address TEXT PRIMARY KEY,
                    computer_name TEXT,
                    owner TEXT DEFAULT '',
                    vendor TEXT DEFAULT '',
                    status TEXT DEFAULT 'Active',
                    warranty_start TEXT DEFAULT '',
                    warranty_end TEXT DEFAULT '',
                    warranty_notes TEXT DEFAULT '',
                    warranty_provider TEXT DEFAULT '',
                    purchase_price TEXT DEFAULT '',
                    purchase_date TEXT DEFAULT '',
                    supplier TEXT DEFAULT '',
                    po_number TEXT DEFAULT '',
                    updated_at TEXT
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS asset_tickets (
                    id SERIAL PRIMARY KEY,
                    mac_address TEXT,
                    computer_name TEXT,
                    ticket_number TEXT,
                    summary TEXT,
                    status TEXT DEFAULT 'Open',
                    assigned TEXT DEFAULT '',
                    priority TEXT DEFAULT 'Medium',
                    mtbf TEXT DEFAULT '',
                    created_at TEXT,
                    updated_at TEXT
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS portal_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            ''')
            conn.execute(
                "INSERT INTO portal_settings (key, value) VALUES ('audit_engine', 'native') "
                "ON CONFLICT (key) DO NOTHING"
            )
        else:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS device_audits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    mac_address TEXT,
                    computer_name TEXT,
                    os_name TEXT,
                    execution_datetime TEXT,
                    audit_data TEXT
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS wifi_credentials (
                    ssid TEXT PRIMARY KEY,
                    password TEXT NOT NULL,
                    updated_at TEXT
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS asset_lifecycle (
                    mac_address TEXT PRIMARY KEY,
                    computer_name TEXT,
                    owner TEXT DEFAULT '',
                    vendor TEXT DEFAULT '',
                    status TEXT DEFAULT 'Active',
                    warranty_start TEXT DEFAULT '',
                    warranty_end TEXT DEFAULT '',
                    warranty_notes TEXT DEFAULT '',
                    warranty_provider TEXT DEFAULT '',
                    purchase_price TEXT DEFAULT '',
                    purchase_date TEXT DEFAULT '',
                    supplier TEXT DEFAULT '',
                    po_number TEXT DEFAULT '',
                    updated_at TEXT
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS asset_tickets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    mac_address TEXT,
                    computer_name TEXT,
                    ticket_number TEXT,
                    summary TEXT,
                    status TEXT DEFAULT 'Open',
                    assigned TEXT DEFAULT '',
                    priority TEXT DEFAULT 'Medium',
                    mtbf TEXT DEFAULT '',
                    created_at TEXT,
                    updated_at TEXT
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS portal_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            ''')
            conn.execute("INSERT OR IGNORE INTO portal_settings (key, value) VALUES ('audit_engine', 'native')")
            conn.commit()
