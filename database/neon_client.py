"""
neon_client.py — Neon Postgres client for the OSINT pipeline.

Responsibilities:
  - get_pending_domains()  → list of unanalyzed corporate domains
  - upsert_exposure()      → insert or update a security_exposure row
  - load_exposure()        → full table for dashboard consumption

Uses psycopg2 directly (no ORM) to keep the dependency footprint minimal
and avoid conflicts with the SQLAlchemy instance used by the Streamlit app.

Reads DATABASE_URL from .env.local (project root) or environment.
"""

import json
import os
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# Load from project root first, then fall back to environment.
_ROOT = os.path.join(os.path.dirname(__file__), "..")
load_dotenv(dotenv_path=os.path.join(_ROOT, ".env.local"))
load_dotenv()


class NeonClient:
    """Thin wrapper around a Neon Postgres connection."""

    def __init__(self) -> None:
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            raise RuntimeError(
                "DATABASE_URL no está configurada. "
                "Agrega un archivo .env.local o define la variable de entorno."
            )
        # psycopg2 requires postgresql:// scheme.
        self._url = db_url.replace("postgres://", "postgresql://", 1)

    def _connect(self) -> psycopg2.extensions.connection:
        return psycopg2.connect(
            self._url,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )

    # ── Reads ────────────────────────────────────────────────────────────────

    def get_pending_domains(self, limit: int = 200) -> list[str]:
        """
        Return up to `limit` unique corporate domains from event_prospects
        that do not yet have a row in security_exposure.

        Corporate = not a free-mail provider; those are already blocked at
        registration time in the Next.js API, so every domain in the table
        should be corporate.
        """
        sql = """
            SELECT DISTINCT split_part(correo, '@', 2) AS domain
            FROM event_prospects
            WHERE split_part(correo, '@', 2) NOT IN (
                SELECT domain FROM security_exposure
            )
            ORDER BY domain
            LIMIT %s
        """
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (limit,))
                return [row["domain"] for row in cur.fetchall()]

    def load_exposure(self) -> list[dict[str, Any]]:
        """Return all rows from security_exposure ordered by score ascending."""
        sql = """
            SELECT
                se.domain,
                se.score,
                se.spf,
                se.dmarc,
                se.open_ports,
                se.timestamp,
                p.empresa
            FROM security_exposure se
            LEFT JOIN LATERAL (
                SELECT empresa
                FROM event_prospects
                WHERE split_part(correo, '@', 2) = se.domain
                LIMIT 1
            ) p ON TRUE
            ORDER BY se.score ASC
        """
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                return [dict(row) for row in cur.fetchall()]

    # ── Writes ───────────────────────────────────────────────────────────────

    def upsert_exposure(self, result: dict[str, Any]) -> None:
        """
        Insert a new security_exposure row or update it if the domain
        already exists (re-analysis scenario).
        """
        sql = """
            INSERT INTO security_exposure (domain, score, spf, dmarc, open_ports)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (domain) DO UPDATE SET
                score      = EXCLUDED.score,
                spf        = EXCLUDED.spf,
                dmarc      = EXCLUDED.dmarc,
                open_ports = EXCLUDED.open_ports,
                timestamp  = NOW()
        """
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    (
                        result["domain"],
                        result["score"],
                        result["spf"],
                        result["dmarc"],
                        json.dumps(result["open_ports"]),
                    ),
                )
            conn.commit()

    def ensure_schema(self) -> None:
        """
        Create the security_exposure table if it doesn't exist yet.
        Useful when running the worker in a fresh environment.
        """
        sql = """
            CREATE TABLE IF NOT EXISTS security_exposure (
                id         SERIAL PRIMARY KEY,
                domain     TEXT NOT NULL UNIQUE,
                score      INTEGER NOT NULL,
                spf        BOOLEAN NOT NULL DEFAULT FALSE,
                dmarc      BOOLEAN NOT NULL DEFAULT FALSE,
                open_ports TEXT NOT NULL DEFAULT '[]',
                timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_security_exposure_score
                ON security_exposure (score ASC);
        """
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
