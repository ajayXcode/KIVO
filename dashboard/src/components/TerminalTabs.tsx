import React, { useState } from 'react';
import { PositionItem, OrderItem, EventItem } from '../types';
import { PositionsTable } from './PositionsTable';
import { OrdersTable } from './OrdersTable';
import { EventJournal } from './EventJournal';
import { ApiScannerCard } from './ApiScannerCard';
import { Shield, ListOrdered, Terminal, Radio } from 'lucide-react';

interface TerminalTabsProps {
  positions: PositionItem[];
  orders: OrderItem[];
  events: EventItem[];
}

export const TerminalTabs: React.FC<TerminalTabsProps> = ({
  positions,
  orders,
  events,
}) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'journal' | 'scanner'>('positions');

  return (
    <div className="bg-[#0F141E] border border-[#1C2433] rounded-xl overflow-hidden shadow-sm">
      {/* Tab Navigation Header */}
      <div className="border-b border-[#161D29] bg-[#0C1017] px-3 sm:px-4 flex items-center justify-between overflow-x-auto">
        <div className="flex space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 text-xs font-mono font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'positions'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>POSITIONS ({positions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 text-xs font-mono font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>ORDERS & FILLS ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 text-xs font-mono font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'journal'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>AUDIT JOURNAL</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 text-xs font-mono font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'scanner'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>API DIAGNOSTICS</span>
          </button>
        </div>

        <div className="text-[10px] font-mono text-slate-500 hidden md:block whitespace-nowrap">
          AUTHORITATIVE EXCHANGE STATE
        </div>
      </div>

      {/* Tab Panels */}
      <div className="p-4 bg-[#0F141E]">
        {activeTab === 'positions' && <PositionsTable positions={positions} />}
        {activeTab === 'orders' && <OrdersTable orders={orders} />}
        {activeTab === 'journal' && <EventJournal events={events} />}
        {activeTab === 'scanner' && <ApiScannerCard />}
      </div>
    </div>
  );
};

