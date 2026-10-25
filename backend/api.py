"""FastAPI application providing health, metrics, dynamic credentials, scanner, and controls."""

import asyncio
from contextlib import asynccontextmanager
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc, select

from backend.bot_service import get_bot_service
from backend.config import get_settings
from backend.database import get_db_session, init_db
from backend.models import (
    ApiScannerResult,
    AutomationPayload,
    BotState,
    BotStatusResponse,
    ControlRequest,
    CredentialsPayload,
    CredentialsStatus,
    EventLog,
    OptionConfigPayload,
    OrderRecord,
    PositionRecord,
    QuickOrderPayload,
    QuickOrderResponse,
    SessionResetResponse,
    SignalRecord,
    SymbolSwitchPayload,
    UserProfileResponse,
    WatchlistItem,
)


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite Database schema immediately
    await init_db()

    # 2. Run bot initialization in background so Uvicorn immediately binds port and serves UI
    if os.environ.get("TESTING") != "1":
        service = get_bot_service()
        async def _run_bg():
            try:
                await service.initialize()
                await service.start()
            except Exception as e:
                import logging
                logging.getLogger("edgepilot.api").error(f"Background bot startup notice: {e}")
        asyncio.create_task(_run_bg())

    yield

    if os.environ.get("TESTING") != "1":
        service = get_bot_service()
        await service.stop()


app = FastAPI(
    title="EdgePilot Delta Testnet Trading Bot API",
    version="1.1.0",
    description="Automated algorithmic trading bot for Delta Exchange India Testnet",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


# ==============================================================================
# Health Checks
# ==============================================================================

@app.get("/api/health/live")
async def health_live() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health/ready")
async def health_ready() -> Dict[str, Any]:
    service = get_bot_service()
    is_ready = service.state_machine.current_state in (BotState.READY, BotState.RUNNING, BotState.PAUSED)
    return {
        "ready": is_ready,
        "state": service.state_machine.current_state.value,
        "reconciliation_healthy": service.reconciler.is_healthy,
        "environment": service.settings.ENVIRONMENT.value
    }


# ==============================================================================
# Dynamic Credentials (Frontend Direct Key Management)
# ==============================================================================

@app.get("/api/config/credentials", response_model=CredentialsStatus)
async def get_credentials() -> CredentialsStatus:
    service = get_bot_service()
    return service.get_credentials_status()


@app.post("/api/config/credentials")
async def set_credentials(payload: CredentialsPayload) -> Dict[str, Any]:
    """Dynamically set Delta API credentials from frontend without modifying backend files."""
    service = get_bot_service()
    service.set_credentials(payload.api_key, payload.api_secret)
    # Attempt immediate reconciliation with new keys
    await service.reconciler.reconcile(service.settings.PRODUCT_ID, service.settings.SYMBOL)
    return {
        "success": True,
        "status": service.get_credentials_status().model_dump(),
        "message": "Delta Exchange credentials updated successfully for current session."
    }


@app.delete("/api/config/credentials")
async def clear_credentials() -> Dict[str, Any]:
    """Clear credentials from active session."""
    service = get_bot_service()
    service.clear_credentials()
    return {"success": True, "message": "Credentials cleared from active session."}


# ==============================================================================
# Delta Profile & Live Wallet Balances
# ==============================================================================

@app.get("/api/profile", response_model=UserProfileResponse)
async def get_profile() -> UserProfileResponse:
    """Fetch user profile, account id, and wallet balances directly from Delta Exchange."""
    service = get_bot_service()
    data = await service.fetch_profile_and_balances()
    return UserProfileResponse(
        configured=data.get("configured", False),
        email=data.get("email"),
        account_id=data.get("account_id"),
        country=data.get("country"),
        is_kyc_approved=data.get("is_kyc_approved", False),
        profile=data.get("profile"),
        balances=data.get("balances", []),
        total_balance_usd=data.get("total_balance_usd", 0.0)
    )


# ==============================================================================
# Watchlist & Multi-Symbol Scanning
# ==============================================================================

@app.get("/api/watchlist", response_model=List[WatchlistItem])
async def get_watchlist() -> List[WatchlistItem]:
    service = get_bot_service()
    return await service.get_watchlist()


@app.post("/api/config/symbol")
async def switch_symbol(payload: SymbolSwitchPayload) -> Dict[str, Any]:
    service = get_bot_service()
    success = await service.switch_symbol(payload.symbol)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to switch to {payload.symbol}. Verify symbol exists on Delta Testnet."
        )
    return {"success": True, "active_symbol": service.settings.SYMBOL, "product_id": service.settings.PRODUCT_ID}


