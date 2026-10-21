import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { Report } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FileCheck2,
  Sparkles,
  Download,
  Eye,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Printer,
  Calendar,
  Lock,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Interpretation state
  const [interpretationText, setInterpretationText] = useState('');
  const [pathologistNotes, setPathologistNotes] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const list = await api.getReports();
      setReports(list);
      if (list.length > 0 && !selectedReportId) {
        setSelectedReportId(list[0].id);
        setInterpretationText(list[0].interpretationDraft || '');
        setPathologistNotes(list[0].pathologistNotes || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const selectedReport = reports.find(r => r.id === selectedReportId);

  useEffect(() => {
    if (selectedReport) {
      setInterpretationText(selectedReport.interpretationDraft || '');
      setPathologistNotes(selectedReport.pathologistNotes || '');
    }
  }, [selectedReportId]);

  // Module 9.A: AI Report Drafting Assistance
  const handleGenerateAiDraft = async () => {
    if (!selectedReport) return;
    setAiDrafting(true);
    try {
      const activeTest = selectedReport.order?.items?.[0]?.test?.name || 'Diagnostic Panel';
      const patient = selectedReport.patient;

      const context = {
        testName: activeTest,
        patientAge: patient?.age || 40,
        patientGender: patient?.gender || 'female',
        parameters: selectedReport.results?.map(r => ({
          name: r.parameterName,
          value: r.value,
          unit: r.unit,
          referenceLow: r.referenceLow,
          referenceHigh: r.referenceHigh,
          flag: r.flag,
        })) || [],
        clinicalNotes: selectedReport.order?.clinicalNotes,
      };

      const res = await api.draftReport(context);
      setInterpretationText(res.draftSummary);
    } catch (err: any) {
      alert(err.message || 'AI Drafting failed');
    } finally {
      setAiDrafting(false);
    }
  };

  // Authorize & Release Report
  const handleAuthorizeAndRelease = async () => {
    if (!selectedReport) return;
    setReleasing(true);
    try {
      await api.verifyAndReleaseReport(selectedReport.id, {
        interpretation: interpretationText,
        pathologistNotes,
        verifiedById: user?.id || 'USR-02',
        verifiedByName: user?.name || 'Dr. Sarah Jenkins, FRCPath',
      });
      alert('Diagnostic report authorized and released. Available in Patient Portal.');
      loadReports();
    } catch (err: any) {
      alert(err.message || 'Release failed');
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Pathologist Report Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">Clinical evaluation, AI draft summaries, digital signatures, and patient release</p>
        </div>

        {selectedReport?.status === 'released' && (
          <a
            href={`/api/reports/${selectedReport.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Reports Queue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Reports Queue</h3>
            <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{reports.length} reports</span>
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {reports.map((r) => {
              const isSelected = r.id === selectedReportId;
              const isReleased = r.status === 'released';

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReportId(r.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/70 border-teal-500 shadow-2xs'
                      : 'bg-white border-slate-200/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-mono font-bold text-slate-900">{r.reportNumber}</span>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm ${
                        isReleased ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 text-xs">
                    {r.patient?.lastName.toUpperCase()}, {r.patient?.firstName}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Order: {r.order?.orderNumber} | Ver: {r.verificationCode}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Pathologist Review & Signature Sheet */}
        <div className="lg:col-span-3 space-y-4">
          {selectedReport && (
            <>
              {/* Report Header Demographics */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 uppercase tracking-wider">
                      {selectedReport.branch?.name || 'Apex Central Reference Lab'}
                    </span>
                    <h2 className="text-base font-extrabold text-slate-900 mt-1">
                      {selectedReport.patient?.lastName.toUpperCase()}, {selectedReport.patient?.firstName}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                      Patient ID: {selectedReport.patient?.patientId} | {selectedReport.patient?.gender.toUpperCase()}, {selectedReport.patient?.age} Yrs
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-slate-900 block">{selectedReport.reportNumber}</span>
                    <span className="text-[11px] text-slate-400 font-mono block">QR Code: {selectedReport.verificationCode}</span>
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        selectedReport.status === 'released'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Status: {selectedReport.status}
                    </span>
                  </div>
                </div>

                {/* Parameters Review Table */}
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Investigation</th>
                        <th className="py-2.5 px-3">Result</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">Reference Range</th>
                        <th className="py-2.5 px-3">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedReport.results?.map((res, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-semibold text-slate-800">{res.parameterName}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{res.value}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{res.unit}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {res.referenceLow !== undefined && res.referenceHigh !== undefined
                              ? `${res.referenceLow} - ${res.referenceHigh}`
                              : 'Standard'}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                res.flag === 'critical'
                                  ? 'bg-rose-100 text-rose-800 font-extrabold'
                                  : res.flag === 'high' || res.flag === 'low'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {res.flag}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pathologist Clinical Interpretation & AI Drafting Assistance */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Pathologist Interpretation & Clinical Summary
                    </h3>
                  </div>

                  {/* AI Drafting Button (Module 9.A) */}
                  <button
                    onClick={handleGenerateAiDraft}
                    disabled={aiDrafting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>{aiDrafting ? 'Drafting Summary...' : 'AI Report Drafting Assistance'}</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <textarea
                    rows={4}
                    value={interpretationText}
                    onChange={(e) => setInterpretationText(e.target.value)}
                    placeholder="Enter detailed clinical impressions, biological correlation, or click 'AI Report Drafting Assistance' above..."
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                  ></textarea>
                  <p className="text-[10px] text-slate-400 italic">
                    Note: Per CLIA/CAP safety regulations, all AI-generated drafts must be reviewed and certified by a qualified Pathologist before clinical release.
                  </p>
                </div>

                {/* Pathologist Signatory Stamp & Action */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold">
                      MD
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {selectedReport.verifiedByName || user?.name || 'Dr. Sarah Jenkins, FRCPath'}
                      </p>
                      <p className="text-[11px] text-slate-500">Consultant Pathologist & Laboratory Medical Director</p>
                      <p className="text-[10px] text-slate-400 font-mono">Lic: CAP-98214 / MC-481920</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedReport.status !== 'released' ? (
                      <button
                        onClick={handleAuthorizeAndRelease}
                        disabled={releasing}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{releasing ? 'Releasing...' : 'Authorize & Release Report'}</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Officially Authorized & Released</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
