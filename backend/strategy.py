"""Option Buying Algorithm Strategy Engine: Supertrend + EMA with Option ATR Brackets."""

import numpy as np

from backend.config import Settings, get_settings
from backend.indicators import (
    calculate_adx,
    calculate_atr,
    calculate_bollinger_bands,
    calculate_ema,
    calculate_rsi,
    calculate_supertrend,
)
from backend.market_data import CandleSeries
from backend.models import IndicatorSnapshot, SignalAction, SignalResult


class StrategyEngine:
    """Evaluates market data using Supertrend + EMA to produce Option Buying signals."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    def evaluate(
        self,
        candles_5m: CandleSeries,
        candles_15m: CandleSeries
    ) -> SignalResult:
        min_candles = max(self.settings.SUPERTREND_PERIOD + 2, self.settings.EMA_PERIOD + 2, 14)

        if len(candles_5m.candles) < min_candles:
            dummy_indicators = IndicatorSnapshot(
                ema20=0.0, ema50=0.0, ema200=0.0, rsi14=50.0, adx14=0.0,
                bb_upper=0.0, bb_middle=0.0, bb_lower=0.0, bb_bandwidth=0.0, atr14=0.0,
                supertrend=0.0, supertrend_direction=0, supertrend_label="NEUTRAL", option_atr=0.0,
                trend_bullish=False, warmup_complete=False
            )
            return SignalResult(
                action=SignalAction.NO_TRADE,
                symbol=self.settings.SYMBOL,
                price=candles_5m.candles[-1].close if candles_5m.candles else 0.0,
                indicators=dummy_indicators,
                reason="INDICATOR_WARMUP: Initializing candle series for Supertrend and EMA."
            )

        opens_5m, highs_5m, lows_5m, closes_5m, _ = candles_5m.to_arrays()
        current_price = float(closes_5m[-1])

        # 1. Supertrend Calculation on Underlying (e.g. 10 period, 3.0 multiplier)
        st_vals, st_dirs, _, _ = calculate_supertrend(
            highs=highs_5m,
            lows=lows_5m,
            closes=closes_5m,
            period=self.settings.SUPERTREND_PERIOD,
            multiplier=self.settings.SUPERTREND_MULT
        )
        val_st = st_vals[-1]
        val_st_dir = st_dirs[-1]  # +1 Bullish, -1 Bearish

        # 2. EMA Calculation (e.g. 20 period filter)
        ema_arr = calculate_ema(closes_5m, self.settings.EMA_PERIOD)
        val_ema = ema_arr[-1]

        # 3. ATR Calculations
        atr_arr = calculate_atr(highs_5m, lows_5m, closes_5m, self.settings.ATR_PERIOD)
        val_atr = atr_arr[-1] if not np.isnan(atr_arr[-1]) else 0.0

        # Option ATR estimation (scaled for ATM option sensitivity ~ 0.5 Delta)
        val_option_atr = val_atr * 0.5 if val_atr > 0 else 10.0

        # Auxiliary Indicators
        rsi_5m = calculate_rsi(closes_5m, self.settings.RSI_PERIOD)
        val_rsi = rsi_5m[-1] if not np.isnan(rsi_5m[-1]) else 50.0

        adx_5m, _, _ = calculate_adx(highs_5m, lows_5m, closes_5m, self.settings.ADX_PERIOD)
        val_adx = adx_5m[-1] if not np.isnan(adx_5m[-1]) else 0.0

        bb_u, bb_m, bb_l, bb_w = calculate_bollinger_bands(closes_5m, self.settings.BB_PERIOD, self.settings.BB_STD)

        # 15m Trend EMAs for broader context
        trend_ema50 = 0.0
        trend_ema200 = 0.0
        if len(candles_15m.candles) >= 50:
            _, _, _, closes_15m, _ = candles_15m.to_arrays()
            ema50_15m = calculate_ema(closes_15m, 50)
            ema200_15m = calculate_ema(closes_15m, min(200, len(closes_15m)))
            trend_ema50 = ema50_15m[-1] if not np.isnan(ema50_15m[-1]) else 0.0
            trend_ema200 = ema200_15m[-1] if not np.isnan(ema200_15m[-1]) else 0.0

        st_label = "BULLISH" if val_st_dir == 1 else "BEARISH" if val_st_dir == -1 else "NEUTRAL"
        is_bullish_aligned = (val_st_dir == 1 and current_price >= val_ema)
        is_bearish_aligned = (val_st_dir == -1 and current_price <= val_ema)

        snapshot = IndicatorSnapshot(
            ema20=round(float(val_ema), 2) if not np.isnan(val_ema) else current_price,
            ema50=round(float(trend_ema50), 2),
            ema200=round(float(trend_ema200), 2),
            rsi14=round(float(val_rsi), 2),
            adx14=round(float(val_adx), 2),
            bb_upper=round(float(bb_u[-1]), 2) if not np.isnan(bb_u[-1]) else current_price,
            bb_middle=round(float(bb_m[-1]), 2) if not np.isnan(bb_m[-1]) else current_price,
            bb_lower=round(float(bb_l[-1]), 2) if not np.isnan(bb_l[-1]) else current_price,
            bb_bandwidth=round(float(bb_w[-1]), 2) if not np.isnan(bb_w[-1]) else 0.0,
            atr14=round(float(val_atr), 2),
            supertrend=round(float(val_st), 2) if not np.isnan(val_st) else current_price,
            supertrend_direction=int(val_st_dir),
            supertrend_label=st_label,
            option_atr=round(float(val_option_atr), 2),
            trend_bullish=is_bullish_aligned,
            warmup_complete=True
        )

        # Bullish Option Setup -> BUY ATM CALL
        if is_bullish_aligned:
            return SignalResult(
                action=SignalAction.BUY_CALL,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason=f"OPTION_BUY_CALL: Supertrend is Bullish ({val_st:.1f}) and Price ({current_price:.1f}) > EMA ({val_ema:.1f})."
            )

        # Bearish Option Setup -> BUY ATM PUT
        if is_bearish_aligned:
            return SignalResult(
                action=SignalAction.BUY_PUT,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason=f"OPTION_BUY_PUT: Supertrend is Bearish ({val_st:.1f}) and Price ({current_price:.1f}) < EMA ({val_ema:.1f})."
            )

        return SignalResult(
            action=SignalAction.NO_TRADE,
            symbol=self.settings.SYMBOL,
            price=current_price,
            indicators=snapshot,
            reason=f"FILTER_WAIT: Supertrend ({st_label}) and EMA ({val_ema:.1f}) awaiting alignment."
        )

    def _build_no_trade(self, price: float, reason: str) -> SignalResult:
        dummy = IndicatorSnapshot(
            ema20=price, ema50=price, ema200=price, rsi14=50.0, adx14=0.0,
            bb_upper=price, bb_middle=price, bb_lower=price, bb_bandwidth=0.0, atr14=0.0,
            supertrend=price, supertrend_direction=0, supertrend_label="NEUTRAL", option_atr=0.0,
            trend_bullish=False, warmup_complete=False
        )
        return SignalResult(
            action=SignalAction.NO_TRADE,
            symbol=self.settings.SYMBOL,
            price=price,
            indicators=dummy,
            reason=reason
        )


