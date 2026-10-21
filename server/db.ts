import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Types representing all 35+ normalized database tables from Module 19
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'lab_owner' | 'branch_manager' | 'receptionist' | 'phlebotomist' | 'technician' | 'pathologist' | 'accountant' | 'doctor' | 'corporate' | 'patient';
  phone?: string;
  branchId?: string;
  passwordHash: string;
  isActive: boolean;
  avatar?: string;
  mfaEnabled?: boolean;
  createdAt: string;
  labName?: string;
  subscriptionPlan?: 'monthly' | 'yearly';
  subscriptionStatus?: 'trial' | 'active' | 'pending' | 'expired';
  subscriptionExpiresAt?: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  type: 'reference_lab' | 'collection_centre' | 'hospital_lab';
  address: string;
  city: string;
  phone: string;
  email: string;
  managerId?: string;
  status: 'active' | 'inactive';
}

export interface Patient {
  id: string;
  patientId: string; // e.g. PAT-2026-1001
  userId?: string;
  firstName: string;
  lastName: string;
  dob: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact?: { name: string; phone: string; relation: string };
  consentSigned: boolean;
  notes?: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  clinicName: string;
  phone: string;
  email: string;
  commissionRate?: number;
  status: 'active' | 'inactive';
}

export interface ReferenceRange {
  id: string;
  testId: string;
  parameterName: string;
  gender: 'all' | 'male' | 'female';
  ageMin: number;
  ageMax: number;
  minVal: number;
  maxVal: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit: string;
  method: string;
  effectiveDate: string;
}

export interface TestItem {
  id: string;
  code: string;
  name: string;
  department: 'Hematology' | 'Biochemistry' | 'Microbiology' | 'Immunology' | 'Histopathology' | 'Clinical Pathology' | 'Molecular';
  specimenType: 'EDTA Whole Blood' | 'Serum' | 'Plasma' | 'Fluoride Plasma' | 'Urine' | 'Stool' | 'CSF' | 'Swab';
  price: number;
  cost: number;
  sampleVolume: string;
  turnaroundHours: number;
  instructions: string;
  parameters: { name: string; unit: string; low: number; high: number; criticalLow?: number; criticalHigh?: number; method: string }[];
  isPackage?: boolean;
  includedCodes?: string[];
  status: 'active' | 'inactive';
}

