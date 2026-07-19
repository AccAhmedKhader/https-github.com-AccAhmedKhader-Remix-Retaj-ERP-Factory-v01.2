import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "../database/db";
import {
  employees,
  attendanceRecords,
  payslips,
  employeeLoans,
  leaveRequests,
  jobCandidates,
  performanceAppraisals,
  tenants
} from "../database/schema";
import { eq, and } from "drizzle-orm";

describe("HR and Payroll Schema and Integration Tests", () => {
  const tenantId = "TEN-HR-TEST";
  const employeeId = "EMP-TEST-01";

  beforeEach(async () => {
    const db = await getDb();

    // Ensure tenant exists
    try {
      await db.insert(tenants).values({ id: tenantId, name: "HR Tenant" }).onConflictDoNothing();
    } catch (e) {}

    // Clean up test records
    await db.delete(attendanceRecords).where(eq(attendanceRecords.tenantId, tenantId));
    await db.delete(payslips).where(eq(payslips.tenantId, tenantId));
    await db.delete(employeeLoans).where(eq(employeeLoans.tenantId, tenantId));
    await db.delete(leaveRequests).where(eq(leaveRequests.tenantId, tenantId));
    await db.delete(jobCandidates).where(eq(jobCandidates.tenantId, tenantId));
    await db.delete(performanceAppraisals).where(eq(performanceAppraisals.tenantId, tenantId));
    await db.delete(employees).where(eq(employees.tenantId, tenantId));

    // Seed test employee
    await db.insert(employees).values({
      id: employeeId,
      tenantId,
      name: "أحمد خضر",
      role: "Software Developer",
      department: "البحث والتطوير",
      baseSalary: "15000",
      attendanceDays: 30,
      withholdingTaxRate: "0.10",
      vatRate: "0.14",
      status: "Active"
    });
  });

  it("should successfully log and retrieve attendance records", async () => {
    const db = await getDb();

    await db.insert(attendanceRecords).values({
      id: "ATT-TEST-01",
      tenantId,
      employeeId,
      employeeName: "أحمد خضر",
      date: "2026-07-15",
      checkIn: "08:58",
      checkOut: "17:05",
      status: "OnTime"
    });

    const records = await db.select().from(attendanceRecords).where(
      and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.tenantId, tenantId))
    );

    expect(records).toHaveLength(1);
    expect(records[0].employeeName).toBe("أحمد خضر");
    expect(records[0].status).toBe("OnTime");
  });

  it("should successfully process payslips with precise payroll values", async () => {
    const db = await getDb();

    await db.insert(payslips).values({
      id: "PS-TEST-01",
      tenantId,
      employeeId,
      employeeName: "صالح محمود",
      month: "يوليو 2026",
      baseSalary: "15000",
      allowances: "2000",
      deductions: "500",
      netSalary: "16500",
      journalId: "JE-PAY-TEST",
      status: "Paid",
      paymentDate: "2026-07-15"
    });

    const slips = await db.select().from(payslips).where(
      and(eq(payslips.employeeId, employeeId), eq(payslips.tenantId, tenantId))
    );

    expect(slips).toHaveLength(1);
    expect(slips[0].employeeName).toBe("صالح محمود");
    expect(Number(slips[0].netSalary)).toBe(16500);
    expect(slips[0].journalId).toBe("JE-PAY-TEST");
  });

  it("should successfully register and update leave requests", async () => {
    const db = await getDb();

    await db.insert(leaveRequests).values({
      id: "LR-TEST-01",
      tenantId,
      employeeId,
      employeeName: "هدى عبد الرحمن",
      type: "Annual",
      duration: 3,
      status: "Pending",
      reason: "إجازة عائلية سنوية"
    });

    // Update to Approved
    await db.update(leaveRequests)
      .set({ status: "Approved" })
      .where(and(eq(leaveRequests.id, "LR-TEST-01"), eq(leaveRequests.tenantId, tenantId)));

    const leaves = await db.select().from(leaveRequests).where(
      and(eq(leaveRequests.id, "LR-TEST-01"), eq(leaveRequests.tenantId, tenantId))
    );

    expect(leaves).toHaveLength(1);
    expect(leaves[0].status).toBe("Approved");
    expect(leaves[0].duration).toBe(3);
  });

  it("should successfully manage loans and repayment", async () => {
    const db = await getDb();

    await db.insert(employeeLoans).values({
      id: "LN-TEST-01",
      tenantId,
      employeeId,
      employeeName: "صالح محمود",
      amount: 12000,
      installmentMonthly: 1000,
      remaining: 12000,
      status: "Active"
    });

    // Pay one installment
    await db.update(employeeLoans)
      .set({ remaining: 11000 })
      .where(and(eq(employeeLoans.id, "LN-TEST-01"), eq(employeeLoans.tenantId, tenantId)));

    const loansList = await db.select().from(employeeLoans).where(
      and(eq(employeeLoans.id, "LN-TEST-01"), eq(employeeLoans.tenantId, tenantId))
    );

    expect(loansList).toHaveLength(1);
    expect(Number(loansList[0].remaining)).toBe(11000);
  });

  it("should successfully manage job candidates and reviews", async () => {
    const db = await getDb();

    await db.insert(jobCandidates).values({
      id: "CAND-TEST-01",
      tenantId,
      name: "ميادة الشريف",
      position: "HR Specialist",
      stage: "Interviewing",
      score: 92,
      expectedSalary: 14000,
      department: "الموارد البشرية"
    });

    await db.insert(performanceAppraisals).values({
      id: "APR-TEST-01",
      tenantId,
      employeeId,
      employeeName: "أحمد خضر",
      rating: 4.8,
      comments: "أداء متميز وتفانٍ مستمر"
    });

    const cand = await db.select().from(jobCandidates).where(
      and(eq(jobCandidates.id, "CAND-TEST-01"), eq(jobCandidates.tenantId, tenantId))
    );
    expect(cand).toHaveLength(1);
    expect(cand[0].stage).toBe("Interviewing");

    const app = await db.select().from(performanceAppraisals).where(
      and(eq(performanceAppraisals.id, "APR-TEST-01"), eq(performanceAppraisals.tenantId, tenantId))
    );
    expect(app).toHaveLength(1);
    expect(Number(app[0].rating)).toBe(4.8);
  });
});
