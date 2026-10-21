import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { QualityControlRecord } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LineChart,
  Plus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  History,
  TrendingUp,
} from 'lucide-react';

export const QualityControlPage: React.FC = () => {
  const { user } = useAuth();
  const [qcRecords, setQcRecords] = useState<QualityControlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    analyzerId: 'ANZ-01',
    testCode: 'CBC-01 (Hemoglobin)',
    controlLot: 'E-CHECK-2026B',
    level: 'Level 2 (Normal)',
    targetMean: '13.5',
    targetSD: '0.35',
    observedValue: '13.6',
  });

  const loadQc = async () => {
    setLoading(true);
    try {
      const data = await api.getQcRecords();
      setQcRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQc();
  }, []);

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.recordQc({
        ...formData,
        technicianName: user?.name || 'Marcus Chen, MLT',
      });
      setIsRecordModalOpen(false);
      loadQc();
    } catch (err: any) {
      alert(err.message || 'QC recording failed');
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Quality Control & Westgard Validation</h1>
          <p className="text-xs text-slate-500 mt-0.5">Statistical process control, Levey-Jennings monitoring, and calibration compliance</p>
        </div>

        <button
          onClick={() => setIsRecordModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Control Run</span>
        </button>
      </div>

      {/* Levey-Jennings Interactive Visualizer Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Levey-Jennings Statistical Control Chart</h3>
            <p className="text-xs text-slate-500">Normal Control Lot E-CHECK-2026B (Target: 13.50 g/dL, SD: ±0.35)</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
            Westgard In-Control
          </span>
        </div>

        {/* Levey-Jennings SVG Plot */}
        <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
          <svg viewBox="0 0 700 200" className="w-full h-48">
            {/* Grid Lines */}
            {/* +3 SD */}
            <line x1="50" y1="20" x2="680" y2="20" stroke="#fca5a5" strokeDasharray="3 3" strokeWidth="1" />
            <text x="10" y="24" fill="#ef4444" fontSize="10" fontWeight="bold">+3 SD (14.55)</text>

            {/* +2 SD */}
            <line x1="50" y1="50" x2="680" y2="50" stroke="#fcd34d" strokeDasharray="3 3" strokeWidth="1" />
            <text x="10" y="54" fill="#d97706" fontSize="10" fontWeight="bold">+2 SD (14.20)</text>

            {/* +1 SD */}
            <line x1="50" y1="80" x2="680" y2="80" stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1" />
            <text x="10" y="84" fill="#64748b" fontSize="10">+1 SD (13.85)</text>

            {/* Mean Centerline */}
            <line x1="50" y1="110" x2="680" y2="110" stroke="#0d9488" strokeWidth="2" />
            <text x="10" y="114" fill="#0d9488" fontSize="10" fontWeight="bold">Mean (13.50)</text>

            {/* -1 SD */}
            <line x1="50" y1="140" x2="680" y2="140" stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="1" />
            <text x="10" y="144" fill="#64748b" fontSize="10">-1 SD (13.15)</text>

            {/* -2 SD */}
            <line x1="50" y1="170" x2="680" y2="170" stroke="#fcd34d" strokeDasharray="3 3" strokeWidth="1" />
            <text x="10" y="174" fill="#d97706" fontSize="10" fontWeight="bold">-2 SD (12.80)</text>

            {/* Plotted QC Points and Connecting Line */}
            <polyline
              fill="none"
              stroke="#0f766e"
              strokeWidth="2.5"
              points="100,105 180,95 260,115 340,100 420,112 500,102 580,108 650,104"
            />

            {[
              { cx: 100, cy: 105, val: 13.56 },
              { cx: 180, cy: 95, val: 13.68 },
              { cx: 260, cy: 115, val: 13.44 },
              { cx: 340, cy: 100, val: 13.62 },
              { cx: 420, cy: 112, val: 13.48 },
              { cx: 500, cy: 102, val: 13.60 },
              { cx: 580, cy: 108, val: 13.52 },
              { cx: 650, cy: 104, val: 13.57 },
            ].map((pt, i) => (
              <circle
                key={i}
                cx={pt.cx}
                cy={pt.cy}
                r="4.5"
                className="fill-white stroke-teal-700 stroke-2 hover:scale-125 transition-transform cursor-pointer"
              >
                <title>Run #{i + 1}: {pt.val} g/dL</title>
              </circle>
            ))}
          </svg>
        </div>
      </div>

      {/* QC Runs History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Quality Control Run Log</h3>
          <span className="text-[10px] text-slate-500">Evaluated against multi-rule Westgard criteria</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Test Code / Lot</th>
                <th className="py-3 px-4">Control Level</th>
                <th className="py-3 px-4">Target Mean (SD)</th>
                <th className="py-3 px-4">Observed Value</th>
                <th className="py-3 px-4">Z-Score</th>
                <th className="py-3 px-4">Westgard Status</th>
                <th className="py-3 px-4">Run At / Tech</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {qcRecords.map((qc) => (
                <tr key={qc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-800">{qc.testCode}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Lot: {qc.controlLot}</p>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{qc.level}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {qc.targetMean} (±{qc.targetSD})
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{qc.observedValue}</td>
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <span className={Math.abs(qc.zScore) > 2 ? 'text-amber-600' : 'text-slate-800'}>
                      {qc.zScore > 0 ? `+${qc.zScore}` : qc.zScore}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        qc.status === 'in_control'
                          ? 'bg-emerald-100 text-emerald-800'
                          : qc.status === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {qc.status.replace('_', ' ')}
                    </span>
                    {qc.ruleViolated && (
                      <p className="text-[10px] text-rose-600 mt-0.5">{qc.ruleViolated}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <p className="font-medium">{qc.technicianName}</p>
                    <p className="text-[10px] text-slate-400">{new Date(qc.runAt).toLocaleDateString()}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record QC Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-teal-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-teal-200" />
                <h3 className="font-bold text-sm">Record Analytical QC Sample</h3>
              </div>
              <button onClick={() => setIsRecordModalOpen(false)} className="p-1 rounded-lg hover:bg-teal-800 text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Investigation / Test</label>
                <select
                  value={formData.testCode}
                  onChange={(e) => setFormData({ ...formData, testCode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="CBC-01 (Hemoglobin)">Hemoglobin (CBC-01)</option>
                  <option value="TFT-04 (TSH)">Ultrasensitive TSH (TFT-04)</option>
                  <option value="CMP-02 (Glucose)">Fasting Blood Glucose (CMP-02)</option>
                  <option value="CMP-02 (Creatinine)">Serum Creatinine (CMP-02)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Control Lot #</label>
                  <input
                    type="text"
                    value={formData.controlLot}
                    onChange={(e) => setFormData({ ...formData, controlLot: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Control Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="Level 1 (Low)">Level 1 (Low)</option>
                    <option value="Level 2 (Normal)">Level 2 (Normal)</option>
                    <option value="Level 3 (High)">Level 3 (High)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Mean</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.targetMean}
                    onChange={(e) => setFormData({ ...formData, targetMean: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target SD (1s)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.targetSD}
                    onChange={(e) => setFormData({ ...formData, targetSD: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observed Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.observedValue}
                    onChange={(e) => setFormData({ ...formData, observedValue: e.target.value })}
                    className="w-full px-3 py-2 border border-teal-500 bg-teal-50/50 rounded-xl font-mono font-bold text-teal-950"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Evaluate & Save QC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
