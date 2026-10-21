import { Router, Request, Response } from 'express';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { db, User, Patient, TestOrder, Specimen, Report, ResultEntry } from './db.ts';
import {
  draftLabReportSummary,
  analyzeAbnormalValues,
  queryWorkflowAssistant,
  parseVoiceTranscriptToResults,
  runQualityPlausibilityCheck,
} from './ai.ts';
import { simulateAnalyzerRun, parseHL7Message, parseASTMMessage } from './analyzer.ts';
import { generateLabReportPDF } from './pdf.ts';
import { openApiSpec } from './openapi.ts';

export const apiRouter = Router();


// --- AUTHENTICATED SESSIONS ---
// Signed, short-lived tokens work across Netlify Function instances. Set SESSION_SECRET in Netlify.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
function sessionSecret() {
  return process.env.SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? 'labpulse-local-only-change-this-secret' : '');
}
function createSessionToken(userId: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error('SESSION_SECRET is missing. Add a strong SESSION_SECRET in Netlify environment variables.');
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + SESSION_TTL_MS, jti: randomBytes(12).toString('hex') })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
function getSessionUser(req: Request): User | null {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  const parts = token.split('.');
  const secret = sessionSecret();
  if (parts.length !== 2 || !secret) return null;
  try {
    const expected = createHmac('sha256', secret).update(parts[0]).digest();
    const actual = Buffer.from(parts[1], 'base64url');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    return db.users.find(u => u.id === payload.sub && u.isActive) || null;
  } catch { return null; }
}

function requireSuperAdmin(req: Request, res: Response): User | null {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: 'Please sign in again.' }); return null; }
  if (user.role !== 'super_admin') { res.status(403).json({ error: 'Super administrator access required.' }); return null; }
  return user;
}

function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, branchId: user.branchId, mfaEnabled: user.mfaEnabled, isActive: user.isActive, labName: user.labName, subscriptionPlan: user.subscriptionPlan, subscriptionStatus: user.subscriptionStatus, subscriptionExpiresAt: user.subscriptionExpiresAt };
}

apiRouter.get('/admin/overview', (req: Request, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  const labs = db.users.filter(u => u.role === 'lab_owner');
  const active = labs.filter(u => u.subscriptionStatus === 'active');
  const pending = labs.filter(u => !u.subscriptionStatus || u.subscriptionStatus === 'pending');
  const expired = labs.filter(u => u.subscriptionStatus === 'expired' || (u.subscriptionExpiresAt && new Date(u.subscriptionExpiresAt).getTime() < Date.now()));
  const estimatedRevenue = db.payments.reduce((sum, p: any) => sum + Number(p.amount || 0), 0);
  res.json({ totalLabs: labs.length, activeSubscriptions: active.length, pendingSubscriptions: pending.length, expiredSubscriptions: expired.length, totalUsers: db.users.length, estimatedRevenue, labs: labs.map(u => ({ id: u.id, name: u.name, labName: u.labName || db.branches.find(b => b.id === u.branchId)?.name || 'Laboratory', email: u.email, phone: u.phone, isActive: u.isActive, createdAt: u.createdAt, subscriptionPlan: u.subscriptionPlan || 'monthly', subscriptionStatus: u.subscriptionStatus || 'pending', subscriptionExpiresAt: u.subscriptionExpiresAt, branchId: u.branchId })) });
});

apiRouter.get('/subscription/payment-settings', (_req: Request, res: Response) => {
  // Public fields only; never expose internal admin data here.
  res.json({ qrImage: db.paymentSettings?.qrImage || '', upiId: db.paymentSettings?.upiId || '', monthlyPrice: db.paymentSettings?.monthlyPrice ?? 400, yearlyPrice: db.paymentSettings?.yearlyPrice ?? 4000 });
});

apiRouter.get('/admin/payment-settings', (req: Request, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(db.paymentSettings);
});

apiRouter.get('/admin/audit-logs', (req: Request, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(db.auditLogs.slice(-100).reverse());
});

apiRouter.put('/admin/payment-settings', (req: Request, res: Response) => {
  const admin = requireSuperAdmin(req, res); if (!admin) return;
  const { qrImage, upiId, monthlyPrice, yearlyPrice } = req.body || {};
  if (qrImage !== undefined && qrImage !== '' && !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(String(qrImage))) return res.status(400).json({ error: 'Upload a valid PNG, JPG, or WebP QR image.' });
  const monthly = Number(monthlyPrice ?? 400), yearly = Number(yearlyPrice ?? 4000);
  if (!Number.isFinite(monthly) || !Number.isFinite(yearly) || monthly < 0 || yearly < 0 || monthly > 10000000 || yearly > 10000000) return res.status(400).json({ error: 'Enter valid plan prices.' });
  if (String(qrImage || '').length > 4_200_000) return res.status(413).json({ error: 'QR image is too large. Use an image under 3 MB.' });
  db.paymentSettings = { qrImage: String(qrImage || ''), upiId: String(upiId || '').trim(), monthlyPrice: monthly, yearlyPrice: yearly, updatedAt: new Date().toISOString() };
  db.persist(); db.logAudit({ id: admin.id, name: admin.name, role: admin.role }, 'PAYMENT_SETTINGS_UPDATED', 'Payment Settings', 'platform', 'Updated QR code / UPI and subscription prices.');
  res.json({ message: 'Payment settings saved.', settings: db.paymentSettings });
});

