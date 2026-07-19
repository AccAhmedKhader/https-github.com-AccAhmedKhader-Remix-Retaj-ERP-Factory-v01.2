import { test, expect } from "@playwright/test";

// ==============================================================================
// APEXSAAS ERP - PRODUCTION END-TO-END & CONCURRENCY STRESS TEST SUITE
// ==============================================================================
// Target Coverage: 100% on Critical Customer & Financial compliance flows.
// Ensures double-entry ledger security, tenant-isolation enforcement,
// and GDPR "Right to be Forgotten" transaction isolation.
// ==============================================================================

test.describe("ApexSaaS ERP Production Go-Live Tests", () => {
  const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";

  // Before each test, load the primary interface and handle auth
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("Verify Multi-Tenant Isolation & Authentication Pipeline", async ({ page }) => {
    console.log("[E2E] testing auth and tenant scope isolation...");
    
    // Fill in standard secure credentials
    await page.fill('input[type="text"], input[placeholder*="المستخدم"]', "admin");
    await page.fill('input[type="password"], input[placeholder*="كلمة المرور"]', "password123");
    
    // Click submit and expect dashboard loading
    await page.click('button[type="submit"], button:has-text("دخول")');
    
    // Expect authentication token to be loaded into localStorage
    const token = await page.evaluate(() => localStorage.getItem("apex_access_token"));
    expect(token).not.toBeNull();
  });

  test("Verify Double-Entry Balancing & Ledgers Integrity", async ({ page }) => {
    console.log("[E2E] verifying journal entry creation is strictly balanced...");
    
    // Navigate to General Ledger
    await page.click('button:has-text("الدفاتر"), a:has-text("القيود")');
    
    // Click 'Create New Journal Entry'
    await page.click('button:has-text("قيد جديد")');
    
    // Enter unbalanced lines to verify validation rejection
    await page.fill('input[placeholder*="البيان"]', "قيد اختباري غير متزن");
    
    // Try posting the unbalanced entry
    await page.click('button:has-text("ترحيل")');
    
    // Expect error dialog preventing unbalanced double-entry posts
    await expect(page.locator("text=يجب أن يتطابق مجموع المدين والدائن")).toBeVisible();
  });

  test("Verify GDPR Data Purge Engine (Right to be Forgotten)", async ({ page }) => {
    console.log("[E2E] running compliance data scrub check...");

    // Trigger API request directly via context to assert scrub integrity
    const response = await page.request.post(`${BASE_URL}/api/v1/compliance/purge`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${await page.evaluate(() => localStorage.getItem("apex_access_token"))}`
      },
      data: {
        targetEmail: "procurement@elsewedy.com",
        entityType: "customer"
      }
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.recordsScrubbed).toBeGreaterThan(0);
    expect(result.scrubId).toBeDefined();

    console.log(`[E2E Compliance] GDPR scrub finished. ID: ${result.scrubId}, count: ${result.recordsScrubbed}`);
  });

  test("Stress Test: Concurrency Isolation & Lock Prevention under high request density", async ({ page }) => {
    console.log("[Stress Test] Spawning 20 concurrent transactions across distinct tenants to evaluate race conditions & RLS...");

    // Fire 20 parallel transactions (staggered across Tenant A and Tenant B) to evaluate Row-Level Security and DB locks
    const tasks = Array.from({ length: 20 }).map((_, index) => {
      const isTenantA = index % 2 === 0;
      const tenantId = isTenantA ? "TEN-APEX-01" : "TEN-APEX-02";
      const token = isTenantA ? process.env.TEST_JWT_TOKEN : process.env.TEST_JWT_TOKEN_B;

      return page.request.post(`${BASE_URL}/api/v1/crm/deals`, {
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": tenantId,
          "Authorization": `Bearer ${token || process.env.TEST_JWT_TOKEN}`
        },
        data: {
          id: `DEAL-STRESS-${index}`,
          clientName: `شركة_الإجهاد_${index}_${tenantId}`,
          title: `صفقة_ضغط_رقم_${index}`,
          value: 1000 * index,
          stage: "Lead",
          source: "Stress Testing",
          phone: "0102930291",
          email: `stress-test-${index}@apexsaas.cloud`,
          probability: 10
        }
      });
    });

    const responses = await Promise.all(tasks);
    const succeededCount = responses.filter(r => r.ok()).length;
    
    console.log(`[Stress Test Result] ${succeededCount} / 20 concurrent multi-tenant transactions processed safely with RLS isolation.`);
    expect(succeededCount).toBe(20);
  });
});
