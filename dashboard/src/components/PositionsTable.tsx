import React from 'react';
import { PositionItem } from '../types';
import { Shield, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface PositionsTableProps {
  positions: PositionItem[];
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ positions }) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-xs font-mono text-slate-400">
        <span>Delta Exchange India Option & Futures Positions</span>
        <span className="text-violet-400 font-semibold">Live Authoritative Exchange State</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-violet-500/20">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0f0d1b] text-violet-300 uppercase font-mono text-[11px] border-b border-violet-500/20">
            <tr>
              <th className="py-2.5 px-3">Contract / Symbol</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Contracts</th>
              <th className="py-2.5 px-3">Entry Quote</th>
              <th className="py-2.5 px-3">Unrealized PnL</th>
              <th className="py-2.5 px-3">ATR Risk Brackets</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-500/10 bg-[#131020]/90">
            {positions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 font-mono text-xs">
                  No active option positions open on Delta Testnet. Bot is scanning for confirmed Supertrend & EMA setups.
                </td>
              </tr>
            ) : (
              positions.map((pos) => {
                const isOption = pos.symbol.startsWith('C-') || pos.symbol.startsWith('P-');
                const isCall = pos.symbol.startsWith('C-');
                return (
                  <tr key={pos.product_id} className="hover:bg-violet-950/20 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white font-mono flex items-center space-x-1.5">
                      <span>{pos.symbol}</span>
                      <span className="text-[10px] text-violet-400 bg-violet-950/50 px-1.5 py-0.5 rounded border border-violet-800/30">
                        {isOption ? 'OPTION' : 'PERP'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {isOption ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center space-x-1 ${
                            isCall
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isCall ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{isCall ? 'CALL' : 'PUT'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">STANDARD</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-xs inline-flex items-center ${
                          pos.size > 0
                            ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                            : 'text-slate-400'
                        }`}
                      >
                        {pos.size} {Math.abs(pos.size) === 1 ? 'Contract' : 'Contracts'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200">
                      ${pos.entry_price > 0 ? pos.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td
                      className={`py-3 px-3 font-mono font-bold ${
                        pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ${pos.unrealized_pnl >= 0 ? '+' : ''}{pos.unrealized_pnl.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="inline-flex items-center space-x-1 text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded text-[10px] font-mono">
                          <Shield className="w-3 h-3" />
                          <span>SL: 1.5x ATR</span>
                        </span>
                        <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-mono">
                          <Target className="w-3 h-3" />
                          <span>TP: 2.5x ATR</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
