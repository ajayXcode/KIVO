import React, { useState } from 'react';
import { Target, Shield, ArrowUpRight, ArrowDownRight, Zap, CheckCircle2, ShoppingCart } from 'lucide-react';
import { BotStatus } from '../types';
import { buyOption } from '../api';

interface AtmOptionCardProps {
  status: BotStatus | null;
  onRefresh?: () => void;
}

export const AtmOptionCard: React.FC<AtmOptionCardProps> = ({ status, onRefresh }) => {
  const [executing, setExecuting] = useState<string | null>(null);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  const atm = status?.atm_option;
  const isCall = atm?.option_type === 'CALL';
  const signal = status?.latest_signal;
  const indicators = status?.indicators;
  const contractsCount = status?.option_config?.contracts || 1;

  const handleQuickBuy = async (action: 'BUY_CALL' | 'BUY_PUT') => {
    try {
      setExecuting(action);
      setOrderNotice(null);
      const res = await buyOption({
        action,
        symbol: atm?.symbol,
        product_id: atm?.product_id,
        contracts: contractsCount,
        with_protection: true,
      });
      setOrderNotice(`Filled: ${res.symbol} (${res.client_order_id?.slice(0, 15)}...)`);
      if (onRefresh) onRefresh();
      setTimeout(() => setOrderNotice(null), 5000);
    } catch (err: any) {
      alert(`Order Failed: ${err.message}`);
    } finally {
      setExecuting(null);
    }
  };

  if (!atm) {
    return (
      <div className="graphite-panel p-4 rounded-xl border border-violet-500/20 bg-[#131020]/80 shadow-lg text-center space-y-2">
        <div className="inline-flex p-2 rounded-full bg-violet-500/10 text-violet-400">
          <Zap className="w-5 h-5 animate-pulse" />
        </div>
        <h4 className="text-xs font-semibold text-slate-300">Scanning Live ATM Option...</h4>
        <p className="text-[11px] text-slate-500">Querying Delta Testnet options chain for {status?.underlying_asset || 'BTC'}</p>
      </div>
    );
  }

  const expiryDate = atm.settlement_time ? new Date(atm.settlement_time).toLocaleDateString() : 'Active Expiry';

  return (
    <div className="graphite-panel p-4 rounded-xl border border-violet-500/20 bg-[#131020]/80 shadow-lg space-y-3.5">
      {/* Header with Option Type Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1 ${
              isCall
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 pro-glow-emerald'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30 pro-glow-red'
            }`}
          >
            {isCall ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>ATM {atm.option_type}</span>
          </span>
          <span className="text-xs font-mono font-bold text-slate-200">{atm.symbol}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-violet-950/40 px-2 py-0.5 rounded border border-violet-800/30">
          Exp: {expiryDate}
        </span>
      </div>

      {/* Pricing & Strike Grid */}
      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#0f0d1b] border border-violet-500/15 text-center">
        <div>
          <span className="text-[9px] uppercase font-mono text-slate-400 block">Strike</span>
          <span className="text-sm font-mono font-bold text-slate-100">${atm.strike_price.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-[9px] uppercase font-mono text-slate-400 block">Option Quote</span>
          <span className="text-sm font-mono font-bold text-violet-300">${atm.quote_price.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[9px] uppercase font-mono text-slate-400 block">Option ATR</span>
          <span className="text-sm font-mono font-bold text-purple-300">{atm.option_atr.toFixed(2)}</span>
        </div>
      </div>

      {/* Option-based ATR Brackets */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
          <span>Option ATR Brackets</span>
          <span className="text-slate-500">Auto-Calculated</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Stop Loss Bracket */}
          <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/25 space-y-1">
            <div className="flex items-center space-x-1.5 text-rose-400 text-[11px] font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Stop-Loss</span>
            </div>
            <div className="text-sm font-mono font-bold text-rose-300">
              ${atm.stop_loss_price.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-rose-400/80">
              {atm.stop_loss_label || `SL: $${atm.stop_loss_price.toFixed(2)} (1.5x ATR)`}
            </div>
          </div>

          {/* Take Profit Target Bracket */}
          <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/25 space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-400 text-[11px] font-semibold">
              <Target className="w-3.5 h-3.5" />
              <span>Target</span>
            </div>
            <div className="text-sm font-mono font-bold text-emerald-300">
              ${atm.take_profit_price.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-emerald-400/80">
              {atm.take_profit_label || `TP: $${atm.take_profit_price.toFixed(2)} (2.5x ATR)`}
            </div>
          </div>
        </div>
      </div>

      {/* Instant 1-Click Trading Buttons */}
      <div className="space-y-2 pt-1 border-t border-violet-500/15">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400">
          <span>Instant 1-Click Execution</span>
          <span className="text-violet-400 font-semibold">{contractsCount} Contract{contractsCount > 1 ? 's' : ''}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickBuy('BUY_CALL')}
            disabled={executing !== null}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg font-mono font-bold text-xs transition-all ${
              executing === 'BUY_CALL'
                ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/50 animate-pulse'
                : 'bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-200 border border-emerald-500/40 pro-glow-emerald active:scale-95'
            }`}
            title="Immediately buy ATM Call on Delta Testnet"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
            <span>{executing === 'BUY_CALL' ? 'Sending...' : '⚡ BUY ATM CALL'}</span>
          </button>

          <button
            onClick={() => handleQuickBuy('BUY_PUT')}
            disabled={executing !== null}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg font-mono font-bold text-xs transition-all ${
              executing === 'BUY_PUT'
                ? 'bg-rose-900/40 text-rose-300 border border-rose-500/50 animate-pulse'
                : 'bg-rose-600/25 hover:bg-rose-600/35 text-rose-200 border border-rose-500/40 pro-glow-red active:scale-95'
            }`}
            title="Immediately buy ATM Put on Delta Testnet"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-rose-400" />
            <span>{executing === 'BUY_PUT' ? 'Sending...' : '⚡ BUY ATM PUT'}</span>
          </button>
        </div>

        {orderNotice && (
          <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center space-x-2 text-xs font-mono text-emerald-300 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{orderNotice}</span>
          </div>
        )}
      </div>

      {/* Underlying Signal Confirmation */}
      <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-violet-500/10">
        <div className="flex items-center space-x-1.5">
          <span>Supertrend:</span>
          <span
            className={`font-semibold ${
              indicators?.supertrend_direction === 1
                ? 'text-emerald-400'
                : indicators?.supertrend_direction === -1
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {indicators?.supertrend_label || 'NEUTRAL'} (${indicators?.supertrend?.toFixed(1) || '0.0'})
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span>EMA:</span>
          <span className="text-violet-300 font-semibold">${indicators?.ema20?.toFixed(1) || '0.0'}</span>
        </div>
      </div>
    </div>
  );
};
