"""
scoring.py — Security exposure scoring model.

Scoring rules (start = 50):
  +5   DNS resolves correctly
  -15  DNS fails to resolve
  +10  SPF record found
  +15  DMARC record found
  -10  More than 2 open ports detected

Final score is clamped to [0, 100].
"""

from typing import Any

from osint.dns_checks import (
    check_dmarc,
    check_dns_resolution,
    check_open_ports,
    check_spf,
)


def calculate_security_exposure_score(domain: str) -> dict[str, Any]:
    """
    Run all checks for `domain` and return a structured exposure result.

    Returns:
        {
            "domain": str,
            "spf": bool,
            "dmarc": bool,
            "open_ports": list[int],
            "score": int   # 0-100
        }
    """
    dns_ok = check_dns_resolution(domain)

    # Skip further checks if domain doesn't resolve — no IP to scan.
    if dns_ok:
        spf = check_spf(domain)
        dmarc = check_dmarc(domain)
        open_ports = check_open_ports(domain)
    else:
        spf = False
        dmarc = False
        open_ports = []

    # ── Apply scoring rules ─────────────────────────────────────────────────
    score = 50

    if dns_ok:
        score += 5
    else:
        score -= 15

    if spf:
        score += 10

    if dmarc:
        score += 15

    if len(open_ports) > 2:
        score -= 10

    # Clamp to valid range.
    score = max(0, min(100, score))

    return {
        "domain": domain,
        "spf": spf,
        "dmarc": dmarc,
        "open_ports": open_ports,
        "score": score,
    }
