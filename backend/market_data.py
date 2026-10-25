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

    def is_fresh(self, max_delay_seconds: int = 1200) -> bool:
        if not self.candles:
            return False
        now_ts = int(time.time())
        latest_ts = self.candles[-1].timestamp
        return (now_ts - latest_ts) <= (self.resolution_seconds + max_delay_seconds)

    def detect_gaps(self) -> bool:
        if len(self.candles) < 2:
            return False
        recent = self.candles[-10:]
        for i in range(1, len(recent)):
            step = recent[i].timestamp - recent[i - 1].timestamp
            if step != self.resolution_seconds:
                return True
        return False

    def fill_gaps(self, current_price: Optional[float] = None) -> int:
        """
        Detects missing intervals between candles and forward-fills synthetic bars
        using previous close and zero volume. Also ensures candle freshness up to now.
        Returns the number of synthetic candles added.
        """
        if not self.candles:
            if current_price is not None and current_price > 0:
                now_ts = int(time.time())
                aligned_ts = now_ts - (now_ts % self.resolution_seconds)
                self.candles.append(Candle(
                    timestamp=aligned_ts,
                    open=current_price,
                    high=current_price,
                    low=current_price,
                    close=current_price,
                    volume=0.0
                ))
                return 1
            return 0

        added = 0
        # 1. Fill internal timestamp gaps between candles
        i = 0
        while i < len(self.candles) - 1 and added < 200:
            curr_ts = self.candles[i].timestamp
            next_ts = self.candles[i + 1].timestamp
            step = next_ts - curr_ts
            if step > self.resolution_seconds:
                missing_ts = curr_ts + self.resolution_seconds
                last_c = self.candles[i].close
                synthetic = Candle(
                    timestamp=missing_ts,
                    open=last_c,
                    high=last_c,
                    low=last_c,
                    close=last_c,
                    volume=0.0
                )
                self.candles.insert(i + 1, synthetic)
                added += 1
                if len(self.candles) > self.max_candles:
                    self.candles.pop(0)
                    i = max(0, i - 1)
            i += 1

        # 2. Forward fill up to current time if trailing behind
        now_ts = int(time.time())
        latest_ts = self.candles[-1].timestamp
        last_close = self.candles[-1].close if current_price is None or current_price <= 0 else current_price
        while (now_ts - latest_ts) >= (self.resolution_seconds * 2) and added < 300:
            next_ts = latest_ts + self.resolution_seconds
            synthetic = Candle(
                timestamp=next_ts,
                open=last_close,
                high=last_close,
                low=last_close,
                close=last_close,
                volume=0.0
            )
            self.candles.append(synthetic)
            added += 1
            if len(self.candles) > self.max_candles:
                self.candles.pop(0)
            latest_ts = next_ts

        return added

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

    def ingest_raw_candles(self, raw_5m: Any, raw_15m: Any, latest_price: Optional[float] = None) -> None:
        self._ingest_single_series(raw_5m, self.candles_5m)
        self._ingest_single_series(raw_15m, self.candles_15m)
        # Automatically fill testnet gaps to ensure seamless indicator math
        self.candles_5m.fill_gaps(latest_price)
        self.candles_15m.fill_gaps(latest_price)


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

