import React, { useState } from "react";
import { 
  Wrench, 
  Layers, 
  Play, 
  CheckCircle, 
  Plus, 
  AlertCircle, 
  ClipboardList,
  Info
} from "lucide-react";
import { BillOfMaterials, ProductionOrder, StockItem, ERPConfig, ChartOfAccount, JournalEntry } from "../types";

interface ManufacturingModuleProps {
  boms: BillOfMaterials[];
  setBoms: React.Dispatch<React.SetStateAction<BillOfMaterials[]>>;
  productionOrders: ProductionOrder[];
  setProductionOrders: React.Dispatch<React.SetStateAction<ProductionOrder[]>>;
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  accounts: ChartOfAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  config: ERPConfig;
}

export default function ManufacturingModule({
  boms = [],
  setBoms,
  productionOrders = [],
  setProductionOrders,
  stock = [],
  setStock,
  accounts = [],
  setAccounts,
  journalEntries = [],
  setJournalEntries,
  config
}: ManufacturingModuleProps) {
  const [activeTab, setActiveTab] = useState<"boms" | "orders" | "mrp" | "work-centers" | "capacity">("boms");
  const [selectedBom, setSelectedBom] = useState<BillOfMaterials | null>(boms[0] || null);

  // Advanced MRP & Routing states
  const [mrpTargetQty, setMrpTargetQty] = useState<number>(20);
  const [mrpSelectedBomId, setMrpSelectedBomId] = useState<string>(boms[0]?.id || "");
  
  const [workCenters, setWorkCenters] = useState<any[]>([
    { id: "WC-001", name: "مركز هندسة التراخيص والرقابة", capacityHoursDaily: 16, activeLoadPercent: 65, costPerHour: 150 },
    { id: "WC-002", name: "مركز الفحص الفني والاختبار المالي", capacityHoursDaily: 8, activeLoadPercent: 80, costPerHour: 220 }
  ]);

  const [routings, setRoutings] = useState<any[]>([
    { id: "RT-001", bomId: "BOM-001", stepNumber: 1, operationName: "توليد الرموز المشفرة", workCenterId: "WC-001", runTimeMinutes: 15 },
    { id: "RT-002", bomId: "BOM-001", stepNumber: 2, operationName: "الفحص الفني والأمان الضريبي", workCenterId: "WC-002", runTimeMinutes: 10 }
  ]);

  // New production order state
  const [orderQty, setOrderQty] = useState(5);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleCreateProductionOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    if (!selectedBom) return;

    const payload = {
      id: `PRD-ORD-00${productionOrders.length + 1}`,
      bomId: selectedBom.id,
      productName: selectedBom.productName,
      quantity: orderQty,
      status: "In Progress" as const,
      startDate: new Date().toISOString().split("T")[0]
    };

    fetch("/api/erp/production-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.error || "فشل إرسال أمر الإنتاج للخادم.");
          });
        }
        return res.json();
      })
      .then(resData => {
        if (resData.success) {
          // Sync frontend state with updated values returned from the secure DB backend
          setStock(resData.stock);
          
          // Complete order details from backend
          const completedOrder: ProductionOrder = {
            ...payload,
            status: "Completed",
            completionDate: new Date().toISOString().split("T")[0]
          };
          setProductionOrders([completedOrder, ...productionOrders]);
          
          if (resData.journal) {
            setJournalEntries([resData.journal, ...journalEntries]);
            
            // Adjust accounts balances locally from journal entry lines to avoid stale visual state before full refresh
            const updatedAccounts = accounts.map(acc => {
              let balanceChange = 0;
              resData.journal.lines.forEach((line: any) => {
                if (line.accountCode === acc.code) {
                  if (acc.type === "Asset" || acc.type === "Expense") {
                    balanceChange += (Number(line.debit) || 0) - (Number(line.credit) || 0);
                  } else {
                    balanceChange += (Number(line.credit) || 0) - (Number(line.debit) || 0);
                  }
                }
              });
              return { ...acc, balance: acc.balance + balanceChange };
            });
            setAccounts(updatedAccounts);
          }
          
          setSuccessMsg(`[استجابة الخادم الحقيقية] تم ترحيل واستهلاك المواد وتوليد القيد المحاسبي (${resData.journal?.id || "تلقائي"}) بنجاح للمنتج التام (${selectedBom.productName}) بمقدار ${orderQty} وحدات!`);
        }
      })
      .catch(err => {
        setFormError(err.message);
      });
  };

  const handleCompleteProductionOrder = (orderId: string) => {
    // Complete the production order and add the finished SKU product into inventory!
    const targetOrder = productionOrders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const targetBom = boms.find(b => b.id === targetOrder.bomId);
    if (!targetBom) return;

    // Calculate costs
    const componentsCost = targetBom.components.reduce((sum, c) => {
      const itemPrice = stock.find(st => st.sku === c.sku)?.unitPrice || 100;
      return sum + (c.quantityRequired * itemPrice * targetOrder.quantity);
    }, 0);
    const totalLaborCost = targetBom.laborCost * targetOrder.quantity;
    const totalManufacturedCost = componentsCost + totalLaborCost;

    // Post double-entry journal entry:
    // Debit "10400" (المخزون - لزيادة مخزون المنتج التام) with totalManufacturedCost
    // Credit "10400" (المخزون - لتخفيض مخزون المواد الخام) with componentsCost
    // Credit "20200" (رواتب مستحقة - لتسجيل تكلفة العمالة) with totalLaborCost
    const journalLines = [
      {
        accountCode: "10400",
        accountName: "المخزون",
        debit: totalManufacturedCost,
        credit: 0
      },
      {
        accountCode: "10400",
        accountName: "المخزون",
        debit: 0,
        credit: componentsCost
      },
      {
        accountCode: "20200",
        accountName: "الأجور والرواتب المستحقة",
        debit: 0,
        credit: totalLaborCost
      }
    ];

    const newJournal: JournalEntry = {
      id: `JE-MFG-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split("T")[0],
      description: `ترحيل تكلفة تصنيع المنتج التام (${targetBom.productName}) بمقدار ${targetOrder.quantity} وحدات شاملة تكلفة المواد والعمالة المباشرة`,
      reference: targetOrder.id,
      lines: journalLines,
      status: "Posted",
      costCenter: "CC-PROD",
      profitCenter: "PC-SFT",
      creator: "محمود العربي",
      approvedBy: "مهندس التصنيع المعتمد"
    };

    // Update Accounts balances
    const updatedAccounts = accounts.map(acc => {
      let balanceChange = 0;
      journalLines.forEach(line => {
        if (line.accountCode === acc.code) {
          if (acc.type === "Asset" || acc.type === "Expense") {
            balanceChange += (line.debit - line.credit);
          } else {
            balanceChange += (line.credit - line.debit);
          }
        }
      });
      return { ...acc, balance: acc.balance + balanceChange };
    });

    // Update order status
    const updatedOrders = productionOrders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "Completed" as const,
          completionDate: new Date().toISOString().split("T")[0]
        };
      }
      return o;
    });

    // Add finished product SKU into active warehouse stock!
    let found = false;
    const updatedStock = stock.map(s => {
      if (s.sku === targetBom.productSku) {
        found = true;
        return { ...s, quantity: s.quantity + targetOrder.quantity };
      }
      return s;
    });

    // If finished SKU doesn't exist, register it
    if (!found) {
      updatedStock.push({
        sku: targetBom.productSku,
        name: targetBom.productName,
        warehouseId: config.warehouse, // destination warehouse
        quantity: targetOrder.quantity,
        unitPrice: targetBom.laborCost + targetBom.components.reduce((sum, c) => {
          const itemPrice = stock.find(st => st.sku === c.sku)?.unitPrice || 100;
          return sum + (c.quantityRequired * itemPrice);
        }, 0),
        minLevel: 5
      });
    }

    setStock(updatedStock);
    setProductionOrders(updatedOrders);
    setAccounts(updatedAccounts);
    setJournalEntries([newJournal, ...journalEntries]);
    setSuccessMsg(`نجح تجميع المنتج التام وتوليد القيد المالي! تم نقل تكلفة التصنيع البالغة ${totalManufacturedCost.toLocaleString()} ${config.currency} لحساب الأستاذ وتحديث مستويات المخزون للمنتج التام.`);
  };

  return (
    <div className="space-y-6 text-right" id="manufacturing-engine-container" dir="rtl">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 font-sans border border-amber-500/30">
            تخطيط متطلبات المواد (MRP) نشط
          </span>
          <h2 className="text-2xl font-display font-bold text-slate-100 mt-1">محرك التصنيع والإنتاج (MRP)</h2>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            تعديل وإنشاء قوائم كميات المواد (BOM)، جدولة وإطلاق عمليات خطوط الإنتاج، مع تتبع ومطابقة استهلاك المخزون والمواد الخام لحظياً.
          </p>
        </div>

        {/* Switches */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#121829] border border-slate-800 p-1.5 rounded-lg self-start">
          <button
            onClick={() => setActiveTab("boms")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "boms" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" /> قوائم كميات المواد (BOM)
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "orders" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> أوامر خطوط الإنتاج
          </button>
          <button
            onClick={() => setActiveTab("mrp")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "mrp" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            تخطيط الاحتياجات (MRP)
          </button>
          <button
            onClick={() => setActiveTab("work-centers")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "work-centers" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            مراكز ومسارات العمل
          </button>
          <button
            onClick={() => setActiveTab("capacity")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "capacity" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            الطاقة والتكاليف
          </button>
        </div>
      </div>

      {/* TAB 1: BOMS */}
      {activeTab === "boms" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* BOM Select list */}
          <div className="lg:col-span-4 bg-[#0f1425] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl text-right">
            <div className="p-4.5 border-b border-slate-800/80">
              <h3 className="font-display font-bold text-slate-200 text-sm">صيغ ومواصفات تركيب المنتجات</h3>
            </div>
            <div className="divide-y divide-slate-800/60">
              {boms.map(b => {
                const isSelected = selectedBom?.id === b.id;
                return (
                  <div 
                    key={b.id} 
                    onClick={() => setSelectedBom(b)}
                    className={`p-4 hover:bg-slate-900/20 cursor-pointer transition-all ${
                      isSelected ? "bg-amber-500/5 border-r-2 border-amber-500" : ""
                    }`}
                  >
                    <h4 className="text-xs font-bold font-mono text-amber-400">{b.id}</h4>
                    <p className="text-sm font-bold text-slate-200 mt-0.5">{b.productName}</p>
                    <span className="text-[10px] font-mono text-slate-500 block mt-1">الرمز المستهدف: {b.productSku}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOM Details / Start Order */}
          {selectedBom ? (
            <div className="lg:col-span-8 space-y-6">
              {/* Formula Table */}
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5.5 space-y-4 shadow-xl">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-200">{selectedBom.productName} - المواصفات والتركيب الفني</h3>
                  <p className="text-xs text-slate-400 mt-1 font-sans">المكونات المطلوبة وتكلفة أجور التجميع والعمالة اللازمة لإنتاج وحدة واحدة تامة الصنع.</p>
                </div>

                <div className="divide-y divide-slate-800/60 text-xs">
                  {selectedBom.components.map((comp, idx) => {
                    const currentStock = stock.find(s => s.sku === comp.sku)?.quantity || 0;
                    return (
                      <div key={idx} className="py-3 flex items-center justify-between">
                        <div>
                          <strong className="text-slate-300 font-bold block">{comp.name}</strong>
                          <span className="text-[10px] font-mono text-slate-500">{comp.sku}</span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="text-slate-400 block font-sans">الكمية المطلوبة للفاتورة: <strong>{comp.quantityRequired} وحدات</strong></span>
                          <span className={`text-[10px] block font-sans ${
                            currentStock < comp.quantityRequired ? "text-rose-400 font-bold" : "text-emerald-400"
                          }`}>
                            الرصيد المتاح بالمخزن: {currentStock} وحدات
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Labor Costs */}
                  <div className="py-3 flex items-center justify-between font-mono">
                    <span className="text-slate-400 font-bold font-sans">تكلفة عمالة التجميع المخصصة:</span>
                    <strong className="text-slate-200">{selectedBom.laborCost.toLocaleString()} {config.currency}</strong>
                  </div>
                </div>
              </div>

              {/* Order form */}
              <form onSubmit={handleCreateProductionOrder} className="bg-[#0f1425] border border-slate-800 rounded-xl p-5.5 space-y-4">
                <h4 className="font-display font-bold text-sm text-slate-200">إطلاق أمر إنتاج جديد</h4>
                
                {formError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex gap-2 items-center font-sans">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold font-sans">
                    {successMsg}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 text-xs font-mono">
                  <div className="flex-1">
                    <label className="text-slate-400 block mb-1.5 font-sans font-bold">حجم دفعة الإنتاج المطلوبة</label>
                    <input
                      type="number"
                      value={orderQty}
                      onChange={(e) => setOrderQty(Number(e.target.value) || 1)}
                      className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none font-mono text-right"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-sans text-xs px-5 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/10"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> إطلاق عملية التصنيع والتشغيل
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="lg:col-span-8 bg-[#0f1425] border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm font-sans">
              يرجى اختيار منتج وصيغة تصنيع من القائمة الجانبية اليمنى.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRODUCTION ORDERS */}
      {activeTab === "orders" && (
        <div className="bg-[#0f1425] border border-slate-800 rounded-xl overflow-hidden shadow-xl animate-fadeIn text-right">
          <div className="p-4.5 border-b border-slate-800/80">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-amber-400" /> أوامر التشغيل الجارية وسجل عمليات الإنتاج
            </h3>
          </div>

          <div className="overflow-x-auto text-xs">
            {productionOrders.length > 0 ? (
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-slate-400 font-sans border-b border-slate-800">
                    <th className="p-4 font-bold text-right">رقم الدفعة</th>
                    <th className="p-4 font-bold text-right">المنتج المستهدف</th>
                    <th className="p-4 font-bold text-left">كمية الدفعة</th>
                    <th className="p-4 font-bold text-right">تاريخ البدء والتشغيل</th>
                    <th className="p-4 font-bold text-right">حالة التنفيذ والتقدم</th>
                    <th className="p-4 font-bold text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {productionOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-900/10 transition-all">
                      <td className="p-4 font-bold text-amber-400 text-right">{order.id}</td>
                      <td className="p-4 font-sans text-slate-200 font-semibold text-right">{order.productName}</td>
                      <td className="p-4 text-left font-bold text-slate-100">{order.quantity}</td>
                      <td className="p-4 text-slate-400 text-right">{order.startDate}</td>
                      <td className="p-4 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-sans font-bold ${
                          order.status === "Completed" 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : "bg-cyan-500/10 text-cyan-400 animate-pulse"
                        }`}>
                          {order.status === "Completed" ? "مكتمل وتام الصنع" : "قيد التشغيل والتصنيع"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {order.status === "In Progress" ? (
                          <button
                            onClick={() => handleCompleteProductionOrder(order.id)}
                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-semibold font-sans text-[11px] px-3 py-1 rounded border border-emerald-500/20 transition-all"
                          >
                            إتمام وتوريد المنتج للمخازن
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1 font-sans font-bold">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> تم التوريد ({order.completionDate})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center p-8 text-slate-500 font-sans">
                لا توجد أوامر إنتاج جارية حالياً. يمكنك بدء أمر إنتاج جديد من علامة تبويب قوائم كميات المواد (BOM).
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MRP (Material Requirements Planning) */}
      {activeTab === "mrp" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="font-display font-bold text-slate-200 text-sm">🔮 محرك تخطيط متطلبات المواد والطلب الاستباقي (MRP Engine)</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                أدخل حجم الطلب/المبيعات المتوقع لحساب الكميات المطلوبة بدقة من المواد الخام وجدولة المشتريات الاستباقية لتفادي نفاد المخزون.
              </p>
            </div>

            {/* Selector and Target Input */}
            <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800/80 flex flex-col md:flex-row items-end gap-4 text-right">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-1">حدد قائمة المواد المستهدفة (BOM)</label>
                <select
                  value={mrpSelectedBomId}
                  onChange={(e) => setMrpSelectedBomId(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none"
                >
                  {boms.map(b => (
                    <option key={b.id} value={b.id}>{b.productName} ({b.id})</option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-44">
                <label className="text-[10px] text-slate-400 block mb-1">الكمية المتوقع تصنيعها</label>
                <input
                  type="number"
                  value={mrpTargetQty}
                  onChange={(e) => setMrpTargetQty(Number(e.target.value))}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none font-mono text-left"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    alert("تم تشغيل محرك حساب تخطيط الاحتياجات (MRP) بنجاح!");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded transition-all cursor-pointer"
                >
                  محاكاة وحساب تخطيط الاحتياجات (Run MRP)
                </button>
              </div>
            </div>

            {/* Requirements output table */}
            <div className="overflow-x-auto pt-2">
              <h4 className="text-xs font-bold text-slate-300 font-display mb-3">📋 نتيجة فحص العجز والوفرة للمواد الأولية:</h4>
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-sans">
                    <th className="p-3">رمز المادة (SKU)</th>
                    <th className="p-3">المكون المطلوب</th>
                    <th className="p-3 text-center">الكمية لكل وحدة</th>
                    <th className="p-3 text-center">إجمالي المطلوب للدفعة ({mrpTargetQty})</th>
                    <th className="p-3 text-center">الرصيد المتاح بالمخزن حالياً</th>
                    <th className="p-3 text-center">العجز / الفائض</th>
                    <th className="p-3 text-center">حالة الجاهزية اللوجستية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {boms.find(b => b.id === mrpSelectedBomId)?.components.map(comp => {
                    const totalRequired = comp.quantityRequired * mrpTargetQty;
                    const stockItem = stock.find(s => s.sku === comp.sku);
                    const stockQty = stockItem ? stockItem.quantity : 0;
                    const variance = stockQty - totalRequired;
                    const hasShortage = variance < 0;

                    return (
                      <tr key={comp.sku} className="hover:bg-slate-900/10 font-sans">
                        <td className="p-3 font-mono text-amber-400">{comp.sku}</td>
                        <td className="p-3 text-slate-200 font-bold">{comp.name}</td>
                        <td className="p-3 text-center font-mono text-slate-400">{comp.quantityRequired}</td>
                        <td className="p-3 text-center font-mono text-slate-100 font-semibold">{totalRequired}</td>
                        <td className="p-3 text-center font-mono text-slate-400">{stockQty}</td>
                        <td className={`p-3 text-center font-mono font-bold ${hasShortage ? "text-rose-400" : "text-emerald-400"}`}>
                          {variance > 0 ? `+${variance}` : variance}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            hasShortage ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {hasShortage ? "⚠️ عجز بالرصيد" : "✓ آمن وجاهز"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WORK CENTERS & ROUTINGS */}
      {activeTab === "work-centers" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fadeIn">
          
          {/* Work Centers */}
          <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 space-y-4 text-right">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="font-display font-bold text-slate-200 text-sm">🏭 مراكز العمل التشغيلية وخطوط الإنتاج (Work Centers)</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">مستويات الطاقة الاستيعابية والتحميل اليومي لمعدات تصنيع التراخيص:</p>
            </div>

            <div className="space-y-4">
              {workCenters.map(wc => (
                <div key={wc.id} className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <strong className="text-slate-200">{wc.name}</strong>
                    <span className="text-[10px] text-slate-500 font-mono">كود المركز: {wc.id}</span>
                  </div>

                  {/* Load bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-sans">
                      <span>التحميل والضغط الحالي:</span>
                      <strong className={wc.activeLoadPercent > 75 ? "text-amber-400" : "text-emerald-400"}>{wc.activeLoadPercent}%</strong>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${wc.activeLoadPercent}%` }}
                        className={`h-full rounded-full ${
                          wc.activeLoadPercent > 75 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-sans text-slate-500 pt-1">
                    <div>الطاقة اليومية المتاحة: <strong className="text-slate-300 font-mono">{wc.capacityHoursDaily} ساعة</strong></div>
                    <div className="text-left">معدل التكلفة التشغيلية/ساعة: <strong className="text-slate-300 font-mono">{wc.costPerHour} {config.currency}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Routings */}
          <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 space-y-4 text-right">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="font-display font-bold text-slate-200 text-sm">🔄 مسارات وعمليات مراحل التصنيع بالترتيب (Routing Operations)</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">الخطوات الزمنية اللازمة لإنهاء دورة التجميع والتراخيص بمركز العمل:</p>
            </div>

            <div className="relative border-r-2 border-emerald-500/30 pr-5 space-y-4">
              {routings.map(rt => (
                <div key={rt.id} className="relative space-y-1 text-xs font-sans">
                  {/* Decorative timeline node */}
                  <span className="absolute -right-[25px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0b0f19]" />
                  
                  <div className="flex justify-between items-center text-slate-400">
                    <strong className="text-slate-200">الخطوة {rt.stepNumber}: {rt.operationName}</strong>
                    <span className="font-mono text-[10px] text-slate-500">{rt.id}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    مركز العمل: {rt.workCenterId} | مدة التشغيل التقريبية: <strong className="text-slate-300 font-mono">{rt.runTimeMinutes} دقيقة</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: CAPACITY & COSTING */}
      {activeTab === "capacity" && (
        <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 text-right space-y-4 animate-fadeIn">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="font-display font-bold text-slate-200 text-sm">📊 هيكل وهوامش تكاليف المنتجات الصناعية (Production Costing Breakdown)</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">مطابقة التكلفة الفعلية للمنتجات التامة لتأكيد الكفاءة وهوامش الأرباح الإجمالية:</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {boms.map(bom => {
              // Calculate raw material estimate
              const matCost = bom.components.reduce((sum, c) => {
                const itemPrice = stock.find(st => st.sku === c.sku)?.unitPrice || 100;
                return sum + (c.quantityRequired * itemPrice);
              }, 0);
              const directLabor = 400; // Constant simulation
              const overhead = 150; // Constant simulation
              const totalEstimate = matCost + directLabor + overhead;

              return (
                <div key={bom.id} className="bg-[#0f1425] border border-slate-800 p-4 rounded-xl space-y-3 shadow-md">
                  <span className="text-[10px] text-slate-500 block font-mono">كود الدليل: {bom.id}</span>
                  <h4 className="font-display font-bold text-slate-200 text-sm">{bom.productName}</h4>
                  
                  <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px] font-sans text-slate-400">
                    <div className="flex justify-between">
                      <span>تكلفة الخامات المباشرة:</span>
                      <strong className="text-slate-200 font-mono">{matCost.toLocaleString()} {config.currency}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>تكلفة العمالة المباشرة:</span>
                      <strong className="text-slate-200 font-mono">{directLabor} {config.currency}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>مصروفات صناعية غير مباشرة (Overhead):</span>
                      <strong className="text-slate-200 font-mono">{overhead} {config.currency}</strong>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-800/80 font-display font-bold text-xs">
                      <span className="text-emerald-400">إجمالي التكلفة المقدرة:</span>
                      <strong className="text-emerald-400 font-mono">{totalEstimate.toLocaleString()} {config.currency}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
