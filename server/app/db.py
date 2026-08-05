import hashlib
import hmac
import secrets
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "chat_history.db"
PASSWORD_HASH_ITERATIONS = 200_000
TOKEN_EXPIRATION_HOURS = 24


def _hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS,
        dklen=32,
    )


def _generate_salt() -> bytes:
    return secrets.token_bytes(16)


def _generate_token() -> str:
    return secrets.token_urlsafe(32)


def _current_timestamp() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                persona TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash BLOB NOT NULL,
                salt BLOB NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()


def session_exists(session_id: str) -> bool:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
        return row is not None


def create_session(session_id: str, persona: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO sessions (session_id, persona) VALUES (?, ?)",
            (session_id, persona),
        )
        conn.commit()


def save_message(session_id: str, role: str, content: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
            (session_id, role, content),
        )
        conn.commit()


def load_messages(session_id: str) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id",
            (session_id,),
        ).fetchall()
        return [{"role": row["role"], "content": row["content"]} for row in rows]


def list_sessions() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT session_id, persona, created_at
            FROM sessions
            ORDER BY created_at DESC
            """
        ).fetchall()
        return [
            {
                "session_id": row["session_id"],
                "persona": row["persona"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]


def delete_session(session_id: str) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.commit()


def create_user(email: str, password: str) -> int:
    if get_user_by_email(email) is not None:
        raise ValueError("Email already registered")

    salt = _generate_salt()
    password_hash = _hash_password(password, salt)

    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)",
            (email.lower().strip(), password_hash, salt),
        )
        conn.commit()
        lastrowid = cursor.lastrowid
        if lastrowid is None:
            raise RuntimeError("Failed to create user")
        return lastrowid


def get_user_by_email(email: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash, salt FROM users WHERE email = ?",
            (email.lower().strip(),),
        ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "email": row["email"],
            "password_hash": row["password_hash"],
            "salt": row["salt"],
        }


def verify_password(password: str, salt: bytes, password_hash: bytes) -> bool:
    computed_hash = _hash_password(password, salt)
    return hmac.compare_digest(computed_hash, password_hash)


def create_auth_token(user_id: int) -> str:
    token = _generate_token()
    expires_at = (datetime.utcnow() + timedelta(hours=TOKEN_EXPIRATION_HOURS)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    with get_connection() as conn:
        conn.execute(
            "INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at),
        )
        conn.commit()

    return token


def get_user_by_token(token: str) -> dict | None:
    now = _current_timestamp()
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT users.id AS id, users.email AS email
            FROM users
            JOIN auth_tokens ON auth_tokens.user_id = users.id
            WHERE auth_tokens.token = ? AND auth_tokens.expires_at > ?
            """,
            (token, now),
        ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "email": row["email"],
        }


def delete_auth_token(token: str) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
        conn.commit()
