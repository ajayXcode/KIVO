from backend.config import Settings
from backend.models import IndicatorSnapshot, SignalAction, SignalResult
from backend.risk_manager import RiskManager


def _make_signal(action: SignalAction = SignalAction.LONG, price: float = 60000.0) -> SignalResult:
    return SignalResult(
        action=action,
        symbol="BTCUSD",
        price=price,
        indicators=IndicatorSnapshot(
            ema20=59900.0, ema50=59500.0, ema200=58000.0,
            rsi14=45.0, adx14=25.0, bb_upper=61000.0, bb_middle=60000.0, bb_lower=59000.0,
            bb_bandwidth=3.3, atr14=500.0, trend_bullish=True, warmup_complete=True
        ),
        reason="Setup confirmed"
    )


def test_risk_manager_approval():
    rm = RiskManager()
    sig = _make_signal(SignalAction.LONG, price=60000.0)
    evaluation = rm.evaluate_intent(sig, current_position_size=0.0)

    assert evaluation.approved is True
    assert evaluation.proposed_size >= 1.0
    assert evaluation.stop_loss_price is not None
    assert evaluation.stop_loss_price < 60000.0


def test_risk_manager_rejects_when_position_open():
    rm = RiskManager()
    sig = _make_signal(SignalAction.LONG, price=60000.0)
    evaluation = rm.evaluate_intent(sig, current_position_size=2.0)

    assert evaluation.approved is False
    assert "POSITION_EXISTS" in evaluation.reason


def test_risk_manager_daily_loss_limit():
    settings = Settings(TEST_EQUITY_USD=10000.0, DAILY_LOSS_LIMIT_PCT=0.015)
    rm = RiskManager(settings)
    rm.record_realized_trade(-200.0)

    sig = _make_signal(SignalAction.LONG, price=60000.0)
    evaluation = rm.evaluate_intent(sig, current_position_size=0.0)

    assert evaluation.approved is False
    assert "DAILY_LIMIT" in evaluation.reason

