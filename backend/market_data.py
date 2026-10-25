"""Market data ingestion, candle normalization, freshness validation, and multi-timeframe alignment."""

from dataclasses import dataclass
from datetime import datetime, timezone
import time
from typing import Any, List, Optional, Tuple
import numpy as np


@dataclass
class Candle:
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

    @property
    def is_bullish(self) -> bool:
        return self.close > self.open

    @property
    def is_bearish(self) -> bool:
        return self.close < self.open


class CandleSeries:
    """Maintains a validated, chronological sequence of closed candles."""

    def __init__(self, resolution_seconds: int, max_candles: int = 500):
        self.resolution_seconds = resolution_seconds
        self.max_candles = max_candles
        self.candles: List[Candle] = []

    def clear(self) -> None:
        self.candles.clear()

    def add_candle(self, candle: Candle) -> bool:
        if not self.candles:
            self.candles.append(candle)
            return True

        last = self.candles[-1]
        if candle.timestamp == last.timestamp:
            self.candles[-1] = candle
            return False
        elif candle.timestamp > last.timestamp:
            self.candles.append(candle)
            if len(self.candles) > self.max_candles:
                self.candles.pop(0)
            return True
        else:
            existing_ts = [c.timestamp for c in self.candles]
            if candle.timestamp not in existing_ts:
                self.candles.append(candle)
                self.candles.sort(key=lambda c: c.timestamp)
                if len(self.candles) > self.max_candles:
                    self.candles.pop(0)
                return True
            return False

    def is_fresh(self, max_delay_seconds: int = 600) -> bool:
        if not self.candles:
            return False
        now_ts = int(time.time())
        latest_ts = self.candles[-1].timestamp
        return (now_ts - latest_ts) <= (self.resolution_seconds + max_delay_seconds)

    def detect_gaps(self) -> bool:
        if len(self.candles) < 2:
            return False
        recent = self.candles[-5:]
        for i in range(1, len(recent)):
            step = recent[i].timestamp - recent[i - 1].timestamp
            if step != self.resolution_seconds:
                return True
        return False

    def to_arrays(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        opens = np.array([c.open for c in self.candles], dtype=float)
        highs = np.array([c.high for c in self.candles], dtype=float)
        lows = np.array([c.low for c in self.candles], dtype=float)
        closes = np.array([c.close for c in self.candles], dtype=float)
        volumes = np.array([c.volume for c in self.candles], dtype=float)
        return opens, highs, lows, closes, volumes


class MarketDataManager:
    """Manages aligned 5m entry candles and 15m trend candles."""

    def __init__(self):
        self.candles_5m = CandleSeries(resolution_seconds=300)
        self.candles_15m = CandleSeries(resolution_seconds=900)

    def reset_for_symbol(self) -> None:
        self.candles_5m.clear()
        self.candles_15m.clear()

    def ingest_raw_candles(self, raw_5m: Any, raw_15m: Any) -> None:
        self._ingest_single_series(raw_5m, self.candles_5m)
        self._ingest_single_series(raw_15m, self.candles_15m)

    def _ingest_single_series(self, raw: Any, series: CandleSeries) -> None:
        if not raw:
            return

        # Case 1: Delta chart column arrays {"t": [...], "o": [...], "c": [...], ...}
        if isinstance(raw, dict) and "t" in raw and "c" in raw:
            timestamps = raw.get("t") or []
            opens = raw.get("o") or []
            highs = raw.get("h") or []
            lows = raw.get("l") or []
            closes = raw.get("c") or []
            volumes = raw.get("v") or [0.0] * len(timestamps)

            for i in range(len(timestamps)):
                try:
                    c = Candle(
                        timestamp=int(timestamps[i]),
                        open=float(opens[i]),
                        high=float(highs[i]),
                        low=float(lows[i]),
                        close=float(closes[i]),
                        volume=float(volumes[i]) if i < len(volumes) else 0.0
                    )
                    series.add_candle(c)
                except Exception:
                    continue
            return

        # Case 2: List of candle objects or lists
        items = raw if isinstance(raw, list) else raw.get("result", []) if isinstance(raw, dict) else []
        for item in items:
            c = self._parse_candle(item)
            if c:
                series.add_candle(c)

    @staticmethod
    def _parse_candle(item: Any) -> Optional[Candle]:
        try:
            if isinstance(item, dict):
                ts = int(item.get("time") or item.get("t") or item.get("timestamp"))
                o = float(item.get("open") or item.get("o"))
                h = float(item.get("high") or item.get("h"))
                l = float(item.get("low") or item.get("l"))
                c = float(item.get("close") or item.get("c"))
                v = float(item.get("volume") or item.get("v", 0.0))
                return Candle(timestamp=ts, open=o, high=h, low=l, close=c, volume=v)
            elif isinstance(item, (list, tuple)) and len(item) >= 5:
                ts = int(item[0])
                o = float(item[1])
                h = float(item[2])
                l = float(item[3])
                c = float(item[4])
                v = float(item[5]) if len(item) > 5 else 0.0
                return Candle(timestamp=ts, open=o, high=h, low=l, close=c, volume=v)
        except Exception:
            return None
        return None

