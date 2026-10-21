-- =====================================================================
-- APEX LIS (LABORATORY INFORMATION SYSTEM) - PRODUCTION POSTGRESQL SCHEMA
-- MODULE 19: Complete Normalized Relational Database Specification
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 2. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('reference_lab', 'collection_centre', 'hospital_lab')),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) REFERENCES roles(id),
    phone VARCHAR(30),
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE SET NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PATIENTS & CONSENTS
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(30) NOT NULL UNIQUE, -- e.g. PAT-2026-1001
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(10),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(30),
    emergency_contact_relation VARCHAR(50),
    consent_signed BOOLEAN DEFAULT TRUE,
    clinical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_search ON patients(last_name, first_name, phone, patient_id);

-- 5. DOCTORS & CORPORATE CLIENTS
CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    clinic_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL,
    commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS corporate_clients (
    id VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    tax_identifier VARCHAR(50),
    credit_limit NUMERIC(12, 2) DEFAULT 0.00,
    current_balance NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TESTS & REFERENCE RANGES
CREATE TABLE IF NOT EXISTS tests (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    department VARCHAR(50) NOT NULL,
    specimen_type VARCHAR(50) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    cost NUMERIC(10, 2) DEFAULT 0.00,
    sample_volume VARCHAR(30),
    turnaround_hours INT DEFAULT 4,
    instructions TEXT,
    is_package BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reference_ranges (
    id VARCHAR(50) PRIMARY KEY,
    test_id VARCHAR(50) REFERENCES tests(id) ON DELETE CASCADE,
    parameter_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) DEFAULT 'all' CHECK (gender IN ('all', 'male', 'female')),
    age_min INT DEFAULT 0,
    age_max INT DEFAULT 120,
    min_val NUMERIC(10, 2) NOT NULL,
    max_val NUMERIC(10, 2) NOT NULL,
    critical_low NUMERIC(10, 2),
    critical_high NUMERIC(10, 2),
    unit VARCHAR(30) NOT NULL,
    method VARCHAR(100),
    effective_date DATE DEFAULT CURRENT_DATE
);

-- 7. ORDERS & SPECIMENS (CHAIN OF CUSTODY)
CREATE TABLE IF NOT EXISTS test_orders (
    id VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. ORD-2026-2001
    patient_id VARCHAR(50) REFERENCES patients(id) ON DELETE RESTRICT,
    branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE RESTRICT,
    doctor_id VARCHAR(50) REFERENCES doctors(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
    status VARCHAR(30) DEFAULT 'ordered' CHECK (status IN ('ordered', 'sample_collected', 'processing', 'verified', 'released', 'cancelled')),
    total_amount NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    paid_amount NUMERIC(10, 2) DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    clinical_notes TEXT,
    created_by_id VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES test_orders(id) ON DELETE CASCADE,
    test_id VARCHAR(50) REFERENCES tests(id) ON DELETE RESTRICT,
    price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS specimens (
    id VARCHAR(50) PRIMARY KEY,
    specimen_id VARCHAR(50) NOT NULL UNIQUE, -- Barcode SMP-2026-3001
    order_id VARCHAR(50) REFERENCES test_orders(id) ON DELETE CASCADE,
    patient_id VARCHAR(50) REFERENCES patients(id) ON DELETE RESTRICT,
    specimen_type VARCHAR(50) NOT NULL,
    tube_color VARCHAR(30) NOT NULL,
    status VARCHAR(30) DEFAULT 'ordered' CHECK (status IN ('ordered', 'collection_pending', 'collected', 'received', 'processing', 'completed', 'rejected', 'cancelled')),
    collected_by VARCHAR(150),
    collected_at TIMESTAMP WITH TIME ZONE,
    received_by VARCHAR(150),
    received_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    department VARCHAR(50) NOT NULL,
    branch_id VARCHAR(50) REFERENCES branches(id),
    storage_location VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS specimen_events (
    id VARCHAR(50) PRIMARY KEY,
    specimen_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    actor_id VARCHAR(50),
    actor_name VARCHAR(150),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 8. ANALYZERS & RESULT ENTRIES
CREATE TABLE IF NOT EXISTS analyzer_devices (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    model VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    protocol VARCHAR(30) NOT NULL CHECK (protocol IN ('HL7', 'ASTM', 'CSV_WATCHER')),
    ip_address VARCHAR(50),
    port INT,
    status VARCHAR(20) DEFAULT 'connected',
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS result_entries (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES test_orders(id) ON DELETE CASCADE,
    test_id VARCHAR(50) REFERENCES tests(id) ON DELETE RESTRICT,
    parameter_name VARCHAR(100) NOT NULL,
    value VARCHAR(100) NOT NULL,
    numeric_value NUMERIC(12, 4),
    unit VARCHAR(30),
    reference_low NUMERIC(10, 2),
    reference_high NUMERIC(10, 2),
    flag VARCHAR(20) DEFAULT 'normal' CHECK (flag IN ('normal', 'low', 'high', 'critical')),
    entered_by_id VARCHAR(50),
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_by_id VARCHAR(50) REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    analyzer_id VARCHAR(50) REFERENCES analyzer_devices(id),
    notes TEXT,
    version INT DEFAULT 1
);

-- 9. REPORTS & VERIFICATIONS
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(50) PRIMARY KEY,
    report_number VARCHAR(50) NOT NULL UNIQUE, -- REP-2026-4001
    order_id VARCHAR(50) REFERENCES test_orders(id) ON DELETE CASCADE,
    patient_id VARCHAR(50) REFERENCES patients(id) ON DELETE RESTRICT,
    branch_id VARCHAR(50) REFERENCES branches(id),
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'verified', 'released', 'amended')),
    interpretation_draft TEXT,
    pathologist_notes TEXT,
    verified_by_id VARCHAR(50) REFERENCES users(id),
    verified_by_name VARCHAR(150),
    released_at TIMESTAMP WITH TIME ZONE,
    verification_code VARCHAR(50) NOT NULL UNIQUE,
    pdf_generated BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. BILLING, INVOICES & PAYMENTS
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE, -- INV-2026-5001
    order_id VARCHAR(50) REFERENCES test_orders(id) ON DELETE CASCADE,
    patient_id VARCHAR(50) REFERENCES patients(id) ON DELETE RESTRICT,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) DEFAULT 0.00,
    balance NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) REFERENCES invoices(id) ON DELETE CASCADE,
    order_id VARCHAR(50) REFERENCES test_orders(id),
    amount NUMERIC(10, 2) NOT NULL,
    method VARCHAR(30) NOT NULL CHECK (method IN ('cash', 'card', 'upi', 'online')),
    reference_number VARCHAR(100) NOT NULL,
    recorded_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. QUALITY CONTROL & AUDIT LOGS
CREATE TABLE IF NOT EXISTS quality_control_records (
    id VARCHAR(50) PRIMARY KEY,
    analyzer_id VARCHAR(50) REFERENCES analyzer_devices(id),
    test_code VARCHAR(50) NOT NULL,
    control_lot VARCHAR(50) NOT NULL,
    level VARCHAR(30) NOT NULL,
    target_mean NUMERIC(10, 2) NOT NULL,
    target_sd NUMERIC(10, 2) NOT NULL,
    observed_value NUMERIC(10, 2) NOT NULL,
    z_score NUMERIC(6, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'in_control' CHECK (status IN ('in_control', 'warning', 'out_of_control')),
    rule_violated VARCHAR(150),
    run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    technician_name VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50)
);
