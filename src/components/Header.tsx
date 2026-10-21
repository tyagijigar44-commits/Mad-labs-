import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Activity,
  Building2,
  Sparkles,
  QrCode,
  Bell,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api.ts';

interface HeaderProps {
  onOpenAiAssistant: () => void;
  onOpenVerifyModal: () => void;
  onSearchSelect?: (item: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAiAssistant, onOpenVerifyModal }) => {
  const { branches, currentBranch, switchBranch } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    api.getNotifications().then(setNotifications).catch(() => {});
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;



  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs h-16 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-sky-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-teal-700/20">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight text-slate-900">Apex<span className="text-teal-600">LIS</span></span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">Enterprise v2.4</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Clinical Pathology & Diagnostic Information System</p>
        </div>
      </div>

      {/* Center: Branch Selector */}
      <div className="hidden md:flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-lg border border-slate-200">
        <Building2 className="w-4 h-4 text-slate-500 ml-1.5" />
        <select
          value={currentBranch?.id || ''}
          onChange={(e) => switchBranch(e.target.value)}
          className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer pr-2"
        >
          {branches.map(b => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Verify QR Code */}
        <button
          onClick={onOpenVerifyModal}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
          title="Verify authentic patient diagnostic report"
        >
          <QrCode className="w-3.5 h-3.5 text-teal-600" />
          <span>Verify Report</span>
        </button>

        {/* AI Copilot Launcher */}
        <button
          onClick={onOpenAiAssistant}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          title="AI Pathology & Workflow Copilot (Powered by Gemini)"
        >
          <Sparkles className="w-4 h-4 text-teal-600 group-hover:rotate-12 transition-transform" />
          <span className="font-bold">AI Copilot</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-800">Critical & System Notifications</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-medium text-slate-600">{notifications.length} events</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {notifications.map(n => (
                  <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                      {n.type === 'critical_result' ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-teal-600" />
                      )}
                      <span>{n.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{n.message}</p>
                    <span className="text-[9px] text-slate-400 block mt-1">{new Date(n.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
