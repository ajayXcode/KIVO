import React from 'react';
import { TrendingUp, TrendingDown, Shield, ShieldAlert, DollarSign, Activity, Zap, Layers, Sparkles } from 'lucide-react';
import { BotStatus } from '../types';

interface BotStatusBannerProps {
  status: BotStatus | null;
}

export const BotStatusBanner: React.FC<BotStatusBannerProps> = ({ status }) => {
  const state = status?.state ?? 'INITIALIZING';
  const asset = status?.underlying_asset ?? 'BTC';
  const symbol = status?.symbol ?? `${asset}USD`;
  const price = status?.latest_price ?? 0.0;
  const dailyPnl = status?.daily_pnl_usd ?? 0.0;
  const dailyPnlPct = status?.daily_pnl_pct ?? 0.0;
  const equity = status?.test_equity_usd ?? 10000.0;
  const posSize = status?.current_position_size ?? 0.0;
  const unrealizedPnl = status?.unrealized_pnl ?? 0.0;
  const circuitBreaker = status?.circuit_breaker_triggered ?? false;
  const optAtr = status?.indicators?.option_atr ?? 0.0;
  const atmSym = status?.atm_option?.symbol ?? 'None';

  const getStateBadge = () => {
    switch (state) {
      case 'RUNNING':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 pro-glow-emerald animate-pulse';
      case 'PAUSED':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
      case 'HALTED':
      case 'ERROR':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 pro-glow-red';
      default:
        return 'bg-violet-500/15 text-violet-300 border-violet-500/40';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Underlying Asset & Engine State */}
      <div className="graphite-panel p-4 shadow-sm space-y-1.5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            <span>ALGORITHM STATE</span>
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-extrabold tracking-wide ${getStateBadge()}`}>
            {state}
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-xl font-extrabold text-white font-mono tracking-tight">{asset}</span>
          <span className="text-xs font-mono text-violet-300 font-semibold">{symbol}</span>
          {price > 0 && (
            <span className="text-sm font-mono font-bold text-emerald-400 ml-auto">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-violet-500/15">
          <span>Target ATM: {status?.atm_option?.option_type || 'CALL'}</span>
          <span className="text-violet-300">{atmSym}</span>
        </div>
      </div>

      {/* 2. Position Exposure & Option Contracts */}
      <div className="graphite-panel p-4 shadow-sm space-y-1.5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>OPTION POSITION</span>
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
              posSize > 0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 pro-glow-emerald'
                : posSize < 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-violet-950/40 text-slate-400 border border-violet-900/30'
            }`}
          >
            {posSize > 0 ? `${posSize} LONG` : posSize < 0 ? `${posSize} SHORT` : 'FLAT'}
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-xl font-extrabold font-mono text-white">
            {Math.abs(posSize)} <span className="text-xs text-slate-400 font-normal">Contracts</span>
          </span>
          <span
            className={`text-sm font-mono font-bold ml-auto ${
              unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            uPnL: {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-violet-500/15">
          <span>Option ATR:</span>
          <span className="text-purple-300 font-semibold">{optAtr > 0 ? `${optAtr.toFixed(2)} pts` : '—'}</span>
        </div>
      </div>

      {/* 3. Session Equity & Daily PnL */}
      <div className="graphite-panel p-4 shadow-sm space-y-1.5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <DollarSign className="w-3.5 h-3.5 text-violet-400" />
            <span>SESSION TEST EQUITY</span>
          </span>
          <span className="text-[10px] font-mono text-violet-300 bg-violet-950/40 px-1.5 py-0.5 rounded border border-violet-800/40">
            TESTNET
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-xl font-extrabold text-white font-mono">
            ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="ml-auto flex items-center space-x-1 font-mono text-xs font-bold">
            {dailyPnl >= 0 ? (
              <span className="text-emerald-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +${dailyPnl.toFixed(2)}
              </span>
            ) : (
              <span className="text-rose-400 flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" />
                -${Math.abs(dailyPnl).toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-violet-500/15">
          <span>Max Loss Circuit (1.5%):</span>
          <span className="text-slate-300">${(equity * 0.015).toFixed(2)}</span>
        </div>
      </div>

      {/* 4. Risk Guardian & Execution Circuit */}
      <div className="graphite-panel p-4 shadow-sm space-y-1.5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-violet-400" />
            <span>RISK GUARD</span>
          </span>
          {circuitBreaker ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-extrabold flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3 mr-0.5" />
              <span>CIRCUIT BREAKER</span>
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
              ARMED & ACTIVE
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between font-mono">
          <span className="text-xs text-slate-300">Option Brackets:</span>
          <span className="text-xs font-bold text-violet-300">
            SL: {status?.option_config?.sl_atr_multiplier || 1.5}x | TP: {status?.option_config?.tp_atr_multiplier || 2.5}x
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-violet-500/15">
          <span>Auth Status:</span>
          <span className={status?.credentials_configured ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
            {status?.credentials_configured ? 'Authorized' : 'Session Ready'}
          </span>
        </div>
      </div>
    </div>
  );
};
