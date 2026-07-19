-- Migration: 0006_add_hr_payroll_tables.up.sql

CREATE TABLE IF NOT EXISTS payslips (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  month TEXT NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT '0',
  allowances NUMERIC NOT NULL DEFAULT '0',
  deductions NUMERIC NOT NULL DEFAULT '0',
  net_salary NUMERIC NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'Pending',
  payment_date TEXT,
  journal_id TEXT
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  date TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employee_loans (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT '0',
  installment_monthly NUMERIC NOT NULL DEFAULT '0',
  remaining NUMERIC NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  type TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Pending',
  reason TEXT
);

CREATE TABLE IF NOT EXISTS job_candidates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  stage TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  expected_salary NUMERIC NOT NULL DEFAULT '0',
  department TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS performance_appraisals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  rating NUMERIC NOT NULL DEFAULT '0',
  comments TEXT
);
