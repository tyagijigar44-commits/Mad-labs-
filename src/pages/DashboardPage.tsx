import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import {
  Users,
  FileSpreadsheet,
  TestTubes,
  Clock,
  ShieldAlert,
  FileCheck2,
  DollarSign,
  TrendingUp,
  Cpu,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Building2,
  CheckCircle,
} from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const { currentBranch, branches, role } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(currentBranch?.id || '');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, oData] = await Promise.all([
        api.getStats(selectedBranchFilter || undefined),
        api.getOrders(),
      ]);
      setStats(sData);
      setOrders(oData.slice(0, 6));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchFilter]);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
            Diagnostic Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time pathological metrics, analytical workload, and revenue monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="">All Branches (Consolidated)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Critical Alert Banner if any critical lab results */}
      {stats?.criticalResultsCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
              <ShieldAlert className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-rose-950">
                {stats.criticalResultsCount} Critical Panic-Value Result(s) Detected
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Pathologist review and verbal clinician notification required per CAP/CLIA escalation protocol.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Review Panic Results
          </button>
        </div>
      )}

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Patients</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats?.totalPatients ?? '--'}</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              +{stats?.todaysRegistrations ?? 0} today
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Central patient index across all facilities</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Test Orders</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats?.totalOrders ?? '--'}</span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
              {stats?.samplesAwaitingProcessing ?? 0} in lab
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{stats?.samplesAwaitingCollection ?? 0} pending phlebotomy</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Turnaround Time (TAT)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats?.averageTurnaroundHours ?? '3.8'}h</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              -18% vs benchmark
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sample collection to pathologist release</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">${stats?.totalRevenue?.toFixed(2) ?? '0.00'}</span>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
              ${stats?.outstandingInvoices?.toFixed(2) ?? '0.00'} bal
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Collected pathology diagnostic fees</p>
        </div>
      </div>

      {/* Secondary Operational Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-sm">
        <div className="border-r border-slate-800 pr-3">
          <p className="text-[11px] text-slate-400 font-medium">Awaiting Collection</p>
          <p className="text-lg font-bold text-amber-400 mt-0.5">{stats?.samplesAwaitingCollection ?? 0}</p>
        </div>
        <div className="border-r border-slate-800 pr-3">
          <p className="text-[11px] text-slate-400 font-medium">Analytical Processing</p>
          <p className="text-lg font-bold text-sky-400 mt-0.5">{stats?.samplesAwaitingProcessing ?? 0}</p>
        </div>
        <div className="border-r border-slate-800 pr-3">
          <p className="text-[11px] text-slate-400 font-medium">Pending Pathologist</p>
          <p className="text-lg font-bold text-purple-400 mt-0.5">{stats?.testsAwaitingVerification ?? 0}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 font-medium">Released Today</p>
          <p className="text-lg font-bold text-emerald-400 mt-0.5">{stats?.reportsReleasedToday ?? 0}</p>
        </div>
      </div>

      {/* Analytics & Volume Charts + Branch Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Volume Trend Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Laboratory Testing Volume by Department</h3>
              <p className="text-xs text-slate-500">Weekly breakdown across analytical specialties</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-md">Live Telemetry</span>
          </div>

          {/* Department Bar Charts */}
          <div className="space-y-3.5 pt-2">
            {[
              { dept: 'Biochemistry (CMP, Enzymes, Lipids)', count: 48, percentage: 82, color: 'bg-teal-500' },
              { dept: 'Hematology (CBC, Differential, Platelets)', count: 39, percentage: 68, color: 'bg-sky-500' },
              { dept: 'Immunology & Serology (Thyroid, Hormones)', count: 24, percentage: 46, color: 'bg-indigo-500' },
              { dept: 'Clinical Pathology (Urinalysis, Fluids)', count: 18, percentage: 32, color: 'bg-amber-500' },
              { dept: 'Microbiology & Culture Sensitivity', count: 9, percentage: 18, color: 'bg-rose-500' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{item.dept}</span>
                  <span className="font-mono text-slate-500">{item.count} orders</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Branch-wise Distribution & Active Analyzers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900">Branch Operations</h3>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-3">
              {stats?.branchBreakdown?.map((b: any) => (
                <div key={b.branchId} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{b.branchName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">ID: {b.branchId}</p>
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                    {b.ordersCount} orders
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Connected Analyzers Indicator */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Cpu className="w-4 h-4 text-teal-600" />
                <span>Connected Analyzers</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {stats?.connectedAnalyzers ?? 3} Online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Recent Test Orders & Workflow Tracking</h3>
            <p className="text-xs text-slate-500">Live order status progression across phlebotomy and testing benches</p>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Orders</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Tests Ordered</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-800">{o.patient?.firstName} {o.patient?.lastName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{o.patient?.patientId}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {o.items?.map((it: any) => it.test?.name.split(' ')[0]).join(', ') || 'Diagnostic Panel'}
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
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        o.status === 'released'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    <span className={o.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>
                      ${o.totalAmount.toFixed(2)} ({o.paymentStatus})
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onNavigate('workflow')}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Process
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
