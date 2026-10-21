import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { AnalyzerDevice } from '../types.ts';
import {
  Cpu,
  Play,
  CheckCircle2,
  AlertCircle,
  Network,
  Activity,
  Terminal,
  RefreshCw,
  Barcode,
} from 'lucide-react';

export const AnalyzersPage: React.FC = () => {
  const [analyzers, setAnalyzers] = useState<AnalyzerDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalyzerId, setSelectedAnalyzerId] = useState<string>('');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [sampleBarcode, setSampleBarcode] = useState('SMP-2026-3001');

  const loadAnalyzers = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalyzers();
      setAnalyzers(data);
      if (data.length > 0 && !selectedAnalyzerId) {
        setSelectedAnalyzerId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyzers();
  }, []);

  const handleRunSimulator = async () => {
    if (!selectedAnalyzerId) return;
    setSimulating(true);
    setSimResult(null);

    try {
      const res = await api.simulateAnalyzer(selectedAnalyzerId, sampleBarcode);
      setSimResult(res);
      loadAnalyzers();
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const selectedAnalyzer = analyzers.find(a => a.id === selectedAnalyzerId);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Machine & Analyzer Interfacing</h1>
          <p className="text-xs text-slate-500 mt-0.5">Bi-directional instrument communication, HL7 v2 and ASTM protocols, automated result queuing</p>
        </div>
      </div>

      {/* Analyzer Devices Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {analyzers.map((a) => {
          const isSelected = a.id === selectedAnalyzerId;
          const isConnected = a.status === 'connected';

          return (
            <div
              key={a.id}
              onClick={() => setSelectedAnalyzerId(a.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-teal-50/70 border-teal-500 shadow-sm'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase font-mono">
                  {a.protocol} Protocol
                </span>
                <span
                  className={`flex items-center gap-1 text-[11px] font-bold ${
                    isConnected ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  {a.status.toUpperCase()}
                </span>
              </div>

              <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{a.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{a.manufacturer} | Model: {a.model}</p>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-600 font-mono">
                <span>{a.ipAddress}:{a.port}</span>
                <span>{a.department}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulator & Telemetry Inspector */}
      {selectedAnalyzer && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simulator Control Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Instrument Transmission Simulator ({selectedAnalyzer.name})
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Test automated bidirectional connectivity by simulating an incoming laboratory run. The instrument will emit a standard {selectedAnalyzer.protocol} message, parse observations, match the tube barcode, and push results to the active clinical worklist.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specimen Tube Barcode to Simulate
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sampleBarcode}
                    onChange={(e) => setSampleBarcode(e.target.value)}
                    placeholder="e.g. SMP-2026-3001"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs font-bold"
                  />
                  <button
                    onClick={handleRunSimulator}
                    disabled={simulating}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{simulating ? 'Transmitting...' : 'Run Instrument'}</span>
                  </button>
                </div>
              </div>

              {/* Parameter Code Mapping Table */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Configured Test Code Mappings ({selectedAnalyzer.testMappings.length})
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 text-[11px]">
                  {selectedAnalyzer.testMappings.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-700 font-mono">
                      <span>{m.analyzerCode}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="font-sans font-semibold text-teal-900">{m.testName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {simResult && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>TRANSMISSION ACCEPTED & MATCHED</span>
                </div>
                <p className="text-[11px]">
                  Imported {simResult.importedCount} test parameter(s) for specimen barcode {simResult.parsed.sampleBarcode}. Results synchronized to LIS database.
                </p>
              </div>
            )}
          </div>

          {/* Raw Protocol Message Inspector */}
          <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold text-white font-mono uppercase">
                    Raw {selectedAnalyzer.protocol} Stream Inspector
                  </span>
                </div>
                <span className="text-[10px] text-teal-400 font-mono">Socket 192.168.10.x</span>
              </div>

              <pre className="font-mono text-[11px] leading-relaxed text-teal-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800 overflow-x-auto max-h-80 whitespace-pre-wrap select-all">
                {simResult?.rawPayload || (
                  `// Waiting for simulator transmission...\n// Protocol: ${selectedAnalyzer.protocol}\n// Device: ${selectedAnalyzer.name}\n// Click 'Run Instrument' to inspect generated wire packets.`
                )}
              </pre>
            </div>

            <p className="text-[10px] text-slate-500 mt-4">
              ApexLIS HL7 & ASTM Engine adheres strictly to ASTM E1394-97 and HL7 v2.3.1 clinical standards.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
