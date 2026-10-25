export type BotState = 'INITIALIZING' | 'READY' | 'RUNNING' | 'PAUSED' | 'HALTED' | 'ERROR';
export type AutomationMode = 'AUTO_PILOT' | 'MANUAL';

export interface IndicatorSnapshot {
  ema20: number;
  ema50: number;
  ema200: number;
  rsi14: number;
  adx14: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
  bb_bandwidth?: number;
  atr14?: number;
  trend_bullish: boolean;
  warmup_complete: boolean;
}

export interface SignalResult {
  action: 'LONG' | 'SHORT' | 'NO_TRADE';
  symbol: string;
  price: number;
  indicators: IndicatorSnapshot;
  reason: string;
  timestamp: string;
}

export interface BotStatus {
  state: BotState;
  environment: string;
  symbol: string;
  product_id: number;
  automation_mode: AutomationMode;
  test_equity_usd: number;
  current_position_size: number;
  unrealized_pnl: number;
  realized_pnl: number;
  daily_pnl_usd: number;
  daily_pnl_pct: number;
  latest_price?: number;
  latest_signal?: SignalResult;
  indicators?: IndicatorSnapshot;
  active_orders_count: number;
  cooldown_remaining_seconds: number;
  circuit_breaker_triggered: boolean;
  reconciliation_healthy: boolean;
  credentials_configured: boolean;
  masked_api_key: string;
  last_reconciliation_time?: string;
}

export interface WatchlistItem {
  symbol: string;
  product_id: number;
  price: number;
  change_24h_pct: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signal: 'LONG' | 'SHORT' | 'NO_TRADE';
  rsi: number;
  is_active: boolean;
}

export interface ApiScannerResult {
  timestamp: string;
  rest_url: string;
  rest_connected: boolean;
  rest_latency_ms: number;
  ws_url: string;
  ws_connected: boolean;
  credentials_valid: boolean;
  auth_status: string;
  product_count: number;
  clock_drift_seconds: number;
  status_summary: string;
}

export interface CredentialsStatus {
  configured: boolean;
  masked_key: string;
  has_secret: boolean;
  environment: string;
}

export interface OrderItem {
  id: number;
  client_order_id: string;
  exchange_order_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  order_type: string;
  size: number;
  limit_price?: number;
  stop_price?: number;
  status: string;
  filled_size: number;
  created_at: string;
}

export interface PositionItem {
  product_id: number;
  symbol: string;
  size: number;
  entry_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  updated_at: string;
}

export interface EventItem {
  id: number;
  timestamp: string;
  event_type: string;
  component: string;
  message: string;
  details?: string;
}

