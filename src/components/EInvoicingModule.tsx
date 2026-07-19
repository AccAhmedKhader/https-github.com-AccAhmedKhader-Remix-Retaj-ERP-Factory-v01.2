import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Activity, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Wifi, 
  Send, 
  Key, 
  Download, 
  RefreshCw, 
  FileCode, 
  Terminal, 
  Lock, 
  Settings,
  HelpCircle,
  Copy,
  Check,
  Building2,
  FileCheck2,
  CloudLightning,
  AlertTriangle
} from "lucide-react";
import { SalesInvoice, ERPConfig } from "../types";
import { getThemeClass } from "./Sidebar";

interface EInvoicingModuleProps {
  salesInvoices: SalesInvoice[];
  setSalesInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  config: ERPConfig;
}

interface ComplianceStatus {
  invoiceId: string;
  status: "Draft" | "Approved" | "Rejected" | "Pending";
  uuid: string;
  submissionDate: string;
  hash: string;
  signature: string;
  errorMsg?: string;
}

export default function EInvoicingModule({
  salesInvoices = [],
  setSalesInvoices,
  config
}: EInvoicingModuleProps) {
  const clr = getThemeClass(config.theme);

  // Connection settings
  const [authorityType, setAuthorityType] = useState<"ETA" | "ZATCA">("ETA"); // ETA = Egypt, ZATCA = Saudi
  const [environment, setEnvironment] = useState<"Sandbox" | "Production">("Sandbox");
  const [clientId, setClientId] = useState("api-client-apex-82910398");
  const [clientSecret, setClientSecret] = useState("sec_9201a39281bc88392efab");
  const [certificateUploaded, setCertificateUploaded] = useState(true);
  const [certificateName, setCertificateName] = useState("Apex_Enterprise_Sign_2026.pfx");
  
  // Local submission states
  const [complianceStatuses, setComplianceStatuses] = useState<Record<string, ComplianceStatus>>({
    "SINV-2026-001": {
      invoiceId: "SINV-2026-001",
      status: "Approved",
      uuid: "ETA-6f9c9b58-e4b2-4d2c-8067-27b6f63df8a2",
      submissionDate: "2026-07-03T11:45:12Z",
      hash: "8f5a11c210d322ef8ac5e2e8bfae8b15a6e29712a14e13da9c21ef882103f19e",
      signature: "MIIEAYYJKoZIhvcNAQcCoIIE2DCCBNQCAQExDzANBglghkgBZQMEAgEFADCCAbQGCSqGSIb3DQEHAaCCAaUEggGlMIIBoQIBADCBtDCBrTELMAkGA1UEBhMC"
    }
  });

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    salesInvoices[0]?.id || null
  );

  // Interactive submission/signing animation states
  const [activeStep, setActiveStep] = useState<"idle" | "canonicalizing" | "hashing" | "signing" | "sending" | "success">("idle");
  const [signingLog, setSigningLog] = useState<string[]>([]);
  const [showXmlView, setShowXmlView] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState(false);

  const selectedInvoice = salesInvoices.find(inv => inv.id === selectedInvoiceId);
  const selectedStatus = selectedInvoiceId ? complianceStatuses[selectedInvoiceId] : null;

  // XML helper generator based on active invoice details (UBL 2.1 Compliance)
  const generateUblXml = (invoice: SalesInvoice) => {
    const isETA = authorityType === "ETA";
    const invoiceType = isETA ? "Invoice-ETA-v1.0" : "Invoice-ZATCA-Phase2";
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
            <ext:ExtensionContent>
                <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2">
                    <sac:SignatureInformation xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureInformationComponents-2">
                        <cbc:ID>urn:uuid:apex-sig-1039820</cbc:ID>
                        <ds:Signature Id="signature-1" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
                            <ds:SignedInfo>
                                <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
                                <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
                                <ds:Reference URI="">
                                    <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                                    <ds:DigestValue>${selectedStatus?.hash || "8f5a11c210d322ef8ac5e2e8bfae8b15a6e2..."}</ds:DigestValue>
                                </ds:Reference>
                            </ds:SignedInfo>
                            <ds:SignatureValue>${selectedStatus?.signature || "MIIEAYYJKoZIhvcNAQcCoIIE2DCCBNQCAQEx..."}</ds:SignatureValue>
                        </ds:Signature>
                    </sac:SignatureInformation>
                </sig:UBLDocumentSignatures>
            </ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>
    <cbc:ProfileID>urn:fdc:peppol.eu:poacc:bis:v3</cbc:ProfileID>
    <cbc:ID>${invoice.id}</cbc:ID>
    <cbc:UUID>${selectedStatus?.uuid || "00000000-0000-0000-0000-000000000000"}</cbc:UUID>
    <cbc:IssueDate>${invoice.date}</cbc:IssueDate>
    <cbc:IssueTime>08:30:00Z</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${invoiceType}">388</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>${config.currency}</cbc:DocumentCurrencyCode>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">1029302931</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${config.company === "Apex Levant Corp" ? "Apex Levant Corp Ltd" : config.company}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>Tahrir Square</cbc:StreetName>
                <cbc:BuildingNumber>12</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>Downtown</cbc:CitySubdivisionName>
                <cbc:CityName>Cairo</cbc:CityName>
                <cac:Country>
                    <cbc:IdentificationCode>EG</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>382-901-291</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${invoice.customerName}</cbc:Name>
            </cac:PartyName>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>123-456-789</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${config.currency}">${invoice.vatAmount}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${config.currency}">${invoice.subtotal}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${config.currency}">${invoice.vatAmount}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>14.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${config.currency}">${invoice.subtotal}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="${config.currency}">${invoice.subtotal}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="${config.currency}">${invoice.subtotal + invoice.vatAmount}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="${config.currency}">0.00</cbc:AllowanceTotalAmount>
        <cbc:PrepaidAmount currencyID="${config.currency}">0.00</cbc:PrepaidAmount>
        <cbc:PayableRoundingAmount currencyID="${config.currency}">0.00</cbc:PayableRoundingAmount>
        <cbc:PayableAmount currencyID="${config.currency}">${invoice.total}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    ${invoice.items.map((item, index) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${config.currency}">${item.total}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Name>${item.name}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>14.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${config.currency}">${item.price}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`).join("")}
</Invoice>`;
  };

  const handleCopyXml = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText("xml");
    setTimeout(() => setCopiedText(null), 3000);
  };

  // Live simulation of signing a sales invoice
  const triggerCryptographicSubmission = async () => {
    if (!selectedInvoiceId || !selectedInvoice) return;

    setActiveStep("canonicalizing");
    setSigningLog(["[INFO] بدء تهيئة قيد الإرسال والتوقيع الإلكتروني..."]);
    
    await new Promise(r => setTimeout(r, 800));
    setSigningLog(prev => [
      ...prev,
      `[INFO] تم استخراج بيانات الفاتورة [${selectedInvoice.id}] وعناصرها السلعية.`,
      `[INFO] جاري توليد مصفوفة المطابقة الثنائية (Canonicalization Standard C14N)...`
    ]);
    setActiveStep("hashing");

    await new Promise(r => setTimeout(r, 1000));
    const generatedHash = Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
    setSigningLog(prev => [
      ...prev,
      `[SUCCESS] تم تشكيل السلسلة النصية المعيارية للفاتورة بنجاح.`,
      `[INFO] حساب قيمة التشفير الرياضي SHA-256...`,
      `[SUCCESS] الهاش المستخرج: SHA-256 (${generatedHash.slice(0, 16)}...)`
    ]);
    setActiveStep("signing");

    await new Promise(r => setTimeout(r, 1200));
    const generatedSignature = "MIIEAY" + Array.from({length: 120}, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(Math.floor(Math.random()*64))).join("");
    setSigningLog(prev => [
      ...prev,
      `[INFO] محاولة الولوج لشهادة التوقيع الإلكتروني المعتمدة: ${certificateName}`,
      `[SUCCESS] تم التحقق من سلامة رمز HSM / الرمز السري بنجاح.`,
      `[INFO] جاري تشفير الهاش بالمفتاح الخاص RSA-2048 (PKCS#7 Digital Signature)...`,
      `[SUCCESS] تم توليد التوقيع الرقمي بنجاح: ${generatedSignature.slice(0, 30)}...`
    ]);
    setActiveStep("sending");

    await new Promise(r => setTimeout(r, 1000));
    const generatedUuid = `${authorityType === "ETA" ? "ETA" : "ZATCA"}-${Array.from({length: 4}, () => Math.floor(Math.random()*16).toString(16)).join("")}-${Array.from({length: 4}, () => Math.floor(Math.random()*16).toString(16)).join("")}-${Array.from({length: 4}, () => Math.floor(Math.random()*16).toString(16)).join("")}-${Array.from({length: 12}, () => Math.floor(Math.random()*16).toString(16)).join("")}`;
    setSigningLog(prev => [
      ...prev,
      `[INFO] الاتصال ببوابة مصلحة الضرائب عبر بروتوكول REST API...`,
      `[INFO] إرسال الـ JSON المُعقّم والمحمي بالتوقيع الرقمي...`,
      `[SUCCESS] تم استلام رد الخادم المالي الحكومي بنجاح [الرمز: 202 Approved]`,
      `[SUCCESS] تم قبول الفاتورة رقم [${selectedInvoice.id}] بالكامل واعتبارها مستنداً ضريبياً قانونياً.`
    ]);
    
    setComplianceStatuses(prev => ({
      ...prev,
      [selectedInvoiceId]: {
        invoiceId: selectedInvoiceId,
        status: "Approved",
        uuid: generatedUuid,
        submissionDate: new Date().toISOString(),
        hash: generatedHash,
        signature: generatedSignature
      }
    }));
    setActiveStep("success");
    setSuccessAnimation(true);
    setTimeout(() => setSuccessAnimation(false), 3000);
  };

  // Metrics calculations
  const totalInvoices = salesInvoices.length;
  const approvedInvoicesCount = (Object.values(complianceStatuses) as ComplianceStatus[]).filter(s => s.status === "Approved").length;
  const pendingInvoicesCount = totalInvoices - approvedInvoicesCount;
  const complianceRate = totalInvoices > 0 ? Math.round((approvedInvoicesCount / totalInvoices) * 100) : 100;

  return (
    <div className="space-y-6 text-right animate-fadeIn" id="einvoicing-portal" dir="rtl">
      {/* Dynamic Splash Alert when invoice approved */}
      {successAnimation && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-6 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce border border-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>تم ترحيل الفاتورة وتوقيعها إلكترونياً بنجاح في مصلحة الضرائب!</span>
        </div>
      )}

      {/* Header Scope */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-sans border border-emerald-500/30">
            المنظومة الضريبية الرقمية الموحدة (مصر والشرق الأوسط)
          </span>
          <h2 className="text-2xl font-display font-bold text-slate-100 mt-1">
            بوابة الفاتورة الإلكترونية والربط الضريبي القانوني
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            منظومة متكاملة لربط مبيعات التراخيص والخدمات مباشرة مع مصلحة الضرائب المصرية (ETA SDK) وهيئة الزكاة والضريبة والجمارك (ZATCA Phase 2) بالتوقيع الرقمي وبث الفاتورة فريضة.
          </p>
        </div>

        {/* Sync Status Button */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>بوابة الضرائب متصلة (الربط المباشر نشط)</span>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f1425] border border-slate-800 p-4.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-sans">إجمالي الفواتير الصادرة</span>
            <strong className="text-xl font-mono font-bold text-slate-100 block mt-1">{totalInvoices}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#0f1425] border border-slate-800 p-4.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-sans">فواتير معتمدة ضريبياً (موقعة)</span>
            <strong className="text-xl font-mono font-bold text-emerald-400 block mt-1">{approvedInvoicesCount}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <FileCheck2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#0f1425] border border-slate-800 p-4.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-sans">فواتير معلقة (غير موقعة)</span>
            <strong className="text-xl font-mono font-bold text-amber-500 block mt-1">{pendingInvoicesCount}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#0f1425] border border-slate-800 p-4.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-sans">معدل الامتثال والربط الحكومي</span>
            <strong className="text-xl font-mono font-bold text-cyan-400 block mt-1">{complianceRate}%</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: System Configuration & Invoice Desk */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Authority Selection & Credentials */}
          <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                <Settings className={`h-4.5 w-4.5 ${clr.text}`} />
                إعدادات بوابة الربط المالي الحكومية
              </h3>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setAuthorityType("ETA");
                    // Auto reset some mock fields if needed
                  }}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                    authorityType === "ETA" 
                      ? "bg-emerald-600 text-slate-950" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  الضرائب المصرية (ETA)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthorityType("ZATCA");
                  }}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                    authorityType === "ZATCA" 
                      ? "bg-amber-600 text-slate-950" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  الزكاة والجمارك (ZATCA)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">البيئة والمنظومة المستهدفة</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as any)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-600 font-sans"
                >
                  <option value="Sandbox">بيئة الاختبارات الضريبية (Sandbox/Pre-Prod)</option>
                  <option value="Production">المنظومة الفعلية الرسمية (Production)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">شهادة التوقيع والمفتاح العام HSM</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#141b2d] text-xs text-slate-300 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between font-mono">
                    <span className="truncate">{certificateName}</span>
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-sans border border-emerald-500/20">نشط</span>
                  </div>
                  <button
                    onClick={() => {
                      setCertificateName(certificateName === "Apex_Enterprise_Sign_2026.pfx" ? "Alternative_ZATCA_Sign.pfx" : "Apex_Enterprise_Sign_2026.pfx");
                    }}
                    className="p-2 bg-[#141b2d] border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                    title="تغيير الشهادة النشطة"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">مفتاح النظام (Client ID / POS ID)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-800 rounded-lg px-8 py-2 focus:outline-none focus:border-slate-600 font-mono"
                  />
                  <Key className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">الرمز السري السحابي (Client Secret)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-800 rounded-lg px-8 py-2 focus:outline-none focus:border-slate-600 font-mono"
                  />
                  <Lock className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Sales Invoices Desk for submission */}
          <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-cyan-400" />
                مكتب إرسال وتوقيع فواتير المبيعات الإلكترونية
              </h3>
              <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                اختر فاتورة لبدء توقيعها إلكترونياً
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900/40 text-slate-400 border-b border-slate-800">
                    <th className="p-4 font-bold">رقم الفاتورة</th>
                    <th className="p-4 font-bold">تاريخ الإصدار</th>
                    <th className="p-4 font-bold">العميل</th>
                    <th className="p-4 font-bold text-left">القيمة الإجمالية</th>
                    <th className="p-4 font-bold text-center">الربط الإلكتروني للضرائب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {salesInvoices.map(inv => {
                    const statusObj = complianceStatuses[inv.id];
                    const isSelected = selectedInvoiceId === inv.id;
                    return (
                      <tr 
                        key={inv.id} 
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className={`hover:bg-slate-900/30 transition-all cursor-pointer ${
                          isSelected ? "bg-slate-800/40 border-r-2 border-cyan-500" : ""
                        }`}
                      >
                        <td className="p-4 font-mono font-bold text-cyan-400">{inv.id}</td>
                        <td className="p-4 text-slate-400 font-mono">{inv.date}</td>
                        <td className="p-4 font-semibold text-slate-200">{inv.customerName}</td>
                        <td className="p-4 font-mono font-bold text-slate-100 text-left">
                          {inv.total.toLocaleString()} {config.currency}
                        </td>
                        <td className="p-4 text-center">
                          {statusObj?.status === "Approved" ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-sans font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> مقبول ضريبياً
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-sans font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 animate-pulse" /> غير موقع بعد
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Cryptographic Signature Workshop */}
        <div className="lg:col-span-5 space-y-6">
          {selectedInvoice ? (
            <div className="space-y-6">
              
              {/* Box 1: Signing Panel */}
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                      <CloudLightning className="h-4.5 w-4.5 text-emerald-400" />
                      ورشة التشفير والتحقق من المستند الإلكتروني
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">الفاتورة النشطة حالياً: <span className="font-mono text-cyan-400 font-bold">{selectedInvoice.id}</span></p>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] font-mono text-slate-400">
                    <span>قيمة الفاتورة:</span>
                    <strong className="text-slate-100">{selectedInvoice.total.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Signing Workflow Animation States */}
                {activeStep !== "idle" && (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                      <span>سجل خط سير العملية الأمنية (Digital Audit Trail)</span>
                      <span className="animate-pulse flex items-center gap-1 text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> جاري المعالجة...
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto text-right text-slate-300 select-text">
                      {signingLog.map((log, idx) => (
                        <div key={idx} className={
                          log.includes("[SUCCESS]") ? "text-emerald-400" : 
                          log.includes("[ERROR]") ? "text-rose-400" : "text-slate-400"
                        }>
                          {log}
                        </div>
                      ))}
                    </div>

                    {/* Simple process progression bar */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${
                        activeStep === "canonicalizing" ? "w-1/4 bg-blue-500" :
                        activeStep === "hashing" ? "w-2/4 bg-cyan-400" :
                        activeStep === "signing" ? "w-3/4 bg-purple-500" :
                        activeStep === "sending" ? "w-11/12 bg-amber-500" :
                        "w-full bg-emerald-500"
                      }`}></div>
                    </div>
                  </div>
                )}

                {/* Submissions & Actions */}
                <div className="space-y-3">
                  {selectedStatus?.status === "Approved" ? (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="p-4.5 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-xl space-y-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                          <strong className="text-sm">مستند مصادق ومعتمد بالمنظومة الحكومية</strong>
                        </div>
                        <div className="text-[11px] leading-relaxed text-slate-300 font-sans space-y-1">
                          <p>تم استلام رد إيجابي رسمي ومطابقة تامة للمعايير المحاسبية والقوانين الضريبية الإقليمية.</p>
                          <div className="border-t border-slate-800/60 pt-2 mt-2 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400">كود مصلحة الضرائب الفاتورة الموحد (UUID):</span>
                              <span className="font-mono text-slate-200 font-bold select-all">{selectedStatus.uuid}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">تاريخ وساعة ترحيل المستند:</span>
                              <span className="font-mono text-slate-200">{new Date(selectedStatus.submissionDate).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">خوارزمية الإحراز الضريبي الرقمي:</span>
                              <span className="font-mono text-slate-200 text-[10px] truncate max-w-[200px]" title={selectedStatus.hash}>{selectedStatus.hash}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Download XML / Copy options */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setShowXmlView(!showXmlView)}
                          className="py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <FileCode className="h-3.5 w-3.5" />
                          <span>{showXmlView ? "إخفاء ملف XML" : "عرض ملف UBL XML"}</span>
                        </button>
                        <button
                          onClick={() => {
                            const blob = new Blob([generateUblXml(selectedInvoice)], { type: "text/xml" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${selectedInvoice.id}_ubl_invoice.xml`;
                            a.click();
                          }}
                          className="py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>تحميل ملف UBL XML</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-[#1b1f2e] border border-slate-800 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                        <div className="text-[11px] leading-relaxed text-slate-300 font-sans">
                          <strong>لم يتم إرسال هذه الفاتورة ضريبياً بعد!</strong>
                          <p className="mt-1">يتعين عليك تفعيل خطوة التوقيع التلقائي والتشفير بالشهادة المعتمدة لإدراجها في منظومة الفاتورة الإلكترونية.</p>
                        </div>
                      </div>

                      <button
                        onClick={triggerCryptographicSubmission}
                        disabled={activeStep !== "idle"}
                        className={`w-full py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                          activeStep !== "idle"
                            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-600/10"
                        }`}
                      >
                        <Send className="h-4 w-4" />
                        <span>توقيع الفاتورة وإرسالها لبوابة مصلحة الضرائب فورياً</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Visual Electronic Receipt & QR View */}
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
                <div>
                  <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                    <QrCode className="h-4.5 w-4.5 text-cyan-400" />
                    شكل الرمز الثنائي المعتمد (Base64 QR Code)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    يحتوي رمز الاستجابة السريعة على تفاصيل قانونية تشمل اسم التاجر، الرقم الضريبي، توقيت الفاتورة والضريبة المستحقة طبقاً لمتطلبات هيئات الربط.
                  </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-5 bg-slate-950 p-4.5 rounded-xl border border-slate-850">
                  {/* Mock QR Generator with real visual canvas representation */}
                  <div className="bg-white p-2 rounded-lg flex items-center justify-center shrink-0">
                    <div className="relative h-28 w-28 bg-white border border-slate-200 flex flex-wrap p-1">
                      {/* Generates a pseudo QR pattern */}
                      {Array.from({length: 49}).map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-[14px] h-[14px] ${
                            (i % 3 === 0 && i % 2 === 0) || 
                            (i < 7 && i % 4 !== 1) || 
                            (i > 42 && i % 5 === 1) ||
                            (i % 7 === 0 && i > 15)
                              ? "bg-slate-950" 
                              : "bg-white"
                          }`}
                        />
                      ))}
                      <div className="absolute inset-0 m-auto h-6 w-6 bg-white border border-slate-200 flex items-center justify-center">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                    </div>
                  </div>

                  {/* QR Decoded Information */}
                  <div className="flex-1 space-y-2 text-xs font-sans">
                    <h4 className="text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-1.5">بيانات الـ QR الضريبي المفككة</h4>
                    
                    <div className="space-y-1.5 text-[10px] text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">اسم المنشأة:</span>
                        <span className="font-semibold">{config.company === "Apex Levant Corp" ? "شركة قمة الشام والرافدين" : config.company}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الرقم الضريبي للبائع:</span>
                        <span className="font-mono text-slate-200">382-901-291</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">طابع تاريخ الإرسال:</span>
                        <span className="font-mono text-slate-200 truncate max-w-[150px]">
                          {selectedStatus?.submissionDate || "غير مرسل بعد"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">مجموع ضريبة القيمة المضافة:</span>
                        <span className="font-mono text-slate-200 font-bold">{selectedInvoice.vatAmount.toLocaleString()} {config.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">صافي قيمة المستند المعتمد:</span>
                        <span className="font-mono text-emerald-400 font-bold">{selectedInvoice.total.toLocaleString()} {config.currency}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
              يرجى تحديد فاتورة مبيعات من القائمة الجانبية لعرض وتوقيع مستندها الضريبي الإلكتروني.
            </div>
          )}
        </div>
      </div>

      {/* XML Code Viewer Panel */}
      {showXmlView && selectedInvoice && (
        <div className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-xl animate-fadeIn">
          <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
            <h4 className="font-display font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-purple-400" />
              مستند UBL 2.1 XML المالي المولد والمعتمد من المنظومة الحكومية
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyXml(generateUblXml(selectedInvoice))}
                className="px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded text-[10px] text-slate-300 font-sans transition-all flex items-center gap-1 cursor-pointer"
              >
                {copiedText === "xml" ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>نسخ الملف</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowXmlView(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-1 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-5 font-mono text-xs text-left overflow-x-auto max-h-[350px] bg-slate-950 text-slate-300 select-text" dir="ltr">
            <pre className="whitespace-pre-wrap">{generateUblXml(selectedInvoice)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
