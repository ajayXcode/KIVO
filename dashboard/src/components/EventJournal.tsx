import React from 'react';
import { EventItem } from '../types';

interface EventJournalProps {
  events: EventItem[];
}

export const EventJournal: React.FC<EventJournalProps> = ({ events }) => {
  const getBadgeForType = (type: string) => {
    switch (type.toUpperCase()) {
      case 'ORDER_SUBMITTED':
      case 'ORDER_FILLED':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'ORDER_REJECTED':
      case 'CIRCUIT_BREAKER':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'RECONCILIATION':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'STRATEGY_SIGNAL':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-xs font-mono text-slate-400">
        <span>Real-Time Audit Journal</span>
        <span className="text-[10px] text-slate-500">Sanitized (No Secrets / Nonce Auth)</span>
      </div>

      <div className="bg-[#0C1017] border border-[#161D29] rounded-lg p-3 font-mono text-xs max-h-72 overflow-y-auto space-y-1.5 divide-y divide-[#141A26]">
        {events.length === 0 ? (
          <div className="text-slate-500 py-6 text-center text-xs">
            System initialized. Awaiting market ticks and strategy signals.
          </div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="pt-1.5 first:pt-0 leading-relaxed">
              <div className="flex items-center space-x-2 text-[11px]">
                <span className="text-slate-500">[{new Date(ev.timestamp).toLocaleTimeString()}]</span>
                <span className="text-slate-300 font-semibold">{ev.component}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-bold ${getBadgeForType(ev.event_type)}`}>
                  {ev.event_type}
                </span>
              </div>
              <div className="text-slate-300 text-xs pl-2 mt-0.5 font-normal">
                {ev.message}
              </div>
              {ev.details && (
                <div className="text-slate-500 text-[10px] pl-4 mt-0.5 font-mono">
                  &rarr; {ev.details}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
