import React from 'react';
import { EventItem } from '../types';
import { Terminal } from 'lucide-react';

interface EventJournalProps {
  events: EventItem[];
}

export const EventJournal: React.FC<EventJournalProps> = ({ events }) => {
  return (
    <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">System Audit Journal</h2>
        </div>
        <span className="text-xs text-slate-400 font-mono">Sanitized Log Stream</span>
      </div>

      <div className="bg-[#0B0E14] border border-[#1E2430] rounded-lg p-3 font-mono text-xs max-h-64 overflow-y-auto space-y-1.5">
        {events.length === 0 ? (
          <div className="text-slate-500 py-4 text-center">No system events logged yet.</div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="leading-relaxed hover:bg-[#151A23] p-1 rounded transition-colors">
              <span className="text-slate-500">[{new Date(ev.timestamp).toLocaleTimeString()}]</span>{' '}
              <span className="text-emerald-400 font-semibold">{ev.component}</span>{' '}
              <span className="text-slate-400 font-bold">[{ev.event_type}]</span>:{' '}
              <span className="text-slate-200">{ev.message}</span>
              {ev.details && <span className="text-slate-500 text-[11px] block pl-6">&rarr; {ev.details}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

