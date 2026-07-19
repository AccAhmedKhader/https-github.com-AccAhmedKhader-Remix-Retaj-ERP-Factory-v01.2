# معايير التسمية والصياغة البرمجية (Naming Standards)
## نظام ApexSaaS ERP v1.0.0

تهدف هذه الوثيقة إلى توحيد أسماء الملفات، المتغيرات، الدوال، الجداول والمفاتيح البرمجية لمنع التناقض المعماري وتسهيل الفحص والدمج المؤتمت.

---

### 1. تسمية الملفات والمجلدات (Files & Folders Naming)

* **مكونات React (React Components):** تُسمى المكونات والواجهات بأسلوب **PascalCase** (مثل: `AccountingModule.tsx`, `Sidebar.tsx`, `ArchitectTerminal.tsx`).
* **الملفات الوظيفية والمساعدين (Utility/Helper Files):** تُسمى بأسلوب **kebab-case** أو **camelCase** (مثل: `erp-config.ts`, `rbac.ts`, `db-foundation.ts`).
* **المجلدات والمسارات:** تُسمى دائماً بأحرف صغيرة مع فواصل kebab-case (مثل: `core`, `shared`, `security`, `database`, `api`).

---

### 2. تسمية الكود البرمجي (Code Variables & Functions)

* **المتغيرات والدوال:** تُسمى بأسلوب **camelCase** (مثل: `accounts`, `setAccounts`, `isAiDrawerOpen`, `renderView`).
* **الواجهات والأنواع (Interfaces & Types):** تُصاغ بأسلوب **PascalCase** وتصف المحتوى بوضوح شديد (مثل: `ChartOfAccount`, `Employee`, `AuditRecord`).
* **الثوابت العامة (Global Constants):** تُسمى بأحرف كبيرة بالكامل مع فواصل سفلية **UPPER_SNAKE_CASE** (مثل: `INITIAL_ACCOUNTS`, `ROLE_PERMISSIONS`, `DEFAULT_ERP_CONFIG`).

---

### 3. معايير تسمية قواعد البيانات (Database & Tables Schema)

* **أسماء الجداول (Tables):** تُسمى بصيغة الجمع والأحرف الصغيرة بالكامل مع فواصل سفلية `snake_case` (مثل: `general_ledger_journals`, `chart_of_accounts`, `employees_payroll`).
* **المفاتيح الرئيسية والأجنبية (Keys):**
  * المفتاح الرئيسي: `id` أو `uuid`.
  * المفتاح الأجنبي: اسم الجدول المفرد ملحوقاً بـ `_id` (مثل: `tenant_id`, `branch_id`, `warehouse_id`).
* **حقول التتبع والتدقيق المحاسبي:**
  * `created_at`: وقت الإنشاء الفعلي.
  * `updated_at`: وقت التعديل الأخير.
  * `deleted_at`: لدعم آلية الحذف اللطيف (Soft Delete) ومنع ضياع السجلات المالية الهامة.
