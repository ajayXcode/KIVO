import React from 'react';
import { PositionItem } from '../types';
import { Shield } from 'lucide-react';

interface PositionsTableProps {
  positions: PositionItem[];
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ positions }) => {
  return (
    <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Authoritative Exchange Positions</h2>
          <p className="text-xs text-slate-400">Reconciled directly from Delta India Testnet</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#10141D] text-slate-400 uppercase font-mono border-b border-[#232936]">
            <tr>
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Size</th>
              <th className="py-2.5 px-3">Entry Price</th>
              <th className="py-2.5 px-3">Unrealized PnL</th>
              <th className="py-2.5 px-3">Realized PnL</th>
              <th className="py-2.5 px-3">Protection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2430]">
            {positions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No active open positions on Delta Testnet.
                </td>
              </tr>
            ) : (
              positions.map((pos) => (
                <tr key={pos.product_id} className="hover:bg-[#181E29] transition-colors">
                  <td className="py-3 px-3 font-semibold text-white font-mono">
                    {pos.symbol}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <span className={`px-2 py-0.5 rounded font-semibold ${
                      pos.size > 0 ? 'bg-emerald-500/20 text-emerald-400' : pos.size < 0 ? 'bg-red-500/20 text-red-400' : 'text-slate-400'
                    }`}>
                      {pos.size > 0 ? `+${pos.size}` : pos.size}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    ${pos.entry_price > 0 ? pos.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className={`py-3 px-3 font-mono font-semibold ${
                    pos.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    ${pos.unrealized_pnl >= 0 ? '+' : ''}{pos.unrealized_pnl.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    ${pos.realized_pnl.toFixed(2)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <Shield className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-mono">STOP ACTIVE</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

