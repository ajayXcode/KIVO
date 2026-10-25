"""Core bot background service coordinating Option Buying, market data, Supertrend+EMA strategy, and execution."""

import asyncio
from datetime import datetime, timezone
import logging
import time
from typing import Any, Dict, List, Optional
from sqlalchemy import delete

from backend.config import Settings, get_settings
from backend.database import get_db_session, init_db
from backend.delta_client import DeltaClient
from backend.execution_manager import ExecutionManager
from backend.indicators import (
    calculate_atr,
    calculate_bollinger_bands,
    calculate_ema,
    calculate_rsi,
    calculate_supertrend,
)
from backend.market_data import MarketDataManager
from backend.models import (
    ApiScannerResult,
    AtmOptionInfo,
    AutomationMode,
    BotState,
    BotStatusResponse,
    CredentialsStatus,
    EventLog,
    OptionConfigPayload,
    OrderRecord,
    PositionRecord,
    SessionResetResponse,
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
    """Singleton service driving the end-to-end Option Buying trading loop."""

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
        self.current_atm_option: Optional[AtmOptionInfo] = None
        self.current_position_size: float = 0.0
        self.unrealized_pnl: float = 0.0
        self.latest_price: float = 0.0
        self.active_orders_count: int = 0
        self.cached_watchlist: Dict[str, WatchlistItem] = {}
        self.cached_profile: Optional[Dict[str, Any]] = None
        self.cached_balances: List[Dict[str, Any]] = []
        self.live_wallet_usd: float = 0.0
        self.user_email: Optional[str] = None
        self.user_account_id: Optional[str] = None

    def set_credentials(self, api_key: str, api_secret: str) -> None:
        """Dynamically update API credentials from frontend UI."""
        self.client.set_credentials(api_key, api_secret)
        logger.info(f"API credentials updated via frontend. Key: {mask_credential(api_key)}")
        async def _sync_and_load():
            await self.client.sync_clock()
            await self.fetch_profile_and_balances()
            await self.reconciler.reconcile(self.settings.PRODUCT_ID, self.settings.SYMBOL)
        try:
            asyncio.create_task(_sync_and_load())
        except Exception:
            pass

    def clear_credentials(self) -> None:
        """Clear active session credentials."""
        self.client.clear_credentials()
        self.cached_profile = None
        self.cached_balances = []
        self.live_wallet_usd = 0.0
        self.user_email = None
        self.user_account_id = None
        logger.info("API credentials cleared from session.")

    def get_credentials_status(self) -> CredentialsStatus:
        return CredentialsStatus(
            configured=self.client.has_credentials(),
            masked_key=mask_credential(self.client.api_key),
            has_secret=bool(self.client.api_secret),
            environment=self.settings.ENVIRONMENT.value
        )

    def get_chart_data(self) -> List[Dict[str, Any]]:
        """Return formatted candle chart history with Supertrend and EMA overlays."""
        if not self.market_data.candles_5m.candles:
            return []
        _, highs, lows, closes, volumes = self.market_data.candles_5m.to_arrays()
        ema_val = calculate_ema(closes, self.settings.EMA_PERIOD)
        st_val, st_dir, _, _ = calculate_supertrend(
            highs, lows, closes,
            period=self.settings.SUPERTREND_PERIOD,
            multiplier=self.settings.SUPERTREND_MULT
        )
        rsi_val = calculate_rsi(closes, self.settings.RSI_PERIOD)

        candles = self.market_data.candles_5m.candles[-60:]
        offset = len(closes) - len(candles)
        data = []

        import numpy as np
        for idx, c in enumerate(candles):
            global_idx = offset + idx
            dt = datetime.fromtimestamp(c.timestamp, tz=timezone.utc)
            val_ema = float(ema_val[global_idx]) if not np.isnan(ema_val[global_idx]) else c.close
            val_st = float(st_val[global_idx]) if not np.isnan(st_val[global_idx]) else c.close
            val_st_d = int(st_dir[global_idx])
            val_rsi = float(rsi_val[global_idx]) if not np.isnan(rsi_val[global_idx]) else 50.0

            data.append({
                "time": dt.strftime("%H:%M"),
                "timestamp": c.timestamp,
                "open": round(c.open, 2),
                "high": round(c.high, 2),
                "low": round(c.low, 2),
                "close": round(c.close, 2),
                "volume": round(c.volume, 2),
                "ema": round(val_ema, 2),
                "supertrend": round(val_st, 2),
                "supertrend_direction": val_st_d,
                "rsi": round(val_rsi, 1)
            })
        return data

    def set_automation_mode(self, enabled: bool) -> None:
        self.automation_mode = AutomationMode.AUTO_PILOT if enabled else AutomationMode.MANUAL
        if enabled:
            if self.state_machine.current_state in (BotState.READY, BotState.PAUSED):
                self.state_machine.transition(BotState.RUNNING, "Auto-Pilot activated by operator")
        logger.info(f"Automation mode set to: {self.automation_mode.value}, State: {self.state_machine.current_state.value}")

    async def switch_underlying_asset(self, asset: str) -> bool:
        """Switch underlying asset between BTC, ETH, and XAUT."""
        asset = asset.upper().strip()
        symbol_map = {
            "BTC": "BTCUSD",
            "ETH": "ETHUSD",
            "XAUT": "XAUTUSD"
        }
        symbol = symbol_map.get(asset, f"{asset}USD")
        self.settings.UNDERLYING_ASSET = asset
        return await self.switch_symbol(symbol)

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

    async def update_option_config(self, payload: OptionConfigPayload) -> None:
        """Update runtime option buying settings."""
        self.settings.TIMEFRAME = payload.timeframe
        self.settings.CONTRACTS_COUNT = max(1, payload.contracts)
        self.settings.SUPERTREND_PERIOD = max(2, payload.supertrend_period)
        self.settings.SUPERTREND_MULT = max(0.5, payload.supertrend_multiplier)
        self.settings.EMA_PERIOD = max(2, payload.ema_period)
        self.settings.OPTION_ATR_PERIOD = max(2, payload.option_atr_period)
        self.settings.SL_ATR_MULT = max(0.5, payload.sl_atr_multiplier)
        self.settings.TP_ATR_MULT = max(0.5, payload.tp_atr_multiplier)

        new_asset = payload.underlying_asset.upper().strip()
        if new_asset != self.settings.UNDERLYING_ASSET:
            await self.switch_underlying_asset(new_asset)
        else:
            await self.sync_market_data()

    async def clear_session(self) -> SessionResetResponse:
        """Stop and close tracked option positions, cancel orders, and clear session data for a fresh start."""
        logger.warning("Safety session reset: Closing positions, cancelling orders, and purging session data...")
        closed_count = 0
        cancelled_count = 0

        # 1. Close current position
        if abs(self.current_position_size) > 0:
            target_prod = self.current_atm_option.product_id if self.current_atm_option else self.settings.PRODUCT_ID
            target_sym = self.current_atm_option.symbol if self.current_atm_option else self.settings.SYMBOL
            success = await self.execution.close_position_market(target_prod, self.current_position_size, target_sym)
            if success:
                closed_count = 1

        # 2. Cancel all pending orders
        prod_ids = [self.settings.PRODUCT_ID]
        if self.current_atm_option:
            prod_ids.append(self.current_atm_option.product_id)
        cancelled_count = await self.execution.emergency_cancel_all(prod_ids)

        # 3. Reset in-memory tracking
        self.current_position_size = 0.0
        self.unrealized_pnl = 0.0
        self.latest_signal = None
        self.active_orders_count = 0
        self.risk_manager.reset_daily_loss()

        # 4. Clear database session records
        try:
            async with get_db_session() as session:
                await session.execute(delete(OrderRecord))
                await session.execute(delete(PositionRecord))
                await session.execute(delete(SignalRecord))
                session.add(EventLog(
                    event_type="SESSION_RESET",
                    component="BotService",
                    message="Session reset completed: closed tracked option positions and cleared session history.",
                    details=f"positions_closed={closed_count}, orders_cancelled={cancelled_count}"
                ))
        except Exception as db_err:
            logger.error(f"Error purging database session tables: {db_err}")

        self.state_machine.transition(BotState.READY, "Clean session reset completed")
        return SessionResetResponse(
            success=True,
            message="Tracked positions closed, pending orders cancelled, and session data cleared for a fresh start.",
            positions_closed=closed_count,
            orders_cancelled=cancelled_count
        )

    async def scan_connectivity(self) -> ApiScannerResult:
        """Scan API connection health, latency, and auth validity."""
        t0 = time.time()
        rest_ok = False
        latency = 999.0
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
            clock_drift_seconds=0.0,
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
                    price = float(ticker.get("close") or ticker.get("spot_price") or ticker.get("mark_price") or 0.0)
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
        target_prod = self.current_atm_option.product_id if self.current_atm_option else self.settings.PRODUCT_ID
        target_sym = self.current_atm_option.symbol if self.current_atm_option else self.settings.SYMBOL
        return await self.execution.close_position_market(
            product_id=target_prod,
            current_size=self.current_position_size,
            symbol=target_sym
        )

    async def fetch_profile_and_balances(self) -> Dict[str, Any]:
        """Fetch live account profile and asset balances from Delta Exchange Testnet."""
        if not self.client.has_credentials():
            return {
                "configured": False,
                "email": None,
                "account_id": None,
                "profile": None,
                "balances": [],
                "total_balance_usd": 0.0
            }

        try:
            profile = await self.client.get_profile()
            balances = await self.client.get_wallet_balances()
            self.cached_profile = profile
            self.cached_balances = balances

            # Extract user metadata
            self.user_email = profile.get("email") or profile.get("user_name")
            self.user_account_id = str(profile.get("id") or "")

            # Calculate total USD balance from USDT/USD assets
            total_usd = 0.0
            for b in balances:
                sym = str(b.get("asset_symbol", "")).upper()
                bal = float(b.get("balance") or b.get("available_balance") or 0.0)
                if sym in ("USDT", "USD", "USDC"):
                    total_usd += bal
            self.live_wallet_usd = round(total_usd, 2)

            return {
                "configured": True,
                "email": self.user_email,
                "account_id": self.user_account_id,
                "country": profile.get("country"),
                "is_kyc_approved": bool(
                    profile.get("is_kyc_approved")
                    or profile.get("is_kyc_done")
                    or profile.get("proof_of_identity_status") == "approved"
                ),
                "profile": profile,
                "balances": balances,
                "total_balance_usd": self.live_wallet_usd
            }
        except Exception as exc:
            logger.error(f"Error fetching Delta profile and wallet balances: {exc}")
            return {
                "configured": True,
                "email": self.user_email,
                "account_id": self.user_account_id,
                "profile": self.cached_profile,
                "balances": self.cached_balances or [],
                "total_balance_usd": self.live_wallet_usd,
                "error": str(exc)
            }

    async def execute_manual_option_buy(
        self,
        action: str = "BUY_CALL",
        symbol: Optional[str] = None,
        product_id: Optional[int] = None,
        contracts: Optional[int] = None,
        with_protection: bool = True
    ) -> Dict[str, Any]:
        """One-click manual purchase of active ATM option with automated protective brackets."""
        action = action.upper().strip()
        size = float(contracts or self.settings.CONTRACTS_COUNT)

        target_product_id = product_id
        target_symbol = symbol

        # If symbol/product not supplied, resolve via active ATM option or discovery
        if not target_product_id or not target_symbol:
            if self.current_atm_option and (
                (action == "BUY_CALL" and self.current_atm_option.option_type == "CALL") or
                (action == "BUY_PUT" and self.current_atm_option.option_type == "PUT")
            ):
                target_product_id = self.current_atm_option.product_id
                target_symbol = self.current_atm_option.symbol
            else:
                spot = self.latest_price if self.latest_price > 0 else 68000.0
                disc = await self.client.find_atm_option(self.settings.UNDERLYING_ASSET, action, spot)
                if disc:
                    target_product_id = int(disc.get("id", 0))
                    target_symbol = disc.get("symbol", "")

        if not target_product_id or not target_symbol:
            return {
                "success": False,
                "message": f"Could not identify active ATM option for {action} on {self.settings.UNDERLYING_ASSET}.",
                "client_order_id": None
            }

        # Calculate Stop-Loss ATR bracket
        sl_price = None
        tp_price = None
        if with_protection and self.current_atm_option:
            sl_price = self.current_atm_option.stop_loss_price
            tp_price = self.current_atm_option.take_profit_price

        success, msg, client_id = await self.execution.execute_manual_option(
            action=action,
            product_id=target_product_id,
            symbol=target_symbol,
            size=size,
            stop_loss_price=sl_price,
            take_profit_price=tp_price
        )

        if success:
            # Reconcile position immediately
            _, self.current_position_size, self.unrealized_pnl = await self.reconciler.reconcile(
                target_product_id,
                target_symbol
            )
            # Update balances in background
            asyncio.create_task(self.fetch_profile_and_balances())

        return {
            "success": success,
            "message": msg,
            "client_order_id": client_id,
            "symbol": target_symbol,
            "product_id": target_product_id,
            "action": action,
            "size": size
        }

    async def initialize(self) -> bool:
        logger.info("Initializing EdgePilot Option Buying Bot...")
        self.state_machine.transition(BotState.INITIALIZING, "Running startup gates")
        await init_db()
        await self.client.sync_clock()

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
        """Synchronize candles, calculate indicators, and select ATM Option with ATR brackets."""
        try:
            # 1. Update live ticker / spot price
            ticker = await self.client.get_ticker(self.settings.SYMBOL)
            if ticker:
                self.latest_price = float(ticker.get("spot_price") or ticker.get("close") or ticker.get("mark_price") or 0.0)

            # 2. Fetch and ingest candles (with gap filling)
            raw_5m = await self.client.get_candles(self.settings.SYMBOL, resolution=self.settings.TIMEFRAME)
            raw_15m = await self.client.get_candles(self.settings.SYMBOL, resolution="15m")
            if raw_5m or raw_15m:
                self.market_data.ingest_raw_candles(raw_5m, raw_15m, latest_price=self.latest_price)
                if self.market_data.candles_5m.candles and self.latest_price == 0.0:
                    self.latest_price = self.market_data.candles_5m.candles[-1].close

            # 3. Evaluate Strategy
            signal = self.strategy.evaluate(
                self.market_data.candles_5m,
                self.market_data.candles_15m
            )
            self.latest_signal = signal

            # 4. Discover ATM Option & Calculate Option-based ATR Brackets
            if self.latest_price > 0:
                direction = "BUY_CALL"
                if signal.action == SignalAction.BUY_PUT:
                    direction = "BUY_PUT"
                elif signal.action == SignalAction.BUY_CALL:
                    direction = "BUY_CALL"

                atm_prod = await self.client.find_atm_option(
                    self.settings.UNDERLYING_ASSET,
                    direction,
                    self.latest_price
                )
                if atm_prod:
                    atm_sym = atm_prod.get("symbol", "")
                    quote = await self.client.get_option_quote(atm_sym)
                    q_price = float(quote.get("best_ask") or quote.get("close") or quote.get("mark_price") or 50.0)
                    opt_atr = signal.indicators.option_atr if signal.indicators.option_atr > 0 else 10.0
                    sl_p = max(0.1, round(q_price - (self.settings.SL_ATR_MULT * opt_atr), 2))
                    tp_p = round(q_price + (self.settings.TP_ATR_MULT * opt_atr), 2)
                    self.current_atm_option = AtmOptionInfo(
                        product_id=int(atm_prod.get("id", 0)),
                        symbol=atm_sym,
                        option_type="CALL" if "call" in atm_prod.get("contract_type", "").lower() else "PUT",
                        strike_price=float(atm_prod.get("strike_price", 0)),
                        settlement_time=str(atm_prod.get("settlement_time", "")),
                        quote_price=q_price,
                        option_atr=opt_atr,
                        stop_loss_price=sl_p,
                        take_profit_price=tp_p,
                        stop_loss_label=f"SL: ${sl_p} ({self.settings.SL_ATR_MULT}x ATR)",
                        take_profit_label=f"TP: ${tp_p} ({self.settings.TP_ATR_MULT}x ATR)"
                    )
        except Exception as exc:
            logger.error(f"Error syncing market data and ATM option: {exc}")

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._main_loop())
        logger.info("Option Buying bot main loop started.")

    async def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Option Buying bot main loop stopped.")

    async def _main_loop(self) -> None:
        reconcile_counter = 0

        while self._running:
            try:
                await self.sync_market_data()

                if self.latest_signal and self.latest_signal.action != SignalAction.NO_TRADE:
                    async with get_db_session() as session:
                        session.add(SignalRecord(
                            symbol=self.latest_signal.symbol,
                            action=self.latest_signal.action.value,
                            price=self.latest_signal.price,
                            indicators=self.latest_signal.indicators.model_dump_json(),
                            reason=self.latest_signal.reason
                        ))

                # If Auto-Pilot is enabled and bot was READY, auto-promote to RUNNING
                if self.automation_mode == AutomationMode.AUTO_PILOT and self.state_machine.current_state == BotState.READY:
                    if not self.risk_manager.circuit_breaker_active:
                        self.state_machine.transition(BotState.RUNNING, "Auto-Pilot active: transitioning READY to RUNNING")

                # ==============================================================
                # 1. ACTIVE POSITION SCALPER: SITUATION-BASED DYNAMIC EXITS
                # ==============================================================
                if abs(self.current_position_size) > 0 and self.automation_mode == AutomationMode.AUTO_PILOT:
                    reversal_exit = False
                    exit_reason = ""
                    target_sym = self.current_atm_option.symbol if self.current_atm_option else self.settings.SYMBOL
                    is_option = target_sym.startswith(("C-", "P-"))

                    if is_option:
                        is_put = target_sym.startswith("P-") or (self.current_atm_option and self.current_atm_option.option_type == "PUT")
                        q_price = self.current_atm_option.quote_price if self.current_atm_option else 0.0

                        if is_put:
                            # We hold a Bearish Put: exit if market reverses to Bullish
                            if self.latest_signal and self.latest_signal.action in (SignalAction.BUY_CALL, SignalAction.LONG):
                                reversal_exit = True
                                exit_reason = f"SCALP_REVERSAL: Trend reversed to {self.latest_signal.action.value}. Fast exit Put."
                            elif self.latest_signal and self.latest_signal.indicators.supertrend_direction == 1:
                                reversal_exit = True
                                exit_reason = "SCALP_TREND_BREAK: Supertrend flipped BULLISH (+1). Fast exit Put."
                        else:
                            # We hold a Bullish Call: exit if market reverses to Bearish
                            if self.latest_signal and self.latest_signal.action in (SignalAction.BUY_PUT, SignalAction.SHORT):
                                reversal_exit = True
                                exit_reason = f"SCALP_REVERSAL: Trend reversed to {self.latest_signal.action.value}. Fast exit Call."
                            elif self.latest_signal and self.latest_signal.indicators.supertrend_direction == -1:
                                reversal_exit = True
                                exit_reason = "SCALP_TREND_BREAK: Supertrend flipped BEARISH (-1). Fast exit Call."

                        # Option-specific ATR Target & Stop-Loss Exits
                        if self.current_atm_option and q_price > 0:
                            if self.current_atm_option.take_profit_price > 0 and q_price >= self.current_atm_option.take_profit_price:
                                reversal_exit = True
                                exit_reason = f"SCALP_TP_HIT: Option price (${q_price}) reached Target (${self.current_atm_option.take_profit_price})."
                            elif self.current_atm_option.stop_loss_price > 0 and q_price <= self.current_atm_option.stop_loss_price:
                                reversal_exit = True
                                exit_reason = f"SCALP_SL_HIT: Option price (${q_price}) hit Stop-Loss (${self.current_atm_option.stop_loss_price})."

                    else:
                        # Standard Perpetual Futures (BTCUSD)
                        if self.current_position_size > 0:
                            if self.latest_signal and self.latest_signal.action in (SignalAction.BUY_PUT, SignalAction.SHORT):
                                reversal_exit = True
                                exit_reason = f"SCALP_REVERSAL: Signal flipped to {self.latest_signal.action.value}. Fast exit."
                            elif self.latest_signal and self.latest_signal.indicators.supertrend_direction == -1:
                                reversal_exit = True
                                exit_reason = "SCALP_TREND_BREAK: Supertrend flipped BEARISH. Fast exit."
                        elif self.current_position_size < 0:
                            if self.latest_signal and self.latest_signal.action in (SignalAction.BUY_CALL, SignalAction.LONG):
                                reversal_exit = True
                                exit_reason = f"SCALP_REVERSAL: Signal flipped to {self.latest_signal.action.value}. Fast exit."
                            elif self.latest_signal and self.latest_signal.indicators.supertrend_direction == 1:
                                reversal_exit = True
                                exit_reason = "SCALP_TREND_BREAK: Supertrend flipped BULLISH. Fast exit."

                    if reversal_exit:
                        logger.info(f"Auto-Pilot Situation Exit Triggered: {exit_reason}")
                        await self.flatten_position(reason=exit_reason)
                        target_prod_id = self.current_atm_option.product_id if self.current_atm_option else self.settings.PRODUCT_ID
                        target_sym = self.current_atm_option.symbol if self.current_atm_option else self.settings.SYMBOL
                        _, self.current_position_size, self.unrealized_pnl = await self.reconciler.reconcile(target_prod_id, target_sym)

                # ==============================================================
                # 2. AUTONOMOUS SCALPING ENTRY ENGINE
                # ==============================================================
                is_active_execution = (
                    self.state_machine.current_state in (BotState.RUNNING, BotState.READY)
                    and self.automation_mode == AutomationMode.AUTO_PILOT
                )
                if is_active_execution and abs(self.current_position_size) == 0.0:
                    if self.client.has_credentials():
                        if self.latest_signal and self.latest_signal.action in (SignalAction.BUY_CALL, SignalAction.BUY_PUT, SignalAction.LONG, SignalAction.SHORT):
                            risk_eval = self.risk_manager.evaluate_intent(
                                signal=self.latest_signal,
                                current_position_size=self.current_position_size
                            )
                            if risk_eval.approved:
                                target_prod_id = self.current_atm_option.product_id if self.current_atm_option else self.settings.PRODUCT_ID
                                target_sym = self.current_atm_option.symbol if self.current_atm_option else self.settings.SYMBOL
                                logger.info(f"Auto-Pilot Scalper: Executing {self.latest_signal.action.value} on {target_sym}...")
                                success, msg, client_id = await self.execution.execute_trade_intent(
                                    action=self.latest_signal.action,
                                    risk=risk_eval,
                                    product_id=target_prod_id,
                                    symbol=target_sym
                                )
                                if success:
                                    _, self.current_position_size, self.unrealized_pnl = await self.reconciler.reconcile(
                                        target_prod_id,
                                        target_sym
                                    )
                                    await self.fetch_profile_and_balances()

                reconcile_counter += 1
                if reconcile_counter >= 6:
                    reconcile_counter = 0
                    target_prod_id = self.current_atm_option.product_id if self.current_atm_option else self.settings.PRODUCT_ID
                    target_sym = self.current_atm_option.symbol if self.current_atm_option else self.settings.SYMBOL
                    _, self.current_position_size, self.unrealized_pnl = await self.reconciler.reconcile(
                        target_prod_id,
                        target_sym
                    )
                    await self.fetch_profile_and_balances()

            except Exception as exc:
                logger.error(f"Main loop error: {exc}")

            await asyncio.sleep(self.settings.SCAN_INTERVAL_SECONDS)

    def get_status(self) -> BotStatusResponse:
        daily_loss_pct = (self.risk_manager.daily_realized_loss / self.settings.TEST_EQUITY_USD) if self.settings.TEST_EQUITY_USD > 0 else 0.0

        current_opt_config = OptionConfigPayload(
            underlying_asset=self.settings.UNDERLYING_ASSET,
            timeframe=self.settings.TIMEFRAME,
            contracts=self.settings.CONTRACTS_COUNT,
            supertrend_period=self.settings.SUPERTREND_PERIOD,
            supertrend_multiplier=self.settings.SUPERTREND_MULT,
            ema_period=self.settings.EMA_PERIOD,
            option_atr_period=self.settings.OPTION_ATR_PERIOD,
            sl_atr_multiplier=self.settings.SL_ATR_MULT,
            tp_atr_multiplier=self.settings.TP_ATR_MULT
        )

        # Human-readable real-time auto-pilot explanation
        if self.risk_manager.circuit_breaker_active:
            auto_detail = "[CIRCUIT BREAKER] Daily Loss Limit Reached. Trading halted."
        elif self.state_machine.current_state == BotState.PAUSED:
            auto_detail = "[PAUSED] Operator Paused: Auto-Pilot waiting for resume."
        elif self.state_machine.current_state == BotState.HALTED:
            auto_detail = "[HALTED] Emergency Halt Active. All orders cancelled."
        elif self.automation_mode == AutomationMode.MANUAL:
            auto_detail = f"[MANUAL STANDBY] Monitoring {self.settings.UNDERLYING_ASSET}. Use Instant Buy buttons or toggle Auto-Pilot ON."
        elif self.automation_mode == AutomationMode.AUTO_PILOT:
            if not self.client.has_credentials():
                auto_detail = f"[AUTO-PILOT ARMED: AWAITING KEYS] Auto-Pilot enabled for {self.settings.SYMBOL}. Click 'Setup API Keys' above to start automated execution."
            else:
                st_text = self.latest_signal.indicators.supertrend_label if self.latest_signal and self.latest_signal.indicators else "NEUTRAL"
                opt_sym = self.current_atm_option.symbol if self.current_atm_option else "Scanning"
                auto_detail = f"[⚡ AUTO-PILOT ACTIVE] Live Scalping {self.settings.SYMBOL} (${self.latest_price:,.1f} | ST: {st_text} | Target: {opt_sym}). Autonomous entry & exit active."
        else:
            auto_detail = f"[READY] Bot State: {self.state_machine.current_state.value}. Standby."

        return BotStatusResponse(
            state=self.state_machine.current_state,
            environment=self.settings.ENVIRONMENT.value,
            symbol=self.settings.SYMBOL,
            product_id=self.settings.PRODUCT_ID,
            underlying_asset=self.settings.UNDERLYING_ASSET,
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
            atm_option=self.current_atm_option,
            option_config=current_opt_config,
            active_orders_count=self.active_orders_count,
            cooldown_remaining_seconds=max(0, int(self.settings.COOLDOWN_SECONDS - (datetime.now(timezone.utc).timestamp() - self.risk_manager.last_trade_closed_time))) if self.risk_manager.last_trade_closed_time > 0 else 0,
            circuit_breaker_triggered=self.risk_manager.circuit_breaker_active,
            reconciliation_healthy=self.reconciler.is_healthy,
            credentials_configured=self.client.has_credentials(),
            masked_api_key=mask_credential(self.client.api_key),
            last_reconciliation_time=self.reconciler.last_reconciliation_time,
            live_balance_usd=self.live_wallet_usd,
            user_email=self.user_email,
            auto_pilot_status_detail=auto_detail
        )


_bot_service: Optional[BotService] = None


def get_bot_service() -> BotService:
    global _bot_service
    if _bot_service is None:
        _bot_service = BotService()
    return _bot_service
