"""Hybrid trend-filtered momentum/pullback strategy engine with Bollinger Bands and ATR."""

import numpy as np

from backend.config import Settings, get_settings
from backend.indicators import (
    calculate_adx,
    calculate_atr,
    calculate_bollinger_bands,
    calculate_ema,
    calculate_rsi,
)
from backend.market_data import CandleSeries
from backend.models import IndicatorSnapshot, SignalAction, SignalResult


class StrategyEngine:
    """Evaluates multi-timeframe market data to produce deterministic trading signals."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    def evaluate(
        self,
        candles_5m: CandleSeries,
        candles_15m: CandleSeries
    ) -> SignalResult:
        min_15m_candles = self.settings.EMA_TREND_SLOW + 5
        min_5m_candles = self.settings.EMA_FAST + 28

        if len(candles_15m.candles) < min_15m_candles or len(candles_5m.candles) < min_5m_candles:
            dummy_indicators = IndicatorSnapshot(
                ema20=0.0, ema50=0.0, ema200=0.0, rsi14=50.0, adx14=0.0,
                bb_upper=0.0, bb_middle=0.0, bb_lower=0.0, bb_bandwidth=0.0, atr14=0.0,
                trend_bullish=False, warmup_complete=False
            )
            return SignalResult(
                action=SignalAction.NO_TRADE,
                symbol=self.settings.SYMBOL,
                price=candles_5m.candles[-1].close if candles_5m.candles else 0.0,
                indicators=dummy_indicators,
                reason="INDICATOR_WARMUP: Insufficient historical candles for reliable indicator calculation."
            )

        _, _, _, closes_15m, _ = candles_15m.to_arrays()
        opens_5m, highs_5m, lows_5m, closes_5m, _ = candles_5m.to_arrays()

        latest_candle = candles_5m.candles[-1]
        current_price = latest_candle.close

        # 15m Trend Indicators
        ema50_15m = calculate_ema(closes_15m, self.settings.EMA_TREND_FAST)
        ema200_15m = calculate_ema(closes_15m, self.settings.EMA_TREND_SLOW)
        trend_ema50 = ema50_15m[-1]
        trend_ema200 = ema200_15m[-1]

        if np.isnan(trend_ema50) or np.isnan(trend_ema200):
            return self._build_no_trade(current_price, "INDICATOR_WARMUP: 15m trend EMAs contain NaN values.")

        is_trend_bullish = trend_ema50 > trend_ema200
        is_trend_bearish = trend_ema50 < trend_ema200

        # 5m Entry Indicators
        ema20_5m = calculate_ema(closes_5m, self.settings.EMA_FAST)
        rsi_5m = calculate_rsi(closes_5m, self.settings.RSI_PERIOD)
        adx_5m, _, _ = calculate_adx(highs_5m, lows_5m, closes_5m, self.settings.ADX_PERIOD)
        bb_upper, bb_mid, bb_lower, bb_bw = calculate_bollinger_bands(closes_5m, self.settings.BB_PERIOD, self.settings.BB_STD)
        atr_arr = calculate_atr(highs_5m, lows_5m, closes_5m, self.settings.ATR_PERIOD)

        val_ema20 = ema20_5m[-1]
        val_rsi = rsi_5m[-1]
        val_adx = adx_5m[-1]
        val_bbu = bb_upper[-1]
        val_bbm = bb_mid[-1]
        val_bbl = bb_lower[-1]
        val_bbw = bb_bw[-1]
        val_atr = atr_arr[-1]

        if np.isnan(val_ema20) or np.isnan(val_rsi) or np.isnan(val_adx):
            return self._build_no_trade(current_price, "INDICATOR_WARMUP: 5m indicators contain NaN values.")

        snapshot = IndicatorSnapshot(
            ema20=round(float(val_ema20), 2),
            ema50=round(float(trend_ema50), 2),
            ema200=round(float(trend_ema200), 2),
            rsi14=round(float(val_rsi), 2),
            adx14=round(float(val_adx), 2),
            bb_upper=round(float(val_bbu), 2) if not np.isnan(val_bbu) else 0.0,
            bb_middle=round(float(val_bbm), 2) if not np.isnan(val_bbm) else 0.0,
            bb_lower=round(float(val_bbl), 2) if not np.isnan(val_bbl) else 0.0,
            bb_bandwidth=round(float(val_bbw), 2) if not np.isnan(val_bbw) else 0.0,
            atr14=round(float(val_atr), 2) if not np.isnan(val_atr) else 0.0,
            trend_bullish=bool(is_trend_bullish),
            warmup_complete=True
        )

        if not is_trend_bullish and not is_trend_bearish:
            return SignalResult(
                action=SignalAction.NO_TRADE,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason="TREND_NEUTRAL: 15m EMA50 and EMA200 converging."
            )

        if val_adx < self.settings.ADX_THRESHOLD:
            return SignalResult(
                action=SignalAction.NO_TRADE,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason=f"ADX_FILTER_FAILED: ADX {val_adx:.1f} below minimum threshold {self.settings.ADX_THRESHOLD}."
            )

        # Long Setup
        if is_trend_bullish:
            recent_lows = lows_5m[-3:]
            pullback_valid = any(l <= val_ema20 * 1.0035 for l in recent_lows)
            if not pullback_valid:
                return SignalResult(
                    action=SignalAction.NO_TRADE,
                    symbol=self.settings.SYMBOL,
                    price=current_price,
                    indicators=snapshot,
                    reason="PULLBACK_NOT_VALID: Price has not retraced near the 5m EMA20 benchmark."
                )

            recent_rsi = rsi_5m[-4:-1]
            rsi_oversold_touched = any(r < (self.settings.RSI_LONG_THRESHOLD + 2.0) for r in recent_rsi if not np.isnan(r))
            rsi_recovering = val_rsi >= self.settings.RSI_LONG_THRESHOLD
            if not (rsi_oversold_touched and rsi_recovering):
                return SignalResult(
                    action=SignalAction.NO_TRADE,
                    symbol=self.settings.SYMBOL,
                    price=current_price,
                    indicators=snapshot,
                    reason="MOMENTUM_NOT_CONFIRMED: RSI has not completed oversold rebound cycle."
                )

            if not latest_candle.is_bullish:
                return SignalResult(
                    action=SignalAction.NO_TRADE,
                    symbol=self.settings.SYMBOL,
                    price=current_price,
                    indicators=snapshot,
                    reason="CANDLE_NOT_CONFIRMED: Closed 5m candle is not a bullish closing bar."
                )

            return SignalResult(
                action=SignalAction.LONG,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason="LONG_SETUP_CONFIRMED: Bullish 15m trend, ADX strength, EMA20 pullback, and RSI bounce."
            )

        # Short Setup
        if is_trend_bearish:
            recent_highs = highs_5m[-3:]
            pullback_valid = any(h >= val_ema20 * 0.9965 for h in recent_highs)
            if not pullback_valid:
                return SignalResult(
                    action=SignalAction.NO_TRADE,
                    symbol=self.settings.SYMBOL,
                    price=current_price,
                    indicators=snapshot,
                    reason="PULLBACK_NOT_VALID: Bearish bounce has not reached near 5m EMA20."
                )

            recent_rsi = rsi_5m[-4:-1]
            rsi_overbought_touched = any(r > (self.settings.RSI_SHORT_THRESHOLD - 2.0) for r in recent_rsi if not np.isnan(r))
            rsi_weakening = val_rsi <= self.settings.RSI_SHORT_THRESHOLD
            if not (rsi_overbought_touched and rsi_weakening):
                return SignalResult(
                    action=SignalAction.NO_TRADE,
                    symbol=self.settings.SYMBOL,
                    price=current_price,
                    indicators=snapshot,
                    reason="MOMENTUM_NOT_CONFIRMED: RSI has not completed overbought rejection cycle."
                )

            if not latest_candle.is_bearish:
                return SignalResult(
                    action=SignalAction.NO_TRADE,
                    symbol=self.settings.SYMBOL,
                    price=current_price,
                    indicators=snapshot,
                    reason="CANDLE_NOT_CONFIRMED: Closed 5m candle is not a bearish closing bar."
                )

            return SignalResult(
                action=SignalAction.SHORT,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason="SHORT_SETUP_CONFIRMED: Bearish 15m trend, ADX strength, EMA20 rejection, and RSI drop."
            )

        return self._build_no_trade(current_price, "NO_SETUP: Current market state does not meet entry rules.")

    def _build_no_trade(self, price: float, reason: str) -> SignalResult:
        dummy = IndicatorSnapshot(
            ema20=0.0, ema50=0.0, ema200=0.0, rsi14=50.0, adx14=0.0,
            bb_upper=0.0, bb_middle=0.0, bb_lower=0.0, bb_bandwidth=0.0, atr14=0.0,
            trend_bullish=False, warmup_complete=False
        )
        return SignalResult(
            action=SignalAction.NO_TRADE,
            symbol=self.settings.SYMBOL,
            price=price,
            indicators=dummy,
            reason=reason
        )