apiRouter.post('/admin/labs/:id/status', (req: Request, res: Response) => {
  const admin = requireSuperAdmin(req, res); if (!admin) return;
  const lab = db.users.find(u => u.id === req.params.id && u.role === 'lab_owner');
  if (!lab) return res.status(404).json({ error: 'Lab account not found.' });
  lab.isActive = Boolean(req.body?.isActive);
  db.persist(); db.logAudit({ id: admin.id, name: admin.name, role: admin.role }, lab.isActive ? 'LAB_ACTIVATED' : 'LAB_SUSPENDED', 'Lab', lab.id, `Lab account ${lab.isActive ? 'activated' : 'suspended'}.`);
  res.json({ message: 'Lab status updated.', id: lab.id, isActive: lab.isActive });
});

apiRouter.post('/admin/labs/:id/subscription', (req: Request, res: Response) => {
  const admin = requireSuperAdmin(req, res); if (!admin) return;
  const lab = db.users.find(u => u.id === req.params.id && u.role === 'lab_owner');
  if (!lab) return res.status(404).json({ error: 'Lab account not found.' });
  const status = String(req.body?.status || 'pending');
  if (!['active', 'pending', 'expired'].includes(status)) return res.status(400).json({ error: 'Invalid subscription status.' });
  lab.subscriptionStatus = status as any;
  if (status === 'active') {
    const expires = new Date();
    if (lab.subscriptionPlan === 'yearly') expires.setFullYear(expires.getFullYear() + 1); else expires.setDate(expires.getDate() + 30);
    lab.subscriptionExpiresAt = expires.toISOString();
  }
  db.persist(); db.logAudit({ id: admin.id, name: admin.name, role: admin.role }, 'SUBSCRIPTION_UPDATED', 'Subscription', lab.id, `Subscription status set to ${status}.`);
  res.json({ message: 'Subscription updated.', id: lab.id, subscriptionStatus: lab.subscriptionStatus, subscriptionExpiresAt: lab.subscriptionExpiresAt });
});

// --- AUTHENTICATION & ACCESS CONTROL (MODULE 1) ---
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
  const user = db.users.find(u => u.email.toLowerCase() === email);

  let passwordOk = false;
  if (user && user.passwordHash.startsWith('scrypt$')) {
    const parts = user.passwordHash.split('$');
    try { const expected = Buffer.from(parts[2], 'hex'); const actual = scryptSync(password, parts[1], 64); passwordOk = expected.length === actual.length && timingSafeEqual(expected, actual); } catch { passwordOk = false; }
  } else if (user) {
    // One-time migration for older demo accounts: upgrade plaintext legacy passwords after successful login.
    passwordOk = user.passwordHash === password;
    if (passwordOk) {
      const salt = randomBytes(16).toString('hex');
      user.passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
      db.persist();
    }
  }
  if (!user || !passwordOk) return res.status(401).json({ error: 'Invalid email or password.' });
  if (!user.isActive) return res.status(403).json({ error: 'Account has been deactivated. Contact the platform administrator.' });

  // Do not issue an application workspace to a lab whose paid subscription has expired.
  if (user.role === 'lab_owner' && user.subscriptionStatus === 'active' && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt).getTime() <= Date.now()) {
    user.subscriptionStatus = 'expired'; db.persist();
  }
  if (user.role === 'lab_owner' && user.subscriptionStatus === 'expired') {
    return res.status(403).json({ error: 'Your subscription has expired. Contact support to renew it.' });
  }
  if (user.role === 'lab_owner' && (!user.subscriptionStatus || user.subscriptionStatus === 'pending')) {
    return res.status(403).json({ error: 'Your account is registered, but the subscription is still pending. Contact the Super Admin after payment verification.' });
  }

  let token: string;
  try { token = createSessionToken(user.id); } catch (error: any) { return res.status(503).json({ error: error?.message || 'Authentication is not configured.' }); }
  db.logAudit({ id: user.id, name: user.name, role: user.role }, 'USER_LOGIN', 'User', user.id, 'Successful login.');
  return res.json({ user: publicUser(user), token, expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'A valid login session is required.' });
  return res.json({ user: publicUser(user) });
});

