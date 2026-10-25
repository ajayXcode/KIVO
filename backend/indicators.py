"""Pure NumPy technical indicators: EMA, RSI, ADX, Bollinger Bands, ATR, and Volume SMA."""

from typing import Tuple
import numpy as np


def calculate_ema(prices: np.ndarray, period: int) -> np.ndarray:
    """Calculate Exponential Moving Average (EMA)."""
    if len(prices) < period:
        return np.full_like(prices, np.nan, dtype=float)

    alpha = 2.0 / (period + 1.0)
    ema = np.empty_like(prices, dtype=float)
    ema[:] = np.nan

    ema[period - 1] = np.mean(prices[:period])
    for i in range(period, len(prices)):
        ema[i] = alpha * prices[i] + (1.0 - alpha) * ema[i - 1]

    return ema


def calculate_rsi(prices: np.ndarray, period: int = 14) -> np.ndarray:
    """Calculate Wilder's smoothed Relative Strength Index (RSI)."""
    if len(prices) <= period:
        return np.full_like(prices, np.nan, dtype=float)

    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)

    rsi = np.full_like(prices, np.nan, dtype=float)
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])

    if avg_loss == 0.0:
        rsi[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi[period] = 100.0 - (100.0 / (1.0 + rs))

    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

        idx = i + 1
        if avg_loss == 0.0:
            rsi[idx] = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi[idx] = 100.0 - (100.0 / (1.0 + rs))

    return rsi


def calculate_adx(
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    period: int = 14
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Calculate Wilder's smoothed ADX, +DI, and -DI."""
    n = len(closes)
    adx = np.full(n, np.nan, dtype=float)
    plus_di = np.full(n, np.nan, dtype=float)
    minus_di = np.full(n, np.nan, dtype=float)

    if n <= 2 * period:
        return adx, plus_di, minus_di

    tr = np.zeros(n, dtype=float)
    plus_dm = np.zeros(n, dtype=float)
    minus_dm = np.zeros(n, dtype=float)

    for i in range(1, n):
        h = highs[i]
        l = lows[i]
        prev_c = closes[i - 1]
        prev_h = highs[i - 1]
        prev_l = lows[i - 1]

        tr[i] = max(h - l, abs(h - prev_c), abs(l - prev_c))
        up_move = h - prev_h
        down_move = prev_l - l

        if up_move > down_move and up_move > 0:
            plus_dm[i] = up_move
        else:
            plus_dm[i] = 0.0

        if down_move > up_move and down_move > 0:
            minus_dm[i] = down_move
        else:
            minus_dm[i] = 0.0

    tr_smooth = np.sum(tr[1:period + 1])
    plus_dm_smooth = np.sum(plus_dm[1:period + 1])
    minus_dm_smooth = np.sum(minus_dm[1:period + 1])

    dx = np.zeros(n, dtype=float)
    if tr_smooth > 0:
        p_di = 100.0 * (plus_dm_smooth / tr_smooth)
        m_di = 100.0 * (minus_dm_smooth / tr_smooth)
        plus_di[period] = p_di
        minus_di[period] = m_di
        di_sum = p_di + m_di
        dx[period] = (100.0 * abs(p_di - m_di) / di_sum) if di_sum > 0 else 0.0

    for i in range(period + 1, n):
        tr_smooth = tr_smooth - (tr_smooth / period) + tr[i]
        plus_dm_smooth = plus_dm_smooth - (plus_dm_smooth / period) + plus_dm[i]
        minus_dm_smooth = minus_dm_smooth - (minus_dm_smooth / period) + minus_dm[i]

        if tr_smooth > 0:
            p_di = 100.0 * (plus_dm_smooth / tr_smooth)
            m_di = 100.0 * (minus_dm_smooth / tr_smooth)
            plus_di[i] = p_di
            minus_di[i] = m_di
            di_sum = p_di + m_di
            dx[i] = (100.0 * abs(p_di - m_di) / di_sum) if di_sum > 0 else 0.0

    adx_start = 2 * period
    if n > adx_start:
        adx[adx_start] = np.mean(dx[period:adx_start + 1])
        for i in range(adx_start + 1, n):
            adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period

    return adx, plus_di, minus_di


def calculate_bollinger_bands(
    prices: np.ndarray,
    period: int = 20,
    num_std: float = 2.0
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Calculate Bollinger Bands: (upper, middle, lower, bandwidth_pct)."""
    n = len(prices)
    upper = np.full(n, np.nan, dtype=float)
    middle = np.full(n, np.nan, dtype=float)
    lower = np.full(n, np.nan, dtype=float)
    bandwidth = np.full(n, np.nan, dtype=float)

    if n < period:
        return upper, middle, lower, bandwidth

    for i in range(period - 1, n):
        window = prices[i - period + 1 : i + 1]
        mean = float(np.mean(window))
        std = float(np.std(window))
        middle[i] = mean
        upper[i] = mean + (num_std * std)
        lower[i] = mean - (num_std * std)
        if mean > 0:
            bandwidth[i] = ((upper[i] - lower[i]) / mean) * 100.0

    return upper, middle, lower, bandwidth


def calculate_atr(
    highs: np.ndarray,
    lows: np.ndarray,
    closes: np.ndarray,
    period: int = 14
) -> np.ndarray:
    """Calculate Average True Range (ATR)."""
    n = len(closes)
    atr = np.full(n, np.nan, dtype=float)
    if n <= period:
        return atr

    tr = np.zeros(n, dtype=float)
    for i in range(1, n):
        tr[i] = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i - 1]),
            abs(lows[i] - closes[i - 1])
        )

    atr[period] = np.mean(tr[1 : period + 1])
    for i in range(period + 1, n):
        atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period

    return atr

