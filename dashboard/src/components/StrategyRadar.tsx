import React from 'react';
import { IndicatorSnapshot, SignalResult } from '../types';
import { Compass, Gauge, BarChart2, CheckCircle2, XCircle, Activity, Cpu, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StrategyRadarProps {
  indicators?: IndicatorSnapshot;
  latestSignal?: SignalResult;
}

export const StrategyRadar: React.FC<StrategyRadarProps> = ({ indicators, latestSignal }) => {
  const ema20 = indicators?.ema20 ?? 0;
  const ema50 = indicators?.ema50 ?? 0;
  const supertrend = indicators?.supertrend ?? 0;
  const stDir = indicators?.supertrend_direction ?? 0;
  const stLabel = indicators?.supertrend_label ?? 'NEUTRAL';
  const optAtr = indicators?.option_atr ?? 0;
  const rsi = indicators?.rsi14 ?? 50.0;
  const adx = indicators?.adx14 ?? 0.0;
  const isTrendBullish = indicators?.trend_bullish ?? false;

  const action = latestSignal?.action ?? 'NO_TRADE';
  const reason = latestSignal?.reason ?? 'Evaluating Supertrend & EMA on Delta Testnet...';

  const getSignalBadge = () => {
    switch (action) {
      case 'BUY_CALL':
      case 'LONG':
        return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold pro-glow-emerald animate-pulse';
      case 'BUY_PUT':
      case 'SHORT':
        return 'bg-gradient-to-r from-rose-600 to-red-600 text-white font-extrabold pro-glow-red animate-pulse';
      default:
        return 'bg-[#181428] text-violet-300 font-semibold border border-violet-500/20';
    }
  };

  return (
    <div className="graphite-panel border border-violet-500/20 rounded-xl p-5 shadow-lg space-y-4 bg-[#131020]/90">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-violet-500/15 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Option Strategy Signal Radar</h2>
            <p className="text-[11px] text-slate-400 font-mono">Supertrend + EMA Confirmation + Option ATR Brackets</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400 font-mono">Option Signal:</span>
          <span className={`text-xs px-3 py-1 rounded-md font-mono flex items-center space-x-1 ${getSignalBadge()}`}>
            {action === 'BUY_CALL' && <ArrowUpRight className="w-3.5 h-3.5" />}
            {action === 'BUY_PUT' && <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{action}</span>
          </span>
        </div>
      </div>

      {/* Multi-Factor Strategy Indicator Gates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Gate 1: Supertrend Gate */}
        <div className="bg-[#0f0d1b] p-3 rounded-lg border border-violet-500/15 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
            <span className="font-mono">SUPERTREND</span>
            <Compass className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="text-xs font-bold font-mono">
            {stDir === 1 ? (
              <span className="text-emerald-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                <span>BULLISH</span>
              </span>
            ) : stDir === -1 ? (
              <span className="text-rose-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block animate-ping" />
                <span>BEARISH</span>
              </span>
            ) : (
              <span className="text-slate-400">NEUTRAL</span>
            )}
          </div>
          <div className="text-[10px] text-violet-300/80 font-mono mt-1">
            Line: ${supertrend.toFixed(1)}
          </div>
        </div>

        {/* Gate 2: EMA Filter */}
        <div className="bg-[#0f0d1b] p-3 rounded-lg border border-violet-500/15 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
            <span className="font-mono">EMA FILTER</span>
            <Activity className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="text-xs font-bold font-mono">
            {isTrendBullish ? (
              <span className="text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ABOVE EMA</span>
              </span>
            ) : (
              <span className="text-rose-400 flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>BELOW EMA</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-violet-300/80 font-mono mt-1">
            EMA: ${ema20.toFixed(1)}
          </div>
        </div>

        {/* Gate 3: Option ATR */}
        <div className="bg-[#0f0d1b] p-3 rounded-lg border border-violet-500/15 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
            <span className="font-mono">OPTION ATR</span>
            <BarChart2 className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="text-xs font-bold font-mono text-purple-300">
            {optAtr.toFixed(2)} PTS
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            SL: 1.5x &bull; TP: 2.5x
          </div>
        </div>

        {/* Gate 4: RSI Momentum */}
        <div className="bg-[#0f0d1b] p-3 rounded-lg border border-violet-500/15 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
            <span className="font-mono">RSI (14)</span>
            <Gauge className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="text-xs font-bold font-mono">
            {rsi < 40 ? (
              <span className="text-emerald-400">OVERSOLD ({rsi.toFixed(1)})</span>
            ) : rsi > 60 ? (
              <span className="text-rose-400">OVERBOUGHT ({rsi.toFixed(1)})</span>
            ) : (
              <span className="text-violet-300">NEUTRAL ({rsi.toFixed(1)})</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            ADX: {adx.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Decision Rationale Terminal Banner */}
      <div className="bg-[#0f0d1b] p-3 rounded-lg border border-violet-500/15 flex items-start space-x-2.5">
        <div className="p-1 rounded bg-violet-500/10 text-violet-400 mt-0.5">
          <Activity className="w-3.5 h-3.5" />
        </div>
        <div className="text-xs font-mono">
          <div className="text-slate-400 text-[10px] uppercase font-bold">Execution Engine Reason:</div>
          <p className="text-slate-200 mt-0.5">{reason}</p>
        </div>
      </div>
    </div>
  );
};
