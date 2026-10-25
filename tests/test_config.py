import pytest
from pydantic import ValidationError
from backend.config import Settings, EnvironmentType


def test_valid_testnet_config():
    settings = Settings(
        ENVIRONMENT=EnvironmentType.TESTNET,
        DELTA_REST_URL="https://cdn-ind.testnet.deltaex.org",
        DELTA_WS_URL="wss://socket-ind.testnet.deltaex.org"
    )
    assert settings.ENVIRONMENT == EnvironmentType.TESTNET
    assert "testnet" in settings.DELTA_REST_URL


def test_reject_production_rest_host():
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT=EnvironmentType.TESTNET,
            DELTA_REST_URL="https://api.delta.exchange"
        )


def test_reject_production_ws_host():
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT=EnvironmentType.TESTNET,
            DELTA_WS_URL="wss://socket.delta.exchange"
        )

