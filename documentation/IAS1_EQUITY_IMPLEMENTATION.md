# IAS 1 - Statement of Changes in Equity Implementation Specification

## 1. Overview
The **IAS 1 Statement of Changes in Equity (قائمة التغيرات في حقوق الملكية)** is an indispensable component of financial statements under IFRS. It details the reconciliation of the carrying amount of each component of equity from the beginning of the period to the end of the period.

Equity components generally include:
1.  **Paid-in Capital (رأس المال المدفوع):** Capital contributed by shareholders.
2.  **Statutory Reserve (الاحتياطي النظامي):** Retained earnings legally earmarked for reserves (e.g., 10% under Egyptian Corporate Law).
3.  **Retained Earnings (الأرباح المبقاة / المرحلية):** Accumulated profits not distributed to owners.
4.  **Other Reserves (احتياطيات أخرى):** Revaluation reserves, etc.

---

## 2. Technical Implementation & Flow Extraction

### 2.1 Extraction Algorithm from Journal Ledger
Instead of static representations, changes are calculated dynamically by parsing the double-entry journal entries affecting accounts with type `Equity`.

For each Equity account:
1.  **Opening Balance (رصيد أول المدة):** Determined by the account's initial balance or beginning balance at the start of the fiscal year.
2.  **Net Income for the Period (صافي ربح الفترة):** Extracted from the Income Statement (Revenue - Expenses) and automatically added to **Retained Earnings**.
3.  **Capital Additions (زيادات رأس المال):** Credit journal entries to Capital accounts (e.g., 30100).
4.  **Dividends Distributed (توزيعات الأرباح):** Debit journal entries to Retained Earnings (e.g., 30200) with a corresponding credit to cash or dividend payable.
5.  **Transfers to Reserves (التحويل للاحتياطيات):** Debit to Retained Earnings and Credit to Statutory Reserve (e.g., 30300).
6.  **Closing Balance (رصيد آخر المدة):** Must match the current balance sheet equity balances:
    $$\text{Closing Balance} = \text{Opening Balance} + \text{Net Income} + \text{Additions} - \text{Reductions}$$

---

## 3. Database Schema Integrity
No new tables are required for IAS 1 as all details are contained within `journal_entries`, `journal_lines`, and `accounts` with `type = 'Equity'`.

---

## 4. Egyptian Accounting Standards Compliance (EAS 1)
Under Egyptian Accounting Standards (EAS 1), the report must clearly identify:
*   Dividends distributed to employees and board members separately from owner withdrawals.
*   Statutory reserves formed by allocating 10% of net profits until the reserve reaches 50% of capital.
*   Localized translation of terms and precise tracking of shareholder transactions.
