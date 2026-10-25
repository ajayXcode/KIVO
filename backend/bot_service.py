"""Core bot background service coordinating market data, strategy, risk, execution, and automation."""

import asyncio
from datetime import datetime, timezone
import logging
import time
from typing import Dict, List, Optional

from backend.config import Settings, get_settings
from backend.database import get_db_session, init_db
from backend.delta_client import DeltaClient
from backend.execution_manager import ExecutionManager
from backend.market_data import MarketDataManager
from backend.models import (
    ApiScannerResult,
    AutomationMode,
    BotState,
    BotStatusResponse,
    CredentialsStatus,
    EventLog,
    SignalAction,
    SignalRecord,
    SignalResult,
    WatchlistItem,
)
from backend.reconciler import Reconciler
from backend.risk_manager import RiskManager
from backend.security import mask_credential
from backend.state_machine import BotStateMachine
from backend.strategy import StrategyEngine

logger = logging.getLogger("edgepilot.bot_service")


class BotService:
    """Singleton service driving the end-to-end trading loop."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self.state_machine = BotStateMachine(BotState.INITIALIZING)
        self.client = DeltaClient(self.settings)
        self.market_data = MarketDataManager()
        self.strategy = StrategyEngine(self.settings)
        self.risk_manager = RiskManager(self.settings)
        self.execution = ExecutionManager(self.client, self.settings)
        self.reconciler = Reconciler(self.client, self.settings)

        self.automation_mode: AutomationMode = AutomationMode.AUTO_PILOT if self.settings.AUTOMATION_ENABLED else AutomationMode.MANUAL
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self.latest_signal: Optional[SignalResult] = None
        self.current_position_size: float = 0.0
        self.unrealized_pnl: float = 0.0
        self.latest_price: float = 0.0
        self.active_orders_count: int = 0
        self.cached_watchlist: Dict[str, WatchlistItem] = {}

    def set_credentials(self, api_key: str, api_secret: str) -> None:
        """Dynamically update API credentials from frontend UI."""
        self.client.set_credentials(api_key, api_secret)
        logger.info(f"API credentials updated via frontend. Key: {mask_credential(api_key)}")

    def clear_credentials(self) -> None:
        """Clear active session credentials."""
        self.client.clear_credentials()
        logger.info("API credentials cleared from session.")

    def get_credentials_status(self) -> CredentialsStatus:
        return CredentialsStatus(
            configured=self.client.has_credentials(),
            masked_key=mask_credential(self.client.api_key),
            has_secret=bool(self.client.api_secret),
            environment=self.settings.ENVIRONMENT.value
        )

    def set_automation_mode(self, enabled: bool) -> None:
        self.automation_mode = AutomationMode.AUTO_PILOT if enabled else AutomationMode.MANUAL
        logger.info(f"Automation mode set to: {self.automation_mode.value}")

    async def switch_symbol(self, symbol: str) -> bool:
        """Switch active market symbol in runtime."""
        symbol = symbol.upper().strip()
        try:
            product = await self.client.get_product_by_symbol(symbol)
            if product:
                self.settings.SYMBOL = symbol
                self.settings.PRODUCT_ID = int(product.get("id", self.settings.PRODUCT_ID))
                self.market_data.reset_for_symbol()
                await self.sync_market_data()
                await self.reconciler.reconcile(self.settings.PRODUCT_ID, symbol)
                logger.info(f"Switched active symbol to {symbol} (Product {self.settings.PRODUCT_ID})")
                return True
            return False
        except Exception as exc:
            logger.error(f"Failed to switch symbol to {symbol}: {exc}")
            return False

    async def scan_connectivity(self) -> ApiScannerResult:
        """Scan API connection health, latency, and auth validity."""
        t0 = time.time()
        rest_ok = False
        latency = 999.0
        drift = 0.0
        products_count = 0
        auth_ok = False
        auth_msg = "Credentials Not Configured"

        try:
            products = await self.client.get_products()
            latency = round((time.time() - t0) * 1000.0, 1)
            products_count = len(products)
            rest_ok = products_count > 0
        except Exception as e:
            logger.error(f"REST connectivity scan failed: {e}")

        if self.client.has_credentials():
            try:
                await self.client.get_positions()
                auth_ok = True
                auth_msg = "Authorized & Valid"
            except Exception as e:
                auth_ok = False
                auth_msg = f"Auth Error: {str(e)[:40]}"

        status_str = "Optimal" if (rest_ok and (auth_ok or not self.client.has_credentials())) else "Degraded"

        return ApiScannerResult(
            rest_url=self.settings.DELTA_REST_URL,
            rest_connected=rest_ok,
            rest_latency_ms=latency,
            ws_url=self.settings.DELTA_WS_URL,
            ws_connected=rest_ok,
            credentials_valid=auth_ok,
            auth_status=auth_msg,
            product_count=products_count,
            clock_drift_seconds=drift,
            status_summary=status_str
        )

    async def get_watchlist(self) -> List[WatchlistItem]:
        """Scan and return metrics for all watchlist assets."""
        items: List[WatchlistItem] = []
        for sym in self.settings.WATCHLIST_SYMBOLS:
            price = 0.0
            change_24h = 0.0
            trend = "NEUTRAL"
            try:
                ticker = await self.client.get_ticker(sym)
                if ticker:
                    price = float(ticker.get("close") or ticker.get("mark_price") or 0.0)
                    open_24h = float(ticker.get("open") or price)
                    if open_24h > 0:
                        change_24h = round(((price - open_24h) / open_24h) * 100.0, 2)
                    trend = "BULLISH" if change_24h > 0 else "BEARISH" if change_24h < 0 else "NEUTRAL"
            except Exception:
                pass

            items.append(WatchlistItem(
                symbol=sym,
                product_id=self.settings.PRODUCT_ID if sym == self.settings.SYMBOL else 0,
                price=price,
                change_24h_pct=change_24h,
                trend=trend,
                signal=SignalAction.NO_TRADE,
                is_active=(sym == self.settings.SYMBOL)
            ))
        return items

    async def flatten_position(self, reason: str = "Operator flatten command") -> bool:
        """Emergency flatten current position."""
        return await self.execution.close_position_market(
            product_id=self.settings.PRODUCT_ID,
            current_size=self.current_position_size,
            symbol=self.settings.SYMBOL
        )

    async def initialize(self) -> bool:
        logger.info("Initializing EdgePilot Trading Bot...")
        self.state_machine.transition(BotState.INITIALIZING, "Running startup gates")
        await init_db()

        try:
            product = await self.client.get_product_by_symbol(self.settings.SYMBOL)
            if product:
                self.settings.PRODUCT_ID = int(product.get("id", self.settings.PRODUCT_ID))
        except Exception as exc:
            logger.warning(f"Product discovery check notice: {exc}")

        _, pos_size, u_pnl = await self.reconciler.reconcile(
            self.settings.PRODUCT_ID,
            self.settings.SYMBOL
        )
        self.current_position_size = pos_size
        self.unrealized_pnl = u_pnl
        await self.sync_market_data()
        self.state_machine.transition(BotState.READY, "Startup gates passed. Ready.")
        return True

    async def sync_market_data(self) -> None:
        try:
            raw_5m = await self.client.get_candles(self.settings.SYMBOL, resolution="5m")
            raw_15m = await self.client.get_candles(self.settings.SYMBOL, resolution="15m")
            if raw_5m or raw_15m:
                self.market_data.ingest_raw_candles(raw_5m, raw_15m)
                if self.market_data.candles_5m.candles:
                    self.latest_price = self.market_data.candles_5m.candles[-1].close
        except Exception as exc:
            logger.error(f"Error syncing candles: {exc}")

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._main_loop())
        logger.info("Bot main loop started.")

    async def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Bot main loop stopped.")

    async def _main_loop(self) -> None:
        reconcile_counter = 0

        while self._running:
            try:
                await self.sync_market_data()

                signal = self.strategy.evaluate(
                    self.market_data.candles_5m,
                    self.market_data.candles_15m
                )
                self.latest_signal = signal

                if signal.action != SignalAction.NO_TRADE:
                    async with get_db_session() as session:
                        session.add(SignalRecord(
                            symbol=signal.symbol,
                            action=signal.action.value,
                            price=signal.price,
                            indicators=signal.indicators.model_dump_json(),
                            reason=signal.reason
                        ))

                # If RUNNING and AUTO_PILOT is enabled, execute automatically
                if self.state_machine.current_state == BotState.RUNNING and self.automation_mode == AutomationMode.AUTO_PILOT:
                    if signal.action in (SignalAction.LONG, SignalAction.SHORT):
                        risk_eval = self.risk_manager.evaluate_intent(
                            signal=signal,
                            current_position_size=self.current_position_size
                        )
                        if risk_eval.approved:
                            logger.info(f"Auto-Pilot: Submitting approved {signal.action.value} order...")
                            success, msg, client_id = await self.execution.execute_trade_intent(
                                action=signal.action,
                                risk=risk_eval,
                                product_id=self.settings.PRODUCT_ID,
                                symbol=self.settings.SYMBOL
                            )
                            if success:
                                _, self.current_position_size, self.unrealized_pnl = await self.reconciler.reconcile(
                                    self.settings.PRODUCT_ID,
                                    self.settings.SYMBOL
                                )

                reconcile_counter += 1
                if reconcile_counter >= 6:
                    reconcile_counter = 0
                    _, self.current_position_size, self.unrealized_pnl = await self.reconciler.reconcile(
                        self.settings.PRODUCT_ID,
                        self.settings.SYMBOL
                    )

            except Exception as exc:
                logger.error(f"Main loop error: {exc}")

            await asyncio.sleep(self.settings.SCAN_INTERVAL_SECONDS)

    def get_status(self) -> BotStatusResponse:
        daily_loss_pct = (self.risk_manager.daily_realized_loss / self.settings.TEST_EQUITY_USD) if self.settings.TEST_EQUITY_USD > 0 else 0.0

        return BotStatusResponse(
            state=self.state_machine.current_state,
            environment=self.settings.ENVIRONMENT.value,
            symbol=self.settings.SYMBOL,
            product_id=self.settings.PRODUCT_ID,
            automation_mode=self.automation_mode,
            test_equity_usd=self.settings.TEST_EQUITY_USD,
            current_position_size=self.current_position_size,
            unrealized_pnl=round(self.unrealized_pnl, 2),
            realized_pnl=round(-self.risk_manager.daily_realized_loss, 2),
            daily_pnl_usd=round(-self.risk_manager.daily_realized_loss + self.unrealized_pnl, 2),
            daily_pnl_pct=round(daily_loss_pct * 100, 3),
            latest_price=self.latest_price if self.latest_price > 0 else None,
            latest_signal=self.latest_signal,
            indicators=self.latest_signal.indicators if self.latest_signal else None,
            active_orders_count=self.active_orders_count,
            cooldown_remaining_seconds=max(0, int(self.settings.COOLDOWN_SECONDS - (datetime.now(timezone.utc).timestamp() - self.risk_manager.last_trade_closed_time))) if self.risk_manager.last_trade_closed_time > 0 else 0,
            circuit_breaker_triggered=self.risk_manager.circuit_breaker_active,
            reconciliation_healthy=self.reconciler.is_healthy,
            credentials_configured=self.client.has_credentials(),
            masked_api_key=mask_credential(self.client.api_key),
            last_reconciliation_time=self.reconciler.last_reconciliation_time
        )


_bot_service: Optional[BotService] = None


def get_bot_service() -> BotService:
    global _bot_service
    if _bot_service is None:
        _bot_service = BotService()
    return _bot_service

