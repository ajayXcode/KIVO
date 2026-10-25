"""
Institutional Multi-Regime Quantitative Strategy Engine: BB_RPB_TSL + Supertrend Confluence.
Derived from proven open-source quantitative crypto frameworks (Freqtrade BB_RPB_TSL & NFI)
combined with Larry Williams Volatility Breakout and Multi-Timeframe Trend Filtering.
"""

from typing import Optional
import numpy as np

from backend.config import Settings, get_settings
from backend.indicators import (
    calculate_adx,
    calculate_atr,
    calculate_bollinger_bands,
    calculate_ema,
    calculate_ewo,
    calculate_roc,
    calculate_rsi,
    calculate_supertrend,
)
from backend.market_data import CandleSeries
from backend.models import IndicatorSnapshot, SignalAction, SignalResult


class StrategyEngine:
    """
    Evaluates multi-timeframe closed candle series using a confluence of:
      1. Macro 15m Trend & Momentum Filter (EMA 50/200 + ROC15m)
      2. 5m Supertrend Direction & Volatility Bands
      3. The Real Pullback (RPB) & Bollinger Band Dip-Buying Matrix
      4. Momentum Oscillators: RSI(14), Elliott Wave Oscillator (EWO), and ADX(14)
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    def evaluate(
        self,
        candles_5m: CandleSeries,
        candles_15m: CandleSeries
    ) -> SignalResult:
        min_candles = max(self.settings.SUPERTREND_PERIOD + 2, self.settings.EMA_PERIOD + 2, 35)

        if len(candles_5m.candles) < min_candles:
            dummy_indicators = IndicatorSnapshot(
                ema20=0.0, ema50=0.0, ema200=0.0, rsi14=50.0, adx14=0.0,
                bb_upper=0.0, bb_middle=0.0, bb_lower=0.0, bb_bandwidth=0.0, atr14=0.0,
                supertrend=0.0, supertrend_direction=0, supertrend_label="NEUTRAL", option_atr=0.0,
                ewo=0.0, roc15m=0.0, setup_type="WARMUP", confidence_pct=0,
                trend_bullish=False, warmup_complete=False
            )
            return SignalResult(
                action=SignalAction.NO_TRADE,
                symbol=self.settings.SYMBOL,
                price=candles_5m.candles[-1].close if candles_5m.candles else 0.0,
                indicators=dummy_indicators,
                reason="INDICATOR_WARMUP: Ingesting closed candles for Supertrend, Bollinger Bands, and EWO."
            )

        opens_5m, highs_5m, lows_5m, closes_5m, _ = candles_5m.to_arrays()
        current_price = float(closes_5m[-1])
        prev_close = float(closes_5m[-2]) if len(closes_5m) > 1 else current_price
        current_low = float(lows_5m[-1])
        current_high = float(highs_5m[-1])

        # ----------------------------------------------------------------------
        # 1. 5m Core Technical Indicators
        # ----------------------------------------------------------------------
        # Supertrend (10 period, 3.0 multiplier)
        st_vals, st_dirs, _, _ = calculate_supertrend(
            highs=highs_5m,
            lows=lows_5m,
            closes=closes_5m,
            period=self.settings.SUPERTREND_PERIOD,
            multiplier=self.settings.SUPERTREND_MULT
        )
        val_st = float(st_vals[-1])
        val_st_dir = int(st_dirs[-1])  # +1 Bullish, -1 Bearish

        # EMA 20 (Mean Reversion Benchmark)
        ema_arr = calculate_ema(closes_5m, self.settings.EMA_PERIOD)
        val_ema20 = float(ema_arr[-1]) if not np.isnan(ema_arr[-1]) else current_price

        # Bollinger Bands (20, 2.0)
        bb_u, bb_m, bb_l, bb_w = calculate_bollinger_bands(
            closes_5m,
            self.settings.BB_PERIOD,
            self.settings.BB_STD
        )
        val_bb_upper = float(bb_u[-1]) if not np.isnan(bb_u[-1]) else current_price
        val_bb_middle = float(bb_m[-1]) if not np.isnan(bb_m[-1]) else current_price
        val_bb_lower = float(bb_l[-1]) if not np.isnan(bb_l[-1]) else current_price
        val_bb_bw = float(bb_w[-1]) if not np.isnan(bb_w[-1]) else 0.0

        # ATR (14)
        atr_arr = calculate_atr(highs_5m, lows_5m, closes_5m, self.settings.ATR_PERIOD)
        val_atr = float(atr_arr[-1]) if not np.isnan(atr_arr[-1]) else 0.0
        val_option_atr = val_atr * 0.5 if val_atr > 0 else 10.0

        # RSI (14)
        rsi_arr = calculate_rsi(closes_5m, self.settings.RSI_PERIOD)
        val_rsi = float(rsi_arr[-1]) if not np.isnan(rsi_arr[-1]) else 50.0
        prev_rsi = float(rsi_arr[-2]) if len(rsi_arr) > 1 and not np.isnan(rsi_arr[-2]) else val_rsi

        # ADX (14) & Directional Movement
        adx_arr, _, _ = calculate_adx(highs_5m, lows_5m, closes_5m, self.settings.ADX_PERIOD)
        val_adx = float(adx_arr[-1]) if not np.isnan(adx_arr[-1]) else 0.0

        # Elliott Wave Oscillator (EWO = EMA(5) - EMA(35))
        ewo_arr = calculate_ewo(closes_5m, fast_period=5, slow_period=35)
        val_ewo = float(ewo_arr[-1])
        prev_ewo = float(ewo_arr[-2]) if len(ewo_arr) > 1 else val_ewo

        # ----------------------------------------------------------------------
        # 2. 15m Higher-Timeframe Trend & Macro Momentum Filter
        # ----------------------------------------------------------------------
        trend_ema50 = 0.0
        trend_ema200 = 0.0
        val_roc15m = 0.0
        is_macro_bullish = False
        is_macro_bearish = False

        if len(candles_15m.candles) >= 35:
            _, _, _, closes_15m, _ = candles_15m.to_arrays()
            ema50_15m = calculate_ema(closes_15m, min(50, len(closes_15m)))
            ema200_15m = calculate_ema(closes_15m, min(200, len(closes_15m)))
            trend_ema50 = float(ema50_15m[-1]) if not np.isnan(ema50_15m[-1]) else 0.0
            trend_ema200 = float(ema200_15m[-1]) if not np.isnan(ema200_15m[-1]) else 0.0

            roc_15m_arr = calculate_roc(closes_15m, period=12)
            val_roc15m = float(roc_15m_arr[-1])

            if trend_ema200 > 0:
                is_macro_bullish = (trend_ema50 >= trend_ema200) and (val_roc15m >= -1.5)
                is_macro_bearish = (trend_ema50 < trend_ema200) and (val_roc15m <= 1.5)
            else:
                is_macro_bullish = val_st_dir == 1
                is_macro_bearish = val_st_dir == -1
        else:
            is_macro_bullish = (val_st_dir == 1)
            is_macro_bearish = (val_st_dir == -1)

        st_label = "BULLISH" if val_st_dir == 1 else "BEARISH" if val_st_dir == -1 else "NEUTRAL"

        # ----------------------------------------------------------------------
        # 3. Global Chop & Safety Filters
        # ----------------------------------------------------------------------
        is_chop_market = (val_adx < 16.0 and val_bb_bw < 0.20)
        is_extreme_overbought = (val_rsi >= 75.0)
        is_extreme_oversold = (val_rsi <= 25.0)

        snapshot = IndicatorSnapshot(
            ema20=round(val_ema20, 2),
            ema50=round(trend_ema50, 2),
            ema200=round(trend_ema200, 2),
            rsi14=round(val_rsi, 2),
            adx14=round(val_adx, 2),
            bb_upper=round(val_bb_upper, 2),
            bb_middle=round(val_bb_middle, 2),
            bb_lower=round(val_bb_lower, 2),
            bb_bandwidth=round(val_bb_bw, 2),
            atr14=round(val_atr, 2),
            supertrend=round(val_st, 2),
            supertrend_direction=val_st_dir,
            supertrend_label=st_label,
            option_atr=round(val_option_atr, 2),
            ewo=round(val_ewo, 2),
            roc15m=round(val_roc15m, 2),
            setup_type="WAITING",
            confidence_pct=0,
            trend_bullish=is_macro_bullish,
            warmup_complete=True
        )

        if is_chop_market:
            snapshot.setup_type = "CHOP_FILTER"
            return SignalResult(
                action=SignalAction.NO_TRADE,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason=f"CHOP_GUARD: Low ADX ({val_adx:.1f}) and compressed BB bandwidth ({val_bb_bw:.2f}%). Avoiding sideways whipsaw."
            )

        # ----------------------------------------------------------------------
        # 4. Multi-Condition Buy Matrix (Freqtrade BB_RPB_TSL Logic)
        # ----------------------------------------------------------------------

        # Setup 1: The Real Pullback (RPB) in Macro Uptrend
        # High-probability dip-buying when price pulls back to EMA20 / lower BB in a strong trend
        is_rpb_bullish_dip = (
            is_macro_bullish
            and val_st_dir == 1
            and (current_low <= (val_ema20 * 1.002) or current_low <= (val_bb_lower * 1.01))
            and current_price >= (val_ema20 * 0.985)
            and (32.0 <= val_rsi <= 54.0)
            and (val_ewo >= 0.0 or val_ewo >= prev_ewo)
        )

        # Setup 2: Supertrend Volatility Breakout (Expansion)
        # Strong directional push confirming trend resumption
        is_st_bullish_breakout = (
            val_st_dir == 1
            and current_price > val_ema20
            and current_price >= prev_close
            and val_bb_bw >= 0.35
            and val_adx >= 20.0
            and (50.0 <= val_rsi < 72.0)
            and not is_extreme_overbought
        )

        # Setup 3: Mean-Reversion Oversold Snapback
        is_mr_bullish_snapback = (
            current_low <= val_bb_lower
            and current_price > val_bb_lower
            and val_rsi < 36.0
            and val_rsi > prev_rsi
            and val_roc15m >= -2.5
        )

        # --- EVALUATE BULLISH (BUY CALL / LONG) ---
        if is_rpb_bullish_dip:
            snapshot.setup_type = "RPB_PULLBACK"
            snapshot.confidence_pct = 88
            return SignalResult(
                action=SignalAction.BUY_CALL,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason=f"RPB_PULLBACK: Confirmed dip to EMA20 (${val_ema20:.1f}) in Macro Bullish trend. RSI ({val_rsi:.1f}) rebounding with positive EWO ({val_ewo:.1f})."
            )

        if is_st_bullish_breakout:
            snapshot.setup_type = "VOLATILITY_BREAKOUT"
            snapshot.confidence_pct = 82
            return SignalResult(
                action=SignalAction.BUY_CALL,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason=f"VOLATILITY_BREAKOUT: Supertrend Bullish (${val_st:.1f}) expansion with expanding BB ({val_bb_bw:.2f}%) and ADX ({val_adx:.1f})."
            )

        if is_mr_bullish_snapback:
            snapshot.setup_type = "MEAN_REVERSION_DIP"
            snapshot.confidence_pct = 75
            return SignalResult(
                action=SignalAction.BUY_CALL,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason=f"MEAN_REVERSION_DIP: Price tested Lower BB (${val_bb_lower:.1f}) with RSI oversold recovery ({val_rsi:.1f})."
            )

        # ----------------------------------------------------------------------
        # 5. Multi-Condition Bearish Matrix (BUY PUT / SHORT)
        # ----------------------------------------------------------------------

        # Setup 1: The Real Pullback (RPB) in Macro Downtrend (Bearish Relief Rally)
        is_rpb_bearish_rally = (
            is_macro_bearish
            and val_st_dir == -1
            and (current_high >= (val_ema20 * 0.998) or current_high >= (val_bb_upper * 0.99))
            and current_price <= (val_ema20 * 1.015)
            and (46.0 <= val_rsi <= 68.0)
            and (val_ewo <= 0.0 or val_ewo <= prev_ewo)
        )

        # Setup 2: Supertrend Volatility Breakdown (Expansion)
        is_st_bearish_breakdown = (
            val_st_dir == -1
            and current_price < val_ema20
            and current_price <= prev_close
            and val_bb_bw >= 0.35
            and val_adx >= 20.0
            and (28.0 < val_rsi <= 50.0)
            and not is_extreme_oversold
        )

        # Setup 3: Mean-Reversion Overbought Rejection
        is_mr_bearish_rejection = (
            current_high >= val_bb_upper
            and current_price < val_bb_upper
            and val_rsi > 68.0
            and val_rsi < prev_rsi
        )

        # --- EVALUATE BEARISH (BUY PUT / SHORT) ---
        if is_rpb_bearish_rally:
            snapshot.setup_type = "RPB_PULLBACK"
            snapshot.confidence_pct = 88
            return SignalResult(
                action=SignalAction.BUY_PUT,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason=f"RPB_PULLBACK: Relief rally tested EMA20 (${val_ema20:.1f}) in Macro Bearish trend. RSI ({val_rsi:.1f}) rejection with negative EWO ({val_ewo:.1f})."
            )

        if is_st_bearish_breakdown:
            snapshot.setup_type = "VOLATILITY_BREAKOUT"
            snapshot.confidence_pct = 82
            return SignalResult(
                action=SignalAction.BUY_PUT,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason=f"VOLATILITY_BREAKDOWN: Supertrend Bearish (${val_st:.1f}) expansion with expanding BB ({val_bb_bw:.2f}%) and ADX ({val_adx:.1f})."
            )

        if is_mr_bearish_rejection:
            snapshot.setup_type = "MEAN_REVERSION_DIP"
            snapshot.confidence_pct = 75
            return SignalResult(
                action=SignalAction.BUY_PUT,
                symbol=self.settings.SYMBOL,
                price=current_price,
                indicators=snapshot,
                reason=f"MEAN_REVERSION_REJECTION: Price rejected Upper BB (${val_bb_upper:.1f}) with RSI overbought hook ({val_rsi:.1f})."
            )

        # ----------------------------------------------------------------------
        # 6. Neutral Waiting State
        # ----------------------------------------------------------------------
        snapshot.setup_type = "WAITING"
        snapshot.confidence_pct = 0
        return SignalResult(
            action=SignalAction.NO_TRADE,
            symbol=self.settings.SYMBOL,
            price=current_price,
            indicators=snapshot,
            reason=f"CONFLUENCE_WAIT: Supertrend is {st_label} (${val_st:.1f}), Price (${current_price:.1f}) vs EMA20 (${val_ema20:.1f}), RSI ({val_rsi:.1f}). Awaiting RPB pullback or breakout confirmation."
        )
