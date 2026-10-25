export type BotState = 'INITIALIZING' | 'READY' | 'RUNNING' | 'PAUSED' | 'HALTED' | 'ERROR';
export type AutomationMode = 'AUTO_PILOT' | 'MANUAL';
export type UnderlyingAsset = 'BTC' | 'ETH' | 'XAUT';

export interface AtmOptionInfo {
  product_id: number;
  symbol: string;
  option_type: 'CALL' | 'PUT';
  strike_price: number;
  settlement_time: string;
  quote_price: number;
  option_atr: number;
  stop_loss_price: number;
  take_profit_price: number;
  stop_loss_label: string;
  take_profit_label: string;
}

export interface OptionConfig {
  underlying_asset: UnderlyingAsset;
  timeframe: string;
  contracts: number;
  supertrend_period: number;
  supertrend_multiplier: number;
  ema_period: number;
  option_atr_period: number;
  sl_atr_multiplier: number;
  tp_atr_multiplier: number;
}

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
  supertrend?: number;
  supertrend_direction?: number;
  supertrend_label?: string;
  option_atr?: number;
  ewo?: number;
  roc15m?: number;
  setup_type?: string;
  confidence_pct?: number;
  trend_bullish: boolean;
  warmup_complete: boolean;
}

export interface SignalResult {
  action: 'BUY_CALL' | 'BUY_PUT' | 'LONG' | 'SHORT' | 'NO_TRADE';
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
  underlying_asset?: UnderlyingAsset;
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
  atm_option?: AtmOptionInfo;
  option_config?: OptionConfig;
  active_orders_count: number;
  cooldown_remaining_seconds: number;
  circuit_breaker_triggered: boolean;
  reconciliation_healthy: boolean;
  credentials_configured: boolean;
  masked_api_key: string;
  last_reconciliation_time?: string;
  live_balance_usd?: number;
  user_email?: string;
  auto_pilot_status_detail?: string;
}

export interface WatchlistItem {
  symbol: string;
  product_id: number;
  price: number;
  change_24h_pct: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signal: 'BUY_CALL' | 'BUY_PUT' | 'LONG' | 'SHORT' | 'NO_TRADE';
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

export interface ChartCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema?: number;
  ema20?: number;
  supertrend?: number;
  supertrend_direction?: number;
  bb_upper?: number;
  bb_lower?: number;
  rsi?: number;
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

export interface SessionResetResponse {
  success: boolean;
  message: string;
  positions_closed: number;
  orders_cancelled: number;
  timestamp: string;
}

export interface UserProfileResponse {
  configured: boolean;
  email?: string;
  account_id?: string;
  country?: string;
  is_kyc_approved: boolean;
  profile?: Record<string, any>;
  balances: Array<{
    asset_symbol: string;
    asset_id?: number;
    balance: string | number;
    available_balance: string | number;
    cash_balance?: string | number;
  }>;
  total_balance_usd: number;
}

export interface QuickOrderPayload {
  action: 'BUY_CALL' | 'BUY_PUT';
  symbol?: string;
  product_id?: number;
  contracts?: number;
  with_protection?: boolean;
}

export interface QuickOrderResponse {
  success: boolean;
  message: string;
  client_order_id?: string;
  symbol?: string;
  product_id?: number;
  action: string;
  size: number;
}
