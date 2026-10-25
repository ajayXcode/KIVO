import React from 'react';
import { IndicatorSnapshot, SignalResult } from '../types';
import {
  Compass,
  Gauge,
  BarChart2,
  CheckCircle2,
  XCircle,
  Activity,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ShieldCheck,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

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
  const ewo = indicators?.ewo ?? 0.0;
  const roc15m = indicators?.roc15m ?? 0.0;
  const setupType = indicators?.setup_type ?? 'WAITING';
  const confidence = indicators?.confidence_pct ?? 0;
  const isTrendBullish = indicators?.trend_bullish ?? false;
  const bbBandwidth = indicators?.bb_bandwidth ?? 0.0;

  const action = latestSignal?.action ?? 'NO_TRADE';
  const reason = latestSignal?.reason ?? 'Evaluating BB_RPB_TSL & Supertrend Confluence Engine...';

  const getSignalBadge = () => {
    switch (action) {
      case 'BUY_CALL':
      case 'LONG':
        return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse';
      case 'BUY_PUT':
      case 'SHORT':
        return 'bg-gradient-to-r from-rose-600 to-red-600 text-white font-extrabold shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse';
      default:
        return 'bg-[#151C28] text-slate-300 font-semibold border border-[#232F42]';
    }
  };

  const getSetupColor = () => {
    switch (setupType) {
      case 'RPB_PULLBACK':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'VOLATILITY_BREAKOUT':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'MEAN_REVERSION_DIP':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'CHOP_FILTER':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-[#0F141E] border border-[#1C2433] rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center border-b border-[#161D29] pb-3 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Quantitative Confluence Engine
              </h2>
              <span className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded font-mono font-bold">
                BB_RPB_TSL &bull; NFI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              The Real Pullback (RPB) &bull; Supertrend Expansion &bull; Dynamic ATR Brackets
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {confidence > 0 && (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
              {confidence}% Confluence
            </span>
          )}
          <span className={`text-[10px] font-mono px-2 py-1 rounded border font-bold ${getSetupColor()}`}>
            {setupType}
          </span>
          <span className={`text-xs px-3 py-1 rounded-md font-mono flex items-center space-x-1 ${getSignalBadge()}`}>
            {action === 'BUY_CALL' && <ArrowUpRight className="w-3.5 h-3.5" />}
            {action === 'BUY_PUT' && <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{action}</span>
          </span>
        </div>
      </div>

      {/* Multi-Factor Strategy Indicator Gates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Gate 1: 15m Macro Trend Filter */}
        <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29] flex flex-col justify-between">
          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
            <span className="font-mono">15M MACRO</span>
            <Compass className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xs font-bold font-mono">
            {isTrendBullish ? (
              <span className="text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                <span>BULLISH</span>
              </span>
            ) : (
              <span className="text-rose-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block animate-ping" />
                <span>BEARISH</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            ROC15m: <span className={roc15m >= 0 ? 'text-emerald-400' : 'text-red-400'}>{roc15m >= 0 ? '+' : ''}{roc15m.toFixed(2)}%</span>
          </div>
        </div>

        {/* Gate 2: Supertrend Direction */}
        <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29] flex flex-col justify-between">
          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
            <span className="font-mono">SUPERTREND</span>
            <Zap className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xs font-bold font-mono">
            {stDir === 1 ? (
              <span className="text-emerald-400">BULLISH (+1)</span>
            ) : stDir === -1 ? (
              <span className="text-rose-400">BEARISH (-1)</span>
            ) : (
              <span className="text-slate-400">NEUTRAL</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Trail: ${supertrend.toFixed(1)}
          </div>
        </div>

        {/* Gate 3: EMA 20 Pullback Benchmark */}
        <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29] flex flex-col justify-between">
          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
            <span className="font-mono">EMA 20 VALUE</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xs font-bold font-mono text-amber-300">
            ${ema20.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Mean Reversion Pivot
          </div>
        </div>

        {/* Gate 4: Elliott Wave Oscillator (EWO) */}
        <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29] flex flex-col justify-between">
          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
            <span className="font-mono">EWO MOMENTUM</span>
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className={`text-xs font-bold font-mono ${ewo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {ewo >= 0 ? '+' : ''}{ewo.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            EMA(5) - EMA(35)
          </div>
        </div>

        {/* Gate 5: RSI (14) Momentum Rebound */}
        <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29] flex flex-col justify-between">
          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
            <span className="font-mono">RSI (14)</span>
            <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xs font-bold font-mono">
            {rsi < 40 ? (
              <span className="text-emerald-400">DIP ({rsi.toFixed(1)})</span>
            ) : rsi > 60 ? (
              <span className="text-rose-400">HOT ({rsi.toFixed(1)})</span>
            ) : (
              <span className="text-slate-300">BALANCED ({rsi.toFixed(1)})</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            ADX: {adx.toFixed(1)}
          </div>
        </div>

        {/* Gate 6: Volatility Bandwidth & ATR */}
        <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29] flex flex-col justify-between">
          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
            <span className="font-mono">BB BANDWIDTH</span>
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xs font-bold font-mono text-cyan-300">
            {bbBandwidth.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Option ATR: {optAtr.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Decision Rationale Terminal Banner */}
      <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29] flex items-start space-x-2.5">
        <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 mt-0.5 flex-shrink-0">
          <Activity className="w-3.5 h-3.5" />
        </div>
        <div className="text-xs font-mono">
          <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            Quantitative Confluence Decision:
          </div>
          <p className="text-slate-200 mt-0.5 leading-relaxed">{reason}</p>
        </div>
      </div>
    </div>
  );
};
