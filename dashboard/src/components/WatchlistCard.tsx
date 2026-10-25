import React, { useState } from 'react';
import { WatchlistItem } from '../types';
import { ListFilter, TrendingUp, TrendingDown, ArrowRight, CheckCircle2 } from 'lucide-react';
import { switchSymbol } from '../api';

interface WatchlistCardProps {
  watchlist: WatchlistItem[];
  onSymbolSwitched: () => void;
}

export const WatchlistCard: React.FC<WatchlistCardProps> = ({ watchlist, onSymbolSwitched }) => {
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSwitch = async (sym: string) => {
    try {
      setSwitching(sym);
      await switchSymbol(sym);
      onSymbolSwitched();
    } catch (err: any) {
      alert(`Could not switch symbol: ${err.message}`);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="bg-[#0F141E] border border-[#1C2433] rounded-xl overflow-hidden shadow-sm">
      <div className="border-b border-[#161D29] bg-[#0C1017] px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ListFilter className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Market Watchlist Scanner</h2>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">1-CLICK SWITCH</span>
      </div>

      <div className="divide-y divide-[#161D29]">
        {watchlist.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 font-mono">
            Scanning Delta Testnet pairs...
          </div>
        ) : (
          watchlist.map((item) => (
            <div
              key={item.symbol}
              onClick={() => !item.is_active && handleSwitch(item.symbol)}
              className={`p-3 flex items-center justify-between transition-all cursor-pointer ${
                item.is_active
                  ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
                  : 'hover:bg-[#141A26] border-l-2 border-transparent'
              }`}
            >
              {/* Asset Name & Trend */}
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-white tracking-wide">
                    {item.symbol}
                  </span>
                  {item.is_active ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.2 rounded font-bold">
                      TRADING
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-500 font-mono">PERP</span>
                  )}
                </div>
                <div className="text-[10px] font-mono">
                  <span
                    className={`font-semibold ${
                      item.trend === 'BULLISH'
                        ? 'text-emerald-400'
                        : item.trend === 'BEARISH'
                        ? 'text-red-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.trend}
                  </span>
                </div>
              </div>

              {/* Price & 24h Change */}
              <div className="text-right space-y-0.5">
                <div className="text-xs font-mono font-bold text-slate-200">
                  {item.price > 0 ? `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                </div>
                <div className="text-[10px] font-mono">
                  <span
                    className={`inline-flex items-center space-x-0.5 ${
                      item.change_24h_pct >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {item.change_24h_pct >= 0 ? (
                      <TrendingUp className="w-3 h-3 inline" />
                    ) : (
                      <TrendingDown className="w-3 h-3 inline" />
                    )}
                    <span>
                      {item.change_24h_pct >= 0 ? '+' : ''}
                      {item.change_24h_pct.toFixed(2)}%
                    </span>
                  </span>
                </div>
              </div>

              {/* Action indicator */}
              <div className="pl-2">
                {item.is_active ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <button
                    disabled={switching === item.symbol}
                    className="p-1 rounded bg-[#161D29] hover:bg-[#1E2738] text-slate-400 hover:text-slate-200 transition-colors"
                    title="Switch active trading asset"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
