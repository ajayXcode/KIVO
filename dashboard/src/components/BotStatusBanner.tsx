import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { BotStatus } from '../types';

interface BotStatusBannerProps {
  status: BotStatus | null;
}

export const BotStatusBanner: React.FC<BotStatusBannerProps> = ({ status }) => {
  const state = status?.state ?? 'INITIALIZING';
  const symbol = status?.symbol ?? 'BTCUSD';
  const price = status?.latest_price ?? 0.0;
  const dailyPnl = status?.daily_pnl_usd ?? 0.0;
  const dailyPnlPct = status?.daily_pnl_pct ?? 0.0;
  const equity = status?.test_equity_usd ?? 10000.0;
  const posSize = status?.current_position_size ?? 0.0;
  const unrealizedPnl = status?.unrealized_pnl ?? 0.0;

  const getStateBadge = () => {
    switch (state) {
      case 'RUNNING':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse';
      case 'PAUSED':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'HALTED':
      case 'ERROR':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Bot State & Asset Card */}
      <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Bot Status</span>
          <span className={`text-xs px-2.5 py-1 rounded-full border font-mono font-bold ${getStateBadge()}`}>
            {state}
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white tracking-tight">{symbol}</span>
          {price > 0 && (
            <span className="text-lg font-mono text-emerald-400">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">Product ID: {status?.product_id ?? 84} (Testnet)</p>
      </div>

      {/* Position Exposure */}
      <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Position</span>
          <span className={`text-xs px-2 py-0.5 rounded font-mono ${posSize !== 0 ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500'}`}>
            {posSize !== 0 ? (posSize > 0 ? 'LONG' : 'SHORT') : 'FLAT'}
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-white">
            {Math.abs(posSize)} <span className="text-sm font-normal text-slate-400">Contracts</span>
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Unrealized PnL: <span className={unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            ${unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
          </span>
        </p>
      </div>

      {/* Daily PnL */}
      <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Session PnL</span>
          {dailyPnl >= 0 ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
        </div>
        <div className="flex items-baseline space-x-2">
          <span className={`text-2xl font-bold font-mono ${dailyPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${dailyPnl >= 0 ? '+' : ''}{dailyPnl.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400">({dailyPnlPct >= 0 ? '+' : ''}{dailyPnlPct.toFixed(2)}%)</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Reference Equity: <span className="text-slate-200">${equity.toLocaleString()}</span>
        </p>
      </div>

      {/* Risk & Circuit Breaker */}
      <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Daily Loss Guard</span>
          <span className="text-xs text-slate-400 font-mono">Limit: 1.50%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2.5 mt-2 overflow-hidden">
          <div
            className={`h-2.5 rounded-full ${dailyPnlPct < 0 && Math.abs(dailyPnlPct) >= 1.2 ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, (Math.max(0, -dailyPnlPct) / 1.5) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
          <span>Drawdown: {Math.max(0, -dailyPnlPct).toFixed(2)}%</span>
          <span>{status?.cooldown_remaining_seconds ? `Cooldown: ${status.cooldown_remaining_seconds}s` : 'Ready'}</span>
        </div>
      </div>
    </div>
  );
};

