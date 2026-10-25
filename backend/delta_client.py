"""Async REST client for Delta Exchange India Testnet."""

import json
import logging
import time
from typing import Any, Dict, List, Optional
import httpx

from backend.config import Settings, get_settings
from backend.security import generate_delta_signature, get_current_timestamp_seconds

logger = logging.getLogger("edgepilot.delta_client")


class DeltaExchangeError(Exception):
    """Custom exception for Delta Exchange API errors."""
    def __init__(self, message: str, status_code: Optional[int] = None, error_code: Optional[str] = None):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code


class DeltaClient:
    """Async client interacting with Delta Exchange India Testnet."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self.base_url = self.settings.DELTA_REST_URL.rstrip("/")
        self.api_key = self.settings.DELTA_API_KEY
        self.api_secret = self.settings.DELTA_API_SECRET
        self.timeout = httpx.Timeout(10.0, connect=5.0)
        self.server_time_offset: int = 0

    async def sync_clock(self) -> int:
        """Synchronize clock offset with Delta server. Relies on NTP local time and self-heals on expired_signature."""
        return self.server_time_offset

    def set_credentials(self, api_key: str, api_secret: str, persist: bool = True) -> None:
        """Dynamically update API credentials with local .env persistence."""
        self.api_key = api_key.strip()
        self.api_secret = api_secret.strip()
        self.settings.DELTA_API_KEY = self.api_key
        self.settings.DELTA_API_SECRET = self.api_secret

        if persist and self.api_key and self.api_secret and os.environ.get("TESTING") != "1":
            try:
                from pathlib import Path
                import re
                env_path = Path(__file__).resolve().parent.parent / ".env"
                content = env_path.read_text(encoding="utf-8") if env_path.exists() else ""
                
                if re.search(r"^DELTA_API_KEY=.*$", content, re.MULTILINE):
                    content = re.sub(r"^DELTA_API_KEY=.*$", f"DELTA_API_KEY={self.api_key}", content, flags=re.MULTILINE)
                else:
                    content += f"\nDELTA_API_KEY={self.api_key}"
                
                if re.search(r"^DELTA_API_SECRET=.*$", content, re.MULTILINE):
                    content = re.sub(r"^DELTA_API_SECRET=.*$", f"DELTA_API_SECRET={self.api_secret}", content, flags=re.MULTILINE)
                else:
                    content += f"\nDELTA_API_SECRET={self.api_secret}"
                
                env_path.write_text(content.strip() + "\n", encoding="utf-8")
                logger.info("Persisted API credentials to local .env.")
            except Exception as e:
                logger.warning(f"Notice: Could not write credentials to .env: {e}")

    def clear_credentials(self, persist: bool = False) -> None:
        """Clear active session credentials."""
        self.api_key = ""
        self.api_secret = ""
        self.settings.DELTA_API_KEY = ""
        self.settings.DELTA_API_SECRET = ""
        if persist and os.environ.get("TESTING") != "1":
            try:
                from pathlib import Path
                import re
                env_path = Path(__file__).resolve().parent.parent / ".env"
                if env_path.exists():
                    content = env_path.read_text(encoding="utf-8")
                    content = re.sub(r"^DELTA_API_KEY=.*$", "DELTA_API_KEY=", content, flags=re.MULTILINE)
                    content = re.sub(r"^DELTA_API_SECRET=.*$", "DELTA_API_SECRET=", content, flags=re.MULTILINE)
                    env_path.write_text(content.strip() + "\n", encoding="utf-8")
            except Exception:
                pass

    def has_credentials(self) -> bool:
        return bool(self.api_key and self.api_secret)

    def _get_auth_headers(
        self,
        method: str,
        path: str,
        query_string: str = "",
        body_str: str = ""
    ) -> Dict[str, str]:
        """Generate mandatory authentication headers synchronized with Delta server time."""
        if not self.has_credentials():
            raise DeltaExchangeError("Credentials not configured. Please enter your Delta Testnet API Key & Secret in the Dashboard.", status_code=401)

        # Synchronize timestamp with Delta Exchange server time
        timestamp = str(int(time.time() + self.server_time_offset))
        signature = generate_delta_signature(
            secret=self.api_secret,
            method=method,
            timestamp=timestamp,
            path=path,
            query_string=query_string,
            body=body_str
        )
        return {
            "api-key": self.api_key,
            "signature": signature,
            "timestamp": timestamp,
            "User-Agent": "EdgePilot-Delta-Bot/1.1",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        authenticated: bool = True
    ) -> Dict[str, Any]:
        """Execute HTTP request with appropriate signing and error handling."""
        query_str = ""
        if params:
            query_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()))

        full_url = f"{self.base_url}{path}?{query_str}" if query_str else f"{self.base_url}{path}"
        body_str = json.dumps(json_data, separators=(',', ':')) if json_data else ""

        headers = {
            "User-Agent": "EdgePilot-Delta-Bot/1.1",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        if authenticated:
            auth_headers = self._get_auth_headers(
                method=method,
                path=path,
                query_string=query_str,
                body_str=body_str
            )
            headers.update(auth_headers)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(
                    method=method,
                    url=full_url,
                    content=body_str if body_str else None,
                    headers=headers
                )
            except httpx.RequestError as exc:
                logger.error(f"Network error during {method} {path}: {type(exc).__name__}")
                raise DeltaExchangeError(f"Network error communicating with Delta Exchange: {type(exc).__name__}")

            if response.status_code == 401:
                # Check if Delta returned expired_signature with authoritative server_time
                try:
                    err_json = response.json()
                    err_obj = err_json.get("error", {})
                    if err_obj.get("code") == "expired_signature":
                        server_time = err_obj.get("context", {}).get("server_time")
                        if server_time:
                            self.server_time_offset = int(server_time) - int(time.time())
                            logger.info(f"Calibrated clock from Delta Exchange error context: offset={self.server_time_offset}s. Retrying request...")
                            auth_headers = self._get_auth_headers(
                                method=method,
                                path=path,
                                query_string=query_str,
                                body_str=body_str
                            )
                            headers.update(auth_headers)
                            retry_resp = await client.request(
                                method=method,
                                url=full_url,
                                content=body_str if body_str else None,
                                headers=headers
                            )
                            if retry_resp.status_code < 400:
                                try:
                                    return retry_resp.json()
                                except Exception:
                                    return {"success": True, "raw": retry_resp.text}
                except Exception as sync_exc:
                    logger.debug(f"Clock recovery notice: {sync_exc}")

                logger.error(f"Authentication failed: HTTP 401 Unauthorized from Delta Testnet: {response.text}")
                raise DeltaExchangeError(f"Authentication failed: Invalid API key or signature ({response.text})", status_code=401)
            elif response.status_code == 429:
                logger.warning("Rate limit hit: HTTP 429 Too Many Requests from Delta Testnet.")
                raise DeltaExchangeError("Rate limited by exchange.", status_code=429)
            elif response.status_code >= 400:
                logger.error(f"Exchange error {response.status_code} on {path}: {response.text}")
                raise DeltaExchangeError(f"Exchange error HTTP {response.status_code}: {response.text}", status_code=response.status_code)

            try:
                return response.json()
            except Exception:
                return {"success": True, "raw": response.text}

    # Public Endpoints & Scanner Probes
    async def ping_scanner(self) -> Dict[str, Any]:
        """Perform diagnostic scan measuring latency and server time."""
        t0 = time.time()
        drift = 0.0
        success = False
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            try:
                res = await client.get(f"{self.base_url}/v2/products", headers={"User-Agent": "EdgePilot-Scanner/1.0"})
                latency_ms = (time.time() - t0) * 1000.0
                success = res.status_code == 200
                server_date = res.headers.get("date")
                if server_date:
                    pass
            except Exception:
                latency_ms = 999.0
        return {"connected": success, "latency_ms": round(latency_ms, 1), "clock_drift": drift}

    async def get_products(self) -> List[Dict[str, Any]]:
        """Fetch all tradable products from Delta."""
        res = await self._request("GET", "/v2/products", authenticated=False)
        return res.get("result", [])

    async def get_product_by_symbol(self, symbol: str) -> Optional[Dict[str, Any]]:
        products = await self.get_products()
        for p in products:
            if p.get("symbol") == symbol:
                return p
        return None

    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Fetch real-time ticker data."""
        res = await self._request("GET", f"/v2/tickers/{symbol}", authenticated=False)
        return res.get("result", {})

    async def get_candles(
        self,
        symbol: str,
        resolution: str = "5m",
        start: Optional[int] = None,
        end: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        # Map human-readable resolution to Delta schema ('5', '15', '60', 'D')
        res_map = {
            "1m": "1", "1": "1",
            "5m": "5", "5": "5",
            "15m": "15", "15": "15",
            "30m": "30", "30": "30",
            "1h": "60", "60m": "60", "60": "60",
            "1d": "D", "D": "D"
        }
        res_val = res_map.get(str(resolution).lower(), "5")

        now_ts = int(time.time())
        step_seconds = 300 if res_val == "5" else 900 if res_val == "15" else 60
        to_ts = end or now_ts
        from_ts = start or (to_ts - (300 * step_seconds))

        params: Dict[str, Any] = {
            "symbol": symbol,
            "resolution": res_val,
            "from": from_ts,
            "to": to_ts
        }

        try:
            res = await self._request("GET", "/v2/chart/history", params=params, authenticated=False)
            if "result" in res:
                return res["result"]
            return res.get("candles", [])
        except Exception as e:
            logger.debug(f"chart/history fallback triggered: {e}")
            res = await self._request("GET", "/v2/candles", params=params, authenticated=False)
            return res.get("result", [])

    # Authenticated Private Endpoints
    async def get_profile(self) -> Dict[str, Any]:
        """Fetch user profile and account details from Delta Exchange."""
        res = await self._request("GET", "/v2/profile", authenticated=True)
        return res.get("result", res)

    async def get_wallet_balances(self) -> List[Dict[str, Any]]:
        """Fetch authenticated user wallet balances (USDT, USD, Cash, Equity)."""
        res = await self._request("GET", "/v2/wallet/balances", authenticated=True)
        return res.get("result", [])

    async def get_positions(self, product_id: Optional[int] = None) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {}

        if product_id:
            params["product_id"] = product_id
        else:
            params["underlying_asset_symbol"] = "BTC"
        res = await self._request("GET", "/v2/positions", params=params, authenticated=True)
        return res.get("result", [])

    async def get_orders(self, product_id: Optional[int] = None) -> List[Dict[str, Any]]:
        params = {}
        if product_id:
            params["product_id"] = product_id
        res = await self._request("GET", "/v2/orders", params=params, authenticated=True)
        return res.get("result", [])

    async def create_order(
        self,
        product_id: int,
        size: float,
        side: str,
        order_type: str = "market_order",
        client_order_id: Optional[str] = None,
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None
    ) -> Dict[str, Any]:
        # Delta Exchange strictly accepts "market_order" or "limit_order" for order_type
        actual_order_type = "market_order" if order_type in ("market_order", "stop_market_order") else "limit_order"
        if limit_price is not None and order_type != "market_order":
            actual_order_type = "limit_order"

        payload: Dict[str, Any] = {
            "product_id": product_id,
            "size": int(size) if size.is_integer() else size,
            "side": side.lower(),
            "order_type": actual_order_type
        }
        if client_order_id:
            payload["client_order_id"] = client_order_id
        if limit_price is not None:
            payload["limit_price"] = str(limit_price)
        if stop_price is not None:
            payload["stop_price"] = str(stop_price)
            payload["stop_order_type"] = "stop_loss_order"
            payload["stop_trigger_method"] = "mark_price"

        res = await self._request("POST", "/v2/orders", json_data=payload, authenticated=True)
        return res.get("result", res)

    async def cancel_order(self, product_id: int, order_id: Optional[str] = None, client_order_id: Optional[str] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"product_id": product_id}
        if order_id:
            payload["id"] = order_id
        if client_order_id:
            payload["client_order_id"] = client_order_id

        res = await self._request("DELETE", "/v2/orders", json_data=payload, authenticated=True)
        return res.get("result", res)

    async def get_fills(self, product_id: Optional[int] = None) -> List[Dict[str, Any]]:
        params = {}
        if product_id:
            params["product_id"] = product_id
        res = await self._request("GET", "/v2/fills", params=params, authenticated=True)
        return res.get("result", [])

    async def get_option_quote(self, symbol: str) -> Dict[str, Any]:
        """Fetch real-time ticker and orderbook quote for an option contract."""
        return await self.get_ticker(symbol)

    async def find_atm_option(
        self,
        underlying_asset: str,
        signal_direction: str,
        spot_price: float
    ) -> Optional[Dict[str, Any]]:
        """
        Dynamically locate the At-The-Money (ATM) option contract for BTC, ETH, or XAUT.
        Selects call_options if signal is Bullish (BUY_CALL/LONG), or put_options if Bearish (BUY_PUT/SHORT).
        Filters by nearest upcoming operational expiry and minimum strike delta from spot.
        """
        underlying = underlying_asset.upper().strip()
        is_call = signal_direction.upper() in ("BUY_CALL", "LONG", "BULLISH", "BUY")
        target_type = "call_options" if is_call else "put_options"

        products = await self.get_products()
        eligible = []
        for p in products:
            if p.get("contract_type") != target_type:
                continue
            sym = p.get("symbol", "")
            # Verify asset match in symbol (e.g. C-BTC-, P-ETH-, C-XAUT-)
            if f"-{underlying}-" not in sym and not sym.startswith(f"C-{underlying}") and not sym.startswith(f"P-{underlying}"):
                continue
            if p.get("trading_status") != "operational":
                continue

            strike_val = p.get("strike_price")
            if not strike_val:
                continue
            try:
                strike_flt = float(strike_val)
            except (ValueError, TypeError):
                continue

            eligible.append((p, strike_flt))

        if not eligible:
            logger.warning(f"No operational {target_type} found for {underlying}")
            return None

        # Sort by nearest settlement time first, then closest strike to spot_price
        eligible.sort(key=lambda item: (
            item[0].get("settlement_time") or "9999",
            abs(item[1] - spot_price)
        ))

        selected_product, strike = eligible[0]
        logger.info(
            f"Selected ATM {'Call' if is_call else 'Put'} for {underlying} (Spot: {spot_price}): "
            f"{selected_product.get('symbol')} (Strike: {strike}, Expiry: {selected_product.get('settlement_time')})"
        )
        return selected_product


