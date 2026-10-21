import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  UserCircle2,
  FileCheck2,
  FileSpreadsheet,
  Download,
  Calendar,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Activity,
} from 'lucide-react';

export const PatientPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Look up default demo patient or Eleanor Sterling
    api.getPatients('Eleanor').then(async (pts) => {
      if (pts.length > 0) {
        const full = await api.getPatient(pts[0].id);
        setPatientData(full);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading patient medical records...
      </div>
    );
  }

  const patient = patientData?.patient;
  const reports = patientData?.reports || [];
  const orders = patientData?.orders || [];
  const invoices = patientData?.invoices || [];

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Patient Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-sky-800 to-blue-900 rounded-3xl p-6 lg:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white font-extrabold text-2xl shadow-inner">
              {patient ? `${patient.firstName[0]}${patient.lastName[0]}` : 'ES'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-black tracking-tight">
                  Welcome, {patient?.firstName} {patient?.lastName}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Verified Patient
                </span>
              </div>
              <p className="text-xs text-teal-100 mt-1 font-mono">
                Patient Medical Record: {patient?.patientId} | DOB: {patient?.dob} ({patient?.age} Yrs, {patient?.gender?.toUpperCase()})
              </p>
            </div>
          </div>

          <div className="sm:text-right text-xs text-teal-100 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-6">
            <span className="block font-bold text-white uppercase text-[10px] tracking-wider">Apex Diagnostic Network</span>
            <span>Accredited ISO 15189 / CAP Diagnostic Partner</span>
          </div>
        </div>
      </div>

      {/* 3 Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Authorized Reports</span>
          <div className="mt-2 text-2xl font-black text-slate-900">{reports.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Available for instant PDF download</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Lab Orders</span>
          <div className="mt-2 text-2xl font-black text-teal-700">{orders.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Diagnostic requisitions in progress</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diagnostic Invoices</span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            ${invoices.reduce((s: number, i: any) => s + i.paidAmount, 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">All accounts currently settled</p>
        </div>
      </div>

      {/* Released Medical Reports Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <span>My Authorized Diagnostic Reports</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reports released and electronically signed by certified pathologists
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {reports.map((rep: any) => (
            <div
              key={rep.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 bg-slate-50/50 hover:bg-teal-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900">{rep.reportNumber}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                    Released
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Certified By: {rep.verifiedByName} (Consultant Pathologist)
                </p>
                <p className="text-[11px] text-slate-400">
                  Released Date: {new Date(rep.releasedAt).toLocaleDateString()} | Verification Code: {rep.verificationCode}
                </p>
              </div>

              <a
                href={`/api/reports/${rep.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Report PDF</span>
              </a>
            </div>
          ))}

          {reports.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              No authorized diagnostic reports currently ready for release.
            </div>
          )}
        </div>
      </div>

      {/* Orders and Billing Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>Recent Test Requisitions</span>
          </h3>
          <div className="space-y-2">
            {orders.map((ord: any) => (
              <div key={ord.id} className="p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <p className="font-mono font-bold text-slate-800">{ord.orderNumber}</p>
                  <p className="text-[11px] text-slate-500">{new Date(ord.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="px-2 py-0.5 bg-slate-100 rounded-full font-bold text-[10px] uppercase">
                  {ord.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices & Receipts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-teal-600" />
            <span>Billing Receipts</span>
          </h3>
          <div className="space-y-2">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <p className="font-mono font-bold text-slate-800">{inv.invoiceNumber}</p>
                  <p className="text-[11px] text-slate-500">Paid: ${inv.paidAmount.toFixed(2)}</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] uppercase">
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
