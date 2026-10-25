import time
import pytest
from backend.market_data import Candle, CandleSeries
from backend.models import SignalAction
from backend.strategy import StrategyEngine


def test_strategy_warmup_gate():
    engine = StrategyEngine()
    series_5m = CandleSeries(resolution_seconds=300)
    series_15m = CandleSeries(resolution_seconds=900)

    now = int(time.time())
    for i in range(5):
        series_5m.add_candle(Candle(now + i * 300, 100.0, 105.0, 95.0, 102.0, 10.0))
        series_15m.add_candle(Candle(now + i * 900, 100.0, 105.0, 95.0, 102.0, 10.0))

    result = engine.evaluate(series_5m, series_15m)
    assert result.action == SignalAction.NO_TRADE
    assert "INDICATOR_WARMUP" in result.reason

