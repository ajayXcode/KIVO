"""Data models and Pydantic schemas for the trading bot."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class BotState(str, Enum):
    INITIALIZING = "INITIALIZING"
    READY = "READY"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    HALTED = "HALTED"
    ERROR = "ERROR"


class AutomationMode(str, Enum):
    AUTO_PILOT = "AUTO_PILOT"
    MANUAL = "MANUAL"


class SignalAction(str, Enum):
    BUY_CALL = "BUY_CALL"
    BUY_PUT = "BUY_PUT"
    LONG = "LONG"
    SHORT = "SHORT"
    NO_TRADE = "NO_TRADE"


class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    OPEN = "open"
    FILLED = "closed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    UNKNOWN = "UNKNOWN_NEEDS_RECONCILIATION"


# ==============================================================================
# SQLAlchemy ORM Models
# ==============================================================================

class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    event_type = Column(String(50), nullable=False, index=True)
    component = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)


class OrderRecord(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_order_id = Column(String(64), unique=True, nullable=False, index=True)
    exchange_order_id = Column(String(64), nullable=True, index=True)
    product_id = Column(Integer, nullable=False)
    symbol = Column(String(20), nullable=False)
    side = Column(String(10), nullable=False)
    order_type = Column(String(30), nullable=False)
    size = Column(Float, nullable=False)
    limit_price = Column(Float, nullable=True)
    stop_price = Column(Float, nullable=True)
    status = Column(String(30), default=OrderStatus.PENDING.value, nullable=False)
    filled_size = Column(Float, default=0.0, nullable=False)
    avg_fill_price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PositionRecord(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, unique=True, nullable=False)
    symbol = Column(String(20), nullable=False)
    size = Column(Float, nullable=False, default=0.0)
    entry_price = Column(Float, nullable=False, default=0.0)
    liquidation_price = Column(Float, nullable=True)
    unrealized_pnl = Column(Float, default=0.0, nullable=False)
    realized_pnl = Column(Float, default=0.0, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SignalRecord(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    symbol = Column(String(20), nullable=False)
    action = Column(String(20), nullable=False)
    price = Column(Float, nullable=False)
    indicators = Column(Text, nullable=False)
    reason = Column(String(100), nullable=False)


# ==============================================================================
# Pydantic Schemas
# ==============================================================================

class AtmOptionInfo(BaseModel):
    product_id: int
    symbol: str
    option_type: str  # "CALL" or "PUT"
    strike_price: float
    settlement_time: str
    quote_price: float = 0.0
    option_atr: float = 0.0
    stop_loss_price: float = 0.0
    take_profit_price: float = 0.0
    stop_loss_label: str = ""
    take_profit_label: str = ""


class OptionConfigPayload(BaseModel):
    underlying_asset: str = "BTC"
    timeframe: str = "5m"
    contracts: int = 1
    supertrend_period: int = 10
    supertrend_multiplier: float = 3.0
    ema_period: int = 20
    option_atr_period: int = 14
    sl_atr_multiplier: float = 1.5
    tp_atr_multiplier: float = 2.5


class IndicatorSnapshot(BaseModel):
    ema20: float
    ema50: float
    ema200: float
    rsi14: float
    adx14: float
    bb_upper: float = 0.0
    bb_middle: float = 0.0
    bb_lower: float = 0.0
    bb_bandwidth: float = 0.0
    atr14: float = 0.0
    supertrend: float = 0.0
    supertrend_direction: int = 0
    supertrend_label: str = "NEUTRAL"
    option_atr: float = 0.0
    ewo: float = 0.0
    roc15m: float = 0.0
    setup_type: str = "WAITING"
    confidence_pct: int = 0
    trend_bullish: bool
    warmup_complete: bool


class SignalResult(BaseModel):
    action: SignalAction
    symbol: str
    price: float
    indicators: IndicatorSnapshot
    reason: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RiskEvaluation(BaseModel):
    approved: bool
    reason: str
    proposed_size: float = 0.0
    stop_loss_price: Optional[float] = None
    take_profit_price: Optional[float] = None
    estimated_risk_usd: float = 0.0
    current_daily_loss_pct: float = 0.0


class BotStatusResponse(BaseModel):
    state: BotState
    environment: str
    symbol: str
    product_id: int
    underlying_asset: str = "BTC"
    automation_mode: AutomationMode
    test_equity_usd: float
    current_position_size: float
    unrealized_pnl: float
    realized_pnl: float
    daily_pnl_usd: float
    daily_pnl_pct: float
    latest_price: Optional[float] = None
    latest_signal: Optional[SignalResult] = None
    indicators: Optional[IndicatorSnapshot] = None
    atm_option: Optional[AtmOptionInfo] = None
    option_config: Optional[OptionConfigPayload] = None
    active_orders_count: int = 0
    cooldown_remaining_seconds: int = 0
    circuit_breaker_triggered: bool = False
    reconciliation_healthy: bool = True
    credentials_configured: bool = False
    masked_api_key: str = "Not Configured"
    last_reconciliation_time: Optional[datetime] = None
    live_balance_usd: float = 0.0
    user_email: Optional[str] = None
    auto_pilot_status_detail: str = ""



class WatchlistItem(BaseModel):
    symbol: str
    product_id: int
    price: float
    change_24h_pct: float = 0.0
    trend: str = "NEUTRAL"
    signal: SignalAction = SignalAction.NO_TRADE
    rsi: float = 50.0
    is_active: bool = False


class ApiScannerResult(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    rest_url: str
    rest_connected: bool
    rest_latency_ms: float
    ws_url: str
    ws_connected: bool
    credentials_valid: bool
    auth_status: str
    product_count: int
    clock_drift_seconds: float
    status_summary: str


class CredentialsPayload(BaseModel):
    api_key: str = Field(..., description="Delta Exchange India Testnet API Key")
    api_secret: str = Field(..., description="Delta Exchange India Testnet API Secret")


class CredentialsStatus(BaseModel):
    configured: bool
    masked_key: str
    has_secret: bool
    environment: str


class AutomationPayload(BaseModel):
    enabled: bool
    scan_interval_seconds: Optional[int] = 5


class SymbolSwitchPayload(BaseModel):
    symbol: str


class ControlRequest(BaseModel):
    reason: Optional[str] = "Operator manual intervention"


class SessionResetResponse(BaseModel):
    success: bool
    message: str
    positions_closed: int = 0
    orders_cancelled: int = 0
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserProfileResponse(BaseModel):
    configured: bool
    email: Optional[str] = None
    account_id: Optional[str] = None
    country: Optional[str] = None
    is_kyc_approved: bool = False
    profile: Optional[Dict[str, Any]] = None
    balances: List[Dict[str, Any]] = []
    total_balance_usd: float = 0.0


class QuickOrderPayload(BaseModel):
    action: str = Field(..., description="BUY_CALL or BUY_PUT")
    symbol: Optional[str] = None
    product_id: Optional[int] = None
    contracts: Optional[int] = 1
    with_protection: bool = True


class QuickOrderResponse(BaseModel):
    success: bool
    message: str
    client_order_id: Optional[str] = None
    symbol: Optional[str] = None
    product_id: Optional[int] = None
    action: str = ""
    size: float = 0.0


