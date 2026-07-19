export interface TenantSettings {
  tenantId: string;
  companyName: string;
  companyNameAr: string;
  taxRegistrationNumber: string; // الرقم الضريبي الموحد
  commercialRegister: string; // السجل التجاري
}

export interface BranchSettings {
  id: string;
  name: string;
  nameAr: string;
  location: string;
  locationAr: string;
}

export interface CurrencySettings {
  code: string;
  symbol: string;
  symbolAr: string;
  exchangeRateToUSD: number;
}

export interface ERPConfigState {
  tenant: TenantSettings;
  branch: BranchSettings;
  fiscalYear: string;
  currency: CurrencySettings;
  language: "Arabic" | "English";
  featureFlags: {
    enableEInvoicing: boolean; // الفاتورة الإلكترونية المصرية
    enableForm41Withholding: boolean; // نموذج 41 خصم وتحصيل
    enableMultiWarehouse: boolean;
    enableRealTimeAuditTrail: boolean;
  };
}

export const ENTERPRISE_TENANTS: TenantSettings[] = [
  {
    tenantId: "tenant-levant",
    companyName: "Apex Levant Corp",
    companyNameAr: "شركة قمة الشام والرافدين المحدودة",
    taxRegistrationNumber: "492-812-390",
    commercialRegister: "CR-92049-LEV"
  },
  {
    tenantId: "tenant-gulf",
    companyName: "Apex Gulf International",
    companyNameAr: "شركة قمة الخليج الدولية",
    taxRegistrationNumber: "102-492-881",
    commercialRegister: "CR-10492-DXB"
  },
  {
    tenantId: "tenant-africa",
    companyName: "Apex Africa Distribution",
    companyNameAr: "مؤسسة قمة أفريقيا للتوزيع والاستيراد",
    taxRegistrationNumber: "582-104-922",
    commercialRegister: "CR-77201-CAI"
  }
];

export const ENTERPRISE_BRANCHES: BranchSettings[] = [
  {
    id: "branch-cairo",
    name: "Cairo Headquarters",
    nameAr: "الإدارة العامة بالقاهرة (شيراتون)",
    location: "Sheraton, Heliopolis, Cairo, Egypt",
    locationAr: "مساكن شيراتون، مصر الجديدة، القاهرة، جمهورية مصر العربية"
  },
  {
    id: "branch-alex",
    name: "Alex Port Gateway",
    nameAr: "مكتب ميناء الإسكندرية اللوجستي",
    location: "Free Zone, Dekheila Port, Alexandria, Egypt",
    locationAr: "المنطقة الحرة، ميناء الدخيلة، الإسكندرية، جمهورية مصر العربية"
  },
  {
    id: "branch-dubai",
    name: "Dubai JAFZA Branch",
    nameAr: "مكتب جافزا دبي الإقليمي",
    location: "Jebel Ali Free Zone, Dubai, UAE",
    locationAr: "المنطقة الحرة بجبل علي (جافزا)، دبي، الإمارات العربية المتحدة"
  }
];

export const ENTERPRISE_CURRENCIES: CurrencySettings[] = [
  { code: "EGP", symbol: "EGP", symbolAr: "ج.م", exchangeRateToUSD: 0.021 },
  { code: "AED", symbol: "AED", symbolAr: "د.إ", exchangeRateToUSD: 0.27 },
  { code: "USD", symbol: "$", symbolAr: "$", exchangeRateToUSD: 1.0 }
];

export const DEFAULT_ERP_CONFIG: ERPConfigState = {
  tenant: ENTERPRISE_TENANTS[0],
  branch: ENTERPRISE_BRANCHES[0],
  fiscalYear: "FY-2026/2027",
  currency: ENTERPRISE_CURRENCIES[0],
  language: "Arabic",
  featureFlags: {
    enableEInvoicing: true,
    enableForm41Withholding: true,
    enableMultiWarehouse: true,
    enableRealTimeAuditTrail: true
  }
};
