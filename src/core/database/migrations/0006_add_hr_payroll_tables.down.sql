-- Migration: 0006_add_hr_payroll_tables.down.sql

DROP TABLE IF EXISTS performance_appraisals CASCADE;
DROP TABLE IF EXISTS job_candidates CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS employee_loans CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
