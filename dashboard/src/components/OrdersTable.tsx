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
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'open':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'cancelled':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'rejected':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      default:
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-xs font-mono text-slate-400">
        <span>Execution Orders & Authoritative Fills</span>
        <span className="text-slate-500">Idempotent Client IDs</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#161D29]">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0C1017] text-slate-400 uppercase font-mono text-[11px] border-b border-[#161D29]">
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
          <tbody className="divide-y divide-[#161D29] bg-[#0E131C]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-mono text-xs">
                  No execution orders placed in the current session.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#141A26] transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">
                    {order.client_order_id}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold">
                    <span className={order.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                      {order.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {order.order_type}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold">
                    {order.size}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {order.stop_price ? `Stop: $${order.stop_price}` : order.limit_price ? `Limit: $${order.limit_price}` : 'MARKET'}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getStatusBadge(order.status)}`}>
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
