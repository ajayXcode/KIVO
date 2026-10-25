import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BotStatusBanner } from './components/BotStatusBanner';
import { ControlsCard } from './components/ControlsCard';
import { IndicatorsCard } from './components/IndicatorsCard';
import { PositionsTable } from './components/PositionsTable';
import { OrdersTable } from './components/OrdersTable';
import { EventJournal } from './components/EventJournal';
import { WatchlistCard } from './components/WatchlistCard';
import { ApiScannerCard } from './components/ApiScannerCard';
import { CredentialsModal } from './components/CredentialsModal';
import { BotStatus, OrderItem, PositionItem, EventItem, WatchlistItem } from './types';
import { fetchOverview, fetchOrders, fetchPositions, fetchEvents, fetchWatchlist } from './api';

export function App() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [overviewData, ordersData, positionsData, eventsData, watchlistData] = await Promise.all([
        fetchOverview(),
        fetchOrders().catch(() => []),
        fetchPositions().catch(() => []),
        fetchEvents().catch(() => []),
        fetchWatchlist().catch(() => []),
      ]);
      setStatus(overviewData);
      setOrders(ordersData);
      setPositions(positionsData);
      setEvents(eventsData);
      setWatchlist(watchlistData);
      setError(null);
    } catch (err: any) {
      setError(`Cannot connect to EdgePilot backend: ${err.message}`);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col">
      <Navbar
        status={status}
        onOpenCredentials={() => setCredentialsOpen(true)}
      />

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-400 px-6 py-2.5 text-xs flex justify-between items-center">
          <span>{error}</span>
          <span className="font-mono text-[10px] text-red-500">Ensure backend server is running on http://127.0.0.1:8000</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Top KPI Metrics Banner */}
        <BotStatusBanner status={status} />

        {/* Tactical Controls & Multi-Timeframe Strategy */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ControlsCard status={status} onRefresh={loadData} />
          </div>
          <div className="lg:col-span-2">
            <IndicatorsCard indicators={status?.indicators} latestSignal={status?.latest_signal} />
          </div>
        </div>

        {/* Watchlist Scanner & API Connectivity Scanner */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WatchlistCard watchlist={watchlist} onSymbolSwitched={loadData} />
          <ApiScannerCard />
        </div>

        {/* Positions & Orders Journal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PositionsTable positions={positions} />
          <OrdersTable orders={orders} />
        </div>

        {/* Audit Event Journal */}
        <EventJournal events={events} />
      </main>

      {/* Direct Frontend API Credentials Modal */}
      <CredentialsModal
        isOpen={credentialsOpen}
        onClose={() => setCredentialsOpen(false)}
        maskedKey={status?.masked_api_key ?? 'Not Configured'}
        isConfigured={status?.credentials_configured ?? false}
        onUpdated={loadData}
      />

      <footer className="border-t border-[#1E2430] py-4 px-6 text-center text-xs text-slate-500">
        EdgePilot Trading Engine v1.1.0 &bull; Delta Exchange India Testnet &bull; Direct Frontend Key Management &bull; Automated Execution Guard
      </footer>
    </div>
  );
}

export default App;

