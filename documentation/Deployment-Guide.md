# دليل التثبيت والتوريد المحلي الفعلي (On-Premise Deployment Guide)
## نظام إدارة الموارد والشركات: ApexSaaS ERP

يصف هذا الدليل الإجراءات التفصيلية والخطوات العملية لإعداد وتشغيل نظام **ApexSaaS ERP** في بيئة إنتاجية محلية مستقرة (On-Premise) أو على خادم سحابي مخصص من البداية التامة دون أي افتراضات مسبقة.

---

### 1. متطلبات النظام الأساسية (System Requirements)

- **نظام التشغيل:** Linux (Ubuntu 20.04 LTS / 22.04 LTS أو Debian 11/12) أو بيئة مجهزة بـ Docker.
- **المعالج والمواصفات:** الحد الأدنى 2 Cores CPU، و 4GB RAM (لتحمل عمليات الدمج والـ caching ومطابقة القيود المحاسبية).
- **البيئة البرمجية:**
  - Node.js v20.x (أو أحدث LTS)
  - npm v10.x
  - PostgreSQL v15.x (أو أحدث) كقاعدة بيانات تشغيلية
  - Redis v7.x كطبقة حيازة كاش وجلسات سريعة

---

### 2. متغيرات البيئة الإلزامية وعزل الأمن الأقصى

يقوم النظام على قواعد أمان صارمة تمنع إقلاع الخادم (Fail-Fast) في حال عدم توفر متغيرات البيئة السرية الأساسية بشكل صريح في ملف `.env`. لا يحتوي الكود على أي قيم افتراضية احتياطية (no fallbacks).

قم بإنشاء ملف `.env` في المجلد الرئيسي واملأ البيانات التالية:

```env
# 1. بيئة التشغيل ومنفذ الخدمة
NODE_ENV=production
PORT=3000
APP_URL=http://localhost:3000

# 2. أسرار التشفير والمصادقة (إلزامية!)
# يجب توليد قيم عالية العشوائية والتشفير عبر الأمر: openssl rand -base64 48
JWT_SECRET="ضع_هنا_مفتاح_Access_Token_العشوائي_المشفر_بقوة"
JWT_REFRESH_SECRET="ضع_هنا_مفتاح_Refresh_Token_العشوائي_المشفر_بقوة"

# 3. محرك الذكاء الاصطناعي (Gemini SDK)
GEMINI_API_KEY="مفتاح_API_الخاص_بجوجل_AI_Studio"

# 4. الاتصال بقاعدة البيانات ومخازن الكاش
DATABASE_URL="postgresql://db_user_prod:YOUR_SECURE_PASSWORD_HERE@localhost:5432/erp_production"
REDIS_URL="redis://localhost:6379/0"
```

> ⚠️ **تنبيه أمني هام:** في حال غياب `JWT_SECRET` أو `JWT_REFRESH_SECRET` سيرفض السيرفر الإقلاع فوراً ويخرج بترميز الخطأ `process.exit(1)`.

---

### 3. إنشاء قاعدة البيانات المحلية وإجراء الترحيلات (Migrations & Seeding)

يتميز النظام بمحرك ترحيل وتأهيل ذاتي الشفاء (Self-Healing Migrations Engine) مدمج يقوم بتهيئة الجداول تلقائياً عند أول اتصال للتطبيق بقاعدة البيانات. ولكن للتحكم اليدوي الكامل وإجراء ترحيل وتغذية من الصفر:

#### أ. تطبيق ترحيلات الجداول (Migrations Up)
يتم تشغيل الترحيلات المبنية بـ Drizzle ORM تلقائياً عبر السيرفر. في البيئات المحلية، يمكنك فحص هيكلية قاعدة البيانات وتطبيق الترحيلات عبر الأمر:
```bash
npm run build
```
حيث يقوم أمر البناء بتنفيذ البناء الكامل للواجهة الخلفية والأمامية للتطبيق وتوليد ملف `dist/server.cjs`.

#### ب. تغذية قاعدة البيانات ببيانات تجريبية منفصلة (Optional Seed Script)
يقوم محرك التهيئة داخل ملف `src/core/database/db.ts` تلقائياً بفحص وجود الجداول وإدراج مستخدمين افتراضيين بصيغة مشفرة آمنة (Bcrypt):
- **المدير العام (System Admin):** اسم المستخدم `admin` / كلمة المرور `AdminPassword2026!`
- **المدير المالي (CFO):** اسم المستخدم `ahlam` / كلمة المرور `CFOPassword2026!`
مع تهيئة كامل شجرة الحسابات (Chart of Accounts) ومستندات الفروع التلقائية للشركة لتبدأ العمل فوراً.

---

### 4. التشغيل الفعلي عبر Docker Compose

لإطلاق بيئة إنتاجية محلية نظيفة تماماً بضغطة واحدة وبدون أي تدخل يدوي خارجي:

```bash
# 1. إيقاف وتطهير أي حاويات أو أحجام تخزين قديمة لضمان البدء من الصفر
docker-compose down -v

# 2. تشغيل الحاويات وإعادة بناء الصور البرمجية
docker-compose up --build -d

# 3. مراقبة حركة السجل للتحقق من الترحيل والتغذية التلقائية الناجحة
docker-compose logs -f erp-app-server
```

الخدمات التي سيتم إطلاقها تلقائياً:
1. **خادم التطبيق الأساسي (Vite + Express):** على الرابط `http://localhost:3000`
2. **قاعدة البيانات (PostgreSQL 15):** على المنفذ المحلي `5432`
3. **طبقة الكاش الكبرى (Redis 7):** على المنفذ المحلي `6379`
4. **لوحة تجميع القياسات (Prometheus):** على المنفذ `9090`

---

### 5. آلية النسخ الاحتياطي والاستعادة لقاعدة البيانات (Backup & Restore)

لضمان سلامة البيانات المحاسبية والمالية وحمايتها من التلف التشغيلي، اعتمد الأوامر التالية الجاهزة للاستخدام:

#### أ. أخذ نسخة احتياطية كاملة (Backup):
قم بتنفيذ الأمر التالي لأخذ نسخة احتياطية مضغوطة من الحاوية النشطة أو خادم PostgreSQL المحلي:
```bash
# في حال استخدام Docker Compose:
docker exec -t erp_db_prod pg_dump -U db_user_prod -d erp_production -F c -b -v -f /var/lib/postgresql/data/erp_backup_$(date +%F).dump

# لنقل ملف النسخة إلى جهازك المضيف:
docker cp erp_db_prod:/var/lib/postgresql/data/erp_backup_$(date +%F).dump ./backups/
```

#### ب. استعادة النسخة الاحتياطية (Restore):
في حال الرغبة في استرجاع البيانات لحالة سابقة من ملف `.dump`:
```bash
# 1. نقل ملف النسخة الاحتياطية داخل حاوية قاعدة البيانات
docker cp ./backups/erp_backup_target.dump erp_db_prod:/var/lib/postgresql/data/

# 2. تنظيف الجداول القديمة وإعادة بناء قاعدة البيانات نظيفة
docker exec -it erp_db_prod psql -U db_user_prod -d postgres -c "DROP DATABASE erp_production;"
docker exec -it erp_db_prod psql -U db_user_prod -d postgres -c "CREATE DATABASE erp_production;"

# 3. تنفيذ استعادة الهيكل والبيانات بالكامل
docker exec -it erp_db_prod pg_restore -U db_user_prod -d erp_production -v /var/lib/postgresql/data/erp_backup_target.dump
```
