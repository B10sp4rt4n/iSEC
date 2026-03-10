"""
analyzer.py — Main OSINT domain analyzer.

Entry point for the analysis pipeline. Calls scoring.py which in turn
calls dns_checks.py, then enriches the result with a risk category used
for the event security map scatter plot.

Risk categories (Y axis in the dashboard):
  email          — SPF and DMARC both missing → email spoofing risk
  infrastructure — More than 2 open ports → network exposure risk
  compliance     — Low score (< 40) but no dominant technical signal
  endpoint       — Default; moderate posture
"""

from typing import Any

from osint.scoring import calculate_security_exposure_score


def _risk_category(result: dict[str, Any]) -> str:
    """Assign a single risk category based on the analysis findings."""
    spf: bool = result.get("spf", False)
    dmarc: bool = result.get("dmarc", False)
    open_ports: list = result.get("open_ports", [])
    score: int = result.get("score", 50)

    if not spf and not dmarc:
        return "email"
    if len(open_ports) > 2:
        return "infrastructure"
    if score < 40:
        return "compliance"
    return "endpoint"


def analyze_domain(domain: str) -> dict[str, Any]:
    """
    Run all OSINT checks on `domain` and return the enriched result.

    Returned dict:
        domain      str
        spf         bool
        dmarc       bool
        open_ports  list[int]
        score       int   (0-100)
        risk        str   (email | infrastructure | compliance | endpoint)
    """
    result = calculate_security_exposure_score(domain)
    result["risk"] = _risk_category(result)
    return result
