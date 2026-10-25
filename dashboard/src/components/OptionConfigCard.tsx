import React, { useState, useEffect } from 'react';
import { Sliders, Check, RefreshCw } from 'lucide-react';
import { BotStatus, OptionConfig, UnderlyingAsset } from '../types';
import { saveOptionConfig, switchAsset } from '../api';

interface OptionConfigCardProps {
  status: BotStatus | null;
  onRefresh: () => void;
}

export const OptionConfigCard: React.FC<OptionConfigCardProps> = ({ status, onRefresh }) => {
  const currentConfig = status?.option_config;
  const currentAsset = status?.underlying_asset || 'BTC';

  const [asset, setAsset] = useState<UnderlyingAsset>(currentAsset);
  const [timeframe, setTimeframe] = useState<string>(currentConfig?.timeframe || '5m');
  const [contracts, setContracts] = useState<number>(currentConfig?.contracts || 1);
  const [stPeriod, setStPeriod] = useState<number>(currentConfig?.supertrend_period || 10);
  const [stMult, setStMult] = useState<number>(currentConfig?.supertrend_multiplier || 3.0);
  const [emaPeriod, setEmaPeriod] = useState<number>(currentConfig?.ema_period || 20);
  const [optAtrPeriod, setOptAtrPeriod] = useState<number>(currentConfig?.option_atr_period || 14);
  const [slAtrMult, setSlAtrMult] = useState<number>(currentConfig?.sl_atr_multiplier || 1.5);
  const [tpAtrMult, setTpAtrMult] = useState<number>(currentConfig?.tp_atr_multiplier || 2.5);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (status?.underlying_asset) {
      setAsset(status.underlying_asset);
    }
    if (status?.option_config) {
      const cfg = status.option_config;
      setTimeframe(cfg.timeframe);
      setContracts(cfg.contracts);
      setStPeriod(cfg.supertrend_period);
      setStMult(cfg.supertrend_multiplier);
      setEmaPeriod(cfg.ema_period);
      setOptAtrPeriod(cfg.option_atr_period);
      setSlAtrMult(cfg.sl_atr_multiplier);
      setTpAtrMult(cfg.tp_atr_multiplier);
    }
  }, [status]);

  const handleAssetChange = async (newAsset: UnderlyingAsset) => {
    setAsset(newAsset);
    try {
      await switchAsset(newAsset);
      onRefresh();
    } catch (e: any) {
      alert(`Asset switch failed: ${e.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const payload: OptionConfig = {
        underlying_asset: asset,
        timeframe,
        contracts: Number(contracts),
        supertrend_period: Number(stPeriod),
        supertrend_multiplier: Number(stMult),
        ema_period: Number(emaPeriod),
        option_atr_period: Number(optAtrPeriod),
        sl_atr_multiplier: Number(slAtrMult),
        tp_atr_multiplier: Number(tpAtrMult),
      };
      await saveOptionConfig(payload);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to save configuration: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="graphite-panel p-4 rounded-xl border border-violet-500/20 bg-[#131020]/80 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-violet-500/15 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-100 tracking-wide uppercase">Option Buying Config</h3>
            <p className="text-[10px] text-slate-400">Underlying Asset, Supertrend & ATR Brackets</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/40">
          DELTA TESTNET
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-3.5 text-xs">
        {/* Asset Selection (BTC, ETH, XAUT) */}
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1.5">
            Underlying Market Asset
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['BTC', 'ETH', 'XAUT'] as UnderlyingAsset[]).map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => handleAssetChange(sym)}
                className={`py-1.5 px-2 rounded-lg font-mono font-semibold text-xs transition-all border ${
                  asset === sym
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-400/50 pro-glow-violet-sm'
                    : 'bg-[#181428] text-slate-400 border-violet-500/15 hover:border-violet-500/40 hover:text-slate-200'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe & Contracts */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-[#181428] border border-violet-500/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-violet-500 focus:outline-none"
            >
              <option value="1m">1m (Scalp)</option>
              <option value="5m">5m (Standard)</option>
              <option value="15m">15m (Trend)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Contracts</label>
            <input
              type="number"
              min="1"
              max="100"
              value={contracts}
              onChange={(e) => setContracts(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-[#181428] border border-violet-500/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Supertrend Settings */}
        <div className="p-2.5 rounded-lg bg-[#181428]/70 border border-violet-500/15 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-violet-300">
            <span>Supertrend Settings</span>
            <span className="text-[10px] text-slate-400">ATR Period + Mult</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] text-slate-400 uppercase">Period</label>
              <input
                type="number"
                min="2"
                max="50"
                value={stPeriod}
                onChange={(e) => setStPeriod(parseInt(e.target.value) || 10)}
                className="w-full bg-[#0f0d1b] border border-violet-500/20 rounded px-2 py-1 text-xs text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 uppercase">Multiplier</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10.0"
                value={stMult}
                onChange={(e) => setStMult(parseFloat(e.target.value) || 3.0)}
                className="w-full bg-[#0f0d1b] border border-violet-500/20 rounded px-2 py-1 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* EMA & Option ATR */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">EMA Filter</label>
            <input
              type="number"
              min="5"
              max="200"
              value={emaPeriod}
              onChange={(e) => setEmaPeriod(parseInt(e.target.value) || 20)}
              className="w-full bg-[#181428] border border-violet-500/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Option ATR Period</label>
            <input
              type="number"
              min="2"
              max="50"
              value={optAtrPeriod}
              onChange={(e) => setOptAtrPeriod(parseInt(e.target.value) || 14)}
              className="w-full bg-[#181428] border border-violet-500/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        {/* ATR Bracket Multipliers */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-mono uppercase text-rose-400 mb-1">Stop-Loss ATR</label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="10.0"
              value={slAtrMult}
              onChange={(e) => setSlAtrMult(parseFloat(e.target.value) || 1.5)}
              className="w-full bg-[#181428] border border-rose-500/20 rounded-lg px-2.5 py-1.5 text-xs text-rose-300 font-mono focus:border-rose-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-emerald-400 mb-1">Target ATR</label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="10.0"
              value={tpAtrMult}
              onChange={(e) => setTpAtrMult(parseFloat(e.target.value) || 2.5)}
              className="w-full bg-[#181428] border border-emerald-500/20 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-all pro-glow-violet-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Applying Settings...</span>
            </>
          ) : savedSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-emerald-200">Configuration Saved!</span>
            </>
          ) : (
            <span>Apply Option Algorithm Config</span>
          )}
        </button>
      </form>
    </div>
  );
};
