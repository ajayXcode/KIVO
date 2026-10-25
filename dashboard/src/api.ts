import {
  BotStatus,
  OrderItem,
  PositionItem,
  EventItem,
  WatchlistItem,
  ApiScannerResult,
  CredentialsStatus
} from './types';

const BASE_URL = '/api';

export async function fetchOverview(): Promise<BotStatus> {
  const res = await fetch(`${BASE_URL}/overview`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchOrders(): Promise<OrderItem[]> {
  const res = await fetch(`${BASE_URL}/orders`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPositions(): Promise<PositionItem[]> {
  const res = await fetch(`${BASE_URL}/positions`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchEvents(): Promise<EventItem[]> {
  const res = await fetch(`${BASE_URL}/events`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Credentials API (Direct from Frontend)
export async function fetchCredentials(): Promise<CredentialsStatus> {
  const res = await fetch(`${BASE_URL}/config/credentials`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function saveCredentials(apiKey: string, apiSecret: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/config/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret }),
  });
  if (!res.ok) throw new Error('Failed to update credentials');
  return res.json();
}

export async function clearCredentials(): Promise<any> {
  const res = await fetch(`${BASE_URL}/config/credentials`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to clear credentials');
  return res.json();
}

// Watchlist API
export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch(`${BASE_URL}/watchlist`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function switchSymbol(symbol: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/config/symbol`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });
  if (!res.ok) throw new Error('Failed to switch symbol');
  return res.json();
}

// Scanner API
export async function runConnectivityScan(): Promise<ApiScannerResult> {
  const res = await fetch(`${BASE_URL}/scanner/connectivity`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Automation API
export async function setAutomationMode(enabled: boolean): Promise<any> {
  const res = await fetch(`${BASE_URL}/config/automation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error('Failed to set automation mode');
  return res.json();
}

// Controls
export async function sendPause(): Promise<void> {
  const res = await fetch(`${BASE_URL}/control/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Operator requested pause via Dashboard' }),
  });
  if (!res.ok) throw new Error(`Failed to pause: ${res.statusText}`);
}

export async function sendResume(): Promise<void> {
  const res = await fetch(`${BASE_URL}/control/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Operator resumed trading via Dashboard' }),
  });
  if (!res.ok) throw new Error(`Failed to resume: ${res.statusText}`);
}

export async function sendKill(): Promise<void> {
  const res = await fetch(`${BASE_URL}/control/kill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'EMERGENCY KILL SWITCH ACTIVATED' }),
  });
  if (!res.ok) throw new Error(`Failed to kill: ${res.statusText}`);
}

export async function sendClosePosition(): Promise<any> {
  const res = await fetch(`${BASE_URL}/control/close-position`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to close position: ${res.statusText}`);
  return res.json();
}

export async function sendReconcile(): Promise<void> {
  const res = await fetch(`${BASE_URL}/control/reconcile`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to reconcile: ${res.statusText}`);
}

