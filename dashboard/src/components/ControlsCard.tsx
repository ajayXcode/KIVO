import React, { useState } from 'react';
import { Play, Pause, AlertOctagon, RefreshCw, XCircle, Bot, Hand } from 'lucide-react';
import { BotStatus } from '../types';
import { sendPause, sendResume, sendKill, sendReconcile, sendClosePosition, setAutomationMode } from '../api';

interface ControlsCardProps {
  status: BotStatus | null;
  onRefresh: () => void;
}

export const ControlsCard: React.FC<ControlsCardProps> = ({ status, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const state = status?.state ?? 'INITIALIZING';
  const isAutoPilot = status?.automation_mode === 'AUTO_PILOT';
  const hasPosition = (status?.current_position_size ?? 0) !== 0;

  const handlePause = async () => {
    try {
      setLoading(true);
      await sendPause();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
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
      alert(err.message);
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
      alert(err.message);
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
      alert(`Failed to close position: ${err.message}`);
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
      alert(err.message);
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
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-white">Execution & Automation Controls</h2>
          <p className="text-xs text-slate-400">Tactical controls, emergency stops, and automation mode</p>
        </div>
        <button
          onClick={handleReconcile}
          disabled={loading}
          className="flex items-center space-x-1.5 text-xs bg-[#1E2430] hover:bg-[#283142] text-slate-300 px-3 py-1.5 rounded-lg border border-[#2D3748] transition-colors"
          title="Force exchange reconciliation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reconcile</span>
        </button>
      </div>

      {/* Automation Mode Switcher */}
      <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isAutoPilot ? (
            <Bot className="w-4 h-4 text-emerald-400" />
          ) : (
            <Hand className="w-4 h-4 text-amber-400" />
          )}
          <div>
            <div className="text-xs font-bold text-white">
              {isAutoPilot ? 'AUTO-PILOT ACTIVE' : 'MANUAL ADVISORY MODE'}
            </div>
            <p className="text-[10px] text-slate-500">
              {isAutoPilot
                ? 'Automated trade execution enabled upon approved risk & signal.'
                : 'Signals generate alerts only; manual trigger required.'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleAutomation}
          disabled={loading}
          className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
            isAutoPilot
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
          }`}
        >
          {isAutoPilot ? 'Disable Auto' : 'Enable Auto-Pilot'}
        </button>
      </div>

      {/* Main Tactical Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Resume */}
        <button
          onClick={handleResume}
          disabled={loading || state === 'RUNNING' || status?.circuit_breaker_triggered}
          className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs transition-all shadow-sm ${
            state === 'RUNNING'
              ? 'bg-emerald-950/40 text-emerald-700 border border-emerald-900/40 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Resume</span>
        </button>

        {/* Pause */}
        <button
          onClick={handlePause}
          disabled={loading || state === 'PAUSED' || state === 'HALTED'}
          className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs transition-all border ${
            state === 'PAUSED'
              ? 'bg-amber-950/20 text-amber-700 border-amber-900/30 cursor-not-allowed'
              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Pause</span>
        </button>

        {/* Emergency Flatten / Close Position */}
        {confirmClose ? (
          <div className="flex space-x-1 col-span-1">
            <button
              onClick={handleClosePosition}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-1 rounded-lg text-[10px]"
            >
              Confirm Close
            </button>
            <button
              onClick={() => setConfirmClose(false)}
              className="bg-slate-800 text-slate-300 py-2 px-1 rounded-lg text-[10px]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClose(true)}
            disabled={loading || !hasPosition}
            className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs border transition-colors ${
              hasPosition
                ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border-orange-500/40'
                : 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
            title="Market close active position immediately"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Flatten (Stop)</span>
          </button>
        )}

        {/* Emergency Kill Switch */}
        {confirmKill ? (
          <div className="flex space-x-1 col-span-1">
            <button
              onClick={handleKill}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-1 rounded-lg text-[10px] animate-pulse"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmKill(false)}
              className="bg-slate-800 text-slate-300 py-2 px-1 rounded-lg text-[10px]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmKill(true)}
            disabled={loading || state === 'HALTED'}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg font-semibold text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/40 transition-colors"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Kill Switch</span>
          </button>
        )}
      </div>
    </div>
  );
};

