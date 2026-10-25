import logging
from backend.security import (
    SensitiveDataRedactor,
    generate_delta_signature,
    mask_credential,
    verify_signature,
)


def test_hmac_sha256_signature_generation():
    secret = "test_secret_key"
    method = "GET"
    timestamp = "1672531199"
    path = "/v2/positions"
    query_string = ""
    body = ""

    sig = generate_delta_signature(secret, method, timestamp, path, query_string, body)
    assert isinstance(sig, str)
    assert len(sig) == 64

    prehash = f"{method}{timestamp}{path}"
    assert verify_signature(secret, prehash, sig) is True


def test_mask_credential():
    assert mask_credential("WoAL5ElJrF58GGracFGB7xqD2z6zeS") == "WoAL...6zeS"
    assert mask_credential("") == "Not Configured"
    assert mask_credential("1234") == "****"


def test_sensitive_data_redactor():
    secret_key = "WoAL5ElJrF58GGracFGB7xqD2z6zeS"
    redactor = SensitiveDataRedactor(patterns_to_redact=[secret_key])

    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg=f"Using credentials key={secret_key} and Bearer mytoken123",
        args=(),
        exc_info=None
    )

    redactor.filter(record)
    assert secret_key not in record.msg
    assert "[REDACTED]" in record.msg


def test_sensitive_data_redactor_preserves_uvicorn_args():
    redactor = SensitiveDataRedactor(patterns_to_redact=["secret123"])
    args = ("127.0.0.1", "GET", "/api/watchlist?key=secret123", "1.1", 200)
    record = logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg='%s - "%s %s HTTP/%s" %d',
        args=args,
        exc_info=None
    )
    redactor.filter(record)
    assert len(record.args) == 5
    assert record.args[0] == "127.0.0.1"
    assert record.args[4] == 200
    assert "secret123" not in record.args[2]

