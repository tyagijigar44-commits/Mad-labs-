import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, Clock3, CreditCard, IndianRupee, ImagePlus, RefreshCw, Save, ShieldCheck, Users, XCircle, Activity, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';

type Lab = { id: string; name: string; labName: string; email: string; phone?: string; isActive: boolean; createdAt: string; subscriptionPlan: string; subscriptionStatus: string; subscriptionExpiresAt?: string };

export function AdminPanelPage({ onBack }: { onBack: () => void }) {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<'overview'|'labs'|'payments'|'activity'>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [settings, setSettings] = useState<any>({ qrImage: '', upiId: '', monthlyPrice: 400, yearlyPrice: 4000 });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const [o, s, l] = await Promise.all([api.adminOverview(token), api.getPaymentSettings(token), api.adminAuditLogs(token)]);
      setOverview(o); setSettings(s); setLogs(l || []);
    } catch (e: any) { setError(e?.message || 'Could not load platform settings. Please sign in again.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [token]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault(); if (!token) return;
    setSaving(true); setMessage(''); setError('');
    try { const result = await api.savePaymentSettings(token, settings); setSettings(result.settings); setMessage('Payment QR and plan prices saved successfully.'); }
    catch (e: any) { setError(e?.message || 'Settings could not be saved.'); }
    finally { setSaving(false); }
  }

  async function changeLabStatus(lab: Lab) {
    if (!token) return;
    try { await api.setLabStatus(token, lab.id, !lab.isActive); await load(); }
    catch (e: any) { setError(e?.message || 'Could not update lab status.'); }
  }
  async function changeSubscription(lab: Lab, status: string) {
    if (!token) return;
    try { await api.setLabSubscription(token, lab.id, status); await load(); }
    catch (e: any) { setError(e?.message || 'Could not update subscription.'); }
  }
  function handleQr(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 3 * 1024 * 1024) { setError('QR image must be smaller than 3 MB.'); return; }
    const reader = new FileReader(); reader.onload = () => setSettings((old: any) => ({ ...old, qrImage: String(reader.result || '') })); reader.readAsDataURL(file);
  }

  const cards = useMemo(() => overview ? [
    { label: 'Registered Labs', value: overview.totalLabs, icon: Building2, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Active Subscriptions', value: overview.activeSubscriptions, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Pending Subscriptions', value: overview.pendingSubscriptions, icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Expired Subscriptions', value: overview.expiredSubscriptions, icon: XCircle, tone: 'bg-rose-50 text-rose-700' },
    { label: 'Total Accounts', value: overview.totalUsers, icon: Users, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Recorded Payments', value: `₹${Number(overview.estimatedRevenue || 0).toLocaleString('en-IN')}`, icon: IndianRupee, tone: 'bg-teal-50 text-teal-700' },
  ] : [], [overview]);

  const nav = [ ['overview','Overview'], ['labs','Labs & Subscriptions'], ['payments','Payment & QR Settings'], ['activity','Audit Activity'] ] as const;
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-slate-950 text-white px-5 sm:px-8 py-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3"><button onClick={onBack} className="p-2 rounded-xl bg-white/10 hover:bg-white/20" title="Back"><ArrowLeft size={18}/></button><div className="w-11 h-11 rounded-2xl bg-teal-500 flex items-center justify-center"><ShieldCheck size={24}/></div><div><h1 className="font-black text-xl sm:text-2xl">Platform Control Center</h1><p className="text-xs text-slate-300">LabPulse AI · Signed in as {user?.name || 'Super Admin'}</p></div></div>
      <button onClick={load} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-white/10 hover:bg-white/20"><RefreshCw size={15}/> Refresh</button>
    </header>
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5">{nav.map(([id,label])=><button key={id} onClick={()=>{setTab(id);setMessage('');setError('')}} className={`whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold ${tab===id?'bg-teal-700 text-white shadow':'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'}`}>{label}</button>)}</div>
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      {loading ? <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500"><RefreshCw className="animate-spin inline mr-2" size={18}/>Loading platform data…</div> : <>
        {tab==='overview' && <><div className="mb-6"><h2 className="text-2xl font-black">Overview</h2><p className="text-sm text-slate-500 mt-1">Monitor labs, subscriptions and account activity.</p></div><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{cards.map(c=><div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500 font-semibold">{c.label}</span><span className={`p-3 rounded-xl ${c.tone}`}><c.icon size={20}/></span></div><p className="text-3xl font-black mt-4">{c.value}</p></div>)}</div><div className="grid lg:grid-cols-2 gap-5 mt-5"><div className="bg-white border border-slate-200 rounded-2xl p-5"><h3 className="font-black text-lg">Subscription Pricing</h3><div className="grid grid-cols-2 gap-3 mt-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Monthly</p><p className="text-2xl font-black">₹{settings.monthlyPrice}</p><p className="text-xs text-slate-500">30 days</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Yearly</p><p className="text-2xl font-black">₹{settings.yearlyPrice}</p><p className="text-xs text-slate-500">365 days</p></div></div><button onClick={()=>setTab('payments')} className="mt-4 text-sm font-bold text-teal-700">Manage prices and QR →</button></div><div className="bg-white border border-slate-200 rounded-2xl p-5"><h3 className="font-black text-lg">Quick Actions</h3><div className="grid sm:grid-cols-2 gap-3 mt-4"><button onClick={()=>setTab('labs')} className="p-4 rounded-xl border border-slate-200 text-left hover:border-teal-400"><Building2 className="text-teal-700 mb-2"/><b className="block text-sm">Manage labs</b><span className="text-xs text-slate-500">Access and subscription status</span></button><button onClick={()=>setTab('payments')} className="p-4 rounded-xl border border-slate-200 text-left hover:border-teal-400"><CreditCard className="text-teal-700 mb-2"/><b className="block text-sm">Payment settings</b><span className="text-xs text-slate-500">Change payment QR code</span></button></div></div></div></>}
        {tab==='labs' && <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden"><div className="p-5 border-b border-slate-100"><h2 className="text-2xl font-black">Labs & Subscriptions</h2><p className="text-sm text-slate-500 mt-1">Activate, suspend or update a registered lab subscription.</p></div>{!overview?.labs?.length ? <p className="p-8 text-center text-slate-500">No registered lab accounts yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Laboratory','Contact','Plan','Status','Expiry','Actions'].map(x=><th key={x} className="text-left px-4 py-3 font-bold">{x}</th>)}</tr></thead><tbody>{(overview.labs as Lab[]).map(l=><tr key={l.id} className="border-t border-slate-100"><td className="px-4 py-4 min-w-48"><b>{l.labName}</b><p className="text-xs text-slate-500">{l.name}</p><p className="text-[10px] text-slate-400">{l.id}</p></td><td className="px-4 py-4"><p>{l.email}</p><p className="text-xs text-slate-500">{l.phone || '—'}</p></td><td className="px-4 py-4 capitalize">{l.subscriptionPlan || 'monthly'}</td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold capitalize">{l.subscriptionStatus || 'pending'}</span><p className={`text-xs mt-1 ${l.isActive?'text-emerald-700':'text-rose-700'}`}>{l.isActive?'Account active':'Account suspended'}</p></td><td className="px-4 py-4 whitespace-nowrap">{l.subscriptionExpiresAt ? new Date(l.subscriptionExpiresAt).toLocaleDateString() : '—'}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2 min-w-44"><button onClick={()=>changeSubscription(l,'active')} className="rounded-lg bg-emerald-50 text-emerald-700 px-2.5 py-1.5 text-xs font-bold">Activate plan</button><button onClick={()=>changeSubscription(l,'pending')} className="rounded-lg bg-amber-50 text-amber-700 px-2.5 py-1.5 text-xs font-bold">Set pending</button><button onClick={()=>changeLabStatus(l)} className="rounded-lg bg-rose-50 text-rose-700 px-2.5 py-1.5 text-xs font-bold">{l.isActive?'Suspend':'Activate'} account</button></div></td></tr>)}</tbody></table></div>}</div>}
        {tab==='payments' && <div className="grid lg:grid-cols-[1fr_0.8fr] gap-5"><form onSubmit={saveSettings} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7"><h2 className="text-2xl font-black">Payment & QR Settings</h2><p className="text-sm text-slate-500 mt-1 mb-6">Upload your own payment QR and manage subscription pricing.</p><label className="block text-sm font-bold mb-1.5">UPI ID (optional)</label><input value={settings.upiId || ''} onChange={e=>setSettings({...settings,upiId:e.target.value})} placeholder="yourname@upi" className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 mb-5"/><div className="grid sm:grid-cols-2 gap-4"><label className="block"><span className="block text-sm font-bold mb-1.5">Monthly plan price (₹)</span><input type="number" min="0" value={settings.monthlyPrice} onChange={e=>setSettings({...settings,monthlyPrice:Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl p-3"/></label><label className="block"><span className="block text-sm font-bold mb-1.5">Yearly plan price (₹)</span><input type="number" min="0" value={settings.yearlyPrice} onChange={e=>setSettings({...settings,yearlyPrice:Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl p-3"/></label></div><div className="mt-6"><span className="block text-sm font-bold mb-2">Payment QR code</span><label className="flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-5 text-sm font-bold text-slate-600"><UploadCloud size={20}/> Choose QR image (PNG/JPG, max 3 MB)<input type="file" accept="image/*" onChange={handleQr} className="hidden"/></label><p className="text-xs text-slate-400 mt-2">The saved QR will be stored in the app database. Only upload a QR code you control.</p></div><button disabled={saving} className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white p-3.5 font-black disabled:opacity-60"><Save size={17}/>{saving?'Saving…':'Save payment settings'}</button></form><div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7"><h3 className="font-black text-lg">QR Preview</h3><p className="text-sm text-slate-500 mt-1">This is the QR image that will be saved for payment instructions.</p><div className="mt-5 min-h-64 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-4">{settings.qrImage ? <img src={settings.qrImage} alt="Payment QR code preview" className="max-w-full max-h-72 object-contain rounded-lg"/> : <div className="text-center text-slate-400"><ImagePlus size={42} className="mx-auto mb-3"/><p className="font-bold">No QR uploaded</p><p className="text-xs mt-1">Choose an image to preview it here.</p></div>}</div>{settings.upiId && <p className="mt-4 rounded-xl bg-teal-50 text-teal-800 p-3 text-sm"><b>UPI ID:</b> {settings.upiId}</p>}<p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl mt-4">QR upload only saves payment instructions. It does not verify transactions automatically. Verify payment before activating a subscription.</p></div></div>}
        {tab==='activity' && <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden"><div className="p-5 border-b border-slate-100"><h2 className="text-2xl font-black">Audit Activity</h2><p className="text-sm text-slate-500 mt-1">Recent recorded actions in the system.</p></div>{!logs.length ? <p className="p-8 text-center text-slate-500">No activity records available.</p> : <div className="divide-y divide-slate-100">{[...logs].reverse().slice(0,100).map((log:any,i)=><div key={log.id || i} className="p-4 flex items-start gap-3"><span className="p-2 rounded-xl bg-slate-100"><Activity size={17}/></span><div className="flex-1 min-w-0"><p className="font-bold text-sm">{log.action || log.event || 'System activity'}</p><p className="text-sm text-slate-600">{log.details || log.description || log.entityName || ''}</p><p className="text-xs text-slate-400 mt-1">{log.actorName || log.userName || log.userId || 'System'} · {log.timestamp ? new Date(log.timestamp).toLocaleString() : (log.createdAt ? new Date(log.createdAt).toLocaleString() : '')}</p></div></div>)}</div>}</div>}
      </>}
      <p className="text-xs text-slate-400 mt-6">Development build: before public launch, secure all admin APIs, connect a payment provider, add transaction verification and test subscription expiry enforcement.</p>
    </div>
  </div>;
}
