# توثيق واجهات برمجة التطبيقات المالية (Accounting API Documentation)

يوثق هذا الدليل واجهات برمجة التطبيقات (REST APIs) المضافة حديثاً في نظام **ApexSaaS ERP** لتوليد التقارير المالية المتوافقة مع معايير التقارير المالية الدولية (**IFRS**).

تعتمد كافة الواجهات على المسار الأساسي الموحد: `/api/v1/accounting` وتدعم عزل البيانات السحابي المتعدد الشركات بالاعتماد على الرمز التعريفي للمستأجر المقترن بطلب الجلسة.

---

### 1. واجهة كشف التدفقات النقدية (IAS 7 Statement of Cash Flows)

تستعلم هذه الواجهة عن تفاصيل التدفقات النقدية بالطريقتين المباشرة وغير المباشرة، مع حساب الفروق ومطابقتها التامة مع النقدية وما يعادلها في الخزانة والبنك.

* **المسار:** `/api/v1/accounting/reports/cashflow`
* **البروتوكول:** `GET`
* **الرأسيات المطلوبة (Headers):**
  * `Authorization`: `Bearer <token>` (لتأمين الصلاحيات وفحص دور المستخدم كـ CFO أو SystemAdmin).
* **معاملات التصفية الاختيارية (Query Parameters):**
  * `fiscalYear`: السنة المالية المستهدفة (مثال: `2026`).
  * `company`: تحديد نطاق الشركة (مثال: `Apex Levant Corp`).

#### هيكل الاستجابة النموذجية (JSON Response Schema)
```json
{
  "direct": {
    "rows": [
      {
        "activity": "Operating",
        "category": "متحصلات نقدية من العملاء",
        "amount": 1450000
      },
      {
        "activity": "Operating",
        "category": "مدفوعات نقدية للموردين",
        "amount": -320000
      },
      {
        "activity": "Investing",
        "category": "شراء أجهزة ومعدات خوادم",
        "amount": -150000
      }
    ],
    "openingCash": 500000,
    "netChange": 980000,
    "closingCash": 1480000
  },
  "indirect": {
    "rows": [
      {
        "activity": "Operating",
        "category": "صافي الربح قبل الضرائب والفوائد",
        "amount": 1200000
      },
      {
        "activity": "Operating",
        "category": "التغير في المدينين وأوراق القبض",
        "amount": -220000
      }
    ],
    "openingCash": 500000,
    "netChange": 980000,
    "closingCash": 1480000
  }
}
```

---

### 2. واجهة كشف التغيرات في حقوق الملكية (IAS 1 Statement of Changes in Equity)

تولد تفاصيل التغيرات في بنود حقوق الملكية ورأس المال المساهم وصافي الأرباح المرحلة والاحتياطيات للفترة المحددة.

* **المسار:** `/api/v1/accounting/reports/equity`
* **البروتوكول:** `GET`
* **الرأسيات المطلوبة (Headers):**
  * `Authorization`: `Bearer <token>`

#### هيكل الاستجابة النموذجية (JSON Response Schema)
```json
[
  {
    "accountCode": "30100",
    "accountName": "رأس المال المدفوع",
    "openingBalance": 10000000,
    "additions": 2500000,
    "reductions": 0,
    "netProfitAllocation": 0,
    "closingBalance": 12500000
  },
  {
    "accountCode": "30200",
    "accountName": "الأرباح المحتجزة",
    "openingBalance": 1450000,
    "additions": 0,
    "reductions": 150000,
    "netProfitAllocation": 875000,
    "closingBalance": 2175000
  }
]
```

---

### 3. واجهة إدارة خرائط التدفق النقدي للحسابات (Cash Flow Mappings Manager)

تستخدم لاسترداد كافة التصنيفات الحالية للحسابات المالية أو إضافة وتحديث التصنيف لربطه بنشاط مالي محدد.

#### أ. جلب التصنيفات والخرائط الحالية
* **المسار:** `/api/v1/accounting/reports/mappings`
* **البروتوكول:** `GET`
* **الرأسيات المطلوبة (Headers):**
  * `Authorization`: `Bearer <token>`

#### ب. تحديث أو حفظ خريطة حساب مالي مخصص
* **المسار:** `/api/v1/accounting/reports/mappings`
* **البروتوكول:** `POST`
* **الرأسيات المطلوبة (Headers):**
  * `Content-Type`: `application/json`
  * `Authorization`: `Bearer <token>`
* **جسم الطلب (Request Body):**
```json
{
  "accountCode": "11000",
  "activityType": "Operating",
  "categoryName": "متحصلات نقدية من العملاء"
}
```
* **الاستجابة الناجحة:**
```json
{
  "success": true,
  "message": "تم تحديث خريطة التدفق النقدي للحساب 11000 بنجاح"
}
```
