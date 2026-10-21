import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { TestOrder, ResultEntry } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FlaskConical,
  Sparkles,
  Mic,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';

export const WorkflowPage: React.FC<{ onNavigateToReports?: () => void }> = ({ onNavigateToReports }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // AI Quality Check Results
  const [qcStatus, setQcStatus] = useState<any>(null);
  const [qcLoading, setQcLoading] = useState(false);

  // AI Voice Dictation Modal
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [dictationTranscript, setDictationTranscript] = useState(
    'Hemoglobin thirteen point eight, WBC six point four, platelet count two hundred forty thousand'
  );
  const [voiceParsing, setVoiceParsing] = useState(false);

  const loadWorkflow = async () => {
    setLoading(true);
    try {
      const oList = await api.getOrders();
      setOrders(oList);
      if (oList.length > 0 && !selectedOrderId) {
        // Prefer one in processing or ordered
        const active = oList.find(o => o.status === 'processing' || o.status === 'sample_collected') || oList[0];
        setSelectedOrderId(active.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflow();
  }, []);

  const loadResultsForOrder = async (orderId: string) => {
    if (!orderId) return;
    try {
      const rList = await api.getResults(orderId);
      const selectedOrder = orders.find(o => o.id === orderId);

      // If no results entered yet, pre-populate parameters from the order's tests!
      if (rList.length === 0 && selectedOrder) {
        const tests = await api.getTests();
        const initialResults: ResultEntry[] = [];
        selectedOrder.items?.forEach((it: any) => {
          const testObj = tests.find(t => t.id === it.testId);
          testObj?.parameters.forEach((p: any) => {
            initialResults.push({
              id: 'TEMP-' + Math.random(),
              orderId,
              testId: testObj.id,
              parameterName: p.name,
              value: '',
              unit: p.unit,
              referenceLow: p.low,
              referenceHigh: p.high,
              flag: 'normal',
              enteredById: user?.id || 'USR-03',
              enteredAt: new Date().toISOString(),
              version: 1,
            });
          });
        });
        setResults(initialResults);
      } else {
        setResults(rList);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      loadResultsForOrder(selectedOrderId);
      setQcStatus(null);
    }
  }, [selectedOrderId, orders]);

  const handleValueChange = (index: number, val: string) => {
    const updated = [...results];
    const target = updated[index];
    target.value = val;
    const num = parseFloat(val);

    if (!isNaN(num) && target.referenceLow !== undefined && target.referenceHigh !== undefined) {
      if (num < target.referenceLow) target.flag = 'low';
      else if (num > target.referenceHigh) target.flag = 'high';
      else target.flag = 'normal';
    }
    setResults(updated);
  };

  const handleSaveResultRow = async (res: ResultEntry) => {
    try {
      await api.saveResult({
        orderId: selectedOrderId,
        testId: res.testId,
        parameterName: res.parameterName,
        value: res.value,
        unit: res.unit,
        referenceLow: res.referenceLow,
        referenceHigh: res.referenceHigh,
        flag: res.flag,
        notes: res.notes,
        actorId: user?.id || 'USR-03',
      });
    } catch (err: any) {
      console.error('Save failed:', err);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const res of results) {
        if (res.value !== '') {
          await handleSaveResultRow(res);
        }
      }
      alert('Laboratory results successfully saved and synchronized.');
      loadResultsForOrder(selectedOrderId);
    } catch (err: any) {
      alert(err.message || 'Save error');
    } finally {
      setSaving(false);
    }
  };

  // Run AI Plausibility Check (Module 9.E)
  const handleRunAiQualityCheck = async () => {
    setQcLoading(true);
    try {
      const activeOrder = orders.find(o => o.id === selectedOrderId);
      const testCode = activeOrder?.items?.[0]?.test?.code || 'CBC-01';
      const formatted = results
        .filter(r => r.value && !isNaN(parseFloat(r.value)))
        .map(r => ({ name: r.parameterName, value: parseFloat(r.value) }));

      const check = await api.qualityCheck(testCode, formatted);
      setQcStatus(check);
    } catch (err: any) {
      alert(err.message || 'AI QC failed');
    } finally {
      setQcLoading(false);
    }
  };

  // Run Voice Dictation Parser (Module 9.D)
  const handleParseVoice = async () => {
    setVoiceParsing(true);
    try {
      const params = results.map(r => ({ name: r.parameterName, unit: r.unit }));
      const parsedData = await api.parseVoice(dictationTranscript, params);

      // Match into results
      const updated = [...results];
      parsedData.results.forEach((item: any) => {
        const idx = updated.findIndex(r => r.parameterName.toLowerCase().includes(item.parameter.toLowerCase()));
        if (idx !== -1) {
          updated[idx].value = item.value;
          const num = parseFloat(item.value);
          if (!isNaN(num) && updated[idx].referenceLow !== undefined && updated[idx].referenceHigh !== undefined) {
            if (num < updated[idx].referenceLow!) updated[idx].flag = 'low';
            else if (num > updated[idx].referenceHigh!) updated[idx].flag = 'high';
            else updated[idx].flag = 'normal';
          }
        }
      });
      setResults(updated);
      setIsVoiceModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Voice parsing error');
    } finally {
      setVoiceParsing(false);
    }
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Laboratory Bench & Result Entry</h1>
          <p className="text-xs text-slate-500 mt-0.5">Enter findings, check abnormal limits, run AI plausibility screening, and transmit to pathologist</p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Voice Dictation Button */}
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Parse technician voice dictation into test parameters"
          >
            <Mic className="w-3.5 h-3.5 text-purple-600" />
            <span>Voice Dictation</span>
          </button>

          {/* AI Plausibility Check Button */}
          <button
            onClick={handleRunAiQualityCheck}
            disabled={qcLoading || results.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Run physiological cross-checks (Rule of 3, BUN/Creatinine)"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>{qcLoading ? 'Checking...' : 'AI Plausibility Check'}</span>
          </button>

          {/* Save Results Button */}
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Results'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout: Order Selector & Worklist Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Pending Batch Orders List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Accessioned Worklist</h3>
            <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{orders.length} orders</span>
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {orders.map((o) => {
              const isSelected = o.id === selectedOrderId;
              return (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/70 border-teal-500 shadow-2xs'
                      : 'bg-white border-slate-200/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-mono font-bold text-slate-900">{o.orderNumber}</span>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm ${
                        o.priority === 'stat' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {o.priority}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 text-xs">
                    {o.patient?.lastName.toUpperCase()}, {o.patient?.firstName}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    ID: {o.patient?.patientId} | {o.patient?.gender.toUpperCase()}, {o.patient?.age}Y
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Test Result Entry Sheet */}
        <div className="lg:col-span-3 space-y-4">
          {/* Active Order Details Banner */}
          {selectedOrder && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400 text-sm">{selectedOrder.orderNumber}</span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="font-bold text-sm">
                    {selectedOrder.patient?.lastName.toUpperCase()}, {selectedOrder.patient?.firstName}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    ({selectedOrder.patient?.gender.toUpperCase()}, {selectedOrder.patient?.age} Yrs)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Tests: {selectedOrder.items?.map((it: any) => it.test?.name).join(', ') || 'General Panel'}
                </p>
              </div>

              {onNavigateToReports && (
                <button
                  onClick={onNavigateToReports}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Submit to Pathologist</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* AI Quality Check Feedback Card */}
          {qcStatus && (
            <div
              className={`p-4 rounded-xl border text-xs animate-in fade-in ${
                qcStatus.passed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {qcStatus.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span>AI Physiological Consistency Assessment</span>
              </div>
              {qcStatus.inconsistencies?.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5 text-rose-800 font-semibold mt-1">
                  {qcStatus.inconsistencies.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              {qcStatus.warnings?.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 mt-1">
                  {qcStatus.warnings.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              {qcStatus.passed && qcStatus.warnings.length === 0 && (
                <p className="text-emerald-700">All entered parameters comply with known physiological rules and ratios.</p>
              )}
            </div>
          )}

          {/* Results Entry Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Parameter Name</th>
                    <th className="py-3 px-4 w-36">Result Value</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Reference Interval</th>
                    <th className="py-3 px-4">Flag</th>
                    <th className="py-3 px-4">Notes / Commentary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((res, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {res.parameterName}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={res.value}
                          onChange={(e) => handleValueChange(idx, e.target.value)}
                          onBlur={() => handleSaveResultRow(res)}
                          placeholder="0.0"
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500 ${
                            res.flag === 'critical'
                              ? 'border-rose-400 bg-rose-50/50 text-rose-900'
                              : res.flag === 'high' || res.flag === 'low'
                              ? 'border-amber-400 bg-amber-50/50 text-amber-900'
                              : 'border-slate-300 text-slate-900'
                          }`}
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {res.unit || '--'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {res.referenceLow !== undefined && res.referenceHigh !== undefined
                          ? `${res.referenceLow} - ${res.referenceHigh}`
                          : 'Clinical Review'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            res.flag === 'critical'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : res.flag === 'high' || res.flag === 'low'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {res.flag}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={res.notes || ''}
                          onChange={(e) => {
                            const updated = [...results];
                            updated[idx].notes = e.target.value;
                            setResults(updated);
                          }}
                          onBlur={() => handleSaveResultRow(res)}
                          placeholder="Optional clinical notes..."
                          className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg text-slate-600"
                        />
                      </td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        Select an order to view and input analytical parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Dictation Simulator Modal (Module 9.D) */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-purple-200" />
                <div>
                  <h3 className="font-bold text-sm">AI Voice Reporting Assistant</h3>
                  <p className="text-[11px] text-purple-200">Convert voice dictations into structured lab values</p>
                </div>
              </div>
              <button onClick={() => setIsVoiceModalOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Dictate or adjust speech text below. The AI will extract recognized laboratory parameters and map them directly into your result entry worklist.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dictation Transcript</label>
                <textarea
                  rows={4}
                  value={dictationTranscript}
                  onChange={(e) => setDictationTranscript(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                ></textarea>
              </div>

              {/* Sample dictation chips */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sample Dictations:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDictationTranscript('Hemoglobin 13.8, WBC 6.4, Platelets 240, RBC count 4.62')}
                    className="text-[10px] bg-slate-100 hover:bg-purple-50 text-slate-700 px-2 py-1 rounded-md border border-slate-200 cursor-pointer"
                  >
                    Normal CBC Panel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDictationTranscript('Fasting glucose 142, serum creatinine 1.8, ALT 65, AST 48')}
                    className="text-[10px] bg-slate-100 hover:bg-purple-50 text-slate-700 px-2 py-1 rounded-md border border-slate-200 cursor-pointer"
                  >
                    Elevated Metabolic Panel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDictationTranscript('TSH 5.85, Free T4 1.18, Total T3 110')}
                    className="text-[10px] bg-slate-100 hover:bg-purple-50 text-slate-700 px-2 py-1 rounded-md border border-slate-200 cursor-pointer"
                  >
                    Subclinical Thyroid Panel
                  </button>
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-[11px] flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>All AI recognized values require review before saving per laboratory protocol.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParseVoice}
                  disabled={voiceParsing}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {voiceParsing ? 'Parsing...' : 'Extract & Fill Values'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
