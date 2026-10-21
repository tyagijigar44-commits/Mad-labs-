// Set VITE_API_BASE_URL only when the API is hosted on a separate domain.
// For the recommended single-service Render deployment, keep the default same-origin /api.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '') + '/api';

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const savedToken = typeof window !== 'undefined' ? window.localStorage.getItem('labpulse_session_token') : null;
    res = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {}),
        ...(options?.headers || {}),
      },
    });
  } catch {
    throw new Error('Backend se connection nahi ho raha. Website ko backend ke saath deploy karein aur API URL check karein.');
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Server error (${res.status}). Netlify par /api/health kholkar check karein.`);
  }
  if (data === null) {
    throw new Error('Server ne galat response diya (API route connect nahi hai). Netlify par /api/health kholkar check karein.');
  }
  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) => fetchJson<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: (token: string) => fetchJson<any>('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  registerPatient: (data: any) => fetchJson<any>('/auth/register-patient', { method: 'POST', body: JSON.stringify(data) }),
  registerLab: (data: any) => fetchJson<any>('/auth/register-lab', { method: 'POST', body: JSON.stringify(data) }),
  getMe: (token: string) => fetchJson<any>('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),

  // Dashboard
  getStats: (branchId?: string) => fetchJson<any>(`/dashboard/stats${branchId ? `?branchId=${branchId}` : ''}`),

  // Patients
  getPatients: (q?: string) => fetchJson<any[]>(`/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getPatient: (id: string) => fetchJson<any>(`/patients/${id}`),
  createPatient: (data: any) => fetchJson<any>('/patients', { method: 'POST', body: JSON.stringify(data) }),

  // Tests
  getTests: () => fetchJson<any[]>('/tests'),
  createTest: (data: any) => fetchJson<any>('/tests', { method: 'POST', body: JSON.stringify(data) }),

  // Orders
  getOrders: () => fetchJson<any[]>('/orders'),
  createOrder: (data: any) => fetchJson<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),

  // Specimens
  getSpecimens: () => fetchJson<any[]>('/specimens'),
  updateSpecimenStatus: (id: string, data: any) => fetchJson<any>(`/specimens/${id}/status`, { method: 'POST', body: JSON.stringify(data) }),

  // Results
  getResults: (orderId?: string) => fetchJson<any[]>(`/results${orderId ? `?orderId=${orderId}` : ''}`),
  saveResult: (data: any) => fetchJson<any>('/results', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReports: () => fetchJson<any[]>('/reports'),
  verifyAndReleaseReport: (id: string, data: any) => fetchJson<any>(`/reports/${id}/verify-and-release`, { method: 'POST', body: JSON.stringify(data) }),
  verifyReportCode: (code: string) => fetchJson<any>(`/reports/verify/${code}`),

  // Billing
  getInvoices: () => fetchJson<any[]>('/billing/invoices'),
  recordPayment: (data: any) => fetchJson<any>('/billing/payments', { method: 'POST', body: JSON.stringify(data) }),

  // Analyzers
  getAnalyzers: () => fetchJson<any[]>('/analyzers'),
  simulateAnalyzer: (id: string, sampleBarcode?: string) => fetchJson<any>(`/analyzers/${id}/simulate`, { method: 'POST', body: JSON.stringify({ sampleBarcode }) }),

  // QC
  getQcRecords: () => fetchJson<any[]>('/qc'),
  recordQc: (data: any) => fetchJson<any>('/qc', { method: 'POST', body: JSON.stringify(data) }),

  // AI Services
  draftReport: (context: any) => fetchJson<any>('/ai/draft-report', { method: 'POST', body: JSON.stringify({ context }) }),
  abnormalCheck: (context: any) => fetchJson<any>('/ai/abnormal-check', { method: 'POST', body: JSON.stringify({ context }) }),
  askAssistant: (query: string) => fetchJson<any>('/ai/assistant', { method: 'POST', body: JSON.stringify({ query }) }),
  parseVoice: (transcript: string, parameters: any[]) => fetchJson<any>('/ai/parse-voice', { method: 'POST', body: JSON.stringify({ transcript, parameters }) }),
  qualityCheck: (testCode: string, results: any[]) => fetchJson<any>('/ai/quality-check', { method: 'POST', body: JSON.stringify({ testCode, results }) }),

  // Staff & Branches
  getStaff: () => fetchJson<any[]>('/staff'),
  getBranches: () => fetchJson<any[]>('/branches'),
  getDoctors: () => fetchJson<any[]>('/doctors'),
  getAuditLogs: () => fetchJson<any[]>('/audit-logs'),
  getNotifications: () => fetchJson<any[]>('/notifications'),

  getPublicPaymentSettings: () => fetchJson<any>('/subscription/payment-settings'),

  // Platform administration (requires a Super Admin session token)
  adminOverview: (token: string) => fetchJson<any>('/admin/overview', { headers: { Authorization: `Bearer ${token}` } }),
  getPaymentSettings: (token: string) => fetchJson<any>('/admin/payment-settings', { headers: { Authorization: `Bearer ${token}` } }),
  adminAuditLogs: (token: string) => fetchJson<any[]>('/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
  savePaymentSettings: (token: string, data: any) => fetchJson<any>('/admin/payment-settings', { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }),
  setLabStatus: (token: string, id: string, isActive: boolean) => fetchJson<any>(`/admin/labs/${encodeURIComponent(id)}/status`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ isActive }) }),
  setLabSubscription: (token: string, id: string, status: string) => fetchJson<any>(`/admin/labs/${encodeURIComponent(id)}/subscription`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) }),
};
