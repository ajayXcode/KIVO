import { useState, useEffect, useRef } from 'react';
import { Bot, ShieldCheck, Wallet } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { BotStatusBanner } from './components/BotStatusBanner';
import { TerminalChart } from './components/TerminalChart';
import { StrategyRadar } from './components/StrategyRadar';
import { ControlsCard } from './components/ControlsCard';
import { OptionConfigCard } from './components/OptionConfigCard';
import { AtmOptionCard } from './components/AtmOptionCard';
import { TerminalTabs } from './components/TerminalTabs';
import { CredentialsModal } from './components/CredentialsModal';
import {
  BotStatus,
  OrderItem,
  PositionItem,
  EventItem,
  WatchlistItem,
  ChartCandle
} from './types';
import {
  fetchOverview,
  fetchOrders,
  fetchPositions,
  fetchEvents,
  fetchWatchlist,
  fetchChartData,
  playTradeChime
} from './api';

export function App() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [candles, setCandles] = useState<ChartCandle[]>([]);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevOrdersCountRef = useRef<number>(0);

  const loadData = async () => {
    try {
      const [overviewData, ordersData, positionsData, eventsData, watchlistData, chartData] =
        await Promise.all([
          fetchOverview(),
          fetchOrders().catch(() => []),
          fetchPositions().catch(() => []),
          fetchEvents().catch(() => []),
          fetchWatchlist().catch(() => []),
          fetchChartData().catch(() => []),
        ]);

      setStatus(overviewData);
      setOrders(ordersData);
      setPositions(positionsData);
      setEvents(eventsData);
      setWatchlist(watchlistData);
      setCandles(chartData);
      setError(null);

      // Play audio chime when new live order is detected
      if (ordersData.length > prevOrdersCountRef.current && prevOrdersCountRef.current > 0) {
        playTradeChime();
      }
      prevOrdersCountRef.current = ordersData.length;
    } catch (err: any) {
      setError(`Cannot connect to Delta Option Buying backend: ${err.message}`);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0914] text-slate-100 flex flex-col selection:bg-violet-500/30 selection:text-violet-200">
      {/* Top Institutional Header */}
      <Navbar
        status={status}
        onOpenCredentials={() => setCredentialsOpen(true)}
        onRefresh={loadData}
      />

      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 text-rose-300 px-6 py-2 text-xs flex justify-between items-center font-mono">
          <span>{error}</span>
          <span className="text-[10px] text-rose-400/80">Backend offline &bull; http://127.0.0.1:8000</span>
        </div>
      )}

      {/* Main Trading Desk Workspace */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-4 lg:p-5 space-y-4">
        {/* Top HUD KPI Ribbon */}
        <BotStatusBanner status={status} />

        {/* Live Auto-Pilot Activity & Delta Account Strip */}
        <div className="graphite-panel p-3 rounded-xl border border-violet-500/20 bg-[#100d1e]/90 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center space-x-2.5 w-full md:w-auto">
            <div className="p-2 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-violet-400 font-bold tracking-wider flex items-center space-x-1.5">
                <span>AUTO-PILOT STRATEGY STATUS</span>
                <span className="text-[9px] bg-violet-900/40 text-violet-300 px-1.5 py-0.2 rounded border border-violet-700/40">
                  {status?.automation_mode === 'AUTO_PILOT' ? 'AUTONOMOUS' : 'MANUAL APPROVALS'}
                </span>
              </div>
              <p className="text-xs font-mono font-medium text-slate-200">
                {status?.auto_pilot_status_detail || 'Monitoring market indicators & Delta Testnet options chain...'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto justify-end text-xs font-mono">
            {status?.user_email && (
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#171329] border border-violet-500/20 text-slate-300">
                <span className="text-slate-500">Account:</span>
                <span className="text-violet-300 font-semibold">{status.user_email}</span>
              </div>
            )}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-bold">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 font-normal">Delta Live Wallet:</span>
              <span>
                ${(status?.live_balance_usd ?? status?.test_equity_usd ?? 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </span>
            </div>
          </div>
        </div>

        {/* Pro Trading Grid Split */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Column: Option Configuration, ATM Option Quote & Tactical Bridge */}
          <div className="w-full lg:w-[380px] flex-shrink-0 space-y-4">
            {/* ATM Option Card (Strike, Call/Put, Quote & ATR Brackets) */}
            <AtmOptionCard status={status} onRefresh={loadData} />

            {/* Option Buying Configuration (BTC/ETH/XAUT, Supertrend, EMA, ATR) */}
            <OptionConfigCard status={status} onRefresh={loadData} />

            {/* Tactical Control Bridge (Auto-pilot, Resume, Pause, Fresh Start) */}
            <ControlsCard status={status} onRefresh={loadData} />
          </div>

          {/* Right/Center Column: Chart, Signal Radar & Tabbed Terminal */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Terminal Financial Chart with Supertrend, EMA & Underlying Price */}
            <TerminalChart candles={candles} status={status} />

            {/* Multi-Factor Option Signal Radar */}
            <StrategyRadar
              indicators={status?.indicators}
              latestSignal={status?.latest_signal}
            />

            {/* Tabbed Institutional Desk: Positions, Orders, Event Logs & API Diagnostics */}
            <TerminalTabs
              positions={positions}
              orders={orders}
              events={events}
            />
          </div>
        </div>
      </main>

      {/* Direct Frontend API Credentials Modal */}
      <CredentialsModal
        isOpen={credentialsOpen}
        onClose={() => setCredentialsOpen(false)}
        maskedKey={status?.masked_api_key ?? 'Not Configured'}
        isConfigured={status?.credentials_configured ?? false}
        onUpdated={loadData}
      />

      {/* Graphite Violet Institutional Footer */}
      <footer className="border-t border-violet-500/15 bg-[#0d0a17] py-2.5 px-6 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
        <div className="flex items-center space-x-3">
          <span className="text-violet-400 font-semibold">DELTA OPTION-BUYING BRIDGE v2.0</span>
          <span>&bull;</span>
          <span className="text-emerald-400">DELTA INDIA TESTNET</span>
          <span>&bull;</span>
          <span>SUPERTREND + EMA + OPTION ATR BRACKETS</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-violet-300">GRAPHITE VIOLET INTERFACE</span>
          <span>&bull;</span>
          <span className="text-slate-400">SESSION AUTH ONLY</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