export interface TestOrder {
  id: string;
  orderNumber: string; // e.g. ORD-2026-2001
  patientId: string;
  branchId: string;
  doctorId?: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'sample_collected' | 'processing' | 'verified' | 'released' | 'cancelled';
  totalAmount: number;
  discount: number;
  paidAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  clinicalNotes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderTestDetail {
  id: string;
  orderId: string;
  testId: string;
  price: number;
  status: 'pending' | 'collected' | 'analyzing' | 'completed';
}

export interface Specimen {
  id: string;
  specimenId: string; // Barcode e.g. SMP-2026-3001
  orderId: string;
  patientId: string;
  specimenType: string;
  tubeColor: string;
  status: 'ordered' | 'collection_pending' | 'collected' | 'received' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  collectedBy?: string;
  collectedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  rejectionReason?: string;
  department: string;
  branchId: string;
  storageLocation?: string;
  createdAt: string;
}

export interface SpecimenEvent {
  id: string;
  specimenId: string;
  status: string;
  actorId: string;
  actorName: string;
  timestamp: string;
  notes: string;
}

export interface ResultEntry {
  id: string;
  orderId: string;
  testId: string;
  parameterName: string;
  value: string;
  numericValue?: number;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  flag: 'normal' | 'low' | 'high' | 'critical';
  enteredById: string;
  enteredAt: string;
  verifiedById?: string;
  verifiedAt?: string;
  analyzerId?: string;
  notes?: string;
  version: number;
}

export interface Report {
  id: string;
  reportNumber: string; // e.g. REP-2026-4001
  orderId: string;
  patientId: string;
  branchId: string;
  status: 'draft' | 'under_review' | 'verified' | 'released' | 'amended';
  interpretationDraft?: string;
  pathologistNotes?: string;
  verifiedById?: string;
  verifiedByName?: string;
  releasedAt?: string;
  verificationCode: string; // For QR verification
  pdfGenerated: boolean;
  version: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-5001
  orderId: string;
  patientId: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  orderId: string;
  amount: number;
  method: 'cash' | 'card' | 'upi' | 'online';
  referenceNumber: string;
  recordedBy: string;
  createdAt: string;
}

export interface AnalyzerDevice {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  department: string;
  protocol: 'HL7' | 'ASTM' | 'CSV_WATCHER';
  ipAddress: string;
  port: number;
  status: 'connected' | 'idle' | 'offline' | 'error';
  lastPing: string;
  testMappings: { analyzerCode: string; testCode: string; testName: string }[];
}

export interface QualityControlRecord {
  id: string;
  analyzerId: string;
  testCode: string;
  controlLot: string;
  level: 'Level 1 (Low)' | 'Level 2 (Normal)' | 'Level 3 (High)';
  targetMean: number;
  targetSD: number;
  observedValue: number;
  zScore: number;
  status: 'in_control' | 'warning' | 'out_of_control';
  ruleViolated?: string;
  runAt: string;
  technicianName: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress?: string;
}

export interface Notification {
  id: string;
  recipientId?: string;
  type: 'order_status' | 'critical_result' | 'report_ready' | 'qc_alert' | 'system';
  title: string;
  message: string;
  channel: 'in_app' | 'sms' | 'email' | 'whatsapp';
  read: boolean;
  createdAt: string;
}

// In-Memory Database store with optional local file backup
class Database {
  users: User[] = [];
  branches: Branch[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  tests: TestItem[] = [];
  orders: TestOrder[] = [];
  orderItems: OrderTestDetail[] = [];
  specimens: Specimen[] = [];
  specimenEvents: SpecimenEvent[] = [];
  results: ResultEntry[] = [];
  reports: Report[] = [];
  invoices: Invoice[] = [];
  payments: Payment[] = [];
  analyzers: AnalyzerDevice[] = [];
  qcRecords: QualityControlRecord[] = [];
  auditLogs: AuditLog[] = [];
  notifications: Notification[] = [];
  paymentSettings: { qrImage: string; upiId: string; monthlyPrice: number; yearlyPrice: number; updatedAt?: string } = { qrImage: '', upiId: '', monthlyPrice: 400, yearlyPrice: 4000 };

  private dataDir = path.resolve(process.cwd(), '.data');
  private dbFile = path.resolve(this.dataDir, 'lis-database.json');

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = fs.readFileSync(this.dbFile, 'utf-8');
        const parsed = JSON.parse(raw);
        Object.assign(this, parsed);
        return;
      }
    } catch {
      // fallback to initial seed
    }
    this.seedDefaults();
    this.persist();
  }

  public exportSnapshot() {
    return {
      users: this.users, branches: this.branches, patients: this.patients, doctors: this.doctors,
      tests: this.tests, orders: this.orders, orderItems: this.orderItems, specimens: this.specimens,
      specimenEvents: this.specimenEvents, results: this.results, reports: this.reports,
      invoices: this.invoices, payments: this.payments, analyzers: this.analyzers,
      qcRecords: this.qcRecords, auditLogs: this.auditLogs, notifications: this.notifications,
      paymentSettings: this.paymentSettings,
    };
  }

  public loadSnapshot(snapshot: any) {
    if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.users)) return false;
    const keys = ['users','branches','patients','doctors','tests','orders','orderItems','specimens','specimenEvents','results','reports','invoices','payments','analyzers','qcRecords','auditLogs','notifications'];
    for (const key of keys) if (Array.isArray(snapshot[key])) (this as any)[key] = snapshot[key];
    if (snapshot.paymentSettings && typeof snapshot.paymentSettings === 'object') this.paymentSettings = { ...this.paymentSettings, ...snapshot.paymentSettings };
    return true;
  }

  public persist() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.dbFile, JSON.stringify(this.exportSnapshot(), null, 2));
    } catch (e) {
      console.warn('Failed to persist LIS database to disk:', e);
    }
  }

  public logAudit(actor: { id: string; name: string; role: string }, action: string, entityType: string, entityId: string, details: string) {
    const log: AuditLog = {
      id: 'AUD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action,
      entityType,
      entityId,
      details,
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
    this.persist();
  }

  private seedDefaults() {
    // 1. Branches
    this.branches = [
      {
        id: 'BR-01',
        code: 'CR-LAB',
        name: 'Apex Central Reference Laboratory',
        type: 'reference_lab',
        address: '450 Biomedical Parkway, Suite 100',
        city: 'Metro Medical District',
        phone: '+1 (555) 019-2831',
        email: 'reflab@apexlis.com',
        status: 'active',
      },
      {
        id: 'BR-02',
        code: 'DT-CLN',
        name: 'Downtown Diagnostic & Collection Centre',
        type: 'collection_centre',
        address: '128 Medical Center Blvd',
        city: 'Downtown',
        phone: '+1 (555) 019-4822',
        email: 'downtown@apexlis.com',
        status: 'active',
      },
      {
        id: 'BR-03',
        code: 'NS-SPEC',
        name: 'Northside Specialty Pathology',
        type: 'hospital_lab',
        address: '880 North Health Way',
        city: 'North Ridge',
        phone: '+1 (555) 019-9110',
        email: 'northside@apexlis.com',
        status: 'active',
      },
    ];

    // 2. Users (Super admin, Pathologist, Technician, Receptionist, Patient, Doctor, Accountant)
    this.users = [
      {
        id: 'USR-01',
        email: 'admin@labpulse.ai',
        name: 'Dr. Arthur Vance, MD',
        role: 'super_admin',
        phone: '+1 555-0101',
        branchId: 'BR-01',
        passwordHash: 'LabPulse@2026#Admin',
        isActive: true,
        createdAt: '2026-01-01T08:00:00Z',
      },
      {
        id: 'USR-02',
        email: 'pathologist@apexlis.com',
        name: 'Dr. Sarah Jenkins, FRCPath',
        role: 'pathologist',
        phone: '+1 555-0102',
        branchId: 'BR-01',
        passwordHash: 'path123',
        isActive: true,
        createdAt: '2026-01-02T08:00:00Z',
      },
      {
        id: 'USR-03',
        email: 'tech@apexlis.com',
        name: 'Marcus Chen, MLT',
        role: 'technician',
        phone: '+1 555-0103',
        branchId: 'BR-01',
        passwordHash: 'tech123',
        isActive: true,
        createdAt: '2026-01-05T08:00:00Z',
      },
      {
        id: 'USR-04',
        email: 'phleb@apexlis.com',
        name: 'Elena Rostova, CPT',
        role: 'phlebotomist',
        phone: '+1 555-0104',
        branchId: 'BR-02',
        passwordHash: 'phleb123',
        isActive: true,
        createdAt: '2026-01-08T08:00:00Z',
      },
      {
        id: 'USR-05',
        email: 'reception@apexlis.com',
        name: 'Jessica Taylor',
        role: 'receptionist',
        phone: '+1 555-0105',
        branchId: 'BR-01',
        passwordHash: 'recep123',
        isActive: true,
        createdAt: '2026-01-10T08:00:00Z',
      },
      {
        id: 'USR-06',
        email: 'accounts@apexlis.com',
        name: 'David Reynolds, CPA',
        role: 'accountant',
        phone: '+1 555-0106',
        branchId: 'BR-01',
        passwordHash: 'acc123',
        isActive: true,
        createdAt: '2026-01-12T08:00:00Z',
      },
      {
        id: 'USR-07',
        email: 'patient@apexlis.com',
        name: 'Eleanor Sterling',
        role: 'patient',
        phone: '+1 555-0199',
        passwordHash: 'pat123',
        isActive: true,
        createdAt: '2026-02-01T08:00:00Z',
      },
      {
        id: 'USR-08',
        email: 'dr.harrison@stjudes.org',
        name: 'Dr. Michael Harrison, MD',
        role: 'doctor',
        phone: '+1 555-0177',
        passwordHash: 'doc123',
        isActive: true,
        createdAt: '2026-02-01T08:00:00Z',
      },
    ];

    // 3. Doctors
    this.doctors = [
      {
        id: 'DOC-01',
        name: 'Dr. Michael Harrison, MD',
        specialization: 'Internal Medicine',
        clinicName: 'St. Jude Clinical Associates',
        phone: '+1 (555) 234-5678',
        email: 'dr.harrison@stjudes.org',
        commissionRate: 5,
        status: 'active',
      },
      {
        id: 'DOC-02',
        name: 'Dr. Anita Roy, MD, DM',
        specialization: 'Cardiology',
        clinicName: 'Heart & Vascular Diagnostic Institute',
        phone: '+1 (555) 345-6789',
        email: 'anita.roy@heartinst.com',
        commissionRate: 5,
        status: 'active',
      },
      {
        id: 'DOC-03',
        name: 'Dr. Robert Torres, MD',
        specialization: 'Endocrinology',
        clinicName: 'Torres Diabetes & Metabolic Center',
        phone: '+1 (555) 456-7890',
        email: 'torres@metabolicdoc.com',
        commissionRate: 0,
        status: 'active',
      },
    ];

    // 4. Patients
    this.patients = [
      {
        id: 'PAT-01',
        patientId: 'PAT-2026-1001',
        userId: 'USR-07',
        firstName: 'Eleanor',
        lastName: 'Sterling',
        dob: '1984-05-14',
        age: 42,
        gender: 'female',
        bloodGroup: 'A+',
        phone: '+1 555-0199',
        email: 'patient@apexlis.com',
        address: '742 Evergreen Terrace, Metro City',
        emergencyContact: { name: 'Thomas Sterling', phone: '+1 555-0198', relation: 'Spouse' },
        consentSigned: true,
        notes: 'History of mild hypothyroidism. Prefers morning appointments.',
        createdAt: '2026-02-01T09:00:00Z',
      },
      {
        id: 'PAT-02',
        patientId: 'PAT-2026-1002',
        firstName: 'Marcus',
        lastName: 'Brody',
        dob: '1968-11-20',
        age: 58,
        gender: 'male',
        bloodGroup: 'O+',
        phone: '+1 555-0182',
        email: 'mbrody@academic.edu',
        address: '15 College Lane, Metro City',
        emergencyContact: { name: 'Susan Brody', phone: '+1 555-0183', relation: 'Wife' },
        consentSigned: true,
        notes: 'Annual executive physical profile. Routine lipid monitoring.',
        createdAt: '2026-02-02T10:15:00Z',
      },
      {
        id: 'PAT-03',
        patientId: 'PAT-2026-1003',
        firstName: 'Aaliyah',
        lastName: 'Nasser',
        dob: '1995-03-08',
        age: 31,
        gender: 'female',
        bloodGroup: 'B+',
        phone: '+1 555-0164',
        email: 'aaliyah.nasser@techmail.com',
        address: '302 Silicon Heights, Apt 4B',
        emergencyContact: { name: 'Tariq Nasser', phone: '+1 555-0165', relation: 'Brother' },
        consentSigned: true,
        notes: 'Report of fatigue and pale conjunctiva. Iron study indicated.',
        createdAt: '2026-02-05T14:30:00Z',
      },
    ];

    // 5. Test Catalogue
    this.tests = [
      {
        id: 'TEST-CBC',
        code: 'CBC-01',
        name: 'Complete Blood Count with 5-Part Differential (CBC)',
        department: 'Hematology',
        specimenType: 'EDTA Whole Blood',
        price: 35.0,
        cost: 6.5,
        sampleVolume: '3.0 mL',
        turnaroundHours: 4,
        instructions: 'Mix lavender top tube by gentle inversion 8-10 times immediately after draw.',
        parameters: [
          { name: 'Hemoglobin (Hb)', unit: 'g/dL', low: 12.0, high: 16.0, criticalLow: 7.0, criticalHigh: 20.0, method: 'Spectrophotometry' },
          { name: 'RBC Count', unit: 'x10^6/uL', low: 4.0, high: 5.5, method: 'Impedance' },
          { name: 'Hematocrit (PCV)', unit: '%', low: 36.0, high: 48.0, method: 'Calculated' },
          { name: 'Total Leukocyte Count (WBC)', unit: 'x10^3/uL', low: 4.5, high: 11.0, criticalLow: 2.0, criticalHigh: 30.0, method: 'Flow Cytometry' },
          { name: 'Platelet Count', unit: 'x10^3/uL', low: 150, high: 450, criticalLow: 50, criticalHigh: 1000, method: 'Impedance' },
          { name: 'Neutrophils', unit: '%', low: 40.0, high: 75.0, method: 'Flow Cytometry' },
          { name: 'Lymphocytes', unit: '%', low: 20.0, high: 45.0, method: 'Flow Cytometry' },
        ],
        status: 'active',
      },
      {
        id: 'TEST-CMP',
        code: 'CMP-02',
        name: 'Comprehensive Metabolic Panel (CMP-14)',
        department: 'Biochemistry',
        specimenType: 'Serum',
        price: 55.0,
        cost: 11.0,
        sampleVolume: '5.0 mL',
        turnaroundHours: 6,
        instructions: '12-hour fasting recommended. Centrifuge gold/red top SST tube within 2 hours.',
        parameters: [
          { name: 'Fasting Blood Glucose', unit: 'mg/dL', low: 70.0, high: 99.0, criticalLow: 45.0, criticalHigh: 400.0, method: 'Hexokinase' },
          { name: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', low: 7.0, high: 20.0, method: 'Urease' },
          { name: 'Serum Creatinine', unit: 'mg/dL', low: 0.6, high: 1.2, criticalHigh: 4.5, method: 'Jaffe Modified' },
          { name: 'eGFR', unit: 'mL/min/1.73m2', low: 60.0, high: 120.0, method: 'CKD-EPI Formula' },
          { name: 'Sodium (Na+)', unit: 'mEq/L', low: 135.0, high: 145.0, criticalLow: 120.0, criticalHigh: 160.0, method: 'ISE Direct' },
          { name: 'Potassium (K+)', unit: 'mEq/L', low: 3.5, high: 5.1, criticalLow: 2.8, criticalHigh: 6.5, method: 'ISE Direct' },
          { name: 'Total Bilirubin', unit: 'mg/dL', low: 0.2, high: 1.2, method: 'Diazo Method' },
          { name: 'ALT (SGPT)', unit: 'U/L', low: 7.0, high: 56.0, criticalHigh: 350.0, method: 'Enzymatic (IFCC)' },
          { name: 'AST (SGOT)', unit: 'U/L', low: 10.0, high: 40.0, criticalHigh: 300.0, method: 'Enzymatic (IFCC)' },
        ],
        status: 'active',
      },
      {
        id: 'TEST-LIPID',
        code: 'LIP-03',
        name: 'Lipid Profile Comprehensive',
        department: 'Biochemistry',
        specimenType: 'Serum',
        price: 45.0,
        cost: 8.0,
        sampleVolume: '4.0 mL',
        turnaroundHours: 4,
        instructions: 'Fasting 10-12 hours strictly required.',
        parameters: [
          { name: 'Total Cholesterol', unit: 'mg/dL', low: 125.0, high: 200.0, method: 'CHOD-PAP' },
          { name: 'Triglycerides', unit: 'mg/dL', low: 50.0, high: 150.0, method: 'GPO-PAP' },
          { name: 'HDL Cholesterol', unit: 'mg/dL', low: 40.0, high: 60.0, method: 'Direct Elimination' },
          { name: 'LDL Cholesterol (Calculated)', unit: 'mg/dL', low: 60.0, high: 100.0, method: 'Friedewald Formula' },
          { name: 'VLDL Cholesterol', unit: 'mg/dL', low: 10.0, high: 30.0, method: 'Calculated' },
        ],
        status: 'active',
      },
      {
        id: 'TEST-THYROID',
        code: 'TFT-04',
        name: 'Thyroid Function Profile (Total T3, Free T4, Ultrasensitive TSH)',
        department: 'Immunology',
        specimenType: 'Serum',
        price: 65.0,
        cost: 14.0,
        sampleVolume: '4.0 mL',
        turnaroundHours: 8,
        instructions: 'Avoid biotin supplements 48 hours prior to blood collection.',
        parameters: [
          { name: 'TSH Ultrasensitive', unit: 'uIU/mL', low: 0.4, high: 4.2, criticalLow: 0.05, criticalHigh: 20.0, method: 'Chemiluminescence (CLIA)' },
          { name: 'Free T4', unit: 'ng/dL', low: 0.8, high: 1.8, method: 'CLIA' },
          { name: 'Total T3', unit: 'ng/dL', low: 80.0, high: 200.0, method: 'CLIA' },
        ],
        status: 'active',
      },
      {
        id: 'TEST-HBA1C',
        code: 'A1C-05',
        name: 'Glycated Hemoglobin (HbA1c with eAG)',
        department: 'Biochemistry',
        specimenType: 'EDTA Whole Blood',
        price: 40.0,
        cost: 7.5,
        sampleVolume: '2.0 mL',
        turnaroundHours: 4,
        instructions: 'No fasting required. Collect in lavender top EDTA tube.',
        parameters: [
          { name: 'HbA1c', unit: '%', low: 4.0, high: 5.6, criticalHigh: 12.0, method: 'HPLC (NGSP Certified)' },
          { name: 'Estimated Average Glucose (eAG)', unit: 'mg/dL', low: 70.0, high: 114.0, method: 'ADA Linear Equation' },
        ],
        status: 'active',
      },
    ];

    // 6. Test Orders
    this.orders = [
      {
        id: 'ORD-01',
        orderNumber: 'ORD-2026-2001',
        patientId: 'PAT-01',
        branchId: 'BR-01',
        doctorId: 'DOC-01',
        priority: 'routine',
        status: 'released',
        totalAmount: 100.0,
        discount: 0,
        paidAmount: 100.0,
        paymentStatus: 'paid',
        clinicalNotes: 'Check thyroid panel and blood counts. Fatigue follow-up.',
        createdById: 'USR-05',
        createdAt: '2026-02-10T08:30:00Z',
        updatedAt: '2026-02-10T14:10:00Z',
      },
      {
        id: 'ORD-02',
        orderNumber: 'ORD-2026-2002',
        patientId: 'PAT-02',
        branchId: 'BR-01',
        doctorId: 'DOC-02',
        priority: 'urgent',
        status: 'processing',
        totalAmount: 100.0,
        discount: 10.0,
        paidAmount: 90.0,
        paymentStatus: 'paid',
        clinicalNotes: 'Cardiac preventive screen. Fasting lipid & metabolic check.',
        createdById: 'USR-05',
        createdAt: '2026-02-12T09:15:00Z',
        updatedAt: '2026-02-12T10:45:00Z',
      },
      {
        id: 'ORD-03',
        orderNumber: 'ORD-2026-2003',
        patientId: 'PAT-03',
        branchId: 'BR-02',
        doctorId: 'DOC-03',
        priority: 'routine',
        status: 'sample_collected',
        totalAmount: 75.0,
        discount: 0,
        paidAmount: 0,
        paymentStatus: 'unpaid',
        clinicalNotes: 'Screening for anemia and diabetes risk.',
        createdById: 'USR-05',
        createdAt: '2026-02-14T11:00:00Z',
        updatedAt: '2026-02-14T11:30:00Z',
      },
    ];

    // 7. Order Items
    this.orderItems = [
      { id: 'OI-01', orderId: 'ORD-01', testId: 'TEST-CBC', price: 35.0, status: 'completed' },
      { id: 'OI-02', orderId: 'ORD-01', testId: 'TEST-THYROID', price: 65.0, status: 'completed' },
      { id: 'OI-03', orderId: 'ORD-02', testId: 'TEST-CMP', price: 55.0, status: 'analyzing' },
      { id: 'OI-04', orderId: 'ORD-02', testId: 'TEST-LIPID', price: 45.0, status: 'analyzing' },
      { id: 'OI-05', orderId: 'ORD-03', testId: 'TEST-CBC', price: 35.0, status: 'collected' },
      { id: 'OI-06', orderId: 'ORD-03', testId: 'TEST-HBA1C', price: 40.0, status: 'collected' },
    ];

    // 8. Specimens & events
    this.specimens = [
      {
        id: 'SMP-01',
        specimenId: 'SMP-2026-3001',
        orderId: 'ORD-01',
        patientId: 'PAT-01',
        specimenType: 'EDTA Whole Blood',
        tubeColor: 'Lavender',
        status: 'completed',
        collectedBy: 'Elena Rostova, CPT',
        collectedAt: '2026-02-10T08:45:00Z',
        receivedBy: 'Marcus Chen, MLT',
        receivedAt: '2026-02-10T09:15:00Z',
        department: 'Hematology',
        branchId: 'BR-01',
        storageLocation: 'Rack H-04',
        createdAt: '2026-02-10T08:30:00Z',
      },
      {
        id: 'SMP-02',
        specimenId: 'SMP-2026-3002',
        orderId: 'ORD-01',
        patientId: 'PAT-01',
        specimenType: 'Serum',
        tubeColor: 'Gold SST',
        status: 'completed',
        collectedBy: 'Elena Rostova, CPT',
        collectedAt: '2026-02-10T08:47:00Z',
        receivedBy: 'Marcus Chen, MLT',
        receivedAt: '2026-02-10T09:15:00Z',
        department: 'Immunology',
        branchId: 'BR-01',
        storageLocation: 'Fridge B, Shelf 2',
        createdAt: '2026-02-10T08:30:00Z',
      },
      {
        id: 'SMP-03',
        specimenId: 'SMP-2026-3003',
        orderId: 'ORD-02',
        patientId: 'PAT-02',
        specimenType: 'Serum',
        tubeColor: 'Gold SST',
        status: 'processing',
        collectedBy: 'Elena Rostova, CPT',
        collectedAt: '2026-02-12T09:30:00Z',
        receivedBy: 'Marcus Chen, MLT',
        receivedAt: '2026-02-12T10:00:00Z',
        department: 'Biochemistry',
        branchId: 'BR-01',
        storageLocation: 'Analyzer Rack 1',
        createdAt: '2026-02-12T09:15:00Z',
      },
      {
        id: 'SMP-04',
        specimenId: 'SMP-2026-3004',
        orderId: 'ORD-03',
        patientId: 'PAT-03',
        specimenType: 'EDTA Whole Blood',
        tubeColor: 'Lavender',
        status: 'collected',
        collectedBy: 'Elena Rostova, CPT',
        collectedAt: '2026-02-14T11:15:00Z',
        department: 'Hematology',
        branchId: 'BR-02',
        storageLocation: 'Cooler Box 1 (Transit to Ref Lab)',
        createdAt: '2026-02-14T11:00:00Z',
      },
    ];

    this.specimenEvents = [
      {
        id: 'EVT-01',
        specimenId: 'SMP-2026-3001',
        status: 'Collected',
        actorId: 'USR-04',
        actorName: 'Elena Rostova, CPT',
        timestamp: '2026-02-10T08:45:00Z',
        notes: 'Phlebotomy completed via left antecubital fossa. 3.0 mL collected without hemolysis.',
      },
      {
        id: 'EVT-02',
        specimenId: 'SMP-2026-3001',
        status: 'Received',
        actorId: 'USR-03',
        actorName: 'Marcus Chen, MLT',
        timestamp: '2026-02-10T09:15:00Z',
        notes: 'Sample received at Central Hematology bench. Tube intact, barcode legible.',
      },
      {
        id: 'EVT-03',
        specimenId: 'SMP-2026-3001',
        status: 'Completed',
        actorId: 'USR-02',
        actorName: 'Dr. Sarah Jenkins, FRCPath',
        timestamp: '2026-02-10T14:00:00Z',
        notes: 'Testing verified and approved.',
      },
    ];

    // 9. Results for ORD-01
    this.results = [
      {
        id: 'RES-01',
        orderId: 'ORD-01',
        testId: 'TEST-CBC',
        parameterName: 'Hemoglobin (Hb)',
        value: '13.8',
        numericValue: 13.8,
        unit: 'g/dL',
        referenceLow: 12.0,
        referenceHigh: 16.0,
        flag: 'normal',
        enteredById: 'USR-03',
        enteredAt: '2026-02-10T11:20:00Z',
        verifiedById: 'USR-02',
        verifiedAt: '2026-02-10T13:45:00Z',
        version: 1,
      },
      {
        id: 'RES-02',
        orderId: 'ORD-01',
        testId: 'TEST-CBC',
        parameterName: 'RBC Count',
        value: '4.62',
        numericValue: 4.62,
        unit: 'x10^6/uL',
        referenceLow: 4.0,
        referenceHigh: 5.5,
        flag: 'normal',
        enteredById: 'USR-03',
        enteredAt: '2026-02-10T11:20:00Z',
        verifiedById: 'USR-02',
        verifiedAt: '2026-02-10T13:45:00Z',
        version: 1,
      },
      {
        id: 'RES-03',
        orderId: 'ORD-01',
        testId: 'TEST-CBC',
        parameterName: 'Total Leukocyte Count (WBC)',
        value: '6.4',
        numericValue: 6.4,
        unit: 'x10^3/uL',
        referenceLow: 4.5,
        referenceHigh: 11.0,
        flag: 'normal',
        enteredById: 'USR-03',
        enteredAt: '2026-02-10T11:20:00Z',
        verifiedById: 'USR-02',
        verifiedAt: '2026-02-10T13:45:00Z',
        version: 1,
      },
      {
        id: 'RES-04',
        orderId: 'ORD-01',
        testId: 'TEST-CBC',
        parameterName: 'Platelet Count',
        value: '240',
        numericValue: 240,
        unit: 'x10^3/uL',
        referenceLow: 150,
        referenceHigh: 450,
        flag: 'normal',
        enteredById: 'USR-03',
        enteredAt: '2026-02-10T11:20:00Z',
        verifiedById: 'USR-02',
        verifiedAt: '2026-02-10T13:45:00Z',
        version: 1,
      },
      {
        id: 'RES-05',
        orderId: 'ORD-01',
        testId: 'TEST-THYROID',
        parameterName: 'TSH Ultrasensitive',
        value: '5.85',
        numericValue: 5.85,
        unit: 'uIU/mL',
        referenceLow: 0.4,
        referenceHigh: 4.2,
        flag: 'high',
        enteredById: 'USR-03',
        enteredAt: '2026-02-10T12:00:00Z',
        verifiedById: 'USR-02',
        verifiedAt: '2026-02-10T13:45:00Z',
        version: 1,
        notes: 'Mildly elevated TSH. Free T4 within normal limits.',
      },
      {
        id: 'RES-06',
        orderId: 'ORD-01',
        testId: 'TEST-THYROID',
        parameterName: 'Free T4',
        value: '1.18',
        numericValue: 1.18,
        unit: 'ng/dL',
        referenceLow: 0.8,
        referenceHigh: 1.8,
        flag: 'normal',
        enteredById: 'USR-03',
        enteredAt: '2026-02-10T12:00:00Z',
        verifiedById: 'USR-02',
        verifiedAt: '2026-02-10T13:45:00Z',
        version: 1,
      },
      {
        id: 'RES-07',
        orderId: 'ORD-01',
        testId: 'TEST-THYROID',
        parameterName: 'Total T3',
        value: '110',
        numericValue: 110,
        unit: 'ng/dL',
        referenceLow: 80.0,
        referenceHigh: 200.0,
        flag: 'normal',
        enteredById: 'USR-03',
        enteredAt: '2026-02-10T12:00:00Z',
        verifiedById: 'USR-02',
        verifiedAt: '2026-02-10T13:45:00Z',
        version: 1,
      },
    ];

    // 10. Reports
    this.reports = [
      {
        id: 'REP-01',
        reportNumber: 'REP-2026-4001',
        orderId: 'ORD-01',
        patientId: 'PAT-01',
        branchId: 'BR-01',
        status: 'released',
        interpretationDraft: 'Laboratory findings are consistent with early subclinical hypothyroidism. TSH is mildly elevated (5.85 uIU/mL) with normal Free T4 (1.18 ng/dL) and Total T3. Complete Blood Count is unremarkable with normal red blood cell indices. Clinical correlation with anti-TPO antibody status and follow-up TSH in 8-12 weeks is recommended.',
        pathologistNotes: 'Reviewed and verified. Findings communicated in accordance with CAP guidelines.',
        verifiedById: 'USR-02',
        verifiedByName: 'Dr. Sarah Jenkins, FRCPath',
        releasedAt: '2026-02-10T14:10:00Z',
        verificationCode: 'VRF-4001-A9Z',
        pdfGenerated: true,
        version: 1,
        createdAt: '2026-02-10T13:45:00Z',
      },
    ];

    // 11. Invoices & Payments
    this.invoices = [
      {
        id: 'INV-01',
        invoiceNumber: 'INV-2026-5001',
        orderId: 'ORD-01',
        patientId: 'PAT-01',
        subtotal: 100.0,
        tax: 0,
        discount: 0,
        total: 100.0,
        paidAmount: 100.0,
        balance: 0,
        status: 'paid',
        createdAt: '2026-02-10T08:30:00Z',
      },
      {
        id: 'INV-02',
        invoiceNumber: 'INV-2026-5002',
        orderId: 'ORD-02',
        patientId: 'PAT-02',
        subtotal: 100.0,
        tax: 0,
        discount: 10.0,
        total: 90.0,
        paidAmount: 90.0,
        balance: 0,
        status: 'paid',
        createdAt: '2026-02-12T09:15:00Z',
      },
      {
        id: 'INV-03',
        invoiceNumber: 'INV-2026-5003',
        orderId: 'ORD-03',
        patientId: 'PAT-03',
        subtotal: 75.0,
        tax: 0,
        discount: 0,
        total: 75.0,
        paidAmount: 0,
        balance: 75.0,
        status: 'unpaid',
        createdAt: '2026-02-14T11:00:00Z',
      },
    ];

    this.payments = [
      {
        id: 'PAY-01',
        invoiceId: 'INV-01',
        orderId: 'ORD-01',
        amount: 100.0,
        method: 'card',
        referenceNumber: 'TXN-90281-AUTH',
        recordedBy: 'Jessica Taylor',
        createdAt: '2026-02-10T08:35:00Z',
      },
      {
        id: 'PAY-02',
        invoiceId: 'INV-02',
        orderId: 'ORD-02',
        amount: 90.0,
        method: 'upi',
        referenceNumber: 'UPI-309819280',
        recordedBy: 'Jessica Taylor',
        createdAt: '2026-02-12T09:20:00Z',
      },
    ];

    // 12. Analyzers
    this.analyzers = [
      {
        id: 'ANZ-01',
        name: 'Sysmex XN-550 Automated Hematology Analyzer',
        model: 'XN-550',
        manufacturer: 'Sysmex Corporation',
        department: 'Hematology',
        protocol: 'ASTM',
        ipAddress: '192.168.10.45',
        port: 5100,
        status: 'connected',
        lastPing: new Date().toISOString(),
        testMappings: [
          { analyzerCode: 'HGB', testCode: 'CBC-01', testName: 'Hemoglobin (Hb)' },
          { analyzerCode: 'WBC', testCode: 'CBC-01', testName: 'Total Leukocyte Count (WBC)' },
          { analyzerCode: 'PLT', testCode: 'CBC-01', testName: 'Platelet Count' },
          { analyzerCode: 'RBC', testCode: 'CBC-01', testName: 'RBC Count' },
          { analyzerCode: 'HCT', testCode: 'CBC-01', testName: 'Hematocrit (PCV)' },
        ],
      },
      {
        id: 'ANZ-02',
        name: 'Roche Cobas e411 Immunoassay Analyzer',
        model: 'Cobas e411',
        manufacturer: 'Roche Diagnostics',
        department: 'Immunology',
        protocol: 'HL7',
        ipAddress: '192.168.10.48',
        port: 5200,
        status: 'connected',
        lastPing: new Date().toISOString(),
        testMappings: [
          { analyzerCode: 'TSH', testCode: 'TFT-04', testName: 'TSH Ultrasensitive' },
          { analyzerCode: 'FT4', testCode: 'TFT-04', testName: 'Free T4' },
          { analyzerCode: 'TT3', testCode: 'TFT-04', testName: 'Total T3' },
        ],
      },
      {
        id: 'ANZ-03',
        name: 'Beckman Coulter AU480 Clinical Chemistry System',
        model: 'AU480',
        manufacturer: 'Beckman Coulter',
        department: 'Biochemistry',
        protocol: 'HL7',
        ipAddress: '192.168.10.50',
        port: 5300,
        status: 'idle',
        lastPing: new Date().toISOString(),
        testMappings: [
          { analyzerCode: 'GLUC', testCode: 'CMP-02', testName: 'Fasting Blood Glucose' },
          { analyzerCode: 'CREAT', testCode: 'CMP-02', testName: 'Serum Creatinine' },
          { analyzerCode: 'ALT', testCode: 'CMP-02', testName: 'ALT (SGPT)' },
          { analyzerCode: 'AST', testCode: 'CMP-02', testName: 'AST (SGOT)' },
        ],
      },
    ];

    // 13. Quality Control Records
    this.qcRecords = [
      {
        id: 'QC-01',
        analyzerId: 'ANZ-01',
        testCode: 'CBC-01 (Hemoglobin)',
        controlLot: 'E-CHECK-2026B',
        level: 'Level 2 (Normal)',
        targetMean: 13.5,
        targetSD: 0.35,
        observedValue: 13.6,
        zScore: 0.28,
        status: 'in_control',
        runAt: '2026-02-15T07:15:00Z',
        technicianName: 'Marcus Chen, MLT',
      },
      {
        id: 'QC-02',
        analyzerId: 'ANZ-02',
        testCode: 'TFT-04 (TSH)',
        controlLot: 'PRECI-CONTROL-T4',
        level: 'Level 1 (Low)',
        targetMean: 0.85,
        targetSD: 0.08,
        observedValue: 0.82,
        zScore: -0.37,
        status: 'in_control',
        runAt: '2026-02-15T07:30:00Z',
        technicianName: 'Marcus Chen, MLT',
      },
      {
        id: 'QC-03',
        analyzerId: 'ANZ-03',
        testCode: 'CMP-02 (Glucose)',
        controlLot: 'CHEM-NORM-L2',
        level: 'Level 2 (Normal)',
        targetMean: 95.0,
        targetSD: 3.2,
        observedValue: 96.1,
        zScore: 0.34,
        status: 'in_control',
        runAt: '2026-02-15T07:45:00Z',
        technicianName: 'Marcus Chen, MLT',
      },
    ];

    // 14. Audit logs initial
    this.auditLogs = [
      {
        id: 'AUD-01',
        timestamp: '2026-02-10T08:30:00Z',
        userId: 'USR-05',
        userName: 'Jessica Taylor',
        userRole: 'receptionist',
        action: 'ORDER_CREATED',
        entityType: 'TestOrder',
        entityId: 'ORD-2026-2001',
        details: 'Order ORD-2026-2001 generated for patient Eleanor Sterling (PAT-2026-1001).',
      },
      {
        id: 'AUD-02',
        timestamp: '2026-02-10T14:10:00Z',
        userId: 'USR-02',
        userName: 'Dr. Sarah Jenkins, FRCPath',
        userRole: 'pathologist',
        action: 'REPORT_RELEASED',
        entityType: 'Report',
        entityId: 'REP-2026-4001',
        details: 'Report REP-2026-4001 authorized and released with digital verification code VRF-4001-A9Z.',
      },
    ];

    // 15. Notifications
    this.notifications = [
      {
        id: 'NOTIF-01',
        recipientId: 'USR-07',
        type: 'report_ready',
        title: 'Diagnostic Report Released',
        message: 'Your laboratory report for Order #ORD-2026-2001 has been authorized by Dr. Sarah Jenkins and is now available.',
        channel: 'in_app',
        read: false,
        createdAt: '2026-02-10T14:11:00Z',
      },
      {
        id: 'NOTIF-02',
        recipientId: 'USR-02',
        type: 'order_status',
        title: 'STAT Test Request',
        message: 'Urgent specimen SMP-2026-3003 received for Marcus Brody (Biochemistry panel).',
        channel: 'in_app',
        read: false,
        createdAt: '2026-02-12T10:02:00Z',
      },
    ];
  }
}

export const db = new Database();
