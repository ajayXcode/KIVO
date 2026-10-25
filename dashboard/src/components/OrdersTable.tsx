import React from 'react';
import { OrderItem } from '../types';

interface OrdersTableProps {
  orders: OrderItem[];
}

export const OrdersTable: React.FC<OrdersTableProps> = ({ orders }) => {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'closed':
      case 'filled':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'open':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled':
        return 'bg-slate-700 text-slate-400 border-slate-600';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  return (
    <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Execution Journal & Orders</h2>
          <p className="text-xs text-slate-400">Idempotent client order IDs & Delta Testnet executions</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#10141D] text-slate-400 uppercase font-mono border-b border-[#232936]">
            <tr>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Client Order ID</th>
              <th className="py-2.5 px-3">Side</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Size</th>
              <th className="py-2.5 px-3">Price / Trigger</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2430]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  No orders placed yet in this session.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#181E29] transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">
                    {order.client_order_id}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold">
                    <span className={order.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                      {order.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {order.order_type}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {order.size}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {order.stop_price ? `Stop: $${order.stop_price}` : order.limit_price ? `Limit: $${order.limit_price}` : 'MARKET'}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${getStatusBadge(order.status)}`}>
                      {order.status.toUpperCase()}
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

