import React from 'react';
import { IndicatorSnapshot, SignalResult } from '../types';
import { Compass, Gauge, BarChart2, CheckCircle2, XCircle, Activity, ShieldAlert } from 'lucide-react';

interface IndicatorsCardProps {
  indicators?: IndicatorSnapshot;
  latestSignal?: SignalResult;
}

export const IndicatorsCard: React.FC<IndicatorsCardProps> = ({ indicators, latestSignal }) => {
  const ema20 = indicators?.ema20 ?? 0;
  const ema50 = indicators?.ema50 ?? 0;
  const ema200 = indicators?.ema200 ?? 0;
  const rsi = indicators?.rsi14 ?? 50.0;
  const adx = indicators?.adx14 ?? 0.0;
  const bbUpper = indicators?.bb_upper ?? 0.0;
  const bbMid = indicators?.bb_middle ?? 0.0;
  const bbLower = indicators?.bb_lower ?? 0.0;
  const bbBw = indicators?.bb_bandwidth ?? 0.0;
  const atr = indicators?.atr14 ?? 0.0;
  const isTrendBullish = indicators?.trend_bullish ?? false;
  const warmupComplete = indicators?.warmup_complete ?? false;

  const action = latestSignal?.action ?? 'NO_TRADE';
  const reason = latestSignal?.reason ?? 'Analyzing real-time closed candle feeds...';

  const getSignalBadge = () => {
    switch (action) {
      case 'LONG':
        return 'bg-emerald-500 text-slate-950 font-bold';
      case 'SHORT':
        return 'bg-red-500 text-white font-bold';
      default:
        return 'bg-slate-800 text-slate-400 font-medium';
    }
  };

  return (
    <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-white">Strategy & Enhanced Indicator Engine</h2>
          <p className="text-xs text-slate-400">15m Trend + 5m Pullback (EMA/RSI/ADX) + Bollinger Bands + ATR Volatility</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2.5 py-1 rounded-md font-mono ${getSignalBadge()}`}>
            {action}
          </span>
        </div>
      </div>

      {/* Row 1: Core Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 15m Trend */}
        <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430]">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>15m Trend</span>
            <Compass className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xs font-bold font-mono">
            {isTrendBullish ? (
              <span className="text-emerald-400">BULLISH (EMA50 &gt; 200)</span>
            ) : (
              <span className="text-red-400">BEARISH (EMA50 &lt; 200)</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            E50: {ema50} | E200: {ema200}
          </div>
        </div>

        {/* 5m Pullback EMA20 */}
        <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430]">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>5m EMA20</span>
            <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base font-bold font-mono text-slate-200">
            ${ema20.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Pullback Benchmark
          </div>
        </div>

        {/* RSI 14 */}
        <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430]">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>RSI (14)</span>
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base font-bold font-mono text-slate-200">
            {rsi.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {rsi < 40 ? 'Oversold (<40)' : rsi > 60 ? 'Overbought (>60)' : 'Neutral'}
          </div>
        </div>

        {/* ADX 14 */}
        <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430]">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>ADX (14)</span>
            <span className="text-[10px] font-mono text-slate-500">&gt;20.0</span>
          </div>
          <div className="text-base font-bold font-mono">
            <span className={adx >= 20.0 ? 'text-emerald-400' : 'text-amber-400'}>
              {adx.toFixed(1)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {adx >= 20.0 ? 'Trend Confirmed' : 'Ranging'}
          </div>
        </div>
      </div>

      {/* Row 2: Advanced Volatility Indicators (Bollinger Bands & ATR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Bollinger Bands */}
        <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430] flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-0.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bollinger Bands (20, 2.0)</span>
            </div>
            <div className="text-xs font-mono text-slate-200">
              Upper: <span className="text-emerald-400">${bbUpper.toLocaleString()}</span> &bull; Mid: ${bbMid.toLocaleString()} &bull; Lower: <span className="text-red-400">${bbLower.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-mono">Bandwidth</span>
            <span className="text-xs font-bold font-mono text-cyan-400">{bbBw.toFixed(2)}%</span>
          </div>
        </div>

        {/* ATR Volatility */}
        <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430] flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-0.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>ATR Volatility (14)</span>
            </div>
            <div className="text-base font-bold font-mono text-slate-200">
              ${atr.toFixed(2)}
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <span>Dynamic Stop Distance</span>
            <span className="block text-[10px] font-mono text-slate-500">1.5x ATR Sizing</span>
          </div>
        </div>
      </div>

      {/* Rationale Banner */}
      <div className="bg-[#10141D] border border-[#1E2430] rounded-lg p-3 flex items-start space-x-2.5">
        {action !== 'NO_TRADE' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        )}
        <div className="text-xs">
          <span className="font-semibold text-slate-300">Decision Rationale: </span>
          <span className="text-slate-400 font-mono">{reason}</span>
          {!warmupComplete && (
            <span className="block text-amber-400 mt-1">
              Warning: Indicator warm-up incomplete. Signals blocked until sufficient closed candles are indexed.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

