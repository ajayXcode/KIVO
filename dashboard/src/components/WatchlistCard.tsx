import React, { useState } from 'react';
import { WatchlistItem } from '../types';
import { ListFilter, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
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
    <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <ListFilter className="w-4 h-4 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Market Watchlist Scanner</h2>
        </div>
        <span className="text-xs text-slate-400 font-mono">Delta India Testnet</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#10141D] text-slate-400 uppercase font-mono border-b border-[#232936]">
            <tr>
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-3">Mark Price</th>
              <th className="py-2.5 px-3">24h Change</th>
              <th className="py-2.5 px-3">Trend</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2430]">
            {watchlist.map((item) => (
              <tr
                key={item.symbol}
                className={`transition-colors ${item.is_active ? 'bg-emerald-500/10' : 'hover:bg-[#181E29]'}`}
              >
                <td className="py-3 px-3 font-semibold text-white font-mono flex items-center space-x-2">
                  <span>{item.symbol}</span>
                  {item.is_active && (
                    <span className="bg-emerald-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.2 rounded font-sans uppercase">
                      Active
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 font-mono text-slate-200">
                  {item.price > 0 ? `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Syncing...'}
                </td>
                <td className="py-3 px-3 font-mono">
                  <span className={`flex items-center space-x-1 ${item.change_24h_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.change_24h_pct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{item.change_24h_pct >= 0 ? '+' : ''}{item.change_24h_pct.toFixed(2)}%</span>
                  </span>
                </td>
                <td className="py-3 px-3 font-mono">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    item.trend === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400' : item.trend === 'BEARISH' ? 'bg-red-500/20 text-red-400' : 'text-slate-400'
                  }`}>
                    {item.trend}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  {item.is_active ? (
                    <span className="text-[11px] text-emerald-400 font-mono font-semibold">Trading Now</span>
                  ) : (
                    <button
                      onClick={() => handleSwitch(item.symbol)}
                      disabled={switching !== null}
                      className="bg-[#1E2430] hover:bg-[#283142] text-slate-300 px-2.5 py-1 rounded text-[11px] font-mono border border-[#2D3748] transition-colors inline-flex items-center space-x-1"
                    >
                      <span>{switching === item.symbol ? 'Loading...' : 'Select'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

