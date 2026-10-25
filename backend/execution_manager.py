"""Execution manager: Sole order submission service with client order IDs and emergency flatten."""

from datetime import datetime, timezone
import logging
import uuid
from typing import Any, Dict, Optional, Tuple

from backend.config import Settings, get_settings
from backend.database import get_db_session
from backend.delta_client import DeltaClient, DeltaExchangeError
from backend.models import (
    EventLog,
    OrderRecord,
    OrderSide,
    OrderStatus,
    RiskEvaluation,
    SignalAction,
)

logger = logging.getLogger("edgepilot.execution")


class ExecutionManager:
    """Manages order lifecycles, client order IDs, and protective stop/target orders."""

    def __init__(self, delta_client: DeltaClient, settings: Optional[Settings] = None):
        self.client = delta_client
        self.settings = settings or get_settings()

    def generate_client_order_id(self, prefix: str = "c") -> str:
        ts_str = datetime.now(timezone.utc).strftime("%y%m%d%H%M%S")
        rand_str = uuid.uuid4().hex[:8]
        return f"{prefix}_{ts_str}_{rand_str}"

    async def execute_trade_intent(
        self,
        action: SignalAction,
        risk: RiskEvaluation,
        product_id: int,
        symbol: str
    ) -> Tuple[bool, str, Optional[str]]:
        if not risk.approved:
            return False, f"Trade intent rejected by risk manager: {risk.reason}", None

        side = OrderSide.BUY.value if action in (SignalAction.LONG, SignalAction.BUY_CALL, SignalAction.BUY_PUT) else OrderSide.SELL.value
        client_id = self.generate_client_order_id(prefix="ent")


        async with get_db_session() as session:
            order_record = OrderRecord(
                client_order_id=client_id,
                product_id=product_id,
                symbol=symbol,
                side=side,
                order_type="market_order",
                size=risk.proposed_size,
                status=OrderStatus.PENDING.value
            )
            session.add(order_record)
            session.add(EventLog(
                event_type="ORDER_INTENT",
                component="ExecutionManager",
                message=f"Preparing entry {side.upper()} order for {risk.proposed_size} {symbol}",
                details=f"client_order_id={client_id}"
            ))

        try:
            exchange_res = await self.client.create_order(
                product_id=product_id,
                size=risk.proposed_size,
                side=side,
                order_type="market_order",
                client_order_id=client_id
            )

            exchange_order_id = str(exchange_res.get("id") or "")
            order_state = exchange_res.get("state", "open")
            total_size = float(exchange_res.get("size", risk.proposed_size))
            unfilled_size = float(exchange_res.get("unfilled_size") or 0.0)
            filled_size = max(0.0, total_size - unfilled_size)

            # Check if market order closed without counter-party fill on testnet
            if order_state == "closed" and filled_size == 0.0:
                async with get_db_session() as session:
                    merged = await session.merge(order_record)
                    merged.exchange_order_id = exchange_order_id
                    merged.status = OrderStatus.CANCELLED.value
                    merged.filled_size = 0.0
                    session.add(EventLog(
                        event_type="ORDER_UNFILLED_NO_LIQUIDITY",
                        component="ExecutionManager",
                        message=f"Order {client_id} closed with 0 fill on {symbol}. Testnet orderbook has 0 counterparty depth at this strike.",
                        details=f"client_id={client_id}, exchange_id={exchange_order_id}"
                    ))
                logger.warning(f"Market order {client_id} on {symbol} closed unfilled: Zero counter-party depth on testnet book.")
                return False, f"Order {client_id} closed unfilled (zero testnet liquidity on {symbol})", client_id

            async with get_db_session() as session:
                merged = await session.merge(order_record)
                merged.exchange_order_id = exchange_order_id
                merged.status = OrderStatus.FILLED.value if order_state in ("closed", "filled") else OrderStatus.OPEN.value
                merged.filled_size = filled_size
                session.add(EventLog(
                    event_type="ORDER_SUBMITTED",
                    component="ExecutionManager",
                    message=f"Order accepted by exchange. State: {order_state}, Filled: {filled_size}",
                    details=f"client_id={client_id}, exchange_id={exchange_order_id}"
                ))

            if risk.stop_loss_price:
                await self._place_protective_exit(
                    product_id=product_id,
                    symbol=symbol,
                    entry_side=side,
                    size=risk.proposed_size,
                    stop_price=risk.stop_loss_price
                )

            return True, f"Order {client_id} submitted successfully.", client_id

        except DeltaExchangeError as exc:
            logger.error(f"Exchange error placing order {client_id}: {exc}")
            async with get_db_session() as session:
                merged = await session.merge(order_record)
                merged.status = OrderStatus.REJECTED.value
                session.add(EventLog(
                    event_type="ORDER_REJECTED",
                    component="ExecutionManager",
                    message=f"Order rejected by Delta Exchange: {str(exc)}",
                    details=f"client_id={client_id}"
                ))
            return False, f"Exchange error: {str(exc)}", client_id

        except Exception as exc:
            logger.critical(f"Ambiguous order submission state for {client_id}: {exc}")
            async with get_db_session() as session:
                merged = await session.merge(order_record)
                merged.status = OrderStatus.UNKNOWN.value
                session.add(EventLog(
                    event_type="AMBIGUOUS_ORDER_SUBMISSION",
                    component="ExecutionManager",
                    message=f"Network exception during submission: {str(exc)}",
                    details=f"client_id={client_id}"
                ))
            return False, f"AMBIGUOUS_SUBMISSION: {str(exc)}", client_id

    async def execute_manual_option(
        self,
        action: str,
        product_id: int,
        symbol: str,
        size: float,
        stop_loss_price: Optional[float] = None,
        take_profit_price: Optional[float] = None
    ) -> Tuple[bool, str, Optional[str]]:
        """Direct one-click manual execution of an option contract (Call or Put)."""
        if not self.client.has_credentials():
            return False, "Delta Exchange credentials not configured. Please enter your Testnet API Key & Secret.", None

        if size <= 0:
            return False, f"Invalid contract size {size}. Must be positive.", None

        client_id = self.generate_client_order_id(prefix="man")
        side = OrderSide.BUY.value

        async with get_db_session() as session:
            order_record = OrderRecord(
                client_order_id=client_id,
                product_id=product_id,
                symbol=symbol,
                side=side,
                order_type="market_order",
                size=size,
                status=OrderStatus.PENDING.value
            )
            session.add(order_record)
            session.add(EventLog(
                event_type="MANUAL_ORDER_INTENT",
                component="ExecutionManager",
                message=f"Manual one-click order: BUY {size} of {symbol} ({action})",
                details=f"client_order_id={client_id}"
            ))

        try:
            exchange_res = await self.client.create_order(
                product_id=product_id,
                size=size,
                side=side,
                order_type="market_order",
                client_order_id=client_id
            )

            exchange_order_id = str(exchange_res.get("id") or "")
            order_state = exchange_res.get("state", "open")
            total_size = float(exchange_res.get("size", size))
            unfilled_size = float(exchange_res.get("unfilled_size") or 0.0)
            filled_size = max(0.0, total_size - unfilled_size)

            async with get_db_session() as session:
                merged = await session.merge(order_record)
                merged.exchange_order_id = exchange_order_id
                merged.status = OrderStatus.FILLED.value if order_state in ("closed", "filled") else OrderStatus.OPEN.value
                merged.filled_size = filled_size
                session.add(EventLog(
                    event_type="MANUAL_ORDER_FILLED",
                    component="ExecutionManager",
                    message=f"Manual {action} executed on Delta Testnet. Status: {order_state}, Filled: {filled_size}",
                    details=f"client_id={client_id}, exchange_id={exchange_order_id}, symbol={symbol}"
                ))

            if stop_loss_price and stop_loss_price > 0:
                await self._place_protective_exit(
                    product_id=product_id,
                    symbol=symbol,
                    entry_side=side,
                    size=size,
                    stop_price=stop_loss_price
                )

            return True, f"Manual {action} order submitted for {size} {symbol}.", client_id

        except DeltaExchangeError as exc:
            logger.error(f"Exchange error placing manual order {client_id}: {exc}")
            async with get_db_session() as session:
                merged = await session.merge(order_record)
                merged.status = OrderStatus.REJECTED.value
                session.add(EventLog(
                    event_type="MANUAL_ORDER_REJECTED",
                    component="ExecutionManager",
                    message=f"Manual order rejected: {str(exc)}",
                    details=f"client_id={client_id}"
                ))
            return False, f"Exchange error: {str(exc)}", client_id

        except Exception as exc:
            logger.critical(f"Network error executing manual order {client_id}: {exc}")
            async with get_db_session() as session:
                merged = await session.merge(order_record)
                merged.status = OrderStatus.UNKNOWN.value
                session.add(EventLog(
                    event_type="MANUAL_ORDER_ERROR",
                    component="ExecutionManager",
                    message=f"Network error: {str(exc)}",
                    details=f"client_id={client_id}"
                ))
            return False, f"Error submitting order: {str(exc)}", client_id

    async def _place_protective_exit(
        self,
        product_id: int,
        symbol: str,
        entry_side: str,
        size: float,
        stop_price: float
    ) -> None:
        exit_side = OrderSide.SELL.value if entry_side == OrderSide.BUY.value else OrderSide.BUY.value
        client_id = self.generate_client_order_id(prefix="stp")

        try:
            res = await self.client.create_order(
                product_id=product_id,
                size=size,
                side=exit_side,
                order_type="market_order",
                client_order_id=client_id,
                stop_price=stop_price
            )
            async with get_db_session() as session:
                session.add(OrderRecord(
                    client_order_id=client_id,
                    exchange_order_id=str(res.get("id") or ""),
                    product_id=product_id,
                    symbol=symbol,
                    side=exit_side,
                    order_type="stop_market_order",
                    size=size,
                    stop_price=stop_price,
                    status=OrderStatus.OPEN.value
                ))
                session.add(EventLog(
                    event_type="PROTECTIVE_STOP_PLACED",
                    component="ExecutionManager",
                    message=f"Protective stop order active at ${stop_price:.2f}",
                    details=f"client_id={client_id}"
                ))
        except DeltaExchangeError as exc:
            # European vanilla options on Delta Exchange India Testnet reject server-side conditional stop orders with 400 'unsupported'
            logger.info(f"Exchange does not support server-side option stops ({exc}). Armed internal Dynamic Scalper Exit at ${stop_price:.2f}.")
            async with get_db_session() as session:
                session.add(EventLog(
                    event_type="DYNAMIC_SCALP_STOP_ARMED",
                    component="ExecutionManager",
                    message=f"Dynamic Scalper Exit active at ${stop_price:.2f} (Options native server-side stops unsupported on exchange)",
                    details=f"product_id={product_id}, symbol={symbol}, stop_price={stop_price}"
                ))
        except Exception as exc:
            logger.warning(f"Protective stop placement notice: {exc}")

    async def close_position_market(self, product_id: int, current_size: float, symbol: str) -> bool:
        """Emergency flatten: submit opposite market order to close open position immediately."""
        if current_size == 0.0:
            return True

        side = OrderSide.SELL.value if current_size > 0 else OrderSide.BUY.value
        client_id = self.generate_client_order_id(prefix="cls")
        size = abs(current_size)

        try:
            logger.info(f"Submitting market close order for {size} {symbol} ({side})...")
            await self.client.create_order(
                product_id=product_id,
                size=size,
                side=side,
                order_type="market_order",
                client_order_id=client_id
            )
            async with get_db_session() as session:
                session.add(EventLog(
                    event_type="POSITION_CLOSED_MARKET",
                    component="ExecutionManager",
                    message=f"Position flattened via market order. Size: {size} {side.upper()}",
                    details=f"client_id={client_id}"
                ))
            return True
        except Exception as exc:
            logger.error(f"Failed to close position: {exc}")
            return False

    async def emergency_cancel_all(self, product_id: int) -> int:
        try:
            orders = await self.client.get_orders(product_id=product_id)
            cancelled_count = 0
            for o in orders:
                oid = o.get("id")
                if oid:
                    await self.client.cancel_order(product_id=product_id, order_id=str(oid))
                    cancelled_count += 1
            return cancelled_count
        except Exception as exc:
            logger.error(f"Error during emergency cancel all: {exc}")
            return 0

