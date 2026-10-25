import pytest
import numpy as np
from backend.indicators import (
    calculate_adx,
    calculate_atr,
    calculate_bollinger_bands,
    calculate_ema,
    calculate_rsi,
)


def test_ema_calculation():
    prices = np.array([10.0, 11.0, 12.0, 13.0, 14.0, 15.0], dtype=float)
    ema = calculate_ema(prices, period=3)
    assert np.isnan(ema[0])
    assert np.isnan(ema[1])
    assert pytest.approx(ema[2], 0.001) == 11.0
    assert pytest.approx(ema[3], 0.001) == 12.0


def test_rsi_calculation():
    prices = np.linspace(100.0, 150.0, 30)
    rsi = calculate_rsi(prices, period=14)
    assert not np.isnan(rsi[-1])
    assert rsi[-1] > 80.0


def test_adx_calculation():
    n = 40
    closes = np.linspace(100.0, 200.0, n)
    highs = closes + 2.0
    lows = closes - 1.0

    adx, plus_di, minus_di = calculate_adx(highs, lows, closes, period=14)
    assert not np.isnan(adx[-1])
    assert plus_di[-1] > minus_di[-1]


def test_bollinger_bands():
    prices = np.full(25, 100.0, dtype=float)
    upper, middle, lower, bandwidth = calculate_bollinger_bands(prices, period=20, num_std=2.0)
    assert not np.isnan(upper[-1])
    assert pytest.approx(middle[-1], 0.01) == 100.0
    # For constant prices, std is 0, so upper = lower = middle = 100
    assert pytest.approx(upper[-1], 0.01) == 100.0
    assert pytest.approx(lower[-1], 0.01) == 100.0


def test_atr():
    n = 20
    highs = np.full(n, 105.0)
    lows = np.full(n, 95.0)
    closes = np.full(n, 100.0)
    atr = calculate_atr(highs, lows, closes, period=14)
    assert not np.isnan(atr[-1])
    assert pytest.approx(atr[-1], 0.01) == 10.0


def test_supertrend():
    from backend.indicators import calculate_supertrend
    highs = np.array([10, 12, 14, 13, 15, 16, 17, 16, 18, 19, 20, 21], dtype=float)
    lows = np.array([8, 9, 11, 10, 12, 13, 14, 13, 15, 16, 17, 18], dtype=float)
    closes = np.array([9, 11, 13, 12, 14, 15, 16, 15, 17, 18, 19, 20], dtype=float)
    st, direction, _, _ = calculate_supertrend(highs, lows, closes, period=5, multiplier=2.0)
    assert not np.isnan(st[-1])
    assert direction[-1] == 1  # Bullish trend


