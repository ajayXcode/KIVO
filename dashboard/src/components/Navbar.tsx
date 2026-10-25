import React from 'react';
import { ShieldCheck, Activity, AlertTriangle, Key, Bot, Hand } from 'lucide-react';
import { BotStatus } from '../types';

interface NavbarProps {
  status: BotStatus | null;
  onOpenCredentials: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ status, onOpenCredentials }) => {
  const isHealthy = status?.reconciliation_healthy ?? false;
  const isCircuitBroken = status?.circuit_breaker_triggered ?? false;
  const isAutoPilot = status?.automation_mode === 'AUTO_PILOT';
  const hasKeys = status?.credentials_configured ?? false;
  const maskedKey = status?.masked_api_key ?? 'Not Configured';

  return (
    <header className="border-b border-[#232936] bg-[#121721] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center space-x-3">
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-lg text-emerald-400">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-white">EdgePilot</h1>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2 py-0.5 rounded font-mono font-semibold">
              TESTNET ONLY
            </span>
          </div>
          <p className="text-xs text-slate-400">Delta Exchange India Algorithmic Trading Bot</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Automation Mode Pill */}
        <div className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-md font-mono border ${
          isAutoPilot
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        }`}>
          {isAutoPilot ? <Bot className="w-3.5 h-3.5" /> : <Hand className="w-3.5 h-3.5" />}
          <span>{isAutoPilot ? 'AUTO-PILOT' : 'MANUAL'}</span>
        </div>

        {/* Frontend Credentials Button */}
        <button
          onClick={onOpenCredentials}
          className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-md border font-mono transition-colors ${
            hasKeys
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40 animate-pulse'
          }`}
          title="Click to configure Delta API Key & Secret"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasKeys ? `Keys: ${maskedKey}` : 'Setup API Keys'}</span>
        </button>

        {/* Circuit Breaker Alert */}
        {isCircuitBroken && (
          <div className="flex items-center space-x-1.5 bg-red-500/20 border border-red-500/40 text-red-400 text-xs px-3 py-1.5 rounded-md font-medium">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>CIRCUIT BREAKER</span>
          </div>
        )}

        {/* Reconciliation health */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-300 bg-[#1A202C] px-3 py-1.5 rounded-md border border-[#2D3748]">
          <ShieldCheck className={`w-4 h-4 ${isHealthy ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>{isHealthy ? 'Reconciled' : 'Syncing'}</span>
        </div>
      </div>
    </header>
  );
};

