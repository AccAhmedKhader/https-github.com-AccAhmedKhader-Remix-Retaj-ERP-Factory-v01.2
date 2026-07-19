# سجل التغييرات الهيكلية لقاعدة البيانات (Database Changes & Migrations)

يحتوي هذا المستند على التقرير التفصيلي للتعديلات الهيكلية التي تم إدخالها على قاعدة بيانات نظام **ApexSaaS ERP** لدعم متطلبات الإفصاح المالي المتوافق مع المعايير الدولية للتقارير المالية (**IFRS**) وتحديداً المعيارين **IAS 7** (قائمة التدفقات النقدية) و **IAS 1** (قائمة التغيرات في حقوق الملكية).

---

### 1. جدول خريطة التدفقات النقدية (`cash_flow_mappings`)

تم إدراج جدول جديد مخصص لتصنيف وتوزيع الحسابات المالية لشجرة الأستاذ العام وتعيينها إلى أنشطتها المحددة في معيار المحاسبة الدولي IAS 7 (أنشطة تشغيلية، استثمارية، تمويلية، نقدية وما يعادلها).

#### أ. مواصفات الجدول الهيكلية (Table Schema)

| اسم الحقل (Column Name) | نوع البيانات (Data Type) | قيود الحقل (Constraints) | الوصف والدور التشغيلي (Description) |
| :--- | :--- | :--- | :--- |
| `account_code` | `TEXT` | `NOT NULL` | رمز الحساب المالي المرتبط من دليل شجرة الحسابات. |
| `tenant_id` | `TEXT` | `NOT NULL`, `FOREIGN KEY` | رمز الشركة المستأجرة، مرتبط بجدول `tenants(id)` مع خاصية `ON DELETE CASCADE`. |
| `activity_type` | `TEXT` | `NOT NULL` | تصنيف النشاط في المعيار الدولي: `Operating` (تشغيلي)، `Investing` (استثماري)، `Financing` (تمويلي)، `CashEquivalent` (نقد وما يعادله). |
| `category_name` | `TEXT` | `NOT NULL` | الوصف المالي المخصص للحركة باللغة العربية (مثال: "متحصلات نقدية من العملاء"). |

#### ب. المفتاح الرئيسي المركب (Composite Primary Key)

* تم تحديد المفتاح الرئيسي ليكون مفتاحاً مركباً: `PRIMARY KEY (tenant_id, account_code)`.
* **السبب المعماري:** ضمان عزل الشركات (Multi-Tenancy) بحيث يمكن لكل مستأجر مالي (Tenant) تخصيص خرائط تدفقاته النقدية بشكل منفصل ومستقل للحساب نفسه دون تداخل البيانات.

---

### 2. تفاصيل ملفات الهجرة الرسمية (SQL Migration Scripts)

تنفيذاً للتوصيات واللوائح المعمارية للمؤسسات الكبرى، تم تجنب الحقن اليدوي المباشر في بيئة التشغيل، وتأسيس تتبع كامل عبر نظام الهجرة الرسمي:

* **موقع ملفات الهجرة:** `/src/core/database/migrations/`
* **موقع تسجيل الهجرات:** `/src/core/database/migrations.ts`

#### أ. ملف الصعود للهجرة (`0007_add_cash_flow_mappings.up.sql`)
```sql
CREATE TABLE IF NOT EXISTS cash_flow_mappings (
  account_code TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  category_name TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_code)
);
```

#### ب. ملف التراجع البرمجي للسلامة النظمية (`0007_add_cash_flow_mappings.down.sql`)
```sql
DROP TABLE IF EXISTS cash_flow_mappings CASCADE;
```

---

### 3. تأمين وتأكيد السلامة التشغيلية (Self-Healing Upgrades)

1. **الوقاية من الانهيار البدئي:** تم بناء ملفات تتبع وهمية من `0000_initial_schema` إلى `0006_add_hr_payroll_tables` لحماية خادم البدء من أي فقدان لملفات التطوير التاريخية، مما يضمن بدء بيئة خالية بالكامل وصالحة للتدقيق (Clean Boot).
2. **القيود المرجعية الصارمة (Relational Integrity):** الجدول الجديد يحقق الربط المحكم بجدول `tenants` لضمان محو البيانات الآلي عند إغلاق أو حذف حساب أي شركة شريكة دون ترك أي خلايا معلقة (Orphaned Rows) قد تضر بسلامة قواعد البيانات.
