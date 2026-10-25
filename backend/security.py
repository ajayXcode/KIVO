"""Security utilities: HMAC-SHA256 signature generation, log redaction, and secret masking."""

import hashlib
import hmac
import logging
import re
import time
from typing import Optional


class SensitiveDataRedactor(logging.Filter):
    """Logging filter that scrubs API keys, secrets, and signatures from log records."""

    def __init__(self, patterns_to_redact: Optional[list] = None):
        super().__init__()
        self.patterns = patterns_to_redact or []
        self.regexes = [
            re.compile(r'(api[_-]?key["\']?\s*[:=]\s*["\']?)([^"\'\s&]+)', re.IGNORECASE),
            re.compile(r'(api[_-]?secret["\']?\s*[:=]\s*["\']?)([^"\'\s&]+)', re.IGNORECASE),
            re.compile(r'(signature["\']?\s*[:=]\s*["\']?)([^"\'\s&]+)', re.IGNORECASE),
            re.compile(r'(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*', re.IGNORECASE),
        ]

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        for token in self.patterns:
            if token and len(token) > 4:
                msg = msg.replace(token, "[REDACTED]")
        for regex in self.regexes:
            msg = regex.sub(r'\1[REDACTED]', msg)
        record.msg = msg
        record.args = ()
        return True


def generate_delta_signature(
    secret: str,
    method: str,
    timestamp: str,
    path: str,
    query_string: str = "",
    body: str = ""
) -> str:
    """Generate Delta Exchange HMAC-SHA256 signature.

    Formula: HMAC-SHA256(secret, method + timestamp + path + query + payload)
    """
    if not secret:
        raise ValueError("Cannot sign request: API secret is empty or missing.")

    method_str = method.upper().strip()
    query_part = f"?{query_string}" if query_string and not query_string.startswith("?") else query_string
    payload_str = body if body else ""

    prehash = f"{method_str}{timestamp}{path}{query_part}{payload_str}"
    signature = hmac.new(
        secret.encode("utf-8"),
        prehash.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return signature


def get_current_timestamp_seconds() -> str:
    """Returns current UTC timestamp in seconds."""
    return str(int(time.time()))


def verify_signature(secret: str, prehash: str, expected_sig: str) -> bool:
    computed = hmac.new(secret.encode("utf-8"), prehash.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, expected_sig)


def mask_credential(val: str) -> str:
    """Safely mask credential string for frontend reporting (e.g. 'WoAL...zeS')."""
    if not val:
        return "Not Configured"
    if len(val) <= 8:
        return "****"
    return f"{val[:4]}...{val[-4:]}"

