import React, { useState } from "react";
import { 
  Building2, 
  Layers, 
  MapPin, 
  Sliders, 
  Package, 
  Server, 
  Trash2, 
  Plus, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";
import { ERPConfig, ChartOfAccount, Supplier, Customer, StockItem } from "../types";
import { getThemeClass } from "./Sidebar";

interface OnboardingModuleProps {
  config: ERPConfig;
  setConfig: React.Dispatch<React.SetStateAction<ERPConfig>>;
  accounts?: ChartOfAccount[];
  setAccounts?: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  suppliers?: Supplier[];
  setSuppliers?: React.Dispatch<React.SetStateAction<Supplier[]>>;
  customers?: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  stock?: StockItem[];
  setStock?: React.Dispatch<React.SetStateAction<StockItem[]>>;
}

export default function OnboardingModule({
  config,
  setConfig,
  accounts = [],
  setAccounts,
  suppliers = [],
  setSuppliers,
  customers = [],
  setCustomers,
  stock = [],
  setStock
}: OnboardingModuleProps) {
  const clr = getThemeClass(config.theme);

  // Stepper states
  const [activeWizardStep, setActiveWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [wizardSuccess, setWizardSuccess] = useState("");
  const [wizardError, setWizardError] = useState("");

  // Step 1 Form States (Company)
  const [compCode, setCompCode] = useState("");
  const [compName, setCompName] = useState("");
  const [compTaxId, setCompTaxId] = useState("");
  const [compCurrency, setCompCurrency] = useState("EGP");
  const [compFiscalYear, setCompFiscalYear] = useState("FY 2026/2027");

  // Step 2 Form States (Branch)
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchLoc, setBranchLoc] = useState("");
  const [branchComp, setBranchComp] = useState("");

  // Step 3 Form States (Warehouse)
  const [whCode, setWhCode] = useState("");
  const [whName, setWhName] = useState("");
  const [whLoc, setWhLoc] = useState("");
  const [whBranch, setWhBranch] = useState("");

  // Step 4 Form States (Suppliers & Customers)
  const [partnerType, setPartnerType] = useState<"customer" | "supplier">("customer");
  const [custCodeField, setCustCodeField] = useState("");
  const [custNameField, setCustNameField] = useState("");
  const [custTaxIdField, setCustTaxIdField] = useState("");
  const [custPhoneField, setCustPhoneField] = useState("");
  const [custEmailField, setCustEmailField] = useState("");
  const [custBalanceField, setCustBalanceField] = useState(0);

  const [suppCodeField, setSuppCodeField] = useState("");
  const [suppNameField, setSuppNameField] = useState("");
  const [suppTaxIdField, setSuppTaxIdField] = useState("");
  const [suppPhoneField, setSuppPhoneField] = useState("");
  const [suppEmailField, setSuppEmailField] = useState("");
  const [suppBalanceField, setSuppBalanceField] = useState(0);

  // Step 5 Form States (Stock Item)
  const [itemSkuField, setItemSkuField] = useState("");
  const [itemNameField, setItemNameField] = useState("");
  const [itemWhField, setItemWhField] = useState("");
  const [itemQtyField, setItemQtyField] = useState(50);
  const [itemPriceField, setItemPriceField] = useState(1200);
  const [itemMinField, setItemMinField] = useState(5);
  const [itemCatField, setItemCatField] = useState("برمجيات ونظم تشغيل");

  // Retrieve current lists from state
  const companiesList: any[] = (config as any).companiesList || [
    { id: "TEN-APEX-01", name: "شركة قمة الشام والرافدين المحدودة", value: "Apex Levant Corp" },
    { id: "TEN-GULF-02", name: "شركة قمة الخليج الدولية", value: "Apex Gulf International" },
    { id: "TEN-AFRICA-03", name: "مؤسسة قمة أفريقيا للتوزيع والاستيراد", value: "Apex Africa Distribution" }
  ];

  const branchesList: any[] = (config as any).branchesList || [
    { id: "BR-CAI-01", name: "الإدارة العامة بالقاهرة (شيراتون)", value: "Cairo Headquarters", companyId: "TEN-APEX-01" },
    { id: "BR-ALX-02", name: "مكتب ميناء الإسكندرية اللوجستي", value: "Alex Port Gateway", companyId: "TEN-APEX-01" },
    { id: "BR-DXB-03", name: "مكتب جافزا دبي الإقليمي", value: "Dubai JAFZA Branch", companyId: "TEN-GULF-02" }
  ];

  const warehousesList: any[] = (config as any).warehousesList || [
    { id: "WH-CAI-01", name: "مستودع القاهرة المركزي الرئيسي", value: "WH-CAI-01", branchId: "BR-CAI-01" },
    { id: "WH-ALX-02", name: "محطة الإسكندرية اللوجستية", value: "WH-ALX-02", branchId: "BR-ALX-02" },
    { id: "WH-DXB-03", name: "مركز جافزا دبي الدولي", value: "WH-DXB-03", branchId: "BR-DXB-03" }
  ];

  // Filter branches and warehouses in the forms based on linkages
  const selectedCompObj = companiesList.find(c => c.name === branchComp || c.value === branchComp || c.name === config.company || c.value === config.company) || companiesList[0];
  const selectedCompId = selectedCompObj ? selectedCompObj.id : "";

  // Filter branches belonging to selected/active company
  const filteredFormBranches = branchesList.filter(b => b.companyId === selectedCompId);

  // For Warehouse Form, we show branches of the active company
  const activeCompObj = companiesList.find(c => c.value === config.company || c.name === config.company) || companiesList[0];
  const activeCompId = activeCompObj ? activeCompObj.id : "";
  const filteredWarehouseFormBranches = branchesList.filter(b => b.companyId === activeCompId);

  // ==========================================================================
  // HANDLERS FOR CREATION
  // ==========================================================================

  const handleAddCompanyWizard = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardSuccess("");
    setWizardError("");

    if (!compCode || !compName) {
      setWizardError("❌ يرجى ملء حقل كود الشركة واسم الشركة الرئيسي.");
      return;
    }
    if (companiesList.some((c: any) => c.id === compCode || c.name === compName)) {
      setWizardError("❌ هذه الشركة أو الكود مسجل بالفعل في النظام.");
      return;
    }

    const newCompany = { id: compCode, name: compName, value: compName, taxId: compTaxId, currency: compCurrency };
    const updatedCompanies = [...companiesList, newCompany];

    setConfig({
      ...config,
      companiesList: updatedCompanies,
      company: compName,
      currency: compCurrency,
      fiscalYear: compFiscalYear
    } as any);

    setWizardSuccess(`✅ تم بنجاح تأسيس شركة "${compName}" وتفعيلها كشركة حالية نشطة بالنظام!`);
    setCompCode("");
    setCompName("");
    setCompTaxId("");
  };

  const handleAddBranchWizard = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardSuccess("");
    setWizardError("");

    if (!branchCode || !branchName) {
      setWizardError("❌ يرجى ملء كود الفرع واسم الفرع.");
      return;
    }
    if (branchesList.some((b: any) => b.id === branchCode)) {
      setWizardError("❌ كود الفرع مسجل مسبقاً.");
      return;
    }

    const targetCompanyObj = companiesList.find(c => c.name === branchComp || c.value === branchComp) || activeCompObj;
    const targetCompId = targetCompanyObj ? targetCompanyObj.id : activeCompId;

    const newBranch = { 
      id: branchCode, 
      name: branchName, 
      value: branchName, 
      location: branchLoc, 
      companyId: targetCompId 
    };

    const updatedBranches = [...branchesList, newBranch];
    setConfig({
      ...config,
      branchesList: updatedBranches,
      branch: branchName
    } as any);

    setWizardSuccess(`✅ تم بنجاح إنشاء فرع "${branchName}" وربطه بالمنشأة وتفعيله كفرع حالي!`);
    setBranchCode("");
    setBranchName("");
    setBranchLoc("");
  };

  const handleAddWarehouseWizard = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardSuccess("");
    setWizardError("");

    if (!whCode || !whName) {
      setWizardError("❌ يرجى إدخال كود واسم المستودع.");
      return;
    }
    if (warehousesList.some((w: any) => w.id === whCode)) {
      setWizardError("❌ كود المستودع هذا مستخدم بالفعل.");
      return;
    }

    // Determine branch linkage
    const targetBranchObj = branchesList.find(b => b.name === whBranch || b.id === whBranch || b.value === whBranch) || branchesList.find(b => b.name === config.branch || b.value === config.branch) || branchesList[0];
    const targetBranchId = targetBranchObj ? targetBranchObj.id : "BR-CAI-01";

    const newWh = {
      id: whCode,
      name: whName,
      value: whCode,
      location: whLoc,
      branchId: targetBranchId
    };

    const updatedWarehouses = [...warehousesList, newWh];
    setConfig({
      ...config,
      warehousesList: updatedWarehouses,
      warehouse: whCode
    } as any);

    setWizardSuccess(`✅ تم بنجاح تأسيس مستودع "${whName}" وتحديده كمستودع تخزين افتراضي!`);
    setWhCode("");
    setWhName("");
    setWhLoc("");
  };

  const handleAddPartnerWizard = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardSuccess("");
    setWizardError("");

    if (partnerType === "customer") {
      if (!custCodeField || !custNameField) {
        setWizardError("❌ يرجى إدخال كود واسم العميل.");
        return;
      }
      if (customers.some(c => c.id === custCodeField)) {
        setWizardError("❌ كود العميل مسجل بالفعل.");
        return;
      }
      const newCust: Customer = {
        id: custCodeField,
        name: custNameField,
        taxRegistrationNumber: custTaxIdField || "112233445",
        phone: custPhoneField || "010000000",
        email: custEmailField || "info@client.com",
        balance: custBalanceField || 0
      };
      if (setCustomers) {
        setCustomers([...customers, newCust]);
      }
      setWizardSuccess(`✅ تم بنجاح تسجيل العميل "${custNameField}" وضبط رصيده الافتتاحي.`);
      setCustCodeField("");
      setCustNameField("");
      setCustTaxIdField("");
      setCustPhoneField("");
      setCustEmailField("");
      setCustBalanceField(0);
    } else {
      if (!suppCodeField || !suppNameField) {
        setWizardError("❌ يرجى إدخال كود واسم المورد.");
        return;
      }
      if (suppliers.some(s => s.id === suppCodeField)) {
        setWizardError("❌ كود المورد مسجل بالفعل.");
        return;
      }
      const newSupp: Supplier = {
        id: suppCodeField,
        name: suppNameField,
        taxRegistrationNumber: suppTaxIdField || "556677889",
        phone: suppPhoneField || "011111111",
        email: suppEmailField || "info@supplier.com",
        balance: suppBalanceField || 0
      };
      if (setSuppliers) {
        setSuppliers([...suppliers, newSupp]);
      }
      setWizardSuccess(`✅ تم بنجاح تسجيل المورد "${suppNameField}" وتأكيد رصيده المالي.`);
      setSuppCodeField("");
      setSuppNameField("");
      setSuppTaxIdField("");
      setSuppPhoneField("");
      setSuppEmailField("");
      setSuppBalanceField(0);
    }
  };

  const handleAddItemWizard = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardSuccess("");
    setWizardError("");

    if (!itemSkuField || !itemNameField) {
      setWizardError("❌ يرجى إدخال رمز صنف واسم معتمد.");
      return;
    }
    if (stock.some(i => i.sku === itemSkuField)) {
      setWizardError("❌ رمز الصنف المالي (SKU) مسجل بالفعل بالدليل.");
      return;
    }
    const targetWh = itemWhField || config.warehouse || "WH-CAI-01";
    const newItem: StockItem = {
      sku: itemSkuField,
      name: itemNameField,
      warehouseId: targetWh,
      quantity: itemQtyField || 0,
      unitPrice: itemPriceField || 0,
      minLevel: itemMinField || 5,
      category: itemCatField || "عام"
    };
    if (setStock) {
      setStock([...stock, newItem]);
    }
    setWizardSuccess(`✅ تم بنجاح تسجيل الصنف "${itemNameField}" برصيد افتتاح مستودعي قدره ${itemQtyField} وحدة.`);
    setItemSkuField("");
    setItemNameField("");
    setItemQtyField(50);
    setItemPriceField(1200);
    setItemMinField(5);
    setItemCatField("برمجيات ونظم تشغيل");
  };

  // ==========================================================================
  // DELETION HANDLERS (with Cascading Safety & Active Context Switch)
  // ==========================================================================

  const handleDeleteCompany = (compToDeleteId: string) => {
    setWizardSuccess("");
    setWizardError("");

    const companyToDel = companiesList.find(c => c.id === compToDeleteId);
    if (!companyToDel) return;

    // We warn or perform cascading delete of branches and warehouses
    const associatedBranches = branchesList.filter(b => b.companyId === compToDeleteId);
    const branchIdsToDel = associatedBranches.map(b => b.id);

    const updatedCompanies = companiesList.filter(c => c.id !== compToDeleteId);
    const updatedBranches = branchesList.filter(b => b.companyId !== compToDeleteId);
    const updatedWarehouses = warehousesList.filter(w => !branchIdsToDel.includes(w.branchId));

    // Determine the next active company if the deleted one was active
    const isActiveDeleted = (config.company === companyToDel.name || config.company === companyToDel.value);
    let nextCompany = config.company;
    let nextCurrency = config.currency;

    if (isActiveDeleted) {
      if (updatedCompanies.length > 0) {
        nextCompany = updatedCompanies[0].name || updatedCompanies[0].value;
        nextCurrency = updatedCompanies[0].currency || "EGP";
      } else {
        nextCompany = "";
        nextCurrency = "EGP";
      }
    }

    // Determine next active branch and warehouse
    let nextBranch = config.branch;
    if (isActiveDeleted || updatedBranches.every(b => (b.name !== config.branch && b.value !== config.branch))) {
      const activeCompObjRemaining = updatedCompanies.find(c => c.name === nextCompany || c.value === nextCompany);
      const remainingBranches = activeCompObjRemaining ? updatedBranches.filter(b => b.companyId === activeCompObjRemaining.id) : [];
      nextBranch = remainingBranches.length > 0 ? (remainingBranches[0].name || remainingBranches[0].value) : "";
    }

    let nextWarehouse = config.warehouse;
    if (isActiveDeleted || updatedWarehouses.every(w => w.id !== config.warehouse)) {
      const activeBrObjRemaining = updatedBranches.find(b => b.name === nextBranch || b.value === nextBranch);
      const remainingWarehouses = activeBrObjRemaining ? updatedWarehouses.filter(w => w.branchId === activeBrObjRemaining.id) : [];
      nextWarehouse = remainingWarehouses.length > 0 ? (remainingWarehouses[0].value || remainingWarehouses[0].id) : "";
    }

    setConfig({
      ...config,
      companiesList: updatedCompanies,
      branchesList: updatedBranches,
      warehousesList: updatedWarehouses,
      company: nextCompany,
      branch: nextBranch,
      warehouse: nextWarehouse,
      currency: nextCurrency
    } as any);

    setWizardSuccess(`🗑️ تم بنجاح حذف الشركة "${companyToDel.name}" وكافة فروعها (${associatedBranches.length}) ومخازنها المرتبطة!`);
  };

  const handleDeleteBranch = (branchToDeleteId: string) => {
    setWizardSuccess("");
    setWizardError("");

    const branchToDel = branchesList.find(b => b.id === branchToDeleteId);
    if (!branchToDel) return;

    const updatedBranches = branchesList.filter(b => b.id !== branchToDeleteId);
    const updatedWarehouses = warehousesList.filter(w => w.branchId !== branchToDeleteId);

    // Determine next active branch if deleted branch was active
    const isActiveDeleted = (config.branch === branchToDel.name || config.branch === branchToDel.value);
    let nextBranch = config.branch;

    if (isActiveDeleted) {
      // Find remaining branches of the ACTIVE company
      const activeCompObjCurrent = companiesList.find(c => c.name === config.company || c.value === config.company);
      const remainingBranches = activeCompObjCurrent ? updatedBranches.filter(b => b.companyId === activeCompObjCurrent.id) : [];
      nextBranch = remainingBranches.length > 0 ? (remainingBranches[0].name || remainingBranches[0].value) : "";
    }

    // Determine next active warehouse
    let nextWarehouse = config.warehouse;
    if (isActiveDeleted || updatedWarehouses.every(w => w.id !== config.warehouse)) {
      const activeBrObjRemaining = updatedBranches.find(b => b.name === nextBranch || b.value === nextBranch);
      const remainingWarehouses = activeBrObjRemaining ? updatedWarehouses.filter(w => w.branchId === activeBrObjRemaining.id) : [];
      nextWarehouse = remainingWarehouses.length > 0 ? (remainingWarehouses[0].value || remainingWarehouses[0].id) : "";
    }

    setConfig({
      ...config,
      branchesList: updatedBranches,
      warehousesList: updatedWarehouses,
      branch: nextBranch,
      warehouse: nextWarehouse
    } as any);

    setWizardSuccess(`🗑️ تم بنجاح حذف الفرع "${branchToDel.name}" والمخازن التابعة له!`);
  };

  const handleDeleteWarehouse = (whToDeleteId: string) => {
    setWizardSuccess("");
    setWizardError("");

    const whToDel = warehousesList.find(w => w.id === whToDeleteId);
    if (!whToDel) return;

    const updatedWarehouses = warehousesList.filter(w => w.id !== whToDeleteId);

    // Determine next active warehouse if deleted was active
    const isActiveDeleted = (config.warehouse === whToDeleteId || config.warehouse === whToDel.value);
    let nextWarehouse = config.warehouse;

    if (isActiveDeleted) {
      const activeBrObjCurrent = branchesList.find(b => b.name === config.branch || b.value === config.branch);
      const remainingWarehouses = activeBrObjCurrent ? updatedWarehouses.filter(w => w.branchId === activeBrObjCurrent.id) : [];
      nextWarehouse = remainingWarehouses.length > 0 ? (remainingWarehouses[0].value || remainingWarehouses[0].id) : "";
    }

    setConfig({
      ...config,
      warehousesList: updatedWarehouses,
      warehouse: nextWarehouse
    } as any);

    setWizardSuccess(`🗑️ تم بنجاح حذف المستودع/المخزن "${whToDel.name}"!`);
  };

  const handleDeleteCustomer = (id: string) => {
    if (setCustomers) {
      setCustomers(customers.filter(c => c.id !== id));
      setWizardSuccess(`🗑️ تم حذف العميل بنجاح.`);
    }
  };

  const handleDeleteSupplier = (id: string) => {
    if (setSuppliers) {
      setSuppliers(suppliers.filter(s => s.id !== id));
      setWizardSuccess(`🗑️ تم حذف المورد بنجاح.`);
    }
  };

  const handleDeleteStockItem = (sku: string) => {
    if (setStock) {
      setStock(stock.filter(s => s.sku !== sku));
      setWizardSuccess(`🗑️ تم حذف الصنف بنجاح من الدليل.`);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-[#121824] p-5 rounded-xl border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-right flex-1">
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20">
            دليل بدء العمل والتأسيس الذكي (standalone)
          </span>
          <h3 className="text-xl font-bold text-slate-100 font-display">بوابة تهيئة وإعداد المنشآت الجديدة وتأسيس النشاط</h3>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            أهلاً بك في دليل التأسيس السريع لنظام **ApexSaaS ERP**. اتبع الخطوات الخمس أدناه لتسجيل شركتك، فروعها، مستودعاتها، ومورديك وعملائك وأصنافك لتبدأ العمل فورا بنظام محاسبي مالي متكامل.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 bg-[#0a0d16] p-2.5 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 font-sans">التقدم الحالي:</span>
          <strong className="text-xs font-mono text-emerald-400">الخطوة {activeWizardStep} من 5</strong>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="grid grid-cols-5 gap-2 md:gap-4 text-center">
        {[
          { step: 1, label: "تأسيس الشركة", icon: Building2, color: "text-emerald-400", border: "border-emerald-500" },
          { step: 2, label: "إضافة الفروع", icon: Layers, color: "text-cyan-400", border: "border-cyan-500" },
          { step: 3, label: "تهيئة المخازن", icon: MapPin, color: "text-pink-400", border: "border-pink-500" },
          { step: 4, label: "شركاء الأعمال", icon: Sliders, color: "text-amber-400", border: "border-amber-500" },
          { step: 5, label: "تعريف الأصناف", icon: Package, color: "text-purple-400", border: "border-purple-500" }
        ].map((item) => {
          const IconComponent = item.icon;
          const isActive = activeWizardStep === item.step;
          const isCompleted = activeWizardStep > item.step;
          return (
            <button
              key={item.step}
              onClick={() => {
                setActiveWizardStep(item.step as any);
                setWizardSuccess("");
                setWizardError("");
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                isActive 
                  ? `bg-[#121824] ${item.border}/40 shadow-md ring-1 ring-slate-800` 
                  : isCompleted 
                    ? "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200" 
                    : "bg-slate-950/20 border-slate-900 text-slate-600 hover:text-slate-400"
              }`}
            >
              <div className={`p-1.5 rounded-lg mb-1.5 ${
                isActive ? "bg-slate-800/80 " + item.color : isCompleted ? "bg-emerald-950/20 text-emerald-400" : "bg-slate-950"
              }`}>
                <IconComponent className="h-4 w-4" />
              </div>
              <span className="text-[10px] md:text-[11px] font-bold font-display block whitespace-nowrap">{item.label}</span>
              <span className="text-[9px] font-mono text-slate-500 mt-0.5 block">خطوة {item.step}</span>
            </button>
          );
        })}
      </div>

      {/* Notifications */}
      {wizardSuccess && (
        <div className="p-3 rounded-lg text-xs font-sans text-right bg-emerald-950/20 border border-emerald-500/20 text-emerald-400">
          {wizardSuccess}
        </div>
      )}
      {wizardError && (
        <div className="p-3 rounded-lg text-xs font-sans text-right bg-red-950/20 border border-red-500/20 text-red-400">
          {wizardError}
        </div>
      )}

      {/* Grid of Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step Forms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0d1220] border border-slate-800 rounded-xl p-5 space-y-4">
            
            {/* STEP 1: Company Setup */}
            {activeWizardStep === 1 && (
              <form onSubmit={handleAddCompanyWizard} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  <h4 className="text-xs font-bold text-slate-200 font-display">الخطوة 1: تأسيس وتسجيل منشأة جديدة</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">كود الشركة الفني الفريد *</label>
                    <input
                      type="text"
                      required
                      value={compCode}
                      onChange={(e) => setCompCode(e.target.value.toUpperCase())}
                      placeholder="مثال: TEN-KHODR-01"
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">الاسم القانوني للشركة *</label>
                    <input
                      type="text"
                      required
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      placeholder="مثال: شركة خضر للتطوير المالي"
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">الرقم الضريبي الموحد</label>
                    <input
                      type="text"
                      value={compTaxId}
                      onChange={(e) => setCompTaxId(e.target.value)}
                      placeholder="مثال: 987654321"
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">عملة النشاط الرئيسية</label>
                    <select
                      value={compCurrency}
                      onChange={(e) => setCompCurrency(e.target.value)}
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="EGP">جنيه مصري (EGP)</option>
                      <option value="AED">درهم إماراتي (AED)</option>
                      <option value="SAR">ريال سعودي (SAR)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                      <option value="EUR">يورو أوروبي (EUR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">السنة المالية النشطة</label>
                    <input
                      type="text"
                      required
                      value={compFiscalYear}
                      onChange={(e) => setCompFiscalYear(e.target.value)}
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                >
                  <Plus className="h-4 w-4" />
                  تأسيس الشركة وتفعيلها فوراً
                </button>
              </form>
            )}

            {/* STEP 2: Branch Setup */}
            {activeWizardStep === 2 && (
              <form onSubmit={handleAddBranchWizard} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Layers className="h-5 w-5 text-cyan-400" />
                  <h4 className="text-xs font-bold text-slate-200 font-display">الخطوة 2: إضافة فروع ومكاتب تشغيلية للمنشأة</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">كود الفرع الفريد *</label>
                    <input
                      type="text"
                      required
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                      placeholder="مثال: BR-GIZA-02"
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">اسم الفرع الجديد *</label>
                    <input
                      type="text"
                      required
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="مثال: فرع الجيزة والمنطقة الغربية"
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">موقع الفرع / العنوان الجغرافي</label>
                    <input
                      type="text"
                      value={branchLoc}
                      onChange={(e) => setBranchLoc(e.target.value)}
                      placeholder="مثال: الجيزة - شارع جامعة الدول العربية"
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">ربط الفرع بالمنشأة القانونية *</label>
                    <select
                      value={branchComp}
                      onChange={(e) => setBranchComp(e.target.value)}
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="">اختر الشركة...</option>
                      {companiesList.map((c: any) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                >
                  <Plus className="h-4 w-4" />
                  حفظ الفرع وتأكيد ربطه بالمنشأة
                </button>
              </form>
            )}

            {/* STEP 3: Warehouse Setup */}
            {activeWizardStep === 3 && (
              <form onSubmit={handleAddWarehouseWizard} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <MapPin className="h-5 w-5 text-pink-400" />
                  <h4 className="text-xs font-bold text-slate-200 font-display">الخطوة 3: تهيئة وتأسيس مستودعات لوجستية</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">كود المستودع الفريد *</label>
                    <input
                      type="text"
                      required
                      value={whCode}
                      onChange={(e) => setWhCode(e.target.value.toUpperCase())}
                      placeholder="مثال: WH-GIZA-02"
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">اسم المستودع / المخزن *</label>
                    <input
                      type="text"
                      required
                      value={whName}
                      onChange={(e) => setWhName(e.target.value)}
                      placeholder="مثال: مستودع الجيزة اللوجستي المركزي"
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">موقع وعنوان المستودع</label>
                    <input
                      type="text"
                      value={whLoc}
                      onChange={(e) => setWhLoc(e.target.value)}
                      placeholder="مثال: المنطقة الصناعية بـ 6 أكتوبر"
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">ربط المخزن بالفرع التابع له *</label>
                    <select
                      value={whBranch}
                      onChange={(e) => setWhBranch(e.target.value)}
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 cursor-pointer"
                    >
                      <option value="">اختر الفرع...</option>
                      {filteredWarehouseFormBranches.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
                      ))}
                      {filteredWarehouseFormBranches.length === 0 && (
                        <option value="">لا توجد فروع للشركة النشطة الحالية لتحديدها</option>
                      )}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-pink-600 hover:bg-pink-500 text-slate-950 font-bold text-xs py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                >
                  <Plus className="h-4 w-4" />
                  تنشيط المستودع وجدولته للعمل الجردي
                </button>
              </form>
            )}

            {/* STEP 4: Business Partners */}
            {activeWizardStep === 4 && (
              <form onSubmit={handleAddPartnerWizard} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-amber-400" />
                    <h4 className="text-xs font-bold text-slate-200 font-display">الخطوة 4: تسجيل شركاء الأعمال والأرصدة الافتتاحية</h4>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-[#0a0c16] p-1 rounded-lg border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setPartnerType("customer"); }}
                      className={`px-3 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                        partnerType === "customer" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      عميل جديد
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPartnerType("supplier"); }}
                      className={`px-3 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                        partnerType === "supplier" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      مورد جديد
                    </button>
                  </div>
                </div>

                {partnerType === "customer" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">كود العميل (Customer Code) *</label>
                        <input
                          type="text"
                          required
                          value={custCodeField}
                          onChange={(e) => setCustCodeField(e.target.value.toUpperCase())}
                          placeholder="CUST-KHODR-101"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">اسم العميل / المؤسسة *</label>
                        <input
                          type="text"
                          required
                          value={custNameField}
                          onChange={(e) => setCustNameField(e.target.value)}
                          placeholder="شركة النيل اللوجستية"
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">الرقم الضريبي للعميل</label>
                        <input
                          type="text"
                          value={custTaxIdField}
                          onChange={(e) => setCustTaxIdField(e.target.value)}
                          placeholder="9 أرقام ضريبية"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">الهاتف</label>
                        <input
                          type="text"
                          value={custPhoneField}
                          onChange={(e) => setCustPhoneField(e.target.value)}
                          placeholder="010000000"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">الرصيد الافتتاحي ({config.currency})</label>
                        <input
                          type="number"
                          value={custBalanceField}
                          onChange={(e) => setCustBalanceField(Number(e.target.value))}
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5">البريد الإلكتروني للعميل</label>
                      <input
                        type="email"
                        value={custEmailField}
                        onChange={(e) => setCustEmailField(e.target.value)}
                        placeholder="billing@nile.com"
                        className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">كود المورد (Supplier Code) *</label>
                        <input
                          type="text"
                          required
                          value={suppCodeField}
                          onChange={(e) => setSuppCodeField(e.target.value.toUpperCase())}
                          placeholder="SUPP-AL-MANSOUR-201"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">اسم المورد / شركة التوريد *</label>
                        <input
                          type="text"
                          required
                          value={suppNameField}
                          onChange={(e) => setSuppNameField(e.target.value)}
                          placeholder="مجموعة المنصور لقطع الغيار"
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">الرقم الضريبي للمورد</label>
                        <input
                          type="text"
                          value={suppTaxIdField}
                          onChange={(e) => setSuppTaxIdField(e.target.value)}
                          placeholder="9 أرقام ضريبية"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">الهاتف</label>
                        <input
                          type="text"
                          value={suppPhoneField}
                          onChange={(e) => setSuppPhoneField(e.target.value)}
                          placeholder="011111111"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5">الرصيد الافتتاحي الدائن ({config.currency})</label>
                        <input
                          type="number"
                          value={suppBalanceField}
                          onChange={(e) => setSuppBalanceField(Number(e.target.value))}
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5">البريد الإلكتروني للمورد</label>
                      <input
                        type="email"
                        value={suppEmailField}
                        onChange={(e) => setSuppEmailField(e.target.value)}
                        placeholder="sales@mansour.com"
                        className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                >
                  <Plus className="h-4 w-4" />
                  {partnerType === "customer" ? "تسجيل العميل وبدء حسابه بالأستاذ" : "تسجيل المورد وفتح بطاقة حسابه الدائن"}
                </button>
              </form>
            )}

            {/* STEP 5: Items Definition */}
            {activeWizardStep === 5 && (
              <form onSubmit={handleAddItemWizard} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Package className="h-5 w-5 text-purple-400" />
                  <h4 className="text-xs font-bold text-slate-200 font-display">الخطوة 5: تعريف أصناف المنتجات وبدء مخزون المستودعات</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">رمز الصنف الفريد (SKU) *</label>
                    <input
                      type="text"
                      required
                      value={itemSkuField}
                      onChange={(e) => setItemSkuField(e.target.value.toUpperCase())}
                      placeholder="SFT-ERP-KHODR"
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">اسم الصنف / المنتج *</label>
                    <input
                      type="text"
                      required
                      value={itemNameField}
                      onChange={(e) => setItemNameField(e.target.value)}
                      placeholder="رخصة نظام مالي سحابي"
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">مستودع استلام الصنف *</label>
                    <select
                      value={itemWhField}
                      onChange={(e) => setItemWhField(e.target.value)}
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">{config.warehouse} (المخزن الافتراضي الحالي)</option>
                      {warehousesList.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">الكمية الافتتاحية</label>
                    <input
                      type="number"
                      value={itemQtyField}
                      onChange={(e) => setItemQtyField(Number(e.target.value))}
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">سعر تكلفة الوحدة ({config.currency})</label>
                    <input
                      type="number"
                      value={itemPriceField}
                      onChange={(e) => setItemPriceField(Number(e.target.value))}
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">الحد الأدنى للأمان</label>
                    <input
                      type="number"
                      value={itemMinField}
                      onChange={(e) => setItemMinField(Number(e.target.value))}
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">الفئة / التصنيف</label>
                    <input
                      type="text"
                      value={itemCatField}
                      onChange={(e) => setItemCatField(e.target.value)}
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-slate-950 font-bold text-xs py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                >
                  <Plus className="h-4 w-4" />
                  إدراج الصنف ببطاقة المخزون وتحديد الكميات
                </button>
              </form>
            )}

            {/* Stepper Footer Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <button
                type="button"
                disabled={activeWizardStep === 1}
                onClick={() => { setActiveWizardStep((prev) => (prev - 1) as any); setWizardSuccess(""); setWizardError(""); }}
                className="bg-[#151c30] hover:bg-slate-800 text-slate-300 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all border border-slate-700/50"
              >
                السابق
              </button>
              
              {activeWizardStep < 5 ? (
                <button
                  type="button"
                  onClick={() => { setActiveWizardStep((prev) => (prev + 1) as any); setWizardSuccess(""); setWizardError(""); }}
                  className="bg-[#151c30] hover:bg-slate-800 text-slate-300 hover:text-slate-100 font-bold text-xs px-5 py-2 rounded-lg cursor-pointer transition-all border border-slate-700/50"
                >
                  التالي
                </button>
              ) : (
                <div className="text-[11px] text-slate-500 font-sans italic">
                  ✨ تم اكتمال كافة خطوات التهيئة بنجاح!
                </div>
              )}
            </div>

          </div>

          {/* ==========================================================================
              MANAGEMENT LISTS & DELETION UI FOR STEPPED ENTITIES
              ========================================================================== */}
          
          {/* STEP 1 registered companies list */}
          {activeWizardStep === 1 && (
            <div className="bg-[#0d1220] border border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-400" />
                قائمة الشركات المسجلة حالياً وإدارتها ({companiesList.length})
              </h4>
              <p className="text-[11px] text-slate-400">
                يمكنك هنا مراجعة كافة الشركات وحذف غير المرغوب فيه. سيقوم الحذف بإزالة الشركة وكافة فروعها ومخازنها المرتبطة فوراً (Cascading Delete).
              </p>
              
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#141b2d] text-slate-400 border-b border-slate-800 font-display">
                    <tr>
                      <th className="p-3">كود المنشأة</th>
                      <th className="p-3">اسم الشركة</th>
                      <th className="p-3">الرقم الضريبي</th>
                      <th className="p-3">العملة</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {companiesList.map((comp: any) => {
                      const isActive = config.company === comp.name || config.company === comp.value;
                      return (
                        <tr key={comp.id} className={`hover:bg-slate-900/40 ${isActive ? 'bg-emerald-950/10' : ''}`}>
                          <td className="p-3 font-mono text-slate-300">{comp.id}</td>
                          <td className="p-3 font-bold text-slate-200">
                            {comp.name}
                            {isActive && <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/20 mr-1.5">النشطة حالياً</span>}
                          </td>
                          <td className="p-3 font-mono text-slate-400">{comp.taxId || "—"}</td>
                          <td className="p-3 text-slate-300">{comp.currency || "EGP"}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if(confirm(`هل أنت متأكد من حذف شركة "${comp.name}"؟ سيتم حذف كافة فروعها ومخازنها التابعة تلقائياً!`)) {
                                  handleDeleteCompany(comp.id);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 transition-all rounded hover:bg-red-950/20"
                              title="حذف الشركة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 2 registered branches list */}
          {activeWizardStep === 2 && (
            <div className="bg-[#0d1220] border border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                فروع المنشآت المسجلة بالنظام ({branchesList.length})
              </h4>
              <p className="text-[11px] text-slate-400">
                قائمة الفروع التابعة للشركات. حذف الفرع سيؤدي لحذف مستودعاته التابعة تلقائياً لضمان سلامة الـ RLS.
              </p>

              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#141b2d] text-slate-400 border-b border-slate-800 font-display">
                    <tr>
                      <th className="p-3">كود الفرع</th>
                      <th className="p-3">اسم الفرع</th>
                      <th className="p-3">الموقع الجغرافي</th>
                      <th className="p-3">الشركة المالكة</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {branchesList.map((branch: any) => {
                      const associatedCompanyObj = companiesList.find(c => c.id === branch.companyId);
                      const isActive = config.branch === branch.name || config.branch === branch.value;
                      return (
                        <tr key={branch.id} className={`hover:bg-slate-900/40 ${isActive ? 'bg-cyan-950/10' : ''}`}>
                          <td className="p-3 font-mono text-slate-300">{branch.id}</td>
                          <td className="p-3 font-bold text-slate-200">
                            {branch.name}
                            {isActive && <span className="bg-cyan-500/10 text-cyan-400 text-[9px] px-1.5 py-0.5 rounded border border-cyan-500/20 mr-1.5">النشط</span>}
                          </td>
                          <td className="p-3 text-slate-400">{branch.location || "—"}</td>
                          <td className="p-3 text-slate-300 text-xs font-display">{associatedCompanyObj ? associatedCompanyObj.name : branch.companyId}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف فرع "${branch.name}"؟ سيقوم ذلك بحذف الفروع والوصول المخزني التابع له!`)) {
                                  handleDeleteBranch(branch.id);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 transition-all rounded hover:bg-red-950/20"
                              title="حذف الفرع"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3 registered warehouses list */}
          {activeWizardStep === 3 && (
            <div className="bg-[#0d1220] border border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2">
                <MapPin className="h-4 w-4 text-pink-400" />
                مستودعات ومخازن التخزين القائمة ({warehousesList.length})
              </h4>
              <p className="text-[11px] text-slate-400">
                إدارة مستودعات الجرد. حذف المخزن يزيل بطاقته الاستدلالية من النظام وتوجيه حركات البضاعة المستقرة.
              </p>

              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#141b2d] text-slate-400 border-b border-slate-800 font-display">
                    <tr>
                      <th className="p-3">كود المستودع</th>
                      <th className="p-3">اسم المستودع</th>
                      <th className="p-3">العنوان اللوجستي</th>
                      <th className="p-3">الفرع المرتبط</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {warehousesList.map((wh: any) => {
                      const associatedBranchObj = branchesList.find(b => b.id === wh.branchId);
                      const isActive = config.warehouse === wh.id || config.warehouse === wh.value;
                      return (
                        <tr key={wh.id} className={`hover:bg-slate-900/40 ${isActive ? 'bg-pink-950/10' : ''}`}>
                          <td className="p-3 font-mono text-slate-300">{wh.id}</td>
                          <td className="p-3 font-bold text-slate-200">
                            {wh.name}
                            {isActive && <span className="bg-pink-500/10 text-pink-400 text-[9px] px-1.5 py-0.5 rounded border border-pink-500/20 mr-1.5">الافتراضي</span>}
                          </td>
                          <td className="p-3 text-slate-400">{wh.location || "—"}</td>
                          <td className="p-3 text-slate-300 font-display text-xs">{associatedBranchObj ? associatedBranchObj.name : wh.branchId}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف المستودع "${wh.name}"؟`)) {
                                  handleDeleteWarehouse(wh.id);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 transition-all rounded hover:bg-red-950/20"
                              title="حذف المستودع"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Business partners lists */}
          {activeWizardStep === 4 && (
            <div className="bg-[#0d1220] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-200 font-display">شركاء الأعمال النشطين المسجلين بقاعدة البيانات</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customers list */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">العملاء ({customers.length})</span>
                  <div className="max-h-[300px] overflow-y-auto border border-slate-800/80 rounded-lg divide-y divide-slate-800/50">
                    {customers.map(c => (
                      <div key={c.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-900/20">
                        <div>
                          <div className="font-bold text-slate-200">{c.name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{c.id} • الرصيد: {c.balance} {config.currency}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { if(confirm(`حذف العميل "${c.name}"؟`)) handleDeleteCustomer(c.id); }}
                          className="p-1 text-slate-500 hover:text-red-400 transition-all rounded hover:bg-red-950/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {customers.length === 0 && <p className="text-[11px] text-slate-500 p-3 italic text-center">لا يوجد عملاء حالياً</p>}
                  </div>
                </div>

                {/* Suppliers list */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">الموردين ({suppliers.length})</span>
                  <div className="max-h-[300px] overflow-y-auto border border-slate-800/80 rounded-lg divide-y divide-slate-800/50">
                    {suppliers.map(s => (
                      <div key={s.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-900/20">
                        <div>
                          <div className="font-bold text-slate-200">{s.name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{s.id} • الرصيد: {s.balance} {config.currency}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { if(confirm(`حذف المورد "${s.name}"؟`)) handleDeleteSupplier(s.id); }}
                          className="p-1 text-slate-500 hover:text-red-400 transition-all rounded hover:bg-red-950/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {suppliers.length === 0 && <p className="text-[11px] text-slate-500 p-3 italic text-center">لا يوجد موردين حالياً</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Stock list */}
          {activeWizardStep === 5 && (
            <div className="bg-[#0d1220] border border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-400" />
                دليل الأصناف وبطاقات المخزون المسجلة ({stock.length})
              </h4>
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#141b2d] text-slate-400 border-b border-slate-800 font-display">
                    <tr>
                      <th className="p-2">رمز SKU</th>
                      <th className="p-2">اسم الصنف</th>
                      <th className="p-2">الفئة</th>
                      <th className="p-2">الكمية القائمة</th>
                      <th className="p-2">سعر التكلفة</th>
                      <th className="p-2 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {stock.map(item => (
                      <tr key={item.sku} className="hover:bg-slate-900/40">
                        <td className="p-2 font-mono text-slate-300">{item.sku}</td>
                        <td className="p-2 font-bold text-slate-200">{item.name}</td>
                        <td className="p-2 text-slate-400">{item.category}</td>
                        <td className="p-2 font-mono text-slate-300">{item.quantity}</td>
                        <td className="p-2 font-mono text-slate-300">{item.unitPrice} {config.currency}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => { if(confirm(`حذف الصنف "${item.name}"؟`)) handleDeleteStockItem(item.sku); }}
                            className="p-1 text-slate-500 hover:text-red-400 transition-all rounded hover:bg-red-950/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Informative Expert Tip Sidebar */}
        <div className="space-y-4">
          
          <div className="bg-[#121824] rounded-xl border border-slate-800 p-4.5 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-400" />
              تأثير التغييرات في النظام
            </h4>
            
            <div className="space-y-3">
              <div className="bg-[#0b0f19] p-3 rounded-lg border border-slate-800/50 space-y-1">
                <span className="text-[10px] text-slate-500 font-mono block">عزل البيانات والفرع (RLS):</span>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  البيانات التي تنشئها يتم حمايتها بـ RLS. تذكر أنه لتجنب الأخطاء، قمنا بإنشاء روابط فلترة قوية تمنع اختيار فروع أو مخازن غير تابعة للمنشأة النشطة في شريط التنقل الجانبي.
                </p>
              </div>

              <div className="bg-[#0b0f19] p-3 rounded-lg border border-slate-800/50 space-y-1">
                <span className="text-[10px] text-slate-500 font-mono block">إدارة الحذف (Deletion Engine):</span>
                <div className="text-[11px] text-slate-300 font-sans leading-relaxed text-slate-400">
                  <strong className="text-red-400 block mb-1">كيفية الحذف:</strong>
                  لحذف شركة، فرع، أو مستودع، انتقل إلى خطوتها الخاصة في هذا الدليل التأسيسي، وابحث عنها في الجدول السفلي ثم اضغط على زر الحذف (<Trash2 className="h-3 w-3 inline text-red-400" />). سيقوم النظام بـ:
                  <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
                    <li>حذف فرعي متتالي للمستندات التابعة لمنع الفراغات.</li>
                    <li>تعديل الاختيار النشط بشريط التنقل تلقائياً لمنع الانهيارات البرمجية.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-4.5">
            <h4 className="text-xs font-bold text-emerald-400 font-display mb-2">💡 دليل التأسيس والتعليمات المالية</h4>
            {activeWizardStep === 1 && (
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                تأسيس الشركة في البداية هو حجر الأساس للنظام؛ حيث يقوم بإنشاء معرّف عزل مستقل (Tenant ID) في قاعدة البيانات يضمن سرية وأمان كافة العمليات والبيانات الضريبية عن أي فروع أو شركات أخرى.
              </p>
            )}
            {activeWizardStep === 2 && (
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                يمكنك ربط أكثر من فرع تشغيلي بنفس الشركة لتشجيع الرقابة المركزية؛ حيث يمنع تفعيل ميزة عزل الفروع (Branch RLS) الموظفين من تصفح حسابات الفروع الأخرى لزيادة السرية والأمان.
              </p>
            )}
            {activeWizardStep === 3 && (
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                تحديد مخازن ومستودعات مستقلة للشركة يسهل عملية تتبع حركة الأصناف وجرد البضاعة وإجراء تسويات العجز والزيادة بشكل مستقل لكل موقع جغرافي.
              </p>
            )}
            {activeWizardStep === 4 && (
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                تسجيل العملاء والموردين بالرقم الضريبي الموحد هو متطلب أساسي في الفاتورة الإلكترونية لتجنب الغرامات المالية من هيئة الضرائب. الرصيد الافتتاحي سينشئ قيداً افتتاحياً تلقائياً في حسابات الأستاذ المساعد.
              </p>
            )}
            {activeWizardStep === 5 && (
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                تعريف الأصناف مع تحديد مستودع استلام افتراضي وسعر التكلفة يمهّد لإجراء عمليات البيع والشراء بسلاسة، ويحسب قيمة المخزون بدقة متناهية تحت طريقة AVCO أو FIFO المعتمدة بوزارة المالية.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
