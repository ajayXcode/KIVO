import os
os.environ["TESTING"] = "1"

import pytest
from backend.api import health_live, health_ready, get_overview, get_credentials
from backend.models import BotState


@pytest.mark.asyncio
async def test_endpoint_health_live():
    res = await health_live()
    assert res == {"status": "ok"}


@pytest.mark.asyncio
async def test_endpoint_health_ready():
    res = await health_ready()
    assert "ready" in res
    assert res["environment"] == "TESTNET"


@pytest.mark.asyncio
async def test_endpoint_get_overview():
    overview = await get_overview()
    assert overview.symbol == "BTCUSD"
    assert overview.environment == "TESTNET"
    assert overview.test_equity_usd == 10000.0


@pytest.mark.asyncio
async def test_endpoint_get_credentials():
    creds = await get_credentials()
    assert creds.environment == "TESTNET"

