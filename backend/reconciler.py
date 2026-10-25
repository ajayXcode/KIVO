"""Reconciliation service ensuring local state mirrors exchange authoritative state."""

from datetime import datetime, timezone
import logging
from typing import Dict, List, Optional, Tuple
from sqlalchemy import select

from backend.config import Settings, get_settings
from backend.database import get_db_session
from backend.delta_client import DeltaClient
from backend.models import EventLog, OrderRecord, OrderStatus, PositionRecord

logger = logging.getLogger("edgepilot.reconciler")


class Reconciler:
    """Synchronizes exchange authoritative orders and positions with local storage."""

    def __init__(self, delta_client: DeltaClient, settings: Optional[Settings] = None):
        self.client = delta_client
        self.settings = settings or get_settings()
        self.last_reconciliation_time: Optional[datetime] = None
        self.is_healthy: bool = True

    async def reconcile(self, product_id: int, symbol: str) -> Tuple[bool, float, float]:
        if not self.client.has_credentials():
            # If credentials are not set, cannot query private positions
            return True, 0.0, 0.0

        try:
            raw_pos = await self.client.get_positions(product_id=product_id)
            positions = [raw_pos] if isinstance(raw_pos, dict) else raw_pos if isinstance(raw_pos, list) else []

            matched_pos = None
            for p in positions:
                if isinstance(p, dict) and (p.get("product_id") == product_id or p.get("product_symbol") == symbol):
                    matched_pos = p
                    break

            exchange_size = 0.0
            entry_price = 0.0
            unrealized_pnl = 0.0
            realized_pnl = 0.0

            if matched_pos:
                exchange_size = float(matched_pos.get("size") or 0.0)
                entry_price = float(matched_pos.get("entry_price") or 0.0)
                unrealized_pnl = float(matched_pos.get("unrealized_pnl") or 0.0)
                realized_pnl = float(matched_pos.get("realized_pnl") or 0.0)

            async with get_db_session() as session:
                stmt = select(PositionRecord).where(PositionRecord.product_id == product_id)
                res = await session.execute(stmt)
                db_pos = res.scalar_one_or_none()

                if not db_pos:
                    db_pos = PositionRecord(
                        product_id=product_id,
                        symbol=symbol,
                        size=exchange_size,
                        entry_price=entry_price,
                        unrealized_pnl=unrealized_pnl,
                        realized_pnl=realized_pnl
                    )
                    session.add(db_pos)
                else:
                    if abs(db_pos.size - exchange_size) > 0.0001:
                        session.add(EventLog(
                            event_type="POSITION_MISMATCH_RECONCILED",
                            component="Reconciler",
                            message=f"Reconciled position from {db_pos.size} to {exchange_size}",
                            details=f"product_id={product_id}"
                        ))
                    db_pos.size = exchange_size
                    db_pos.entry_price = entry_price
                    db_pos.unrealized_pnl = unrealized_pnl
                    db_pos.realized_pnl = realized_pnl

            # Check open orders
            exchange_orders = await self.client.get_orders(product_id=product_id)
            active_exchange_order_ids = {str(o.get("id")) for o in exchange_orders if o.get("id")}

            async with get_db_session() as session:
                stmt = select(OrderRecord).where(
                    OrderRecord.product_id == product_id,
                    OrderRecord.status.in_([OrderStatus.PENDING.value, OrderStatus.OPEN.value])
                )
                res = await session.execute(stmt)
                open_db_orders = res.scalars().all()

                for db_order in open_db_orders:
                    if db_order.exchange_order_id and db_order.exchange_order_id not in active_exchange_order_ids:
                        db_order.status = OrderStatus.FILLED.value

            self.last_reconciliation_time = datetime.now(timezone.utc)
            self.is_healthy = True
            return True, exchange_size, unrealized_pnl

        except Exception as exc:
            self.is_healthy = False
            logger.error(f"Reconciliation notice: {exc}")
            return False, 0.0, 0.0

