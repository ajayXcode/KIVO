import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { ChartCandle, BotStatus } from '../types';
import { Activity, TrendingUp, Sliders } from 'lucide-react';

interface TerminalChartProps {
  candles: ChartCandle[];
  status: BotStatus | null;
}

export const TerminalChart: React.FC<TerminalChartProps> = ({ candles, status }) => {
  const [showSupertrend, setShowSupertrend] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [showRsi, setShowRsi] = useState(true);

  const currentPrice = status?.latest_price ?? (candles.length > 0 ? candles[candles.length - 1].close : 0);
  const assetName = status?.underlying_asset || 'BTC';
  const symbol = status?.symbol || `${assetName}USD`;

  const minPrice = candles.length > 0
    ? Math.min(...candles.map((c) => Math.min(c.low, c.supertrend || c.low))) * 0.999
    : 0;
  const maxPrice = candles.length > 0
    ? Math.max(...candles.map((c) => Math.max(c.high, c.supertrend || c.high))) * 1.001
    : 100;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartCandle;
      const stDir = data.supertrend_direction;
      return (
        <div className="bg-[#120f22]/95 backdrop-blur-md border border-violet-500/30 p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1">
          <div className="text-violet-300 font-bold border-b border-violet-500/20 pb-1 flex justify-between">
            <span>BAR: {data.time}</span>
            <span className="text-purple-300 font-semibold">{status?.option_config?.timeframe || '5m'}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1">
            <span className="text-slate-400">OPEN: <span className="text-white">${data.open}</span></span>
            <span className="text-slate-400">HIGH: <span className="text-emerald-400">${data.high}</span></span>
            <span className="text-slate-400">LOW: <span className="text-rose-400">${data.low}</span></span>
            <span className="text-slate-400">CLOSE: <span className="text-white font-bold">${data.close}</span></span>
          </div>
          <div className="border-t border-violet-500/20 pt-1 text-[11px] space-y-0.5">
            <div className="flex justify-between text-violet-300">
              <span>EMA:</span>
              <span>${data.ema ?? data.ema20 ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className={stDir === 1 ? 'text-emerald-400' : 'text-rose-400'}>
                SUPERTREND ({stDir === 1 ? 'BULL' : stDir === -1 ? 'BEAR' : 'NEUT'}):
              </span>
              <span className={stDir === 1 ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>
                ${data.supertrend ?? '—'}
              </span>
            </div>
            {data.rsi !== undefined && (
              <div className="flex justify-between text-purple-400 font-bold">
                <span>RSI (14):</span>
                <span>{data.rsi}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="graphite-panel border border-violet-500/20 rounded-xl overflow-hidden shadow-lg flex flex-col bg-[#131020]/90">
      {/* Terminal Chart Header */}
      <div className="border-b border-violet-500/15 px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#0f0d1b]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-base font-extrabold text-white tracking-wider font-mono">
              {assetName} <span className="text-violet-400 font-normal">({symbol})</span>
            </span>
            <span className="bg-gradient-to-r from-violet-600/30 to-purple-600/30 text-violet-200 border border-violet-400/30 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
              Underlying Market
            </span>
          </div>
          <div className="h-4 w-[1px] bg-violet-900/40 hidden sm:block" />
          <div className="text-lg font-bold font-mono text-emerald-400 flex items-baseline space-x-1.5">
            <span>${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[11px] text-slate-400 font-normal">USD</span>
          </div>
        </div>

        {/* View Controls & Toggles */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSupertrend(!showSupertrend)}
            className={`text-[11px] px-2.5 py-1 rounded font-mono border transition-all ${
              showSupertrend
                ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 font-bold pro-glow-violet-sm'
                : 'bg-[#181428] text-slate-500 border-violet-900/20'
            }`}
          >
            Supertrend ({status?.option_config?.supertrend_period || 10}, {status?.option_config?.supertrend_multiplier || 3.0})
          </button>
          <button
            onClick={() => setShowEma(!showEma)}
            className={`text-[11px] px-2.5 py-1 rounded font-mono border transition-all ${
              showEma
                ? 'bg-violet-500/20 text-violet-200 border-violet-500/40 font-bold'
                : 'bg-[#181428] text-slate-500 border-violet-900/20'
            }`}
          >
            EMA ({status?.option_config?.ema_period || 20})
          </button>
          <button
            onClick={() => setShowRsi(!showRsi)}
            className={`text-[11px] px-2.5 py-1 rounded font-mono border transition-all ${
              showRsi
                ? 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40 font-bold'
                : 'bg-[#181428] text-slate-500 border-violet-900/20'
            }`}
          >
            RSI (14)
          </button>
          <div className="bg-[#181428] text-violet-300 border border-violet-500/20 text-[11px] font-mono px-2.5 py-1 rounded">
            {status?.option_config?.timeframe || '5m'} Bars
          </div>
        </div>
      </div>

      {/* Main Price & Technical Overlay Chart */}
      <div className="p-4 bg-gradient-to-b from-[#131020] to-[#0d0b17]">
        <div className="h-[280px] w-full">
          {candles.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-violet-400 font-mono">
              <Activity className="w-4 h-4 animate-spin mr-2 text-violet-400" />
              Ingesting closed candles for {assetName} from Delta India Testnet...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={candles} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradientViolet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  domain={[minPrice, maxPrice]}
                  orientation="right"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `$${val.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* EMA Line */}
                {showEma && (
                  <Line
                    type="monotone"
                    dataKey={(c) => c.ema ?? c.ema20}
                    stroke="#c084fc"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}

                {/* Supertrend Line */}
                {showSupertrend && (
                  <Line
                    type="monotone"
                    dataKey="supertrend"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}

                {/* Close Price Area */}
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  fill="url(#priceGradientViolet)"
                  dot={false}
                  isAnimationActive={false}
                />

                {/* Volume Bars */}
                <Bar dataKey="volume" yAxisId={1} fill="#4c1d95" opacity={0.25} />
                <YAxis yAxisId={1} orientation="left" hide domain={[0, 'dataMax * 4']} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* RSI Sub-Panel */}
        {showRsi && candles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-violet-500/15">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span className="text-violet-300 font-bold">RSI (14) OSCILLATOR</span>
              </span>
              <span>Rebound &lt;40 | Rejection &gt;60</span>
            </div>
            <div className="h-[75px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={candles} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} orientation="right" stroke="#64748b" fontSize={9} ticks={[30, 40, 60, 70]} />
                  <ReferenceLine y={40} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.6} />
                  <ReferenceLine y={60} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.6} />
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    stroke="#a855f7"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
