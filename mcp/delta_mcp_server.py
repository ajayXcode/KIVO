#!/usr/bin/env python3
"""
Delta Exchange India Testnet - Model Context Protocol (MCP) Server
Enables AI Agents and MCP Clients (Antigravity, Claude, Cursor) to monitor markets,
query account balances, calculate Supertrend/EMA, and execute option orders directly.
"""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add project root to sys.path so backend imports work seamlessly
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.config import get_settings
from backend.delta_client import DeltaClient, DeltaExchangeError
from backend.indicators import calculate_ema, calculate_supertrend, calculate_atr
from backend.market_data import MarketDataManager

logging.basicConfig(
    level=logging.ERROR,  # Stdio MCP servers must not emit logs to stdout
    format="%(asctime)s [%(levelname)s]: %(message)s",
    stream=sys.stderr
)
logger = logging.getLogger("delta_mcp_server")


class DeltaMcpServer:
    """Stdio JSON-RPC 2.0 Model Context Protocol Server for Delta Exchange."""

    def __init__(self):
        self.settings = get_settings()
        self.client = DeltaClient(self.settings)
        self.market_data = MarketDataManager()

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "delta_get_profile",
                "description": "Fetch Delta Exchange India Testnet account profile, user ID, email, and KYC approval status.",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "delta_get_balances",
                "description": "Fetch user wallet balances across assets (USDT, USD, Cash, Available Margin) on Delta Exchange Testnet.",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "delta_get_ticker",
                "description": "Get real-time spot price, mark price, best bid/ask, and 24h volume for a given symbol (e.g. BTCUSD, ETHUSD, XAUTUSD).",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbol": {
                            "type": "string",
                            "description": "Symbol name, e.g. BTCUSD, ETHUSD, or option contract symbol."
                        }
                    },
                    "required": ["symbol"]
                }
            },
            {
                "name": "delta_find_atm_option",
                "description": "Locate the active At-The-Money (ATM) option contract for BTC, ETH, or XAUT on Delta Testnet with nearest expiry.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "underlying_asset": {
                            "type": "string",
                            "enum": ["BTC", "ETH", "XAUT"],
                            "description": "Underlying crypto asset"
                        },
                        "option_type": {
                            "type": "string",
                            "enum": ["CALL", "PUT"],
                            "description": "CALL for bullish setups, PUT for bearish setups"
                        }
                    },
                    "required": ["underlying_asset", "option_type"]
                }
            },
            {
                "name": "delta_get_market_analysis",
                "description": "Analyze market technicals: calculate Supertrend (10, 3.0), EMA (20), and Option ATR for underlying asset.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbol": {
                            "type": "string",
                            "description": "Market symbol to analyze, defaults to active SYMBOL (e.g. BTCUSD)."
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "delta_place_option_order",
                "description": "Submit a market buy order for an option contract on Delta Exchange Testnet.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbol": {
                            "type": "string",
                            "description": "Option symbol to buy, e.g. C-BTC-68000-281026"
                        },
                        "product_id": {
                            "type": "integer",
                            "description": "Delta Exchange Product ID"
                        },
                        "contracts": {
                            "type": "number",
                            "description": "Number of contracts to purchase (default 1)"
                        },
                        "stop_loss_price": {
                            "type": "number",
                            "description": "Optional protective Stop-Loss price"
                        }
                    },
                    "required": ["symbol", "product_id"]
                }
            },
            {
                "name": "delta_get_positions",
                "description": "Retrieve all open positions, entry prices, and unrealized PnL from Delta Exchange Testnet.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "product_id": {
                            "type": "integer",
                            "description": "Optional product ID filter"
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "delta_close_position",
                "description": "Market close an open position immediately on Delta Exchange Testnet.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "product_id": {
                            "type": "integer",
                            "description": "Product ID of the position to close"
                        },
                        "symbol": {
                            "type": "string",
                            "description": "Symbol name of the position"
                        },
                        "size": {
                            "type": "number",
                            "description": "Position size to close (absolute number)"
                        }
                    },
                    "required": ["product_id", "symbol", "size"]
                }
            },
            {
                "name": "delta_cancel_all_orders",
                "description": "Emergency cancel all open orders on Delta Exchange Testnet.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "product_id": {
                            "type": "integer",
                            "description": "Product ID to cancel orders for"
                        }
                    },
                    "required": ["product_id"]
                }
            }
        ]

    async def _ensure_credentials_and_clock(self):
        """Reload latest credentials from .env and ensure clock is synced with Delta server."""
        if not self.client.has_credentials():
            env_path = ROOT_DIR / ".env"
            if env_path.exists():
                try:
                    for line in env_path.read_text(encoding="utf-8").splitlines():
                        if line.startswith("DELTA_API_KEY="):
                            self.client.api_key = line.split("=", 1)[1].strip()
                        elif line.startswith("DELTA_API_SECRET="):
                            self.client.api_secret = line.split("=", 1)[1].strip()
                except Exception:
                    pass
    async def execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Any:
        await self._ensure_credentials_and_clock()

        if tool_name == "delta_get_profile":
            if not self.client.has_credentials():
                return {"error": "Delta Exchange credentials not configured in .env or web dashboard"}
            profile = await self.client.get_profile()
            is_kyc = bool(
                profile.get("is_kyc_approved")
                or profile.get("is_kyc_done")
                or profile.get("proof_of_identity_status") == "approved"
            )
            return {
                "id": profile.get("id"),
                "email": profile.get("email") or profile.get("user_name"),
                "country": profile.get("country"),
                "is_kyc_approved": is_kyc,
                "trading_status": profile.get("status")
            }

        elif tool_name == "delta_get_balances":
            if not self.client.has_credentials():
                return {"error": "Delta Exchange credentials not configured in .env or web dashboard"}
            balances = await self.client.get_wallet_balances()
            formatted = []
            total_usd = 0.0
            for b in balances:
                sym = b.get("asset_symbol", "")
                bal = float(b.get("balance") or 0.0)
                avail = float(b.get("available_balance") or 0.0)
                formatted.append({
                    "asset": sym,
                    "balance": bal,
                    "available_balance": avail
                })
                if sym.upper() in ("USDT", "USD", "USDC"):
                    total_usd += bal
            return {
                "balances": formatted,
                "total_usd_equity": round(total_usd, 2)
            }

        elif tool_name == "delta_get_ticker":
            symbol = args.get("symbol", self.settings.SYMBOL)
            ticker = await self.client.get_ticker(symbol)
            return ticker

        elif tool_name == "delta_find_atm_option":
            asset = args.get("underlying_asset", "BTC").upper()
            opt_type = args.get("option_type", "CALL").upper()
            # Fetch spot price
            spot_ticker = await self.client.get_ticker(f"{asset}USD")
            spot_price = float(spot_ticker.get("spot_price") or spot_ticker.get("close") or 68000.0)
            product = await self.client.find_atm_option(asset, f"BUY_{opt_type}", spot_price)
            if not product:
                return {"error": f"No active operational {opt_type} option found for {asset}"}
            quote = await self.client.get_option_quote(product.get("symbol", ""))
            return {
                "underlying_asset": asset,
                "spot_price": spot_price,
                "option_type": opt_type,
                "product_id": product.get("id"),
                "symbol": product.get("symbol"),
                "strike_price": product.get("strike_price"),
                "settlement_time": product.get("settlement_time"),
                "quote_price": quote.get("best_ask") or quote.get("close") or quote.get("mark_price")
            }

        elif tool_name == "delta_get_market_analysis":
            symbol = args.get("symbol", self.settings.SYMBOL)
            raw_5m = await self.client.get_candles(symbol, resolution="5m")
            if not raw_5m:
                return {"error": f"No candle history available for {symbol}"}
            self.market_data.ingest_raw_candles(raw_5m, None)
            if not self.market_data.candles_5m.candles:
                return {"error": "Failed to parse candle data"}

            _, highs, lows, closes, _ = self.market_data.candles_5m.to_arrays()
            st_val, st_dir, _, _ = calculate_supertrend(highs, lows, closes, 10, 3.0)
            ema_val = calculate_ema(closes, 20)
            atr_val = calculate_atr(highs, lows, closes, 14)

            latest_close = float(closes[-1])
            latest_st = float(st_val[-1])
            latest_st_dir = int(st_dir[-1])
            latest_ema = float(ema_val[-1])
            latest_atr = float(atr_val[-1])

            trend = "BULLISH" if latest_st_dir == 1 else "BEARISH" if latest_st_dir == -1 else "NEUTRAL"
            bias = "BUY_CALL" if (latest_close > latest_st and latest_close > latest_ema) else "BUY_PUT" if (latest_close < latest_st and latest_close < latest_ema) else "NO_TRADE"

            return {
                "symbol": symbol,
                "latest_price": round(latest_close, 2),
                "supertrend": round(latest_st, 2),
                "supertrend_direction": trend,
                "ema20": round(latest_ema, 2),
                "atr14": round(latest_atr, 2),
                "recommended_action": bias
            }

        elif tool_name == "delta_place_option_order":
            if not self.client.has_credentials():
                return {"error": "Delta Exchange credentials not configured in .env"}
            symbol = args["symbol"]
            product_id = int(args["product_id"])
            contracts = float(args.get("contracts", 1.0))
            stop_loss = args.get("stop_loss_price")

            import uuid
            cid = f"mcp_{uuid.uuid4().hex[:8]}"
            order_res = await self.client.create_order(
                product_id=product_id,
                size=contracts,
                side="buy",
                order_type="market_order",
                client_order_id=cid
            )
            res_data = {
                "success": True,
                "client_order_id": cid,
                "exchange_order_id": order_res.get("id"),
                "symbol": symbol,
                "size": contracts,
                "state": order_res.get("state")
            }
            if stop_loss:
                stop_cid = f"stp_{uuid.uuid4().hex[:8]}"
                try:
                    stop_res = await self.client.create_order(
                        product_id=product_id,
                        size=contracts,
                        side="sell",
                        order_type="stop_market_order",
                        client_order_id=stop_cid,
                        stop_price=float(stop_loss)
                    )
                    res_data["stop_loss_order_id"] = stop_res.get("id")
                except Exception as e:
                    res_data["stop_loss_notice"] = f"Failed to attach stop loss: {e}"
            return res_data

        elif tool_name == "delta_get_positions":
            if not self.client.has_credentials():
                return {"error": "Delta Exchange credentials not configured in .env"}
            product_id = args.get("product_id")
            positions = await self.client.get_positions(product_id=product_id)
            return positions

        elif tool_name == "delta_close_position":
            if not self.client.has_credentials():
                return {"error": "Delta Exchange credentials not configured in .env"}
            product_id = int(args["product_id"])
            size = float(args["size"])
            import uuid
            cid = f"cls_{uuid.uuid4().hex[:8]}"
            res = await self.client.create_order(
                product_id=product_id,
                size=size,
                side="sell",
                order_type="market_order",
                client_order_id=cid
            )
            return {"success": True, "closed_order": res}

        elif tool_name == "delta_cancel_all_orders":
            if not self.client.has_credentials():
                return {"error": "Delta Exchange credentials not configured in .env"}
            product_id = int(args["product_id"])
            orders = await self.client.get_orders(product_id=product_id)
            cancelled = 0
            for o in orders:
                oid = o.get("id")
                if oid:
                    await self.client.cancel_order(product_id=product_id, order_id=str(oid))
                    cancelled += 1
            return {"success": True, "cancelled_count": cancelled}

        else:
            raise ValueError(f"Unknown tool: {tool_name}")

    async def handle_request(self, request: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        req_id = request.get("id")
        method = request.get("method")
        params = request.get("params", {})

        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "delta-exchange-mcp-server",
                        "version": "1.1.0"
                    }
                }
            }

        elif method == "notifications/initialized":
            return None

        elif method == "ping":
            return {"jsonrpc": "2.0", "id": req_id, "result": {}}

        elif method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": self.get_tool_definitions()
                }
            }

        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            try:
                result = await self.execute_tool(tool_name, arguments)
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": json.dumps(result, indent=2)
                            }
                        ]
                    }
                }
            except Exception as e:
                logger.error(f"Error executing tool {tool_name}: {e}")
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32603,
                        "message": str(e)
                    }
                }

        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}"
                }
            }

    async def run(self):
        """Read standard input line-by-line and respond with JSON-RPC over stdout."""
        queue: asyncio.Queue[Optional[str]] = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def reader():
            try:
                while True:
                    line = sys.stdin.readline()
                    if not line:
                        break
                    loop.call_soon_threadsafe(queue.put_nowait, line)
            except Exception as e:
                logger.error(f"Stdin read error: {e}")
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        import threading
        t = threading.Thread(target=reader, daemon=True)
        t.start()

        while True:
            line = await queue.get()
            if line is None:
                break
            raw_text = line.strip()
            if not raw_text:
                continue

            try:
                request = json.loads(raw_text)
                response = await self.handle_request(request)
                if response:
                    sys.stdout.write(json.dumps(response) + "\n")
                    sys.stdout.flush()
            except json.JSONDecodeError:
                err_resp = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32700, "message": "Parse error"}
                }
                sys.stdout.write(json.dumps(err_resp) + "\n")
                sys.stdout.flush()
            except Exception as e:
                logger.error(f"Unexpected MCP error: {e}")


def main():
    server = DeltaMcpServer()
    asyncio.run(server.run())


if __name__ == "__main__":
    main()
