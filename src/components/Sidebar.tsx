import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Barcode,
  FlaskConical,
  FileCheck2,
  Receipt,
  Cpu,
  LineChart,
  ShieldCheck,
  UserCircle2,
  FileCode,
  LogOut,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'patients'
  | 'orders'
  | 'specimens'
  | 'workflow'
  | 'reports'
  | 'patient_portal'
  | 'billing'
  | 'analyzers'
  | 'qc'
  | 'staff'
  | 'apidocs'
  | 'admin';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { role, user, logout } = useAuth();

  const isPatient = role === 'patient';

  const navSections = [
    {
      title: 'Clinical Operations',
      items: [
        { id: 'dashboard', label: 'LIS Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'lab_owner', 'branch_manager', 'pathologist', 'technician', 'receptionist', 'accountant', 'doctor'] },
        { id: 'patients', label: 'Patient Directory', icon: Users, roles: ['super_admin', 'lab_owner', 'branch_manager', 'receptionist', 'pathologist', 'technician'] },
        { id: 'orders', label: 'Test Orders', icon: FileSpreadsheet, badge: 'Live', roles: ['super_admin', 'lab_owner', 'branch_manager', 'receptionist', 'pathologist', 'technician', 'doctor'] },
        { id: 'specimens', label: 'Sample Tracking', icon: Barcode, roles: ['super_admin', 'phlebotomist', 'technician', 'pathologist', 'branch_manager'] },
        { id: 'workflow', label: 'Lab Bench Worklist', icon: FlaskConical, badge: 'Results', roles: ['super_admin', 'technician', 'pathologist', 'lab_owner'] },
        { id: 'reports', label: 'Pathologist Reports', icon: FileCheck2, badge: 'Verify', roles: ['super_admin', 'pathologist', 'lab_owner', 'branch_manager'] },
      ],
    },
    {
      title: 'Diagnostic Patient Hub',
      items: [
        { id: 'patient_portal', label: 'Patient Portal', icon: UserCircle2, badge: isPatient ? 'My Health' : undefined, roles: ['patient', 'super_admin', 'receptionist'] },
      ],
    },
    {
      title: 'Finance & Instruments',
      items: [
        { id: 'billing', label: 'Billing & Invoices', icon: Receipt, roles: ['super_admin', 'accountant', 'lab_owner', 'branch_manager', 'receptionist'] },
        { id: 'analyzers', label: 'Machine Interfacing', icon: Cpu, badge: 'HL7/ASTM', roles: ['super_admin', 'technician', 'lab_owner', 'pathologist'] },
        { id: 'qc', label: 'Quality Control (QC)', icon: LineChart, badge: 'Westgard', roles: ['super_admin', 'technician', 'pathologist', 'lab_owner'] },
      ],
    },
    {
      title: 'Administration & System',
      items: [
        { id: 'staff', label: 'Staff & Audit Logs', icon: ShieldCheck, roles: ['super_admin', 'lab_owner', 'branch_manager'] },
        { id: 'apidocs', label: 'OpenAPI & PostgreSQL', icon: FileCode, roles: ['super_admin', 'lab_owner', 'branch_manager', 'technician', 'accountant', 'pathologist', 'receptionist', 'doctor', 'patient'] },
        { id: 'admin', label: 'Platform Admin', icon: ShieldCheck, roles: ['super_admin'] },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((sec, idx) => {
          // Filter items accessible to current role
          const visibleItems = sec.items.filter(it => it.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx}>
              <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {sec.title}
              </div>
              <nav className="space-y-1">
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id as TabType)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isActive ? 'bg-teal-700/80 text-teal-100' : 'bg-slate-800 text-teal-400 border border-teal-500/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-white truncate">{user?.name || 'Authorized User'}</p>
            <p className="text-[10px] text-teal-400 font-mono capitalize">{role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
