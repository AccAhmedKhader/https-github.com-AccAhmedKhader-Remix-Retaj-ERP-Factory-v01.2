# IAS 7 - Statement of Cash Flows Implementation Specification

## 1. Overview
The **IAS 7 Statement of Cash Flows** is an essential enterprise financial report classifying cash receipts and payments during a fiscal period into three primary categories:
1. **Operating Activities (الأنشطة التشغيلية):** Primary revenue-producing activities and other activities that are not investing or financing.
2. **Investing Activities (الأنشطة الاستثمارية):** Acquisition and disposal of long-term assets and other investments.
3. **Financing Activities (الأنشطة التمويلية):** Activities that result in changes in the size and composition of the contributed equity and borrowings.

This system implements **both** the **Direct Method** and **Indirect Method** under IFRS and EAS (Egyptian Accounting Standards) rules, powered by a relational, multi-tenant cash flow mapping engine.

---

## 2. Technical Architecture & Data Mapping Engine
To classify ledger accounts dynamically, we introduce a central mapping table `cash_flow_mappings`.

### 2.1 Database Schema
```sql
CREATE TABLE cash_flow_mappings (
    account_code VARCHAR(50) NOT NULL,
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'Operating', 'Investing', 'Financing', 'CashEquivalent'
    category_name VARCHAR(255) NOT NULL, -- e.g., 'Receipts from Customers', 'Payments to Suppliers'
    PRIMARY KEY (tenant_id, account_code)
);
```

### 2.2 Default Mappings Rules (Egypt Chart of Accounts / IFRS Standards)
*   **10100 / 10101 (Cash/Bank):** `CashEquivalent`
*   **10200 / 10201 (Accounts Receivable):** `Operating` (Working Capital / Customer Receipts)
*   **20100 / 20101 (Accounts Payable):** `Operating` (Working Capital / Supplier Payments)
*   **10500 (Inventory):** `Operating` (Working Capital / Inventory changes)
*   **10400 (Fixed Assets):** `Investing` (Acquisition/Disposal of property & equipment)
*   **30100 (Capital / Paid-in Capital):** `Financing` (Equity additions)
*   **30200 (Retained Earnings):** `Financing` (or Operating - non-cash reconciliation base)
*   **20200 (Long-Term Loans):** `Financing` (Debt receipts/payments)
*   **50100 (Cost of Goods Sold):** `Operating` (Working Capital / COGS)
*   **50400 (Depreciation Expense):** Non-cash Adjustment (operating reconciliation)

---

## 3. Reporting Pipelines

### 3.1 Direct Method (الطريقة المباشرة)
Under the Direct Method, the actual cash-equivalent receipts and payments are extracted from double-entry journal entries.
*   **Algorithm:**
    1.  Identify all journal lines touching accounts classified as `CashEquivalent` (e.g. Cash, Bank).
    2.  For each such transaction line, look at the other lines (opposing lines) in the same `journal_entry` to determine where the cash came from or went.
    3.  Lookup the opposing account's classification in `cash_flow_mappings`.
    4.  Classify the flow based on the opposing account category:
        *   If opposing is Revenue -> Cash received from Customers (Operating)
        *   If opposing is Expense -> Cash paid to Suppliers/Employees (Operating)
        *   If opposing is Fixed Asset -> Acquisition of property (Investing)
        *   If opposing is Loan -> Loan Receipt/Repayment (Financing)

### 3.2 Indirect Method (الطريقة غير المباشرة)
The Indirect Method reconciles **Net Profit** back to cash from operating activities.
*   **Formulas:**
    $$\text{Cash from Operating} = \text{Net Profit} + \text{Non-Cash Expenses (Depreciation)} - \Delta \text{Accounts Receivable} - \Delta \text{Inventory} + \Delta \text{Accounts Payable} + \text{Other Operating Adjustments}$$
*   **Reconciliation steps:**
    1.  Retrieve **Net Profit** (Revenue minus Expense).
    2.  Add back **Depreciation Expense** (which is a debit to depreciation expense and credit to accumulated depreciation—no cash went out).
    3.  Analyze the delta of working capital accounts from the balance sheet (current period balance minus previous period balance):
        *   Increase in Accounts Receivable: Deduct from Net Profit
        *   Increase in Inventory: Deduct from Net Profit
        *   Increase in Accounts Payable: Add to Net Profit

---

## 4. UI/UX Interface Design
A professional, localized dashboard integrated in `ReportsEngine.tsx` includes:
*   **Direct/Indirect Switcher:** High-fidelity toggle to flip calculations in real-time.
*   **Mapping Interface:** Drag-and-drop or select-box classification interface to re-assign account codes on the fly.
*   **Excel Export & Printing:** Fully localized IFRS Arabic templates for audited submission.