apiRouter.post('/auth/logout', (_req: Request, res: Response) => {
  // Tokens are signed and expire automatically after 12 hours; the client clears its copy on logout.
  return res.json({ message: 'Signed out.' });
});

apiRouter.post('/auth/register-lab', (req: Request, res: Response) => {
  const { name, labName, email, phone, password, plan } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!name || !labName || !cleanEmail || !phone || !password) return res.status(400).json({ error: 'Please complete all registration fields.' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must contain at least 8 characters.' });
  if (!['monthly', 'yearly'].includes(plan)) return res.status(400).json({ error: 'Please select a valid subscription plan.' });
  if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });

  const now = new Date();
  const expires = new Date(now);
  if (plan === 'yearly') expires.setFullYear(expires.getFullYear() + 1); else expires.setMonth(expires.getMonth() + 1);
  const userId = 'USR-' + Date.now();
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  const branchId = 'BR-' + Date.now();
  const newUser: User = {
    id: userId, email: cleanEmail, name: String(name).trim(), role: 'lab_owner', phone: String(phone).trim(), branchId,
    passwordHash: `scrypt$${salt}$${hash}`, isActive: true, createdAt: now.toISOString(),
    labName: String(labName).trim(), subscriptionPlan: plan, subscriptionStatus: 'pending', subscriptionExpiresAt: expires.toISOString(),
  };
  db.users.push(newUser);
  db.branches.push({ id: branchId, code: `LAB-${Date.now().toString().slice(-6)}`, name: String(labName).trim(), type: 'reference_lab', address: 'Update address in branch settings', city: 'India', phone: String(phone).trim(), email: cleanEmail, managerId: userId, status: 'active' });
  db.persist();
  db.logAudit({ id: userId, name: newUser.name, role: newUser.role }, 'LAB_REGISTER', 'Subscription', userId, `Registered ${plan} plan; payment pending. Price: INR ${plan === 'yearly' ? (db.paymentSettings?.yearlyPrice ?? 4000) : (db.paymentSettings?.monthlyPrice ?? 400)}/period.`);
  return res.status(201).json({ message: 'Account created. Subscription is pending until payment is connected/confirmed.', user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, subscriptionPlan: plan, subscriptionStatus: 'pending', subscriptionExpiresAt: expires.toISOString() } });
});

apiRouter.post('/auth/register-patient', (req: Request, res: Response) => {
  const { firstName, lastName, email, phone, dob, gender, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!firstName || !lastName || !cleanEmail || !dob || !password || String(password).length < 8) {
    return res.status(400).json({ error: 'First name, last name, valid email, date of birth and a password of at least 8 characters are required.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return res.status(400).json({ error: 'Enter a valid email address.' });

  // Check duplicate email
  if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'An account with this email address already exists' });
  }

  const userId = 'USR-' + Date.now();
  const newUser: User = {
    id: userId,
    email: cleanEmail,
    name: `${String(firstName).trim()} ${String(lastName).trim()}`,
    role: 'patient',
    phone,
    passwordHash: (() => { const salt = randomBytes(16).toString('hex'); return `scrypt$${salt}$${scryptSync(String(password), salt, 64).toString('hex')}`; })(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);

  // Calculate age
  const birthDate = new Date(dob);
  const ageDiff = Date.now() - birthDate.getTime();
  const age = Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);

  const patientId = `PAT-2026-${1000 + db.patients.length + 1}`;
  const newPatient: Patient = {
    id: 'PAT-' + Date.now(),
    patientId,
    userId,
    firstName,
    lastName,
    dob,
    age,
    gender: gender || 'female',
    phone,
    email: cleanEmail,
    address: 'Self-registered Online',
    consentSigned: true,
    createdAt: new Date().toISOString(),
  };
  db.patients.push(newPatient);
  db.persist();

  db.logAudit({ id: userId, name: newUser.name, role: 'patient' }, 'PATIENT_SELF_REGISTER', 'Patient', newPatient.id, `Self registered with ID ${patientId}`);

  res.status(201).json({ user: publicUser(newUser), patient: newPatient });
});

// Protect all laboratory/business APIs by default. Login, registration, public plan settings,
// health checks and report-code verification remain public by design.
apiRouter.use((req: Request, res: Response, next) => {
  if (req.method === 'GET' && req.path.startsWith('/reports/verify/')) return next();
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to access this information.' });
  (req as any).authUser = user;
  next();
});

