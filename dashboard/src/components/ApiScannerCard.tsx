import React, { useState } from 'react';
import { ApiScannerResult } from '../types';
import { Radio, RefreshCw, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { runConnectivityScan } from '../api';

export const ApiScannerCard: React.FC = () => {
  const [result, setResult] = useState<ApiScannerResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    try {
      setScanning(true);
      const res = await runConnectivityScan();
      setResult(res);
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span>Delta Exchange India Testnet Gateway Diagnostics</span>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center space-x-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-md transition-colors font-mono"
        >
          <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Pinging Gateway...' : 'Run Connectivity Scan'}</span>
        </button>
      </div>

      {result ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* REST Status */}
          <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29]">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span className="font-mono text-[11px]">REST GATEWAY</span>
              {result.rest_connected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              )}
            </div>
            <div className="text-xs font-mono font-bold text-white truncate">
              {result.rest_connected ? 'Connected (200 OK)' : 'Unreachable'}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1 truncate">
              {result.rest_url}
            </div>
          </div>

          {/* Latency */}
          <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29]">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span className="font-mono text-[11px]">ROUNDTRIP PING</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base font-bold font-mono text-emerald-400">
              {result.rest_latency_ms} <span className="text-xs text-slate-400 font-normal">ms</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              {result.rest_latency_ms < 150 ? 'Optimal Low Latency' : 'Standard Latency'}
            </div>
          </div>

          {/* Auth Verification */}
          <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29]">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span className="font-mono text-[11px]">HMAC-SHA256 AUTH</span>
              {result.credentials_valid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              {result.auth_status}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              Deterministic Canonical Signature
            </div>
          </div>

          {/* Testnet Catalog */}
          <div className="bg-[#0C1017] p-3 rounded-lg border border-[#161D29]">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span className="font-mono text-[11px]">PERPETUAL PAIRS</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">Catalog OK</span>
            </div>
            <div className="text-base font-bold font-mono text-slate-200">
              {result.product_count} <span className="text-xs text-slate-400 font-normal">Contracts</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              Fail-Closed Testnet Allowlist
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0C1017] border border-[#161D29] rounded-lg p-6 text-center space-y-2">
          <p className="text-xs font-mono text-slate-400">
            Click &ldquo;Run Connectivity Scan&rdquo; to test live REST latency, Delta HMAC signature verification, and product catalog synchronization.
          </p>
        </div>
      )}
    </div>
  );
};