# ==============================================================================
# API Connection Scanner
# ==============================================================================

@app.get("/api/scanner/connectivity", response_model=ApiScannerResult)
async def scan_connectivity() -> ApiScannerResult:
    service = get_bot_service()
    return await service.scan_connectivity()


# ==============================================================================
# Automation Control
# ==============================================================================

@app.post("/api/config/automation")
async def configure_automation(payload: AutomationPayload) -> Dict[str, Any]:
    service = get_bot_service()
    service.set_automation_mode(payload.enabled)
    if payload.scan_interval_seconds:
        service.settings.SCAN_INTERVAL_SECONDS = max(2, payload.scan_interval_seconds)
    return {
        "success": True,
        "automation_mode": service.automation_mode.value,
        "scan_interval_seconds": service.settings.SCAN_INTERVAL_SECONDS
    }


# ==============================================================================
# Operational & Reporting Endpoints
# ==============================================================================

@app.get("/api/overview", response_model=BotStatusResponse)
async def get_overview() -> BotStatusResponse:
    service = get_bot_service()
    return service.get_status()


@app.get("/api/chart")
async def get_chart_data() -> List[Dict[str, Any]]:
    """Return historical 5m candle chart data with technical overlays."""
    service = get_bot_service()
    return service.get_chart_data()


@app.get("/api/signals")
async def get_signals(limit: int = 50) -> List[Dict[str, Any]]:
    async with get_db_session() as session:
        stmt = select(SignalRecord).order_by(desc(SignalRecord.timestamp)).limit(limit)
        res = await session.execute(stmt)
        records = res.scalars().all()
        return [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat(),
                "symbol": r.symbol,
                "action": r.action,
                "price": r.price,
                "reason": r.reason
            }
            for r in records
        ]


@app.get("/api/orders")
async def get_orders(limit: int = 50) -> List[Dict[str, Any]]:
    async with get_db_session() as session:
        stmt = select(OrderRecord).order_by(desc(OrderRecord.created_at)).limit(limit)
        res = await session.execute(stmt)
        records = res.scalars().all()
        return [
            {
                "id": r.id,
                "client_order_id": r.client_order_id,
                "exchange_order_id": r.exchange_order_id,
                "symbol": r.symbol,
                "side": r.side,
                "order_type": r.order_type,
                "size": r.size,
                "limit_price": r.limit_price,
                "stop_price": r.stop_price,
                "status": r.status,
                "filled_size": r.filled_size,
                "created_at": r.created_at.isoformat()
            }
            for r in records
        ]


@app.get("/api/positions")
async def get_positions() -> List[Dict[str, Any]]:
    async with get_db_session() as session:
        stmt = select(PositionRecord)
        res = await session.execute(stmt)
        records = res.scalars().all()
        return [
            {
                "product_id": r.product_id,
                "symbol": r.symbol,
                "size": r.size,
                "entry_price": r.entry_price,
                "unrealized_pnl": r.unrealized_pnl,
                "realized_pnl": r.realized_pnl,
                "updated_at": r.updated_at.isoformat()
            }
            for r in records
        ]


@app.get("/api/events")
async def get_events(limit: int = 100) -> List[Dict[str, Any]]:
    async with get_db_session() as session:
        stmt = select(EventLog).order_by(desc(EventLog.timestamp)).limit(limit)
        res = await session.execute(stmt)
        records = res.scalars().all()
        return [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat(),
                "event_type": r.event_type,
                "component": r.component,
                "message": r.message,
                "details": r.details
            }
            for r in records
        ]


# ==============================================================================
# Operator Control Endpoints
# ==============================================================================

@app.post("/api/control/pause")
async def control_pause(req: ControlRequest) -> Dict[str, Any]:
    service = get_bot_service()
    success = service.state_machine.pause(req.reason or "Operator paused bot")
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition to PAUSED from {service.state_machine.current_state.value}"
        )
    return {"success": True, "state": service.state_machine.current_state.value}


