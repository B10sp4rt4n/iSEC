"""
worker.py — Background worker for bulk OSINT domain analysis.

Reads every unique corporate domain from event_prospects that has not yet
been analyzed, runs the full OSINT pipeline concurrently, and persists
the results to security_exposure.

Performance target: 100 domains in a few minutes.
Strategy: ThreadPoolExecutor with 10 workers (I/O-bound workload).

Usage (from the workspace root):
    python -m osint.worker
    python -m osint.worker --limit 50   # optional cap
"""

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

from database.neon_client import NeonClient
from osint.analyzer import analyze_domain

MAX_WORKERS = 10  # concurrent threads; tune as needed


def run_worker(limit: int = 200) -> None:
    db = NeonClient()

    domains = db.get_pending_domains(limit)

    if not domains:
        print("✅ No hay dominios pendientes de analizar.")
        return

    total = len(domains)
    print(f"🔍 Analizando {total} dominios con {MAX_WORKERS} workers en paralelo...\n")

    done = 0
    errors = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_domain = {
            executor.submit(analyze_domain, domain): domain
            for domain in domains
        }

        for future in as_completed(future_to_domain):
            domain = future_to_domain[future]
            try:
                result = future.result()
                db.upsert_exposure(result)
                done += 1
                status = "✅" if result["score"] >= 60 else ("⚠️" if result["score"] >= 40 else "🔴")
                print(
                    f"[{done}/{total}] {status} {domain:<40} "
                    f"score={result['score']:>3}  risk={result['risk']:<16} "
                    f"ports={result['open_ports']}"
                )
            except Exception as exc:
                errors += 1
                print(f"[ERROR] {domain}: {exc}", file=sys.stderr)

    print(f"\n🏁 Completado: {done} OK, {errors} errores.")


# ── CLI entry point ──────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="iSEC OSINT domain worker")
    parser.add_argument(
        "--limit",
        type=int,
        default=200,
        help="Maximum number of domains to process (default: 200)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    run_worker(limit=args.limit)
