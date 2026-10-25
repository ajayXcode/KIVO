import React, { useState } from 'react';
import { Play, Pause, AlertOctagon, RefreshCw, XCircle, Bot, Hand, ShieldAlert, Cpu, RotateCcw } from 'lucide-react';
import { BotStatus } from '../types';
import {
  sendPause,
  sendResume,
  sendKill,
  sendReconcile,
  sendClosePosition,
  setAutomationMode,
  clearSession
} from '../api';

interface ControlsCardProps {
  status: BotStatus | null;
  onRefresh: () => void;
}

export const ControlsCard: React.FC<ControlsCardProps> = ({ status, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmClearSession, setConfirmClearSession] = useState(false);

  const state = status?.state ?? 'INITIALIZING';
  const isAutoPilot = status?.automation_mode === 'AUTO_PILOT';
  const hasPosition = (status?.current_position_size ?? 0) !== 0;

  const handlePause = async () => {
    try {
      setLoading(true);
      await sendPause();
      onRefresh();
    } catch (err: any) {
      alert(`Pause failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      await sendResume();
      onRefresh();
    } catch (err: any) {
      alert(`Resume failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKill = async () => {
    try {
      setLoading(true);
      await sendKill();
      setConfirmKill(false);
      onRefresh();
    } catch (err: any) {
      alert(`Emergency kill failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePosition = async () => {
    try {
      setLoading(true);
      await sendClosePosition();
      setConfirmClose(false);
      onRefresh();
    } catch (err: any) {
      alert(`Market flatten failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSession = async () => {
    try {
      setLoading(true);
      await clearSession();
      setConfirmClearSession(false);
      onRefresh();
    } catch (err: any) {
      alert(`Safety clear session failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutomation = async () => {
    try {
      setLoading(true);
      await setAutomationMode(!isAutoPilot);
      onRefresh();
    } catch (err: any) {
      alert(`Could not toggle automation mode: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    try {
      setLoading(true);
      await sendReconcile();
      onRefresh();
    } catch (err: any) {
      alert(`Reconcile failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="graphite-panel p-4 rounded-xl border border-violet-500/20 bg-[#131020]/80 shadow-lg space-y-3.5">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-violet-500/15 pb-2.5">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Tactical Bridge</h2>
        </div>
        <button
          onClick={handleReconcile}
          disabled={loading}
          className="flex items-center space-x-1 text-[11px] font-mono text-violet-300 hover:text-white bg-violet-950/40 hover:bg-violet-900/50 px-2.5 py-1 rounded-md border border-violet-800/40 transition-colors"
          title="Force authoritative sync with Delta Testnet"
        >
          <RefreshCw className={`w-3 h-3 text-violet-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* Automation Mode Switcher */}
      <div className="bg-[#0f0d1b] p-3 rounded-lg border border-violet-500/15 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className={`p-1.5 rounded-md ${isAutoPilot ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {isAutoPilot ? <Bot className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-white">
              {isAutoPilot ? 'AUTONOMOUS EXECUTION' : 'MANUAL APPROVALS'}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {isAutoPilot ? 'Bot buys confirmed ATM options on signal' : 'Manual operator review'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleAutomation}
          disabled={loading}
          className={`text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-md border transition-all ${
            isAutoPilot
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 pro-glow-emerald'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
          }`}
        >
          {isAutoPilot ? 'Switch Manual' : 'Enable Auto'}
        </button>
      </div>

      {/* Execution Actions Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Resume */}
        <button
          onClick={handleResume}
          disabled={loading || state === 'RUNNING' || status?.circuit_breaker_triggered}
          className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg font-mono font-bold text-xs transition-all ${
            state === 'RUNNING'
              ? 'bg-[#181428] text-slate-600 border border-violet-900/20 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white pro-glow-emerald'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Resume</span>
        </button>

        {/* Pause */}
        <button
          onClick={handlePause}
          disabled={loading || state === 'PAUSED' || state === 'HALTED'}
          className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg font-mono font-bold text-xs border transition-all ${
            state === 'PAUSED'
              ? 'bg-[#181428] text-slate-600 border-violet-900/20 cursor-not-allowed'
              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
          }`}
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Pause</span>
        </button>

        {/* Panic Flatten / Market Close */}
        {confirmClose ? (
          <div className="flex space-x-1 col-span-1">
            <button
              onClick={handleClosePosition}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-mono font-bold py-1.5 px-1 rounded text-[10px]"
            >
              Confirm Flatten
            </button>
            <button
              onClick={() => setConfirmClose(false)}
              className="bg-slate-800 text-slate-300 font-mono text-[10px] px-2 py-1.5 rounded"
            >
              X
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClose(true)}
            disabled={loading || !hasPosition}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg font-mono font-bold text-xs border transition-all ${
              hasPosition
                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30 pro-glow-red'
                : 'bg-[#181428] text-slate-600 border-violet-900/20 cursor-not-allowed'
            }`}
            title="Instant market close of active option position"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Close Option</span>
          </button>
        )}

        {/* Emergency Kill */}
        {confirmKill ? (
          <div className="flex space-x-1 col-span-1">
            <button
              onClick={handleKill}
              disabled={loading}
              className="flex-1 bg-red-700 hover:bg-red-800 text-white font-mono font-extrabold py-1.5 px-1 rounded text-[10px] animate-pulse"
            >
              HALT BOT
            </button>
            <button
              onClick={() => setConfirmKill(false)}
              className="bg-slate-800 text-slate-300 font-mono text-[10px] px-2 py-1.5 rounded"
            >
              X
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmKill(true)}
            disabled={loading || state === 'HALTED'}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg font-mono font-bold text-xs border transition-all ${
              state === 'HALTED'
                ? 'bg-[#181428] text-slate-600 border-violet-900/20 cursor-not-allowed'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Kill Switch</span>
          </button>
        )}
      </div>

      {/* Safety: Stop, Close Tracked Positions & Fresh Start */}
      <div className="pt-1">
        {confirmClearSession ? (
          <div className="flex items-center space-x-1.5 p-2 rounded-lg bg-red-950/40 border border-red-500/40">
            <button
              onClick={handleClearSession}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-mono font-bold py-1.5 px-2 rounded text-xs flex items-center justify-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Confirm Safety Clear & Reset</span>
            </button>
            <button
              onClick={() => setConfirmClearSession(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded font-mono text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClearSession(true)}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-violet-950/40 hover:bg-violet-900/60 border border-violet-500/25 hover:border-violet-500/50 text-violet-300 font-mono text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
            title="Stop & close tracked option positions, purge session data for a fresh start"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Safety: Stop, Close & Reset Session</span>
          </button>
        )}
      </div>

      {/* Safety Risk Guard Metrics */}
      <div className="bg-[#0f0d1b] p-2.5 rounded-lg border border-violet-500/15 space-y-1.5 text-[10px] font-mono">
        <div className="flex justify-between text-slate-400">
          <span>RISK BUDGET PER TRADE:</span>
          <span className="text-slate-200 font-bold">0.25% ($25.00)</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>MAX DAILY LOSS CIRCUIT:</span>
          <span className="text-rose-400 font-bold">1.50% ($150.00)</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>CONCURRENT OPTION TRADES:</span>
          <span className="text-violet-300 font-bold">MAX 1 (STRICT)</span>
        </div>
      </div>
    </div>
  );
};
