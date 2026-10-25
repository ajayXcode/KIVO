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
    <div className="bg-[#151A23] border border-[#232936] rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">API Connection Scanner</h2>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center space-x-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning...' : 'Run Connectivity Scan'}</span>
        </button>
      </div>

      {result ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* REST Status */}
          <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430]">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>REST Gateway</span>
              {result.rest_connected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              )}
            </div>
            <div className="text-xs font-mono font-semibold text-white truncate">
              {result.rest_connected ? 'Connected (200 OK)' : 'Unreachable'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              {result.rest_url}
            </div>
          </div>

          {/* Latency */}
          <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430]">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>Roundtrip Ping</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base font-bold font-mono text-emerald-400">
              {result.rest_latency_ms} <span className="text-xs text-slate-400 font-normal">ms</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {result.rest_latency_ms < 150 ? 'Fast Response' : 'Normal Latency'}
            </div>
          </div>

          {/* Auth Verification */}
          <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430]">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>API Key Status</span>
              {result.credentials_valid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {result.auth_status}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              HMAC-SHA256 Signed
            </div>
          </div>

          {/* Testnet Catalog */}
          <div className="bg-[#10141D] p-3 rounded-lg border border-[#1E2430]">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
              <span>Testnet Markets</span>
              <span className="text-[10px] text-emerald-400 font-mono">Live</span>
            </div>
            <div className="text-base font-bold font-mono text-slate-200">
              {result.product_count} <span className="text-xs text-slate-400 font-normal">Pairs</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Health: {result.status_summary}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#10141D] border border-dashed border-[#1E2430] rounded-lg p-6 text-center text-xs text-slate-500">
          Click <strong>"Run Connectivity Scan"</strong> to probe Delta Testnet endpoints, latency, and signature verification.
        </div>
      )}
    </div>
  );
};

