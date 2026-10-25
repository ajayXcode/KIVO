import pytest
from backend.delta_client import DeltaClient


def test_delta_client_credentials():
    client = DeltaClient()
    client.set_credentials("test_key", "test_secret", persist=False)
    assert client.has_credentials() is True
    assert client.api_key == "test_key"
    assert client.api_secret == "test_secret"

    client.clear_credentials(persist=False)
    assert client.has_credentials() is False
    assert client.api_key == ""