// --- ADMIN DASHBOARD & STATS (MODULE 2) ---
apiRouter.get('/dashboard/stats', (req: Request, res: Response) => {
  const branchId = req.query.branchId as string;

  const orders = branchId ? db.orders.filter(o => o.branchId === branchId) : db.orders;
  const specimens = branchId ? db.specimens.filter(s => s.branchId === branchId) : db.specimens;
  const reports = branchId ? db.reports.filter(r => r.branchId === branchId) : db.reports;
  const invoices = db.invoices;

  const totalPatients = db.patients.length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysRegistrations = db.patients.filter(p => p.createdAt.startsWith(todayStr)).length;

  const samplesAwaitingCollection = specimens.filter(s => s.status === 'ordered' || s.status === 'collection_pending').length;
  const samplesAwaitingProcessing = specimens.filter(s => s.status === 'received' || s.status === 'processing').length;
  const testsAwaitingVerification = reports.filter(r => r.status === 'draft' || r.status === 'under_review').length;
  const reportsReleasedToday = reports.filter(r => r.status === 'released').length;

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const outstandingInvoices = invoices.reduce((sum, inv) => sum + inv.balance, 0);
  const criticalResultsCount = db.results.filter(r => r.flag === 'critical').length;
  const connectedAnalyzers = db.analyzers.filter(a => a.status === 'connected').length;

  res.json({
    totalPatients,
    todaysRegistrations,
    totalOrders: orders.length,
    samplesAwaitingCollection,
    samplesAwaitingProcessing,
    testsAwaitingVerification,
    reportsReleasedToday,
    totalRevenue,
    outstandingInvoices,
    averageTurnaroundHours: 3.8,
    criticalResultsCount,
    connectedAnalyzers,
    branchBreakdown: db.branches.map(b => ({
      branchId: b.id,
      branchName: b.name,
      ordersCount: db.orders.filter(o => o.branchId === b.id).length,
    })),
  });
});

// --- PATIENT MANAGEMENT (MODULE 3) ---
apiRouter.get('/patients', (req: Request, res: Response) => {
  const q = ((req.query.q as string) || '').toLowerCase();
  let list = db.patients;
  if (q) {
    list = list.filter(p =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  }
  res.json(list);
});

apiRouter.post('/patients', (req: Request, res: Response) => {
  const { firstName, lastName, dob, gender, bloodGroup, phone, email, address, emergencyContact, notes } = req.body;
  if (!firstName || !lastName || !dob || !phone) {
    return res.status(400).json({ error: 'First name, last name, date of birth, and phone are mandatory.' });
  }

  // Duplicate check
  const duplicate = db.patients.find(p => p.phone === phone && p.firstName.toLowerCase() === firstName.toLowerCase());
  if (duplicate) {
    return res.status(409).json({ error: `Possible duplicate patient detected with ID ${duplicate.patientId}` });
  }

  const birthDate = new Date(dob);
  const age = Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);

  const newPatient: Patient = {
    id: 'PAT-' + Date.now(),
    patientId: `PAT-2026-${1000 + db.patients.length + 1}`,
    firstName,
    lastName,
    dob,
    age,
    gender: gender || 'female',
    bloodGroup,
    phone,
    email: email || '',
    address: address || '',
    emergencyContact,
    consentSigned: true,
    notes,
    createdAt: new Date().toISOString(),
  };

  db.patients.unshift(newPatient);
  db.persist();
  db.logAudit({ id: 'SYSTEM', name: 'Authorized Staff', role: 'receptionist' }, 'PATIENT_CREATED', 'Patient', newPatient.id, `Patient registered: ${newPatient.firstName} ${newPatient.lastName}`);

  res.status(201).json(newPatient);
});

