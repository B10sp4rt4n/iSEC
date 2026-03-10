"""
dns_checks.py — Lightweight passive DNS and port checks.

All checks are read-only / non-invasive:
  - DNS queries use the system resolver via dnspython.
  - Port scanning uses a short TCP connect timeout (no SYN scan).
"""

import socket
from typing import Optional

import dns.exception
import dns.resolver


# ── DNS resolution ──────────────────────────────────────────────────────────

def check_dns_resolution(domain: str) -> bool:
    """Return True if the domain resolves to at least one A record."""
    try:
        dns.resolver.resolve(domain, "A", lifetime=5)
        return True
    except Exception:
        return False


# ── SPF ─────────────────────────────────────────────────────────────────────

def check_spf(domain: str) -> bool:
    """Return True if a TXT record starting with 'v=spf1' exists on the domain."""
    try:
        answers = dns.resolver.resolve(domain, "TXT", lifetime=5)
        for rdata in answers:
            # Each TXT record may have multiple strings; join them.
            txt = b"".join(rdata.strings).decode("utf-8", errors="ignore")
            if txt.startswith("v=spf1"):
                return True
    except Exception:
        pass
    return False


# ── DMARC ────────────────────────────────────────────────────────────────────

def check_dmarc(domain: str) -> bool:
    """Return True if a DMARC policy record exists at _dmarc.<domain>."""
    try:
        answers = dns.resolver.resolve(f"_dmarc.{domain}", "TXT", lifetime=5)
        for rdata in answers:
            txt = b"".join(rdata.strings).decode("utf-8", errors="ignore")
            if "v=DMARC1" in txt:
                return True
    except Exception:
        pass
    return False


# ── Port scan ────────────────────────────────────────────────────────────────

def check_open_ports(
    domain: str,
    ports: list[int] | None = None,
    timeout: float = 2.0,
) -> list[int]:
    """
    Return the subset of `ports` that accept TCP connections on `domain`.

    Uses a short connect timeout to avoid blocking the worker.
    Defaults to checking [80, 443, 22, 21].
    """
    if ports is None:
        ports = [80, 443, 22, 21]

    # Resolve once to avoid repeated DNS lookups per port.
    try:
        ip = socket.gethostbyname(domain)
    except socket.gaierror:
        return []

    open_ports: list[int] = []
    for port in ports:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(timeout)
                if sock.connect_ex((ip, port)) == 0:
                    open_ports.append(port)
        except Exception:
            pass

    return open_ports