@app.post("/api/control/resume")
async def control_resume(req: ControlRequest) -> Dict[str, Any]:
    service = get_bot_service()
    if service.risk_manager.circuit_breaker_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot resume: Daily loss circuit breaker is active!"
        )
    success = service.state_machine.resume(req.reason or "Operator resumed bot")
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition to RUNNING from {service.state_machine.current_state.value}"
        )
    return {"success": True, "state": service.state_machine.current_state.value}


@app.post("/api/control/kill")
async def control_kill(req: ControlRequest) -> Dict[str, Any]:
    service = get_bot_service()
    service.state_machine.halt(req.reason or "EMERGENCY KILL SWITCH")
    cancelled_orders = await service.execution.emergency_cancel_all(service.settings.PRODUCT_ID)
    return {
        "success": True,
        "state": service.state_machine.current_state.value,
        "cancelled_orders": cancelled_orders
    }


@app.post("/api/control/close-position")
async def control_close_position() -> Dict[str, Any]:
    """Operator Emergency Action: Market close active position and cancel pending orders."""
    service = get_bot_service()
    cancelled = await service.execution.emergency_cancel_all(service.settings.PRODUCT_ID)
    flattened = await service.flatten_position(reason="Operator requested position close")
    # Reconcile immediately
    _, size, upnl = await service.reconciler.reconcile(service.settings.PRODUCT_ID, service.settings.SYMBOL)
    service.current_position_size = size
    service.unrealized_pnl = upnl
    return {
        "success": flattened,
        "orders_cancelled": cancelled,
        "current_position_size": size
    }


@app.post("/api/control/option-config")
async def control_option_config(req: OptionConfigPayload) -> Dict[str, Any]:
    """Configure Option Buying parameters: BTC/ETH/XAUT, Supertrend, EMA, and Option ATR brackets."""
    service = get_bot_service()
    await service.update_option_config(req)
    return {"success": True, "config": req.model_dump()}


@app.post("/api/control/switch-asset")
async def control_switch_asset(req: SymbolSwitchPayload) -> Dict[str, Any]:
    """Switch active underlying asset (BTC, ETH, XAUT)."""
    service = get_bot_service()
    success = await service.switch_underlying_asset(req.symbol)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset {req.symbol} could not be selected on Delta Exchange Testnet."
        )
    return {"success": True, "underlying_asset": service.settings.UNDERLYING_ASSET, "symbol": service.settings.SYMBOL}


@app.post("/api/control/clear-session", response_model=SessionResetResponse)
async def control_clear_session() -> SessionResetResponse:
    """Safety feature: Stop and close tracked option positions, clear session data for a fresh start."""
    service = get_bot_service()
    return await service.clear_session()


@app.post("/api/control/reconcile")
async def control_reconcile() -> Dict[str, Any]:
    service = get_bot_service()
    success, size, upnl = await service.reconciler.reconcile(
        service.settings.PRODUCT_ID,
        service.settings.SYMBOL
    )
    service.current_position_size = size
    service.unrealized_pnl = upnl
    return {
        "success": success,
        "reconciled_position_size": size,
        "unrealized_pnl": upnl
    }


@app.post("/api/control/buy-option", response_model=QuickOrderResponse)
async def control_buy_option(payload: QuickOrderPayload) -> QuickOrderResponse:
    """Instant one-click manual execution of an ATM Call or Put option."""
    service = get_bot_service()
    res = await service.execute_manual_option_buy(
        action=payload.action,
        symbol=payload.symbol,
        product_id=payload.product_id,
        contracts=payload.contracts,
        with_protection=payload.with_protection
    )
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("message", "Order execution failed.")
        )
    return QuickOrderResponse(
        success=True,
        message=res.get("message", ""),
        client_order_id=res.get("client_order_id"),
        symbol=res.get("symbol"),
        product_id=res.get("product_id"),
        action=res.get("action", payload.action),
        size=res.get("size", 1.0)
    )



# ==============================================================================
# Static Dashboard Files Mount
# ==============================================================================

dashboard_dist = Path(__file__).resolve().parent.parent / "dashboard" / "dist"
if dashboard_dist.exists():
    app.mount("/", StaticFiles(directory=str(dashboard_dist), html=True), name="dashboard")

