import { useState, useEffect, useRef } from 'react';
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

        {/* Pro Trading Grid Split */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Column: Option Configuration, ATM Option Quote & Tactical Bridge */}
          <div className="w-full lg:w-[380px] flex-shrink-0 space-y-4">
            {/* ATM Option Card (Strike, Call/Put, Quote & ATR Brackets) */}
            <AtmOptionCard status={status} />

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
