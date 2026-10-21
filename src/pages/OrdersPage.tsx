import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { TestOrder, Patient, TestItem } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Barcode,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  Stethoscope,
  Filter,
} from 'lucide-react';

export const OrdersPage: React.FC<{ onNavigateToWorkflow?: () => void }> = ({ onNavigateToWorkflow }) => {
  const { currentBranch } = useAuth();
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [discount, setDiscount] = useState<number>(0);
  const [payNow, setPayNow] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'online'>('card');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oList, pList, tList, dList] = await Promise.all([
        api.getOrders(),
        api.getPatients(),
        api.getTests(),
        api.getDoctors(),
      ]);
      setOrders(oList);
      setPatients(pList);
      setTests(tList);
      setDoctors(dList);
      if (pList.length > 0 && !selectedPatientId) setSelectedPatientId(pList[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleTest = (testId: string) => {
    if (selectedTestIds.includes(testId)) {
      setSelectedTestIds(selectedTestIds.filter(id => id !== testId));
    } else {
      setSelectedTestIds([...selectedTestIds, testId]);
    }
  };

  const calculatedSubtotal = selectedTestIds.reduce((sum, id) => {
    const t = tests.find(item => item.id === id);
    return sum + (t ? t.price : 0);
  }, 0);

  const calculatedTotal = Math.max(0, calculatedSubtotal - discount);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || selectedTestIds.length === 0) {
      setErrorMsg('Please select a patient and at least one diagnostic test.');
      return;
    }

    setErrorMsg(null);
    try {
      await api.createOrder({
        patientId: selectedPatientId,
        branchId: currentBranch?.id || 'BR-01',
        doctorId: selectedDoctorId || undefined,
        testIds: selectedTestIds,
        priority,
        discount,
        paidAmount: payNow ? calculatedTotal : 0,
        paymentMethod,
        clinicalNotes,
      });

      setIsOrderModalOpen(false);
      setSelectedTestIds([]);
      setDiscount(0);
      setClinicalNotes('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Order creation failed');
    }
  };

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Test Orders & Accessioning</h1>
          <p className="text-xs text-slate-500 mt-0.5">Generate orders, print tube barcodes, and manage diagnostic requisitions</p>
        </div>

        <button
          onClick={() => setIsOrderModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Laboratory Order</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['all', 'ordered', 'sample_collected', 'processing', 'released'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-colors cursor-pointer ${
              statusFilter === s
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Tests & Specimen</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Sample Barcode(s)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Amount & Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-mono font-bold text-slate-900">{o.orderNumber}</p>
                    <p className="text-[10px] text-slate-400">{new Date(o.createdAt).toLocaleString()}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{o.patient?.lastName.toUpperCase()}, {o.patient?.firstName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {o.patient?.patientId}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    <div className="space-y-0.5">
                      {o.items?.map((it: any) => (
                        <div key={it.id} className="font-medium text-slate-800">
                          {it.test?.name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        o.priority === 'stat'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : o.priority === 'urgent'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {o.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {o.specimens?.map((sp: any) => (
                        <span key={sp.id} className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          <Barcode className="w-3 h-3 text-teal-600" />
                          <span>{sp.specimenId}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        o.status === 'released'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">${o.totalAmount.toFixed(2)}</p>
                    <p className={`text-[10px] font-bold capitalize ${o.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {o.paymentStatus}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {onNavigateToWorkflow && (
                      <button
                        onClick={onNavigateToWorkflow}
                        className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Workflow
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-700 to-blue-800 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-200" />
                <h3 className="font-bold text-base">Create Diagnostic Order</h3>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateOrder} className="p-6 overflow-y-auto space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Patient Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Patient *</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  required
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.lastName.toUpperCase()}, {p.firstName} ({p.patientId}) - {p.gender.toUpperCase()}, {p.age} Yrs
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor / Clinic */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Referring Clinician</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="">Direct Patient Walk-In / Self</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.clinicName})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Order Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="routine">Routine (Standard TAT)</option>
                    <option value="urgent">Urgent Priority</option>
                    <option value="stat">STAT Immediate Emergency</option>
                  </select>
                </div>
              </div>

              {/* Test Selection Catalogue */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Select Diagnostic Tests / Panels * ({selectedTestIds.length} selected)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                  {tests.map(t => {
                    const isChecked = selectedTestIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTest(t.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'bg-teal-50 border-teal-500 text-teal-950 font-semibold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs">{t.name}</p>
                          <p className="text-[10px] text-slate-500">{t.department} | {t.specimenType}</p>
                        </div>
                        <span className="font-mono font-bold text-slate-900">${t.price.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clinical Indication Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Notes & Indications</label>
                <input
                  type="text"
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="e.g. History of fatigue, fasting lipid check, rule out anemia"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Billing & Payment Options */}
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">${calculatedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Special Discount ($):</span>
                  <input
                    type="number"
                    min="0"
                    max={calculatedSubtotal}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-20 px-2 py-1 text-right border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Net Payable Amount:</span>
                  <span className="font-mono text-teal-700">${calculatedTotal.toFixed(2)}</span>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="payNow"
                      checked={payNow}
                      onChange={(e) => setPayNow(e.target.checked)}
                      className="rounded text-teal-600"
                    />
                    <label htmlFor="payNow" className="font-bold text-slate-700">Record Payment Now</label>
                  </div>

                  {payNow && (
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs font-semibold"
                    >
                      <option value="card">Credit/Debit Card</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / Instant QR</option>
                      <option value="online">Online Gateway</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedTestIds.length === 0}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Confirm Order & Generate Barcodes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
