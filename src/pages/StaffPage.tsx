import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { Branch, AuditLog } from '../types.ts';
import {
  Users,
  Building2,
  ShieldCheck,
  History,
  Phone,
  Mail,
  CheckCircle2,
  Search,
} from 'lucide-react';

export const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'branches' | 'audit'>('staff');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sList, bList, aList] = await Promise.all([
        api.getStaff(),
        api.getBranches(),
        api.getAuditLogs(),
      ]);
      setStaff(sList);
      setBranches(bList);
      setAuditLogs(aList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Staff, Branches & Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage certified clinical personnel, facility branches, and HIPAA/CLIA compliance logs</p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('staff')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSubTab === 'staff' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff Directory ({staff.length})
          </button>
          <button
            onClick={() => setActiveSubTab('branches')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSubTab === 'branches' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSubTab === 'audit' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Compliance Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* 1. Staff Directory Sub-tab */}
      {activeSubTab === 'staff' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Name & Professional Title</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Branch Facility</th>
                  <th className="py-3 px-4">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-800">{s.id}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{s.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 capitalize font-mono">
                        {s.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{s.phone || '+1 555-0100'}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {s.branch?.name || 'Apex Central Reference Lab'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Branches Sub-tab */}
      {activeSubTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                  {b.code}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full capitalize">
                  {b.status}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{b.name}</h3>
                <p className="text-[11px] text-slate-400 capitalize mt-0.5 font-medium">{b.type.replace('_', ' ')}</p>
              </div>
              <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                <p>{b.address}, {b.city}</p>
                <p className="font-mono text-[11px]">Ph: {b.phone}</p>
                <p className="font-mono text-[11px] text-slate-400">{b.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Compliance Audit Logs Sub-tab */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-teal-600" />
              <span>Immutable System Audit Trail</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">CAP / CLIA Subpart J Compliance</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Operator / User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{log.userName}</p>
                      <p className="text-[10px] text-slate-400 capitalize font-mono">{log.userRole}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {log.entityType} ({log.entityId})
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-xs">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
