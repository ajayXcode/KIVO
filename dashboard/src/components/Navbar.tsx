import React, { useState } from 'react';
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  Key,
  Bot,
  Hand,
  Radio,
  RefreshCw,
  XCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { BotStatus } from '../types';
import { sendReconcile, sendClosePosition, setAutomationMode } from '../api';

interface NavbarProps {
  status: BotStatus | null;
  onOpenCredentials: () => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ status, onOpenCredentials, onRefresh }) => {
  const [reconciling, setReconciling] = useState(false);
  const [confirmFlatten, setConfirmFlatten] = useState(false);
  const [flattening, setFlattening] = useState(false);

  const isHealthy = status?.reconciliation_healthy ?? false;
  const isCircuitBroken = status?.circuit_breaker_triggered ?? false;
  const isAutoPilot = status?.automation_mode === 'AUTO_PILOT';
  const hasKeys = status?.credentials_configured ?? false;
  const maskedKey = status?.masked_api_key ?? 'Not Configured';
  const currentSymbol = status?.symbol ?? 'BTCUSD';
  const markPrice = status?.latest_price ?? 0;
  const hasPosition = (status?.current_position_size ?? 0) !== 0;

  const handleReconcile = async () => {
    try {
      setReconciling(true);
      await sendReconcile();
      onRefresh();
    } catch (err: any) {
      alert(`Reconcile failed: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  const handleQuickFlatten = async () => {
    try {
      setFlattening(true);
      await sendClosePosition();
      setConfirmFlatten(false);
      onRefresh();
    } catch (err: any) {
      alert(`Panic close failed: ${err.message}`);
    } finally {
      setFlattening(false);
    }
  };

  const handleToggleAutoPilot = async () => {
    try {
      await setAutomationMode(!isAutoPilot);
      onRefresh();
    } catch (err: any) {
      alert(`Could not toggle automation: ${err.message}`);
    }
  };

  return (
    <header className="border-b border-[#1A2333] bg-[#0C1017]/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Section: Brand & Active Market Ticker */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white font-mono">EDGEPILOT</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight hidden sm:block">Delta Exchange India Testnet</p>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#1E2738] hidden md:block" />

          {/* Active Symbol & Mark Price Ticker */}
          <div className="flex items-center space-x-3 bg-[#111722] border border-[#1E2738] rounded-lg px-3 py-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold font-mono text-white tracking-wider">{currentSymbol}</span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono">PERP</span>
            </div>
            {markPrice > 0 && (
              <div className="flex items-center space-x-1 font-mono text-xs font-bold text-emerald-400">
                <span>${markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          {/* Testnet Connectivity Pill */}
          <div className="hidden lg:flex items-center space-x-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>TESTNET LIVE</span>
          </div>
        </div>

        {/* Right Section: Automation, Direct Keys & Panic Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Automation Mode Toggle Pill */}
          <button
            onClick={handleToggleAutoPilot}
            className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg font-mono font-bold border transition-all ${
              isAutoPilot
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:bg-emerald-500/25'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
            }`}
            title="Click to toggle Auto-Pilot execution"
          >
            {isAutoPilot ? <Bot className="w-3.5 h-3.5 text-emerald-400" /> : <Hand className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isAutoPilot ? 'AUTO-PILOT: ON' : 'AUTO-PILOT: OFF'}</span>
          </button>

          {/* Direct API Keys Setup Button */}
          <button
            onClick={onOpenCredentials}
            className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg border font-mono transition-all ${
              hasKeys
                ? 'bg-[#151C28] hover:bg-[#1E2738] text-slate-200 border-[#263248]'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40 animate-pulse font-bold'
            }`}
            title="Configure or update Delta API keys directly in UI"
          >
            <Key className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{hasKeys ? `Keys: ${maskedKey}` : 'Setup API Keys'}</span>
            <span className="sm:hidden">{hasKeys ? 'Keys Configured' : 'Keys'}</span>
          </button>

          {/* Quick Panic Flatten / Market Close (visible if position > 0) */}
          {hasPosition && (
            confirmFlatten ? (
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleQuickFlatten}
                  disabled={flattening}
                  className="bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-[10px] px-2 py-1.5 rounded"
                >
                  {flattening ? 'Closing...' : 'Confirm Flatten'}
                </button>
                <button
                  onClick={() => setConfirmFlatten(false)}
                  className="bg-slate-800 text-slate-300 font-mono text-[10px] px-1.5 py-1.5 rounded"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmFlatten(true)}
                className="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all animate-pulse"
                title="Immediately market-close current open position"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PANIC CLOSE</span>
              </button>
            )
          )}

          {/* Circuit Breaker Alert */}
          {isCircuitBroken && (
            <div className="flex items-center space-x-1 text-[11px] font-mono font-bold bg-red-500/20 border border-red-500/40 text-red-400 px-2.5 py-1.5 rounded-lg animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>CIRCUIT BREAKER</span>
            </div>
          )}

          {/* Reconcile Sync Button */}
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="flex items-center space-x-1 text-xs text-slate-300 bg-[#151C28] hover:bg-[#1E2738] px-2.5 py-1.5 rounded-lg border border-[#263248] transition-colors"
            title="Reconcile authoritative exchange state"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${reconciling ? 'animate-spin' : ''}`} />
            <ShieldCheck className={`w-3.5 h-3.5 ${isHealthy ? 'text-emerald-400' : 'text-amber-400'}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
