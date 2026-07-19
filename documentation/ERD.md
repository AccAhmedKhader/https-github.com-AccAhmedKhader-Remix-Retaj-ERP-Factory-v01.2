# بنية البيانات وقاموس الجداول الموحد (Entity Relationship & Database Foundation)
## نظام ApexSaaS ERP v1.0.0

يصف هذا الدليل بنية جداول قاعدة البيانات والربط الهيكلي بين الكيانات والتحوط الأمني لمنع تسريب بيانات المستأجرين مع تسريع جلب الحركات المالية من خلال الفهارس والمفاتيح الموزعة.

---

### 1. مخطط الجداول الرئيسي وقاموس الحقول (Database Schema Dictionary)

#### أ. جدول الحسابات العامة (`chart_of_accounts`)
| الحقل | النوع | القيود | الوصف |
| :--- | :--- | :--- | :--- |
| `code` | VARCHAR(10) | PRIMARY KEY | كود الحساب المالي (مثال: 10100) |
| `tenant_id` | VARCHAR(30) | FOREIGN KEY | معرّف الشركة المستأجرة وعزل البيانات |
| `name` | VARCHAR(150) | NOT NULL | اسم الحساب باللغة العربية أو الإنجليزية |
| `type` | VARCHAR(20) | CHECK CONSTRAINT | نوع الحساب (Asset, Liability, Equity, Revenue, Expense) |
| `balance` | NUMERIC(15, 2) | DEFAULT 0.00 | الرصيد الحالي الفعلي للحساب |
| `initial_balance` | NUMERIC(15, 2) | DEFAULT 0.00 | الرصيد الافتتاحي لبداية العام المالي |

#### ب. جدول قيود اليومية المحاسبية (`general_ledger_journals`)
| الحقل | النوع | القيود | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(30) | PRIMARY KEY | كود القيد المحاسبي الفريد (مثال: JE-2026-001) |
| `tenant_id` | VARCHAR(30) | FOREIGN KEY | معرّف الشركة لعزل القيود |
| `branch_id` | VARCHAR(30) | NOT NULL | معرّف الفرع التشغيلي المنشئ |
| `date_posted` | DATE | NOT NULL | تاريخ ترحيل وتسجيل القيد في الدفاتر |
| `description` | TEXT | NOT NULL | البيان / شرح تفصيلي للقيد المالي |
| `reference_voucher` | VARCHAR(100) | NOT NULL | مرجع المستند أو الفاتورة (الرقم اليدوي أو الإلكتروني) |
| `status` | VARCHAR(15) | CHECK CONSTRAINT | حالة القيد (Draft, Approved, Posted) |
| `creator_id` | VARCHAR(30) | NOT NULL | كود المستخدم منشئ القيد |
| `approved_by` | VARCHAR(30) | NULLABLE | كود المدير أو المفوض المعتمد للقيد |

#### ج. جدول تفاصيل قيود اليومية (`journal_lines`)
| الحقل | النوع | القيود | الوصف |
| :--- | :--- | :--- | :--- |
| `id` | BIGSERIAL | PRIMARY KEY | الرقم المتسلسل التلقائي لسطر القيد |
| `journal_id` | VARCHAR(30) | FOREIGN KEY | كود القيد المحاسبي الأب |
| `account_code` | VARCHAR(10) | FOREIGN KEY | كود الحساب المدين أو الدائن |
| `debit` | NUMERIC(15, 2) | DEFAULT 0.00 | قيمة الجانب المدين للقيد المحاسبي |
| `credit` | NUMERIC(15, 2) | DEFAULT 0.00 | قيمة الجانب الدائن للقيد المحاسبي |

---

### 2. الفهارس ومحركات الفرز لسرعة البيانات (Enterprise Indexing & Keys)

لتسريع التقارير المالية وضمان عدم حدوث بطء أثناء استخراج ميزان المراجعة، يتم تفعيل الفهارس التالية:
* **مفتاح عزل البيانات (Multi-Tenant Composite Index):**
  `CREATE INDEX idx_tenant_accounts ON chart_of_accounts(tenant_id, code);`
* **مفتاح فرز حركة القيود المحاسبية بالفرع والتاريخ:**
  `CREATE INDEX idx_branch_date_journal ON general_ledger_journals(tenant_id, branch_id, date_posted);`
* **مفتاح جلب سطور القيد والتجميع المالي المحاسبي:**
  `CREATE INDEX idx_lines_journal ON journal_lines(journal_id);`

---

### 3. القيود المحاسبية والسلامة (Constraints & Double Entry Audit)

* **صحة المدين والدائن:** يفرض محرك الحسابات عدم ترحيل أي قيد محاسبي لا تتطابق فيه قيم المدين والدائن تماماً: `SUM(debit) == SUM(credit)`.
* **الخصم والتحصيل الضريبي:** ترتبط مصلحة الضرائب المصرية بمراجعة كافة العمليات الضريبية المسجلة في حقل ضريبة القيمة المضافة 14% للتطابق الكامل مع تقرير مبيعات الفواتير الإلكترونية لنموذج 41.
* **الحذف اللطيف (Soft Delete):** يُمنع استخدام الحذف الفعلي `DELETE` لأي حركات تم ترحيلها. يتم تحديث الحقل `deleted_at` وتصفيته من العرض النشط، مما يحفظ سجل المراجعة التاريخي كاملاً للجهات الرقابية والمراجع الخارجي.
