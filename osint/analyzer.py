"""
analyzer.py — Main OSINT domain analyzer.

Entry point for the analysis pipeline. Calls scoring.py which in turn
calls dns_checks.py, then enriches the result with a risk category used
for the event security map scatter plot.

Risk categories (Y axis in the dashboard) — based ONLY on passive DNS/network checks:
  Email expuesto    — SPF and DMARC both missing → domain open to spoofing
  Puertos expuestos — More than 2 open TCP ports detected publicly
  Score crítico     — Low score (< 40) but no dominant technical signal
  Sin alertas DNS   — Default; no alarming signals in passive checks

NOTE: These categories reflect only what public DNS and TCP port checks
can observe. They do NOT indicate presence/absence of EDR, AV, XDR or
any internal endpoint controls.
"""

from typing import Any

from osint.scoring import calculate_security_exposure_score


def _risk_category(result: dict[str, Any]) -> str:
    """Assign a risk category based solely on observable passive-check findings.

    Categories reflect only what DNS/port scans can detect — they do NOT
    imply knowledge of internal controls such as EDR or AV.
    """
    spf: bool = result.get("spf", False)
    dmarc: bool = result.get("dmarc", False)
    open_ports: list = result.get("open_ports", [])
    score: int = result.get("score", 50)

    if not spf and not dmarc:
        return "Email expuesto"
    if len(open_ports) > 2:
        return "Puertos expuestos"
    if score < 40:
        return "Score crítico"
    return "Sin alertas DNS"


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
