import React, { useState } from "react";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle, 
  CreditCard, 
  Smartphone, 
  Coins, 
  Percent,
  Calculator
} from "lucide-react";
import { StockItem, POSSale, POSSaleItem, ChartOfAccount, JournalEntry, ERPConfig } from "../types";

interface POSModuleProps {
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  accounts: ChartOfAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  config: ERPConfig;
}

export default function POSModule({
  stock = [],
  setStock,
  accounts = [],
  setAccounts,
  journalEntries = [],
  setJournalEntries,
  config
}: POSModuleProps) {
  const [cart, setCart] = useState<{ item: StockItem; quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Card" | "Mobile Wallet" | "Point Redemption" | "نقدي" | "بطاقة" | "محفظة" | "نقاط">("نقدي");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");

  const handleAddToCart = (item: StockItem) => {
    if (item.quantity <= 0) return;
    
    const existingIndex = cart.findIndex(c => c.item.sku === item.sku);
    if (existingIndex > -1) {
      if (cart[existingIndex].quantity < item.quantity) {
        const updated = [...cart];
        updated[existingIndex].quantity += 1;
        setCart(updated);
      }
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
    setCheckoutSuccess("");
  };

  const handleRemoveFromCart = (sku: string) => {
    const existingIndex = cart.findIndex(c => c.item.sku === sku);
    if (existingIndex > -1) {
      const updated = [...cart];
      if (updated[existingIndex].quantity > 1) {
        updated[existingIndex].quantity -= 1;
        setCart(updated);
      } else {
        setCart(cart.filter(c => c.item.sku !== sku));
      }
    }
  };

  const handleDeleteFromCart = (sku: string) => {
    setCart(cart.filter(c => c.item.sku !== sku));
  };

  // Tax and Total calculations
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, c) => sum + (c.item.unitPrice * c.quantity), 0);
    const vatAmount = subtotal * 0.14; // Egypt standard 14% VAT
    const withholdingTax = subtotal * 0.01; // 1% withholding tax on supplies/finished goods
    const total = subtotal + vatAmount - withholdingTax;

    return { subtotal, vatAmount, withholdingTax, total };
  };

  const { subtotal, vatAmount, withholdingTax, total } = calculateTotals();

  const handleCheckout = () => {
    if (cart.length === 0) return;

    // Deduct stock levels in physical inventory
    const updatedStock = stock.map(s => {
      const cartItem = cart.find(c => c.item.sku === s.sku);
      if (cartItem) {
        return { ...s, quantity: Math.max(0, s.quantity - cartItem.quantity) };
      }
      return s;
    });

    // Automatically trigger a double-entry journal entry inside General Ledger!
    // Debit CIB Bank (Asset increase) with the net settlement.
    // Debit Withholding Tax (WHT Asset / Form 41 tracking).
    // Credit Enterprise Software License / Product Sales (Revenue increase) with the subtotal.
    // Credit VAT Payable (Liability increase) with the 14% VAT.
    const journalLines = [
      { accountCode: "10100", accountName: "CIB Bank - EGP Corporate", debit: total, credit: 0 },
      { accountCode: "22100", accountName: "Withholding Tax Liability (Form 41)", debit: withholdingTax, credit: 0 },
      { accountCode: "40100", accountName: "Enterprise Software License Sales", debit: 0, credit: subtotal },
      { accountCode: "22000", accountName: "Egyptian Tax Authority - VAT Payable (14%)", debit: 0, credit: vatAmount }
    ];

    const newJournal: JournalEntry = {
      id: `JE-2026-POS00${journalEntries.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      description: `مبيعات شاشة نقاط البيع POS: ${cart.map(c => `${c.quantity}x ${c.item.sku}`).join(", ")}`,
      reference: `POS-${Date.now().toString().slice(-6)}`,
      lines: journalLines,
      status: "Posted",
      costCenter: "CC-INF",
      profitCenter: "PC-SFT",
      creator: "Apex POS Terminal Operator",
      approvedBy: "POS Audit Controller"
    };

    // Update Accounts state balances
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

    // Post state updates
    setStock(updatedStock);
    setAccounts(updatedAccounts);
    setJournalEntries([newJournal, ...journalEntries]);
    setCart([]);
    setCheckoutSuccess(`تمت عملية البيع بنجاح! تم ترحيل القيد بقيمة ${total.toLocaleString()} ${config.currency} إلى دفتر الأستاذ العام وتحديث أرصدة الحسابات الضريبية والبنكية.`);
  };

  return (
    <div className="space-y-6 text-right" id="pos-module-container" dir="rtl">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-sans border border-emerald-500/30">
            جهاز نقاط بيع متكامل محاسبياً ومعزز ضريبياً
          </span>
          <h2 className="text-2xl font-display font-bold text-slate-100 mt-1">شاشة نقاط البيع والمبيعات (POS)</h2>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            تسجيل مبيعات المنتجات والبرمجيات، حساب ضريبة القيمة المضافة المصرية 14% وضريبة الخصم من المنبع نموذج 41، وترحيل قيود اليومية آلياً.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Products Catalogue */}
        <div className="lg:col-span-7 bg-[#0f1425] border border-slate-800/80 rounded-xl p-5 shadow-xl space-y-4 text-right">
          <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
            <Coins className="h-4.5 w-4.5 text-emerald-400" /> دليل المنتجات والبرمجيات والسلع الجاهزة
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pl-1">
            {stock.map(item => {
              const isOutOfStock = item.quantity <= 0;
              return (
                <div 
                  key={item.sku} 
                  onClick={() => !isOutOfStock && handleAddToCart(item)}
                  className={`p-4 bg-slate-900/40 border border-slate-800 rounded-xl hover:border-emerald-500/50 cursor-pointer transition-all flex flex-col justify-between space-y-3 text-right ${
                    isOutOfStock ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-400">{item.sku}</span>
                    <h4 className="text-sm font-bold text-slate-200">{item.name}</h4>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs font-mono">
                    <span className="text-slate-500 font-sans">المتاح بالمخازن: <strong className="text-slate-300">{item.quantity}</strong></span>
                    <strong className="text-slate-200">{item.unitPrice.toLocaleString()} {config.currency}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sales Basket / Cart */}
        <div className="lg:col-span-5 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-6 h-[510px] overflow-y-auto text-right">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                <ShoppingCart className="h-4.5 w-4.5 text-cyan-400" /> سلة مبيعات نقطة البيع
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{cart.length} سلع فريدة</span>
            </div>

            {checkoutSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold leading-relaxed font-sans">
                {checkoutSuccess}
              </div>
            )}

            {/* Cart list */}
            {cart.length > 0 ? (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pl-1">
                {cart.map(c => (
                  <div key={c.item.sku} className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-1 truncate max-w-[150px] text-right">
                      <strong className="text-slate-200 font-bold block">{c.item.name}</strong>
                      <span className="text-[10px] font-mono text-slate-500 block">{c.item.sku}</span>
                    </div>
                    
                    {/* Qty controls */}
                    <div className="flex items-center gap-2.5">
                      <button 
                        onClick={() => handleRemoveFromCart(c.item.sku)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-all"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-mono font-bold text-slate-200 w-4 text-center">{c.quantity}</span>
                      <button 
                        onClick={() => handleAddToCart(c.item)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-all"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteFromCart(c.item.sku)}
                        className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 text-slate-500 text-xs font-sans">
                سلة البيع فارغة حالياً. أضف سلعاً أو برمجيات من كتالوج المنتجات لبدء الفاتورة.
              </div>
            )}
          </div>

          {/* Checkout Block */}
          {cart.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-800 text-right">
              {/* Payment Methods */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-sans font-bold text-slate-400 uppercase block">طريقة السداد وقناة الدفع</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { key: "Cash", val: "نقدي" },
                    { key: "Card", val: "بطاقة" },
                    { key: "Mobile Wallet", val: "محفظة" },
                    { key: "Point Redemption", val: "نقاط" }
                  ].map(method => (
                    <button
                      key={method.key}
                      onClick={() => setPaymentMethod(method.key as any)}
                      className={`py-2 rounded-lg text-[9px] font-bold transition-all border ${
                        paymentMethod === method.key 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40" 
                          : "bg-[#141b2d] text-slate-400 border-slate-800 hover:text-slate-300"
                      }`}
                    >
                      {method.val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-900/60 p-3.5 border border-slate-800 rounded-lg space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">الإجمالي الفرعي:</span>
                  <span className="text-slate-300">{subtotal.toLocaleString()} {config.currency}</span>
                </div>
                <div className="flex justify-between text-rose-400/90">
                  <span className="text-slate-500 font-sans">ضريبة القيمة المضافة (14%):</span>
                  <span>+ {vatAmount.toLocaleString()} {config.currency}</span>
                </div>
                <div className="flex justify-between text-cyan-400/90 border-b border-slate-800/60 pb-2">
                  <span className="text-slate-500 font-sans">خصم من المنبع نموذج 41 (1%):</span>
                  <span>- {withholdingTax.toLocaleString()} {config.currency}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-emerald-400">
                  <span className="font-sans">صافي القيمة المستحقة:</span>
                  <span>{total.toLocaleString()} {config.currency}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/10 transition-all text-xs flex items-center justify-center gap-1.5 font-sans"
              >
                <Calculator className="h-4 w-4" /> إتمام وتأكيد عملية البيع وترحيلها
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
