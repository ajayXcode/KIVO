import React, { useState } from 'react';
import { Key, Shield, Check, X, Trash2, Eye, EyeOff } from 'lucide-react';
import { saveCredentials, clearCredentials } from '../api';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  maskedKey: string;
  isConfigured: boolean;
  onUpdated: () => void;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({
  isOpen,
  onClose,
  maskedKey,
  isConfigured,
  onUpdated,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim()) {
      setMessage('Both API Key and Secret are required.');
      return;
    }
    try {
      setSaving(true);
      await saveCredentials(apiKey, apiSecret);
      setMessage('Credentials applied to active session!');
      setApiKey('');
      setApiSecret('');
      onUpdated();
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Clear active API credentials from bot memory?')) {
      try {
        setSaving(true);
        await clearCredentials();
        onUpdated();
        setMessage('Credentials cleared.');
        setTimeout(() => setMessage(null), 1500);
      } catch (err: any) {
        setMessage(err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#151A23] border border-[#232936] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-[#232936] pb-3">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Delta Exchange API Credentials</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-400 bg-[#0B0E14] p-3 rounded-lg border border-[#1E2430]">
          <Shield className="w-4 h-4 text-emerald-400 inline mr-1" />
          <strong>Direct Frontend Management:</strong> Keys are kept in the active runtime session and never committed to code or source files.
        </div>

        <div className="flex justify-between items-center text-xs px-1">
          <span className="text-slate-400">Current Key:</span>
          <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {isConfigured ? maskedKey : 'Not Configured'}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Delta Testnet API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. WoAL5ElJrF58..."
              className="w-full bg-[#0B0E14] border border-[#232936] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Delta Testnet API Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="e.g. HGdfMm01Ab3..."
                className="w-full bg-[#0B0E14] border border-[#232936] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {message && (
            <div className="text-xs p-2 rounded bg-[#0B0E14] text-emerald-400 border border-emerald-500/30 font-mono">
              {message}
            </div>
          )}

          <div className="flex space-x-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1"
            >
              <Check className="w-4 h-4" />
              <span>Apply Keys to Session</span>
            </button>

            {isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg text-xs transition-colors flex items-center space-x-1"
                title="Clear credentials"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

