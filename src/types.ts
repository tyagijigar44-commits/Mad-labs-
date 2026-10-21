export type UserRole =
  | 'super_admin'
  | 'lab_owner'
  | 'branch_manager'
  | 'receptionist'
  | 'phlebotomist'
  | 'technician'
  | 'pathologist'
  | 'accountant'
  | 'doctor'
  | 'corporate'
  | 'patient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  branchId?: string;
  mfaEnabled?: boolean;
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
  status: 'active' | 'inactive';
}

export interface Patient {
  id: string;
  patientId: string;
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

export interface TestItem {
  id: string;
  code: string;
  name: string;
  department: string;
  specimenType: string;
  price: number;
  cost: number;
  sampleVolume: string;
  turnaroundHours: number;
  instructions: string;
  parameters: {
    name: string;
    unit: string;
    low: number;
    high: number;
    criticalLow?: number;
    criticalHigh?: number;
    method: string;
  }[];
  status: 'active' | 'inactive';
}

export interface TestOrder {
  id: string;
  orderNumber: string;
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
  patient?: Patient;
  branch?: Branch;
  doctor?: { id: string; name: string; clinicName: string };
  items?: { id: string; testId: string; price: number; status: string; test?: TestItem }[];
  specimens?: Specimen[];
  report?: Report;
}

export interface Specimen {
  id: string;
  specimenId: string; // Barcode
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
  patient?: Patient;
  order?: TestOrder;
  events?: SpecimenEvent[];
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
  reportNumber: string;
  orderId: string;
  patientId: string;
  branchId: string;
  status: 'draft' | 'under_review' | 'verified' | 'released' | 'amended';
  interpretationDraft?: string;
  pathologistNotes?: string;
  verifiedById?: string;
  verifiedByName?: string;
  releasedAt?: string;
  verificationCode: string;
  pdfGenerated: boolean;
  version: number;
  createdAt: string;
  patient?: Patient;
  order?: TestOrder;
  branch?: Branch;
  results?: ResultEntry[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
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
  patient?: Patient;
  order?: TestOrder;
  payments?: Payment[];
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
}
