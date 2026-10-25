"""Risk manager enforcing server-side risk gates, position caps, and position sizing."""

import time
from typing import Optional
from backend.config import Settings, get_settings
from backend.models import RiskEvaluation, SignalAction, SignalResult


class RiskManager:
    """Evaluates strategy signals against strict pre-trade risk controls."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self.daily_realized_loss: float = 0.0
        self.last_trade_closed_time: float = 0.0
        self.circuit_breaker_active: bool = False

    def reset_daily_loss(self) -> None:
        self.daily_realized_loss = 0.0
        self.circuit_breaker_active = False

    def record_realized_trade(self, pnl: float) -> None:
        self.last_trade_closed_time = time.time()
        if pnl < 0:
            self.daily_realized_loss += abs(pnl)
            max_allowed_loss = self.settings.TEST_EQUITY_USD * self.settings.DAILY_LOSS_LIMIT_PCT
            if self.daily_realized_loss >= max_allowed_loss:
                self.circuit_breaker_active = True

    def evaluate_intent(
        self,
        signal: SignalResult,
        current_position_size: float,
        best_bid: Optional[float] = None,
        best_ask: Optional[float] = None
    ) -> RiskEvaluation:
        if signal.action == SignalAction.NO_TRADE:
            return RiskEvaluation(approved=False, reason="NO_ACTION: Signal is NO_TRADE.")

        max_daily_loss = self.settings.TEST_EQUITY_USD * self.settings.DAILY_LOSS_LIMIT_PCT
        current_loss_pct = (self.daily_realized_loss / self.settings.TEST_EQUITY_USD) if self.settings.TEST_EQUITY_USD > 0 else 0.0

        if self.circuit_breaker_active or self.daily_realized_loss >= max_daily_loss:
            return RiskEvaluation(
                approved=False,
                reason=f"DAILY_LIMIT: Cumulative daily loss (${self.daily_realized_loss:.2f}) reached limit (${max_daily_loss:.2f}).",
                current_daily_loss_pct=current_loss_pct
            )

        if abs(current_position_size) > 0.0:
            return RiskEvaluation(
                approved=False,
                reason=f"POSITION_EXISTS: Active position of size {current_position_size} already open.",
                current_daily_loss_pct=current_loss_pct
            )

        elapsed_since_last_trade = time.time() - self.last_trade_closed_time
        if self.last_trade_closed_time > 0 and elapsed_since_last_trade < self.settings.COOLDOWN_SECONDS:
            remaining = int(self.settings.COOLDOWN_SECONDS - elapsed_since_last_trade)
            return RiskEvaluation(
                approved=False,
                reason=f"COOLDOWN_ACTIVE: Trade rejected during cooldown ({remaining}s remaining).",
                current_daily_loss_pct=current_loss_pct
            )

        if best_bid is not None and best_ask is not None and best_ask > best_bid:
            spread = best_ask - best_bid
            if spread > (signal.price * 0.001):
                return RiskEvaluation(
                    approved=False,
                    reason=f"SPREAD_TOO_WIDE: Market spread ({spread:.2f}) exceeds threshold.",
                    current_daily_loss_pct=current_loss_pct
                )

        risk_budget_usd = self.settings.TEST_EQUITY_USD * self.settings.RISK_PER_TRADE_PCT
        entry_price = signal.price
        if entry_price <= 0:
            return RiskEvaluation(approved=False, reason="PRICE_INVALID: Entry price must be positive.")

        # Use ATR if available, else standard 1% stop
        atr = signal.indicators.atr14 if signal.indicators and signal.indicators.atr14 > 0 else (entry_price * 0.010)
        stop_dist = max(entry_price * 0.005, min(entry_price * 0.02, atr * 1.5))
        tp_dist = stop_dist * 1.5

        is_buying = signal.action in (SignalAction.LONG, SignalAction.BUY_CALL, SignalAction.BUY_PUT)
        if is_buying:
            stop_price = round(entry_price - stop_dist, 2)
            take_profit_price = round(entry_price + tp_dist, 2)
            per_contract_loss = max(0.1, entry_price - stop_price)
        else:
            stop_price = round(entry_price + stop_dist, 2)
            take_profit_price = round(entry_price - tp_dist, 2)
            per_contract_loss = max(0.1, stop_price - entry_price)

        if signal.action in (SignalAction.BUY_CALL, SignalAction.BUY_PUT):
            calculated_size = float(self.settings.CONTRACTS_COUNT)
        else:
            raw_size = risk_budget_usd / per_contract_loss
            calculated_size = max(1.0, round(raw_size, 1))


        return RiskEvaluation(
            approved=True,
            reason="RISK_APPROVED: All safety gates, cooldown, and sizing criteria satisfied.",
            proposed_size=calculated_size,
            stop_loss_price=stop_price,
            take_profit_price=take_profit_price,
            estimated_risk_usd=risk_budget_usd,
            current_daily_loss_pct=current_loss_pct
        )