apiRouter.get('/patients/:id', (req: Request, res: Response) => {
  const patient = db.patients.find(p => p.id === req.params.id || p.patientId === req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const orders = db.orders.filter(o => o.patientId === patient.id);
  const reports = db.reports.filter(r => r.patientId === patient.id);
  const invoices = db.invoices.filter(i => i.patientId === patient.id);

  res.json({
    patient,
    orders,
    reports,
    invoices,
  });
});

// --- TEST CATALOGUE (MODULE 4) ---
apiRouter.get('/tests', (req: Request, res: Response) => {
  res.json(db.tests);
});

apiRouter.post('/tests', (req: Request, res: Response) => {
  const { code, name, department, specimenType, price, cost, sampleVolume, turnaroundHours, instructions, parameters } = req.body;
  if (!code || !name || !price) {
    return res.status(400).json({ error: 'Code, name, and price are required.' });
  }

  const newTest = {
    id: 'TEST-' + Date.now(),
    code,
    name,
    department: department || 'Biochemistry',
    specimenType: specimenType || 'Serum',
    price: Number(price),
    cost: Number(cost || price * 0.2),
    sampleVolume: sampleVolume || '3.0 mL',
    turnaroundHours: Number(turnaroundHours || 4),
    instructions: instructions || 'Standard sample collection.',
    parameters: parameters || [{ name: 'Test Result', unit: '', low: 0, high: 100, method: 'Direct' }],
    status: 'active' as const,
  };

  db.tests.push(newTest);
  db.persist();
  res.status(201).json(newTest);
});

// --- ORDERS & TRANSACTION (MODULE 4) ---
apiRouter.get('/orders', (req: Request, res: Response) => {
  const list = db.orders.map(o => {
    const patient = db.patients.find(p => p.id === o.patientId);
    const branch = db.branches.find(b => b.id === o.branchId);
    const doctor = o.doctorId ? db.doctors.find(d => d.id === o.doctorId) : null;
    const items = db.orderItems.filter(oi => oi.orderId === o.id).map(oi => {
      const test = db.tests.find(t => t.id === oi.testId);
      return { ...oi, test };
    });
    const specimens = db.specimens.filter(s => s.orderId === o.id);
    const report = db.reports.find(r => r.orderId === o.id);

    return {
      ...o,
      patient,
      branch,
      doctor,
      items,
      specimens,
      report,
    };
  });
  res.json(list);
});

apiRouter.post('/orders', (req: Request, res: Response) => {
  const { patientId, branchId, doctorId, testIds, priority, discount, paidAmount, paymentMethod, clinicalNotes } = req.body;

  if (!patientId || !testIds || !testIds.length) {
    return res.status(400).json({ error: 'Patient and at least one test are required to generate an order.' });
  }

  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  // Calculate pricing
  const selectedTests = db.tests.filter(t => testIds.includes(t.id));
  const subtotal = selectedTests.reduce((sum, t) => sum + t.price, 0);
  const disc = Number(discount || 0);
  const total = Math.max(0, subtotal - disc);
  const paid = Number(paidAmount || 0);
  const paymentStatus = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

  const orderId = 'ORD-' + Date.now();
  const orderNumber = `ORD-2026-${2000 + db.orders.length + 1}`;

  // 1. Create Order
  const newOrder: TestOrder = {
    id: orderId,
    orderNumber,
    patientId,
    branchId: branchId || 'BR-01',
    doctorId: doctorId || undefined,
    priority: priority || 'routine',
    status: 'ordered',
    totalAmount: total,
    discount: disc,
    paidAmount: paid,
    paymentStatus,
    clinicalNotes,
    createdById: 'USR-05',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.orders.unshift(newOrder);

  // 2. Order items
  for (const t of selectedTests) {
    db.orderItems.push({
      id: 'OI-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      orderId,
      testId: t.id,
      price: t.price,
      status: 'pending',
    });
  }

  // 3. Generate Specimen Barcodes for needed sample tubes
  const specimenTypes = Array.from(new Set(selectedTests.map(t => t.specimenType)));
  for (const sType of specimenTypes) {
    const specimenBarcode = `SMP-2026-${3000 + db.specimens.length + 1}`;
    const tubeColor = sType.includes('EDTA') ? 'Lavender' : sType.includes('Serum') ? 'Gold SST' : 'Standard Tube';

    const newSpecimen: Specimen = {
      id: 'SMP-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      specimenId: specimenBarcode,
      orderId,
      patientId,
      specimenType: sType,
      tubeColor,
      status: 'collection_pending',
      department: selectedTests.find(t => t.specimenType === sType)?.department || 'Biochemistry',
      branchId: branchId || 'BR-01',
      createdAt: new Date().toISOString(),
    };
    db.specimens.push(newSpecimen);

    db.specimenEvents.push({
      id: 'EVT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      specimenId: specimenBarcode,
      status: 'Collection Pending',
      actorId: 'USR-05',
      actorName: 'Jessica Taylor',
      timestamp: new Date().toISOString(),
      notes: `Specimen ordered for ${sType}. Barcode generated.`,
    });
  }

  // 4. Generate Invoice
  const invoiceId = 'INV-' + Date.now();
  const invoiceNumber = `INV-2026-${5000 + db.invoices.length + 1}`;
  const newInvoice = {
    id: invoiceId,
    invoiceNumber,
    orderId,
    patientId,
    subtotal,
    tax: 0,
    discount: disc,
    total,
    paidAmount: paid,
    balance: Math.max(0, total - paid),
    status: paymentStatus as any,
    createdAt: new Date().toISOString(),
  };
  db.invoices.unshift(newInvoice);

  // 5. Payment record if paid
  if (paid > 0) {
    db.payments.push({
      id: 'PAY-' + Date.now(),
      invoiceId,
      orderId,
      amount: paid,
      method: paymentMethod || 'cash',
      referenceNumber: `TXN-${Date.now().toString().slice(-6)}`,
      recordedBy: 'Jessica Taylor',
      createdAt: new Date().toISOString(),
    });
  }

  // 6. Report Draft initialization
  const reportNumber = `REP-2026-${4000 + db.reports.length + 1}`;
  const verificationCode = `VRF-${4000 + db.reports.length + 1}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  db.reports.push({
    id: 'REP-' + Date.now(),
    reportNumber,
    orderId,
    patientId,
    branchId: branchId || 'BR-01',
    status: 'draft',
    verificationCode,
    pdfGenerated: false,
    version: 1,
    createdAt: new Date().toISOString(),
  });

  db.persist();
  db.logAudit({ id: 'USR-05', name: 'Jessica Taylor', role: 'receptionist' }, 'ORDER_CREATED', 'TestOrder', orderId, `Created order ${orderNumber} for patient ${patient.firstName} ${patient.lastName}`);

  res.status(201).json({
    order: newOrder,
    invoice: newInvoice,
  });
});

// --- SPECIMEN & BARCODE TRACKING (MODULE 5) ---
apiRouter.get('/specimens', (req: Request, res: Response) => {
  const list = db.specimens.map(s => {
    const patient = db.patients.find(p => p.id === s.patientId);
    const order = db.orders.find(o => o.id === s.orderId);
    const events = db.specimenEvents.filter(e => e.specimenId === s.specimenId);
    return { ...s, patient, order, events };
  });
  res.json(list);
});

apiRouter.post('/specimens/:id/status', (req: Request, res: Response) => {
  const { status, actorName, actorId, notes, rejectionReason } = req.body;
  const specimen = db.specimens.find(s => s.id === req.params.id || s.specimenId === req.params.id);
  if (!specimen) return res.status(404).json({ error: 'Specimen not found' });

  specimen.status = status;
  if (status === 'collected') {
    specimen.collectedBy = actorName || 'Elena Rostova, CPT';
    specimen.collectedAt = new Date().toISOString();
  } else if (status === 'received') {
    specimen.receivedBy = actorName || 'Marcus Chen, MLT';
    specimen.receivedAt = new Date().toISOString();
  } else if (status === 'rejected') {
    specimen.rejectionReason = rejectionReason || 'Specimen hemolyzed/compromised';
  }

  // Update order status if appropriate
  const order = db.orders.find(o => o.id === specimen.orderId);
  if (order) {
    if (status === 'collected') order.status = 'sample_collected';
    if (status === 'received' || status === 'processing') order.status = 'processing';
  }

  db.specimenEvents.push({
    id: 'EVT-' + Date.now(),
    specimenId: specimen.specimenId,
    status: status.toUpperCase(),
    actorId: actorId || 'USR-03',
    actorName: actorName || 'Staff Member',
    timestamp: new Date().toISOString(),
    notes: notes || `Specimen marked as ${status}. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`,
  });

  db.persist();
  res.json({ specimen, order });
});

// --- LABORATORY RESULTS & VERIFICATION (MODULE 6) ---
apiRouter.get('/results', (req: Request, res: Response) => {
  const orderId = req.query.orderId as string;
  if (orderId) {
    return res.json(db.results.filter(r => r.orderId === orderId));
  }
  res.json(db.results);
});

apiRouter.post('/results', (req: Request, res: Response) => {
  const { orderId, testId, parameterName, value, unit, referenceLow, referenceHigh, flag, notes, actorId } = req.body;
  if (!orderId || !parameterName || value === undefined) {
    return res.status(400).json({ error: 'Order ID, parameter name, and result value are required.' });
  }

  const numVal = parseFloat(value);
  let computedFlag = flag;
  if (!computedFlag && !isNaN(numVal) && referenceLow !== undefined && referenceHigh !== undefined) {
    if (numVal < referenceLow) computedFlag = 'low';
    else if (numVal > referenceHigh) computedFlag = 'high';
    else computedFlag = 'normal';
  }

  let existing = db.results.find(r => r.orderId === orderId && r.parameterName === parameterName);
  if (existing) {
    existing.value = String(value);
    existing.numericValue = isNaN(numVal) ? undefined : numVal;
    existing.flag = computedFlag || existing.flag;
    existing.notes = notes || existing.notes;
    existing.enteredAt = new Date().toISOString();
    existing.version += 1;
  } else {
    existing = {
      id: 'RES-' + Date.now(),
      orderId,
      testId: testId || 'TEST-GEN',
      parameterName,
      value: String(value),
      numericValue: isNaN(numVal) ? undefined : numVal,
      unit: unit || '',
      referenceLow,
      referenceHigh,
      flag: computedFlag || 'normal',
      enteredById: actorId || 'USR-03',
      enteredAt: new Date().toISOString(),
      notes,
      version: 1,
    };
    db.results.push(existing);
  }

  db.persist();
  res.json(existing);
});

// --- REPORT MANAGEMENT & RELEASE (MODULE 7) ---
apiRouter.get('/reports', (req: Request, res: Response) => {
  const list = db.reports.map(r => {
    const patient = db.patients.find(p => p.id === r.patientId);
    const order = db.orders.find(o => o.id === r.orderId);
    const branch = db.branches.find(b => b.id === r.branchId);
    const results = db.results.filter(res => res.orderId === r.orderId);
    return { ...r, patient, order, branch, results };
  });
  res.json(list);
});

apiRouter.post('/reports/:id/verify-and-release', (req: Request, res: Response) => {
  const { interpretation, pathologistNotes, verifiedById, verifiedByName } = req.body;
  const report = db.reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  report.interpretationDraft = interpretation || report.interpretationDraft;
  report.pathologistNotes = pathologistNotes;
  report.verifiedById = verifiedById || 'USR-02';
  report.verifiedByName = verifiedByName || 'Dr. Sarah Jenkins, FRCPath';
  report.releasedAt = new Date().toISOString();
  report.status = 'released';
  report.pdfGenerated = true;

  // Mark order as released
  const order = db.orders.find(o => o.id === report.orderId);
  if (order) {
    order.status = 'released';
  }

  // Create notification for patient
  db.notifications.unshift({
    id: 'NOTIF-' + Date.now(),
    recipientId: report.patientId,
    type: 'report_ready',
    title: 'Laboratory Diagnostic Report Released',
    message: `Your clinical report (${report.reportNumber}) has been approved by ${report.verifiedByName} and is now ready for download.`,
    channel: 'in_app',
    read: false,
    createdAt: new Date().toISOString(),
  });

  db.persist();
  db.logAudit({ id: verifiedById || 'USR-02', name: verifiedByName || 'Dr. Sarah Jenkins', role: 'pathologist' }, 'REPORT_RELEASED', 'Report', report.id, `Report ${report.reportNumber} authorized and released.`);

  res.json(report);
});

// PDF Report Download
apiRouter.get('/reports/:id/pdf', async (req: Request, res: Response) => {
  try {
    const pdfBuffer = await generateLabReportPDF(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ApexLIS-Report-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});

// Minimal-data QR Code Public Verification Endpoint
apiRouter.get('/reports/verify/:code', (req: Request, res: Response) => {
  const report = db.reports.find(r => r.verificationCode.toLowerCase() === req.params.code.toLowerCase());
  if (!report || report.status !== 'released') {
    return res.status(404).json({ verified: false, message: 'Invalid or unreleased diagnostic report.' });
  }

  const patient = db.patients.find(p => p.id === report.patientId);
  res.json({
    verified: true,
    reportNumber: report.reportNumber,
    releasedAt: report.releasedAt,
    authorizedBy: report.verifiedByName,
    patientInitials: patient ? `${patient.firstName[0]}*** ${patient.lastName[0]}***` : 'A*** S***',
    laboratory: 'Apex Clinical Reference Laboratories (CAP & ISO 15189 Accredited)',
  });
});

// --- BILLING & PAYMENTS (MODULE 10) ---
apiRouter.get('/billing/invoices', (req: Request, res: Response) => {
  const list = db.invoices.map(inv => {
    const patient = db.patients.find(p => p.id === inv.patientId);
    const order = db.orders.find(o => o.id === inv.orderId);
    const payments = db.payments.filter(p => p.invoiceId === inv.id);
    return { ...inv, patient, order, payments };
  });
  res.json(list);
});

apiRouter.post('/billing/payments', (req: Request, res: Response) => {
  const { invoiceId, amount, method, referenceNumber, recordedBy } = req.body;
  const invoice = db.invoices.find(i => i.id === invoiceId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const amt = Number(amount);
  if (amt <= 0) return res.status(400).json({ error: 'Payment amount must be greater than zero.' });

  const newPayment = {
    id: 'PAY-' + Date.now(),
    invoiceId,
    orderId: invoice.orderId,
    amount: amt,
    method: method || 'cash',
    referenceNumber: referenceNumber || `TXN-${Date.now().toString().slice(-6)}`,
    recordedBy: recordedBy || 'Jessica Taylor',
    createdAt: new Date().toISOString(),
  };
  db.payments.push(newPayment);

  invoice.paidAmount += amt;
  invoice.balance = Math.max(0, invoice.total - invoice.paidAmount);
  invoice.status = invoice.balance <= 0 ? 'paid' : 'partial';

  const order = db.orders.find(o => o.id === invoice.orderId);
  if (order) {
    order.paidAmount = invoice.paidAmount;
    order.paymentStatus = invoice.status;
  }

  db.persist();
  res.json({ payment: newPayment, invoice });
});

// --- MACHINE & ANALYZER INTEGRATION (MODULE 12) ---
apiRouter.get('/analyzers', (req: Request, res: Response) => {
  res.json(db.analyzers);
});

apiRouter.post('/analyzers/:id/simulate', (req: Request, res: Response) => {
  const { sampleBarcode } = req.body;
  try {
    const runResult = simulateAnalyzerRun(req.params.id, sampleBarcode);
    res.json(runResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Analyzer simulation failed' });
  }
});

// --- QUALITY CONTROL (MODULE 15) ---
apiRouter.get('/qc', (req: Request, res: Response) => {
  res.json(db.qcRecords);
});

apiRouter.post('/qc', (req: Request, res: Response) => {
  const { analyzerId, testCode, controlLot, level, targetMean, targetSD, observedValue, technicianName } = req.body;
  const mean = Number(targetMean);
  const sd = Number(targetSD);
  const obs = Number(observedValue);
  const zScore = (obs - mean) / (sd || 1);

  let status: 'in_control' | 'warning' | 'out_of_control' = 'in_control';
  let ruleViolated: string | undefined = undefined;

  // Westgard Rules Evaluation
  if (Math.abs(zScore) > 3) {
    status = 'out_of_control';
    ruleViolated = '1:3s Rule (Observed value exceeds 3 standard deviations)';
  } else if (Math.abs(zScore) > 2) {
    status = 'warning';
    ruleViolated = '1:2s Warning Rule (Observed value exceeds 2 standard deviations)';
  }

  const record = {
    id: 'QC-' + Date.now(),
    analyzerId: analyzerId || 'ANZ-01',
    testCode: testCode || 'CBC-01',
    controlLot: controlLot || 'LOT-2026-X',
    level: level || 'Level 2 (Normal)',
    targetMean: mean,
    targetSD: sd,
    observedValue: obs,
    zScore: Number(zScore.toFixed(2)),
    status,
    ruleViolated,
    runAt: new Date().toISOString(),
    technicianName: technicianName || 'Marcus Chen, MLT',
  };

  db.qcRecords.unshift(record);
  db.persist();
  res.status(201).json(record);
});

// --- AI INTEGRATION (MODULE 9) ---
apiRouter.post('/ai/draft-report', async (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    if (!context) return res.status(400).json({ error: 'Context required' });
    const draft = await draftLabReportSummary(context);
    res.json(draft);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'AI drafting error' });
  }
});

apiRouter.post('/ai/abnormal-check', async (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    const check = await analyzeAbnormalValues(context);
    res.json(check);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/ai/assistant', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const systemStats = {
      totalOrders: db.orders.length,
      pendingCollection: db.specimens.filter(s => s.status === 'collection_pending').length,
      inProcessing: db.specimens.filter(s => s.status === 'processing' || s.status === 'received').length,
      awaitingVerification: db.reports.filter(r => r.status === 'draft' || r.status === 'under_review').length,
      reportsReleasedToday: db.reports.filter(r => r.status === 'released').length,
      criticalAlertsCount: db.results.filter(r => r.flag === 'critical').length,
      connectedAnalyzers: db.analyzers.filter(a => a.status === 'connected').length,
      currentBranchName: 'Apex Central Reference Laboratory',
    };
    const answer = await queryWorkflowAssistant(query || 'What are the urgent tasks today?', systemStats);
    res.json({ answer });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/ai/parse-voice', async (req: Request, res: Response) => {
  try {
    const { transcript, parameters } = req.body;
    const parsed = await parseVoiceTranscriptToResults(transcript || '', parameters || []);
    res.json({ results: parsed });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/ai/quality-check', async (req: Request, res: Response) => {
  try {
    const { testCode, results } = req.body;
    const qc = await runQualityPlausibilityCheck(testCode || '', results || []);
    res.json(qc);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- STAFF & BRANCHES & AUDIT LOGS (MODULE 11, 13, 17) ---
apiRouter.get('/staff', (req: Request, res: Response) => {
  const staff = db.users.filter(u => u.role !== 'patient').map(u => {
    const branch = db.branches.find(b => b.id === u.branchId);
    return { ...u, branch };
  });
  res.json(staff);
});

apiRouter.get('/branches', (req: Request, res: Response) => {
  res.json(db.branches);
});

apiRouter.get('/doctors', (req: Request, res: Response) => {
  res.json(db.doctors);
});

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  res.json(db.auditLogs);
});

apiRouter.get('/notifications', (req: Request, res: Response) => {
  res.json(db.notifications);
});

// --- OPENAPI 3.0 SPEC & POSTGRESQL SCHEMA SPEC (MODULE 17, 19) ---
apiRouter.get('/openapi.json', (req: Request, res: Response) => {
  res.json(openApiSpec);
});

apiRouter.get('/schema.sql', (req: Request, res: Response) => {
  const schemaPath = path.resolve(process.cwd(), 'server', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(fs.readFileSync(schemaPath, 'utf-8'));
  } else {
    res.status(404).json({ error: 'Schema file not found' });
  }
});

