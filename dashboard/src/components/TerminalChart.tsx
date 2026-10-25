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
import { Activity, Zap, ArrowUpRight, ArrowDownRight, Layers, Shield } from 'lucide-react';

interface TerminalChartProps {
  candles: ChartCandle[];
  status: BotStatus | null;
}

export const TerminalChart: React.FC<TerminalChartProps> = ({ candles, status }) => {
  const [showSupertrend, setShowSupertrend] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showRsi, setShowRsi] = useState(true);

  const currentPrice = status?.latest_price ?? (candles.length > 0 ? candles[candles.length - 1].close : 0);
  const assetName = status?.underlying_asset || 'BTC';
  const symbol = status?.symbol || `${assetName}USD`;
  const latestSignal = status?.latest_signal;
  const atmOption = status?.atm_option;
  const isAutoPilot = status?.automation_mode === 'AUTO_PILOT';

  // Inject current live spot price into the latest candle for real-time live chart action
  const liveCandles = React.useMemo(() => {
    if (candles.length === 0) return [];
    const copy = [...candles];
    if (currentPrice > 0) {
      const last = { ...copy[copy.length - 1] };
      last.close = currentPrice;
      if (currentPrice > last.high) last.high = currentPrice;
      if (currentPrice < last.low) last.low = currentPrice;
      copy[copy.length - 1] = last;
    }
    return copy;
  }, [candles, currentPrice]);

  const minPrice = liveCandles.length > 0
    ? Math.min(...liveCandles.map((c) => Math.min(c.low, c.supertrend || c.low, c.bb_lower || c.low))) * 0.999
    : 0;
  const maxPrice = liveCandles.length > 0
    ? Math.max(...liveCandles.map((c) => Math.max(c.high, c.supertrend || c.high, c.bb_upper || c.high))) * 1.001
    : 100;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartCandle;
      const stDir = data.supertrend_direction;
      return (
        <div className="bg-[#0c1017]/95 backdrop-blur-md border border-[#1f293d] p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1">
          <div className="text-slate-300 font-bold border-b border-[#1c2433] pb-1 flex justify-between">
            <span>BAR: {data.time}</span>
            <span className="text-emerald-400 font-semibold">{status?.option_config?.timeframe || '5m'} LIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1">
            <span className="text-slate-400">OPEN: <span className="text-white">${data.open}</span></span>
            <span className="text-slate-400">HIGH: <span className="text-emerald-400">${data.high}</span></span>
            <span className="text-slate-400">LOW: <span className="text-rose-400">${data.low}</span></span>
            <span className="text-slate-400">CLOSE: <span className="text-white font-bold">${data.close}</span></span>
          </div>
          <div className="border-t border-[#1c2433] pt-1 text-[11px] space-y-0.5">
            <div className="flex justify-between text-amber-300">
              <span>EMA 20:</span>
              <span>${data.ema ?? data.ema20 ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className={stDir === 1 ? 'text-emerald-400' : 'text-rose-400'}>
                SUPERTREND:
              </span>
              <span className={stDir === 1 ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>
                ${data.supertrend ?? '—'}
              </span>
            </div>
            {data.bb_upper && (
              <div className="flex justify-between text-cyan-300">
                <span>BB BANDS:</span>
                <span>${data.bb_lower?.toFixed(0)} - ${data.bb_upper?.toFixed(0)}</span>
              </div>
            )}
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
    <div className="bg-[#0F141E] border border-[#1C2433] rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Terminal Chart Header */}
      <div className="border-b border-[#161D29] px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#0C1017]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-base font-extrabold text-white tracking-wider font-mono">
              {assetName} <span className="text-slate-400 font-normal">({symbol})</span>
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
              Delta Testnet Live Feed
            </span>
          </div>
          <div className="h-4 w-[1px] bg-[#1E2738] hidden sm:block" />
          <div className="text-lg font-bold font-mono text-emerald-400 flex items-baseline space-x-1.5">
            <span>${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-slate-500 font-normal">USD</span>
          </div>
        </div>

        {/* View Controls & Indicator Toggles */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => setShowSupertrend(!showSupertrend)}
            className={`text-[11px] px-2.5 py-1 rounded font-mono border transition-all ${
              showSupertrend
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-bold'
                : 'bg-[#141A26] text-slate-500 border-[#1E2738]'
            }`}
          >
            Supertrend
          </button>
          <button
            onClick={() => setShowEma(!showEma)}
            className={`text-[11px] px-2.5 py-1 rounded font-mono border transition-all ${
              showEma
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold'
                : 'bg-[#141A26] text-slate-500 border-[#1E2738]'
            }`}
          >
            EMA 20
          </button>
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`text-[11px] px-2.5 py-1 rounded font-mono border transition-all ${
              showBollinger
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-bold'
                : 'bg-[#141A26] text-slate-500 border-[#1E2738]'
            }`}
          >
            Bollinger
          </button>
          <button
            onClick={() => setShowRsi(!showRsi)}
            className={`text-[11px] px-2.5 py-1 rounded font-mono border transition-all ${
              showRsi
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-bold'
                : 'bg-[#141A26] text-slate-500 border-[#1E2738]'
            }`}
          >
            RSI
          </button>
          <div className="bg-[#141A26] text-slate-300 border border-[#1E2738] text-[11px] font-mono px-2 py-1 rounded hidden sm:block">
            {status?.option_config?.timeframe || '5m'} Bars
          </div>
        </div>
      </div>

      {/* Real-Time Live Scalping Banner Overlay */}
      <div className="bg-[#0A0E15] px-4 py-2 border-b border-[#161D29] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAutoPilot ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isAutoPilot ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-slate-400 text-[11px]">AUTONOMOUS SCALPER:</span>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
              isAutoPilot ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {isAutoPilot ? 'AUTO-PILOT ACTIVE (<2s Loop)' : 'MANUAL CONFIRMATION'}
            </span>
          </div>

          {latestSignal && latestSignal.action !== 'NO_TRADE' && (
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 text-[11px]">SETUP:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] flex items-center space-x-1 ${
                latestSignal.action.includes('CALL') || latestSignal.action.includes('LONG')
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {latestSignal.action.includes('CALL') ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{latestSignal.action}</span>
                <span className="opacity-75 font-normal">({latestSignal.indicators?.setup_type || 'RPB'} • {latestSignal.indicators?.confidence_pct || 80}%)</span>
              </span>
            </div>
          )}
        </div>

        {atmOption && (
          <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
            <span className="text-slate-400">OPTION TARGET:</span>
            <span className="text-white font-bold bg-[#141A26] px-2 py-0.5 rounded border border-[#1E2738]">{atmOption.symbol}</span>
            <span className="text-emerald-400 font-bold font-mono">${atmOption.quote_price.toFixed(1)}</span>
            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] px-1.5 py-0.5 rounded font-bold">
              SL: ${atmOption.stop_loss_price.toFixed(1)} (1.5x ATR)
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-1.5 py-0.5 rounded font-bold">
              TP: ${atmOption.take_profit_price.toFixed(1)} (2.5x ATR)
            </span>
          </div>
        )}
      </div>

      {/* Main Price & Technical Overlay Chart */}
      <div className="p-4 bg-gradient-to-b from-[#0F141E] to-[#090D14]">
        <div className="h-[300px] w-full">
          {liveCandles.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
              <Activity className="w-4 h-4 animate-spin mr-2 text-emerald-400" />
              Ingesting closed candles for {assetName} from Delta India Testnet...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={liveCandles} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradientEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E676" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#00E676" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis
                  domain={[minPrice, maxPrice]}
                  orientation="right"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `$${val.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Live Current Price Horizontal Reference Line */}
                {currentPrice > 0 && (
                  <ReferenceLine
                    y={currentPrice}
                    stroke="#00E5FF"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{
                      value: `LIVE SPOT: $${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
                      fill: '#00E5FF',
                      fontSize: 10,
                      fontWeight: 'bold',
                      position: 'insideTopRight',
                    }}
                  />
                )}

                {/* Bollinger Bands Overlay */}
                {showBollinger && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="bb_upper"
                      stroke="#00E5FF"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="bb_lower"
                      stroke="#00E5FF"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </>
                )}

                {/* EMA 20 Mean Reversion Line */}
                {showEma && (
                  <Line
                    type="monotone"
                    dataKey={(c) => c.ema ?? c.ema20}
                    stroke="#FFB020"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}

                {/* Supertrend Volatility Line */}
                {showSupertrend && (
                  <Line
                    type="monotone"
                    dataKey="supertrend"
                    stroke="#00E676"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}

                {/* Close Price Area */}
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="#00E676"
                  strokeWidth={2}
                  fill="url(#priceGradientEmerald)"
                  dot={false}
                  isAnimationActive={false}
                />

                {/* Volume Histogram */}
                <Bar dataKey="volume" yAxisId={1} fill="#1E293B" opacity={0.3} />
                <YAxis yAxisId={1} orientation="left" hide domain={[0, 'dataMax * 4']} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* RSI Sub-Panel */}
        {showRsi && liveCandles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#161D29]">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-purple-300 font-bold">RSI (14) MOMENTUM OSCILLATOR</span>
              </span>
              <span>Rebound &lt;40 | Overbought &gt;60</span>
            </div>
            <div className="h-[75px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={liveCandles} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} orientation="right" stroke="#475569" fontSize={9} ticks={[30, 40, 60, 70]} />
                  <ReferenceLine y={40} stroke="#00E676" strokeDasharray="3 3" strokeOpacity={0.6} />
                  <ReferenceLine y={60} stroke="#FF334B" strokeDasharray="3 3" strokeOpacity={0.6} />
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    stroke="#A855F7"
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
