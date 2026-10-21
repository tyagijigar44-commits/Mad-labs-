import React, { useState } from 'react';
import { api } from '../lib/api.ts';
import { X, QrCode, ShieldCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({ isOpen, onClose, initialCode = 'VRF-4001-A9Z' }) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.verifyReportCode(code.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Report verification failed. Code may be invalid or report not yet officially released.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="bg-gradient-to-r from-teal-700 to-blue-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <QrCode className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Public Report Verification</h3>
              <p className="text-xs text-teal-100">Cryptographic authenticity audit endpoint</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Scan the QR code on any official ApexLIS clinical diagnostic report or enter the unique verification code below to validate authenticity.
          </p>

          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Report Verification Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. VRF-4001-A9Z"
                  className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-wider uppercase focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Complies with HIPAA/GDPR minimal disclosure rules.</span>
            </div>
          </form>

          {/* Results Display */}
          {result && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-slate-800 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>OFFICIAL ACCREDITED REPORT CONFIRMED</span>
              </div>
              <div className="text-xs space-y-1 text-slate-700 pt-1 border-t border-emerald-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-500">Report Number:</span>
                  <span className="font-mono font-bold">{result.reportNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient Initials:</span>
                  <span className="font-bold">{result.patientInitials}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Released Timestamp:</span>
                  <span>{new Date(result.releasedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Certifying Pathologist:</span>
                  <span className="font-bold text-teal-800">{result.authorizedBy}</span>
                </div>
                <div className="pt-2 text-[11px] text-slate-500 italic">
                  {result.laboratory}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Verification Failed</p>
                <p className="text-[11px] mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
