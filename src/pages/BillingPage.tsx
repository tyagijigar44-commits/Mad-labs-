import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { Invoice } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Receipt,
  DollarSign,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  X,
  AlertCircle,
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Payment form
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'upi' | 'online'>('card');
  const [payRef, setPayRef] = useState('');

  const loadBilling = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance, 0);

  const handleOpenPay = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.balance);
    setPayRef(`TXN-${Date.now().toString().slice(-6)}`);
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || payAmount <= 0) return;

    try {
      await api.recordPayment({
        invoiceId: selectedInvoice.id,
        amount: payAmount,
        method: payMethod,
        referenceNumber: payRef,
        recordedBy: user?.name || 'Accounts Staff',
      });
      setIsPayModalOpen(false);
      loadBilling();
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Billing & Revenue Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Diagnostic invoices, receipts, payment recording, and balance reconciliation</p>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Diagnostic Billings</span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            ${(totalCollected + totalOutstanding).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{invoices.length} clinical invoices issued</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Collections Realized</span>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            ${totalCollected.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Verified via cash, card, UPI, and gateway</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding Invoices</span>
          <div className="mt-2 text-2xl font-black text-amber-600">
            ${totalOutstanding.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pending patient settlement</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Order Reference</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Outstanding Balance</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-800">{inv.patient?.lastName.toUpperCase()}, {inv.patient?.firstName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {inv.patient?.patientId}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-teal-800">
                    {inv.order?.orderNumber || 'ORD-2026-X'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">${inv.total.toFixed(2)}</td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-700">${inv.paidAmount.toFixed(2)}</td>
                  <td className="py-3.5 px-4 font-bold text-amber-700">${inv.balance.toFixed(2)}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'partial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {inv.balance > 0 ? (
                      <button
                        onClick={() => handleOpenPay(inv)}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        Record Pay
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Settled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPayModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-teal-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-200" />
                <h3 className="font-bold text-sm">Record Patient Payment</h3>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="p-1 rounded-lg hover:bg-teal-800 text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.patient?.firstName} {selectedInvoice.patient?.lastName}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                  <span className="text-slate-700">Remaining Balance:</span>
                  <span className="text-teal-800 font-mono">${selectedInvoice.balance.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedInvoice.balance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Cash Counter</option>
                  <option value="upi">UPI / Instant QR</option>
                  <option value="online">Online Payment Gateway</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transaction Reference #</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  placeholder="e.g. TXN-19283-AUTH"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Confirm & Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
