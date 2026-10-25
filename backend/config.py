"""Configuration module with strict Testnet enforcement and dynamic credential support."""

from enum import Enum
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class EnvironmentType(str, Enum):
    TESTNET = "TESTNET"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Environment & Host Policy
    ENVIRONMENT: EnvironmentType = Field(
        default=EnvironmentType.TESTNET,
        description="Fail-Closed: Only TESTNET allowed in v1"
    )
    DELTA_REST_URL: str = Field(
        default="https://cdn-ind.testnet.deltaex.org",
        description="Authoritative Delta Testnet REST endpoint"
    )
    DELTA_WS_URL: str = Field(
        default="wss://socket-ind.testnet.deltaex.org",
        description="Authoritative Delta Testnet WebSocket endpoint"
    )

    # Dynamic Credentials (Entered directly via Frontend, never hardcoded in backend)
    DELTA_API_KEY: str = Field(default="", description="Delta Testnet API Key")
    DELTA_API_SECRET: str = Field(default="", description="Delta Testnet API Secret")

    # Market & Option Buying Settings
    UNDERLYING_ASSET: str = Field(default="BTC", description="Underlying Asset: BTC, ETH, XAUT")
    SYMBOL: str = Field(default="BTCUSD")
    PRODUCT_ID: int = Field(default=84)
    WATCHLIST_SYMBOLS: List[str] = Field(default=["BTCUSD", "ETHUSD", "XAUTUSD", "SOLUSD"])
    TIMEFRAME: str = Field(default="5m", description="Strategy execution timeframe")
    TREND_TIMEFRAME: str = Field(default="15m")
    ENTRY_TIMEFRAME: str = Field(default="5m")

    # Option Strategy & Contract Controls
    CONTRACTS_COUNT: int = Field(default=1, description="Number of option contracts per order")
    SUPERTREND_PERIOD: int = Field(default=10, description="Supertrend ATR period")
    SUPERTREND_MULT: float = Field(default=3.0, description="Supertrend multiplier")
    EMA_PERIOD: int = Field(default=20, description="EMA trend/pullback filter period")
    OPTION_ATR_PERIOD: int = Field(default=14, description="Option ATR period")
    SL_ATR_MULT: float = Field(default=1.5, description="Stop-Loss ATR Multiplier")
    TP_ATR_MULT: float = Field(default=2.5, description="Target ATR Multiplier")

    # Indicator Baselines
    EMA_FAST: int = Field(default=20)
    EMA_TREND_FAST: int = Field(default=50)
    EMA_TREND_SLOW: int = Field(default=200)
    RSI_PERIOD: int = Field(default=14)
    RSI_LONG_THRESHOLD: float = Field(default=40.0)
    RSI_SHORT_THRESHOLD: float = Field(default=60.0)
    ADX_PERIOD: int = Field(default=14)
    ADX_THRESHOLD: float = Field(default=20.0)
    BB_PERIOD: int = Field(default=20)
    BB_STD: float = Field(default=2.0)
    ATR_PERIOD: int = Field(default=14)

    # Risk Controls
    TEST_EQUITY_USD: float = Field(default=10000.00)
    RISK_PER_TRADE_PCT: float = Field(default=0.0025)
    DAILY_LOSS_LIMIT_PCT: float = Field(default=0.015)
    MAX_OPEN_POSITIONS: int = Field(default=1)
    MAX_SPREAD_TICKS: int = Field(default=10)
    COOLDOWN_SECONDS: int = Field(default=15, description="Scalper trade cooldown in seconds")
    SLIPPAGE_TOLERANCE_PCT: float = Field(default=0.001)

    # Automation Mode (AUTO_PILOT vs MANUAL)
    AUTOMATION_ENABLED: bool = Field(default=False)
    SCAN_INTERVAL_SECONDS: int = Field(default=2, description="Fast execution scan loop interval in seconds")

    # Runtime & Safety
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///trading_bot.db")
    LOG_LEVEL: str = Field(default="INFO")

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_testnet_only(cls, v: EnvironmentType) -> EnvironmentType:
        if v != EnvironmentType.TESTNET:
            raise ValueError("CRITICAL: Only TESTNET environment is permitted in EdgePilot v1!")
        return v

    @field_validator("DELTA_REST_URL")
    @classmethod
    def validate_rest_url(cls, v: str) -> str:
        allowed_domains = ["testnet.deltaex.org", "testnet-ind.deltaex.org", "cdn-ind.testnet.deltaex.org"]
        if not any(domain in v for domain in allowed_domains):
            raise ValueError(f"CRITICAL: Non-testnet or unapproved REST host '{v}'. Execution aborted.")
        if "api.delta.exchange" in v or "cdn.delta.exchange" in v:
            raise ValueError(f"CRITICAL: Production host detected in REST URL '{v}'!")
        return v

    @field_validator("DELTA_WS_URL")
    @classmethod
    def validate_ws_url(cls, v: str) -> str:
        allowed_domains = ["testnet.deltaex.org", "socket-ind.testnet.deltaex.org", "socket-ind-pub.testnet.deltaex.org"]
        if not any(domain in v for domain in allowed_domains):
            raise ValueError(f"CRITICAL: Non-testnet or unapproved WebSocket host '{v}'. Execution aborted.")
        if "socket.delta.exchange" in v:
            raise ValueError(f"CRITICAL: Production host detected in WebSocket URL '{v}'!")
        return v


_global_settings: Settings | None = None


def get_settings() -> Settings:
    global _global_settings
    if _global_settings is None:
        _global_settings = Settings()
    return _global_settings

