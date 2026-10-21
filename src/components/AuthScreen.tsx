import React, { useState, useEffect } from 'react';
import { Activity, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, FlaskConical, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';

export function AuthScreen() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', labName: '', email: '', phone: '', password: '', plan: 'monthly' });
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  useEffect(() => { api.getPublicPaymentSettings().then(setPaymentSettings).catch(() => {}); }, []);
  const update = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    try {
      if (mode === 'register') {
        await api.registerLab(form);
        setSuccess('Account created successfully. Your subscription is pending. Scan the payment QR below if available, then contact the Super Admin for payment verification and activation. Login will be available after the subscription is activated.');
        setMode('login');
      } else {
        await login(form.email, form.password);
      }
    } catch (err: any) { setError(err?.message || 'Unable to continue. Check your details and try again.'); }
    finally { setBusy(false); }
  }

  return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
    <div className="absolute -top-28 -left-20 w-96 h-96 rounded-full bg-teal-500/20 blur-3xl" />
    <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl" />
    <div className="relative w-full max-w-5xl grid lg:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-2xl">
      <section className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white">
        <div><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center"><FlaskConical className="w-7 h-7" /></div><div><p className="text-xl font-black tracking-tight">LabPulse AI</p><p className="text-xs text-teal-200">Laboratory Information System</p></div></div>
        <h1 className="text-4xl font-black leading-tight mt-16">Your laboratory.<br/><span className="text-teal-300">One smart workspace.</span></h1><p className="text-slate-300 mt-5 leading-7">Manage patients, test orders, samples, reports, billing and laboratory workflows from one place.</p>
        <div className="mt-8 space-y-4 text-sm">{['Patient and test workflow tools','Role-based staff workspace','Monthly and annual subscription options'].map(x=><div className="flex items-center gap-3" key={x}><CheckCircle2 className="w-5 h-5 text-teal-300"/><span>{x}</span></div>)}</div></div>
        <p className="text-xs text-slate-400">For operational use, configure hosting, secure database, backups and payment gateway before storing real patient records.</p>
      </section>
      <section className="p-6 sm:p-10">
        <div className="lg:hidden flex items-center gap-3 mb-8"><div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center"><FlaskConical /></div><div><p className="font-black text-xl">LabPulse AI</p><p className="text-xs text-slate-500">Laboratory Information System</p></div></div>
        <div className="mb-7"><p className="text-xs uppercase tracking-[.2em] text-teal-700 font-black">Secure workspace</p><h2 className="text-3xl font-black text-slate-900 mt-2">{mode === 'login' ? 'Welcome back' : 'Create lab account'}</h2><p className="text-sm text-slate-500 mt-2">{mode === 'login' ? 'Sign in to continue to your workspace.' : 'Register your diagnostic centre and choose a plan.'}</p></div>
        <div className="flex p-1 rounded-xl bg-slate-100 mb-6"><button onClick={()=>{setMode('login');setError('');setSuccess('')}} className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode==='login'?'bg-white shadow text-slate-900':'text-slate-500'}`}>Login</button><button onClick={()=>{setMode('register');setError('');setSuccess('')}} className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode==='register'?'bg-white shadow text-slate-900':'text-slate-500'}`}>Register</button></div>
        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>}{success && <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700">{success}{paymentSettings?.qrImage && <div className="mt-3 flex flex-col items-center rounded-xl bg-white p-3 text-slate-700"><img src={paymentSettings.qrImage} alt="Subscription payment QR code" className="w-44 h-44 object-contain"/>{paymentSettings.upiId && <p className="mt-2 font-bold">UPI: {paymentSettings.upiId}</p>}<p className="text-xs text-slate-500 mt-1">Keep your transaction reference for payment verification.</p></div>}</div>}
        <form onSubmit={submit} className="space-y-4">
          {mode==='register' && <><label className="block"><span className="text-xs font-bold text-slate-600">Your full name</span><div className="relative mt-1.5"><UserRound className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><input required name="name" value={form.name} onChange={update} className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-sm outline-none focus:border-teal-500" placeholder="Lab owner name"/></div></label><label className="block"><span className="text-xs font-bold text-slate-600">Laboratory / centre name</span><div className="relative mt-1.5"><Building2 className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><input required name="labName" value={form.labName} onChange={update} className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-sm outline-none focus:border-teal-500" placeholder="Your diagnostic centre"/></div></label><label className="block"><span className="text-xs font-bold text-slate-600">Phone number</span><input required name="phone" value={form.phone} onChange={update} className="w-full mt-1.5 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-500" placeholder="Mobile number"/></label></>}
          <label className="block"><span className="text-xs font-bold text-slate-600">Email address</span><div className="relative mt-1.5"><Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><input required type="email" name="email" value={form.email} onChange={update} className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-sm outline-none focus:border-teal-500" placeholder="you@laboratory.com"/></div></label>
          <label className="block"><span className="text-xs font-bold text-slate-600">Password</span><div className="relative mt-1.5"><LockKeyhole className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/><input required minLength={8} type={showPassword?'text':'password'} name="password" value={form.password} onChange={update} className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-3 text-sm outline-none focus:border-teal-500" placeholder="At least 8 characters"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400">{showPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div></label>
          {mode==='register' && <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4"><div className="flex items-center justify-between"><div><p className="font-black text-slate-900">Choose your plan</p><p className="text-xs text-slate-500 mt-1">Subscription prices in INR</p></div><ShieldCheck className="w-6 h-6 text-teal-700"/></div><div className="grid grid-cols-2 gap-3 mt-3"><label className={`rounded-xl border p-3 cursor-pointer ${form.plan==='monthly'?'border-teal-600 bg-white ring-1 ring-teal-600':'border-slate-200 bg-white/70'}`}><input type="radio" name="plan" value="monthly" checked={form.plan==='monthly'} onChange={update} className="mr-2 accent-teal-600"/><span className="text-xs font-bold">Monthly</span><p className="text-2xl font-black mt-1">₹{paymentSettings?.monthlyPrice ?? 400}</p><p className="text-[10px] text-slate-500">per month</p></label><label className={`rounded-xl border p-3 cursor-pointer ${form.plan==='yearly'?'border-teal-600 bg-white ring-1 ring-teal-600':'border-slate-200 bg-white/70'}`}><input type="radio" name="plan" value="yearly" checked={form.plan==='yearly'} onChange={update} className="mr-2 accent-teal-600"/><span className="text-xs font-bold">Yearly</span><p className="text-2xl font-black mt-1">₹{paymentSettings?.yearlyPrice ?? 4000}</p><p className="text-[10px] text-emerald-700 font-bold">Save ₹{Math.max(0, (paymentSettings?.monthlyPrice ?? 400) * 12 - (paymentSettings?.yearlyPrice ?? 4000)).toLocaleString("en-IN")} / year</p></label></div><p className="text-[10px] text-slate-500 mt-2">Payment gateway is not connected yet; registration does not charge money.</p></div>}
          <button disabled={busy} className="w-full rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white py-3.5 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-700/20">{busy?<Activity className="w-4 h-4 animate-spin"/>:null}{busy?'Please wait':mode==='login'?'Sign in securely':'Create account'}{!busy&&<ArrowRight className="w-4 h-4"/>}</button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-6">Demo software: connect a verified payment gateway and harden authentication before public launch.</p>
      </section>
    </div>
  </div>;
}
