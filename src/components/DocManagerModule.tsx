import React, { useState, useEffect } from "react";
import { 
  FolderOpen, 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Server, 
  FileSpreadsheet, 
  Lock, 
  Plus, 
  Folder, 
  History, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  X, 
  FileSignature, 
  Info,
  Check,
  Bookmark
} from "lucide-react";
import { ERPConfig } from "../types";
import { getThemeClass } from "./Sidebar";

interface DocManagerModuleProps {
  config: ERPConfig;
}

export interface DocVersion {
  version: string;
  size: string;
  modifiedAt: string;
  modifiedBy: string;
  reason: string;
  sha256: string;
}

export interface DocSignature {
  signer: string;
  role: string;
  timestamp: string;
  signatureHash: string;
  certificateRef: string;
  isVerified: boolean;
}

export interface AuditLog {
  action: string;
  timestamp: string;
  user: string;
  details: string;
}

export interface ERPDocument {
  id: string;
  name: string;
  sizeBytes: number;
  category: "Invoice" | "Contract" | "Tax" | "Payroll" | "General";
  folderId: string;
  uploadedAt: string;
  uploadedBy: string;
  securityLevel: "Public" | "Internal" | "Confidential" | "Highly Confidential";
  tags?: string[];
  version: string;
  versions: DocVersion[];
  retentionYears: number;
  isLegalHold: boolean;
  signatureStatus: "Unsigned" | "PartiallySigned" | "Signed";
  signatures: DocSignature[];
  auditLogs: AuditLog[];
  sha256: string;
}

export interface ERPFolder {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  iconType: "legal" | "finance" | "tax" | "hr" | "general" | "custom";
}

export default function DocManagerModule({ config }: DocManagerModuleProps) {
  const clr = getThemeClass(config.theme);

  // Core Data States
  const [folders, setFolders] = useState<ERPFolder[]>([]);
  const [documents, setDocuments] = useState<ERPDocument[]>([]);
  const [activeDoc, setActiveDoc] = useState<ERPDocument | null>(null);

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter state
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedSec, setSelectedSec] = useState<string>("all");

  // Modals & Dynamic UI overlays
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // Real File Upload Selection
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVersionFile, setSelectedVersionFile] = useState<File | null>(null);

  // High-Tech OCR Simulator
  const [showOcrSimulator, setShowOcrSimulator] = useState(false);
  const [ocrStep, setOcrStep] = useState<"idle" | "scanning" | "analyzing" | "completed" | "loading">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrFileName, setOcrFileName] = useState("");
  const [ocrDetectedType, setOcrDetectedType] = useState<"Invoice" | "Contract" | "Tax">("Invoice");
  const [ocrExtractedData, setOcrExtractedData] = useState({
    companyName: "",
    taxId: "",
    totalAmount: "",
    vatAmount: "",
    date: "",
    confidence: 0
  });

  // Forms Fields
  const [uploadName, setUploadName] = useState("");
  const [uploadCat, setUploadCat] = useState<ERPDocument["category"]>("General");
  const [uploadSec, setUploadSec] = useState<ERPDocument["securityLevel"]>("Internal");
  const [uploadFolder, setUploadFolder] = useState<string>("");
  const [uploadRetention, setUploadRetention] = useState<number>(5);
  const [tagInput, setTagInput] = useState("");

  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState<ERPFolder["iconType"]>("custom");

  const [newVersionReason, setNewVersionReason] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // --- START OF ENTERPRISE SEARCH & DISCOVERY STATES ---
  const [activeTab, setActiveTab] = useState<"explorer" | "intelligent-search">("explorer");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIsSemantic, setSearchIsSemantic] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTotalCount, setSearchTotalCount] = useState(0);
  const [searchLatencyMs, setSearchLatencyMs] = useState(0);

  const [facets, setFacets] = useState<any>({
    categories: [],
    securityLevels: [],
    extensions: [],
    statuses: [],
    tags: []
  });

  const [discCat, setDiscCat] = useState("all");
  const [discSec, setDiscSec] = useState("all");
  const [discExt, setDiscExt] = useState("all");
  const [discHold, setDiscHold] = useState<boolean | undefined>(undefined);
  const [discSig, setDiscSig] = useState<boolean | undefined>(undefined);
  const [discVer, setDiscVer] = useState<boolean | undefined>(undefined);
  const [discMinSize, setDiscMinSize] = useState<number | undefined>(undefined);
  const [discMaxSize, setDiscMaxSize] = useState<number | undefined>(undefined);
  const [discDateFrom, setDiscDateFrom] = useState("");
  const [discDateTo, setDiscDateTo] = useState("");

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearchesList, setRecentSearchesList] = useState<any[]>([]);
  const [popularSearchesList, setPopularSearchesList] = useState<any[]>([]);
  
  const [searchAnalytics, setSearchAnalytics] = useState<any>({
    totalSearches: 0,
    averageLatencyMs: 0,
    zeroResultSearches: 0,
    trendingTerms: []
  });

  const [savedSearchesList, setSavedSearchesList] = useState<any[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");

  const [indexIntegrity, setIndexIntegrity] = useState<any>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch search suggestions reactively
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/v1/search/suggestions?prefix=${encodeURIComponent(searchQuery)}`);
        const json = await r.json();
        if (json.success) {
          setSuggestions(json.data || []);
        }
      } catch (err) {
        console.error("Error loading search suggestions:", err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleExecuteSearch = async () => {
    setSearchLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (discCat !== "all") params.append("category", discCat);
      if (discSec !== "all") params.append("securityLevel", discSec);
      if (discExt !== "all") params.append("extension", discExt);
      if (discHold !== undefined) params.append("isLegalHold", discHold ? "true" : "false");
      if (discSig !== undefined) params.append("hasSignature", discSig ? "true" : "false");
      if (discVer !== undefined) params.append("hasVersions", discVer ? "true" : "false");
      if (discMinSize !== undefined) params.append("minSize", discMinSize.toString());
      if (discMaxSize !== undefined) params.append("maxSize", discMaxSize.toString());
      if (discDateFrom) params.append("dateFrom", discDateFrom);
      if (discDateTo) params.append("dateTo", discDateTo);
      if (searchIsSemantic) params.append("semantic", "true");

      const r = await fetch(`/api/v1/search?${params.toString()}`);
      const json = await r.json();
      if (json.success) {
        setSearchResults(json.data.results || []);
        setSearchTotalCount(json.data.total || 0);
        setSearchLatencyMs(json.data.latencyMs || 0);
      } else {
        throw new Error(json.error || "خطأ في معالجة البحث ذي الصلة");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchSearchFacets = async () => {
    try {
      const r = await fetch("/api/v1/search/facets");
      const json = await r.json();
      if (json.success) {
        setFacets(json.data);
      }
    } catch (err) {
      console.error("Facet error:", err);
    }
  };

  const fetchRecentAndPopular = async () => {
    try {
      const r1 = await fetch("/api/v1/search/recent");
      const j1 = await r1.json();
      if (j1.success) setRecentSearchesList(j1.data || []);

      const r2 = await fetch("/api/v1/search/popular");
      const j2 = await r2.json();
      if (j2.success) setPopularSearchesList(j2.data || []);
    } catch (err) {
      console.error("Recent/Popular error:", err);
    }
  };

  const fetchSearchAnalytics = async () => {
    try {
      const r = await fetch("/api/v1/search/analytics");
      const json = await r.json();
      if (json.success) setSearchAnalytics(json.data);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    }
  };

  const handleSaveSearchQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveSearchName || !searchQuery) return;
    try {
      const filters = { discCat, discSec, discExt, discHold, discSig };
      const r = await fetch("/api/v1/search/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveSearchName, query: searchQuery, filters })
      });
      const json = await r.json();
      if (json.success) {
        setSuccessMessage("تم حفظ استعلام البحث بنجاح للرجوع السريع له لاحقاً.");
        setIsSaveModalOpen(false);
        setSaveSearchName("");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleManualRebuildIndex = async () => {
    setIsRebuilding(true);
    setError(null);
    try {
      const r = await fetch("/api/v1/search/rebuild", { method: "POST" });
      const json = await r.json();
      if (json.success) {
        setSuccessMessage(`تمت إعادة بناء فهرس البحث الممركز بنجاح! تم تضمين ${json.data.indexedCount} مستنداً.`);
        fetchSearchFacets();
      } else {
        throw new Error(json.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleIntegrityCheck = async () => {
    setIsVerifying(true);
    try {
      const r = await fetch("/api/v1/search/verify", { method: "POST" });
      const json = await r.json();
      if (json.success) {
        setIndexIntegrity(json.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };
  // --- END OF ENTERPRISE SEARCH & DISCOVERY STATES ---

  // Fetch initial folders and documents on load
  useEffect(() => {
    fetchFoldersAndDocs();
  }, []);

  const fetchFoldersAndDocs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch folders
      const fRes = await fetch("/api/v1/documents/folders");
      const fData = await fRes.json();
      let activeFolders = fData.data || [];

      // Auto seed default folders if DB folders are empty
      if (activeFolders.length === 0) {
        const seedFolders = [
          { id: "fold-legal", name: "عقود وتوكيلات قانونية", description: "عقود المبيعات والتوكيلات الرسمية والاتفاقيات الدولية", iconType: "legal" },
          { id: "fold-finance", name: "فواتير ومطالبات مالية", description: "فواتير المبيعات والشراء ومستندات المطالبات البنكية", iconType: "finance" },
          { id: "fold-taxes", name: "ملفات وإقرارات ضريبية", description: "إقرارات القيمة المضافة وضريبة كسب العمل والنموذج 41", iconType: "tax" },
          { id: "fold-hr", name: "مسيرات رواتب وموارد بشرية", description: "مسيرات الأجور والرواتب الشهرية والبدلات وعقود التوظيف", iconType: "hr" },
          { id: "fold-general", name: "سجلات عامة ووثائق تأسيس", description: "السجل التجاري، البطاقة الضريبية، والشهادات الرسمية للمنشأة", iconType: "general" }
        ];

        for (const sf of seedFolders) {
          await fetch("/api/v1/documents/folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sf)
          });
        }
        const refetchF = await fetch("/api/v1/documents/folders");
        const refetchFData = await refetchF.json();
        activeFolders = refetchFData.data || [];
      }

      setFolders(activeFolders);
      if (activeFolders.length > 0 && !uploadFolder) {
        setUploadFolder(activeFolders[0].id);
      }

      // 2. Fetch documents
      const dRes = await fetch("/api/v1/documents");
      const dData = await dRes.json();
      setDocuments(dData.data || []);
    } catch (err: any) {
      setError("فشل الاتصال بخادم الأرشيف الإلكتروني المركزي: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic filter updates from API
  useEffect(() => {
    fetchFilteredDocs();
  }, [selectedFolderId, selectedCat, selectedSec, searchTerm]);

  const fetchFilteredDocs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedFolderId !== "all") params.append("folderId", selectedFolderId);
      if (selectedCat !== "all") params.append("category", selectedCat);
      if (searchTerm) params.append("search", searchTerm);

      const dRes = await fetch(`/api/v1/documents?${params.toString()}`);
      const dData = await dRes.json();
      const updatedDocs = dData.data || [];
      setDocuments(updatedDocs);

      // Re-link active document for updated info panels
      if (activeDoc) {
        const matching = updatedDocs.find((d: any) => d.id === activeDoc.id);
        if (matching) setActiveDoc(matching);
      }
    } catch (err: any) {
      console.error("Filter fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Uploading a brand new document via multipart Form
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("يرجى اختيار ملف صالح من القرص أولاً.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("category", uploadCat);
      formData.append("folderId", uploadFolder);
      formData.append("securityLevel", uploadSec);
      formData.append("name", uploadName || selectedFile.name);

      const res = await fetch("/api/v1/documents/upload", {
        method: "POST",
        body: formData // Fetch sets multi-part headers automatically for FormData
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.message || "فشل رفع المستند وتشفيره");
      }

      setSuccessMessage("تمت أرشفة وتوثيق المستند الجديد بنجاح في المستودع الآمن.");
      setIsUploadOpen(false);
      setSelectedFile(null);
      setUploadName("");
      setTagInput("");
      
      // Reload documents
      await fetchFilteredDocs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Secure local download fetch triggering browser downloads
  const handleSecureDownload = async (doc: ERPDocument) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/documents/${doc.id}/download`);
      if (res.status === 403) {
        throw new Error("عذراً! لا تملك الصلاحية الأمنية الكافية لتنزيل هذا المستند السري للغاية.");
      }
      if (!res.ok) {
        throw new Error("حدث خطأ أثناء الاتصال بوحدة التخزين الآمنة للملف.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMessage(`تم تنزيل وفك تشفير المستند بنجاح: ${doc.name}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Create customized database folders
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/documents/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          description: newFolderDesc || "مجلد أرشيفي مخصص",
          iconType: newFolderIcon
        })
      });

      if (!res.ok) {
        throw new Error("فشل إنشاء مجلد تشغيلي جديد");
      }

      setSuccessMessage(`تم إنشاء المجلد المالي الجديد: ${newFolderName}`);
      setIsFolderModalOpen(false);
      setNewFolderName("");
      setNewFolderDesc("");

      // Re-fetch folders structure
      const fRes = await fetch("/api/v1/documents/folders");
      const fData = await fRes.json();
      setFolders(fData.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add incremental upgrades / Document versions
  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc || !selectedVersionFile || !newVersionReason) {
      setError("يرجى تعبئة كافة حقول الإصدار واختيار الملف الجديد.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const currentVerNum = parseFloat((activeDoc.version || "v1.0").replace("v", ""));
      const nextVerStr = `v${(currentVerNum + 1.0).toFixed(1)}`;

      const formData = new FormData();
      formData.append("file", selectedVersionFile);
      formData.append("reason", newVersionReason);
      formData.append("version", nextVerStr);
      formData.append("currentDbVersion", String(activeDoc.version ? parseFloat(activeDoc.version.replace("v", "")) : 1));

      const res = await fetch(`/api/v1/documents/${activeDoc.id}/versions`, {
        method: "POST",
        body: formData
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.message || "فشل إصدار نسخة جديدة");
      }

      setSuccessMessage(`تم ترقية وترشيح إصدار المستند للمستوى ${nextVerStr} بنجاح.`);
      setIsVersionModalOpen(false);
      setSelectedVersionFile(null);
      setNewVersionReason("");

      await fetchFilteredDocs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Rollback to historic version
  const handleRollbackVersion = async (versionStr: string) => {
    if (!activeDoc) return;

    if (!confirm(`⚠️ هل أنت متأكد من استرجاع وإعادة تفعيل الإصدار التاريخي (${versionStr}) للمستند؟`)) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/documents/${activeDoc.id}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: versionStr })
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.message || "فشل استرجاع النسخة");
      }

      setSuccessMessage(`تم استرداد وتعميم النسخة ${versionStr} كإصدار نشط بنجاح.`);
      await fetchFilteredDocs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Legal Hold Toggle (Lock file from deletion)
  const handleToggleLegalHold = async (doc: ERPDocument) => {
    setIsLoading(true);
    setError(null);

    try {
      const nextState = !doc.isLegalHold;
      const res = await fetch(`/api/v1/documents/${doc.id}/legal-hold`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isLegalHold: nextState,
          details: nextState ? "تفعيل الوقف القانوني التجميدي لحماية الوثيقة من التعديل" : "رفع الوقف القانوني للمستند"
        })
      });

      if (!res.ok) {
        throw new Error("فشل تعديل حالة الامتثال القانوني");
      }

      setSuccessMessage(nextState ? "تم فرض الوقف التحفظي وحظر الحذف القانوني على الوثيقة بنجاح." : "تم فك قفل الحماية وتداول الوثيقة طبيعياً.");
      await fetchFilteredDocs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Crytographic Sign Document
  const handleSignDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/documents/${activeDoc.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.message || "فشل مصادقة الختم المالي الرقمي");
      }

      setSuccessMessage("تم تصديق وختم المستند رقمياً وتشفيره بالختم الوطني الموحد بنجاح.");
      setIsSignatureModalOpen(false);
      await fetchFilteredDocs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete document
  const handleDeleteDoc = async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    if (doc.isLegalHold) {
      setError("❌ خطأ بالامتثال الدولي: المستند خاضع لوقف قانوني نشط (Legal Hold) ومحمي تماماً ضد الكشط أو الحذف.");
      return;
    }

    if (!confirm("⚠️ هل أنت متأكد من الحذف النهائي والمؤرشف لهذا المستند؟ لا يمكن التراجع عن هذه الخطوة في سجلات التدقيق العام.")) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/documents/${id}`, {
        method: "DELETE"
      });

      const resJson = await res.json();
      if (res.status === 423) {
        throw new Error("مرفوض! الخادم محمي باللوائح القانونية؛ لا يمكن إزالة هذا المستند لوجود وقف تجميدي.");
      }
      if (!res.ok) {
        throw new Error(resJson.message || "فشل حذف المستند");
      }

      setSuccessMessage("تم إزالة الملف نهائياً من قاعدة البيانات والتخزين السحابي المؤرشف.");
      if (activeDoc?.id === id) setActiveDoc(null);
      await fetchFilteredDocs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // OCR Simulator
  const launchOcrScanner = (doc: ERPDocument) => {
    setOcrFileName(doc.name);
    setOcrStep("idle");
    setOcrProgress(0);
    
    const lowerName = doc.name.toLowerCase();
    if (lowerName.includes("سجل") || lowerName.includes("رخصة")) {
      setOcrDetectedType("Tax");
      setOcrExtractedData({
        companyName: config.company,
        taxId: "682-192-381 (سجل تجاري)",
        totalAmount: "غير مطبق",
        vatAmount: "غير مطبق",
        date: doc.uploadedAt,
        confidence: 98.4
      });
    } else if (lowerName.includes("إقرار") || lowerName.includes("ضريبة") || lowerName.includes("قيمة")) {
      setOcrDetectedType("Tax");
      setOcrExtractedData({
        companyName: config.company + " - الإدارة الضريبية",
        taxId: "401-291-002",
        totalAmount: "1,245,000 ج.م",
        vatAmount: "174,300 ج.م (14%)",
        date: doc.uploadedAt || "2026-07-10",
        confidence: 97.2
      });
    } else {
      setOcrDetectedType("Invoice");
      setOcrExtractedData({
        companyName: "مجموعة السويدي للكابلات والكهرباء",
        taxId: "910-384-284 (ملف معتمد)",
        totalAmount: "450,000 ج.م",
        vatAmount: "63,000 ج.م (14% ضريبة)",
        date: doc.uploadedAt || "2026-07-01",
        confidence: 99.1
      });
    }

    setShowOcrSimulator(true);
  };

  const triggerOcrScanningProcess = () => {
    setOcrStep("scanning");
    setOcrProgress(15);
  };

  useEffect(() => {
    let timer: any;
    if (ocrStep === "scanning") {
      timer = setInterval(() => {
        setOcrProgress(prev => {
          if (prev >= 60) {
            clearInterval(timer);
            setOcrStep("analyzing");
            return 60;
          }
          return prev + 15;
        });
      }, 400);
    } else if (ocrStep === "analyzing") {
      timer = setInterval(() => {
        setOcrProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setOcrStep("completed");
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    }
    return () => clearInterval(timer);
  }, [ocrStep]);

  const handleApplyOcrData = () => {
    setShowOcrSimulator(false);
    setSuccessMessage("تم قراءة وتطبيق بيانات المستخلص الذكي OCR بنجاح على شجرة التدقيق.");
  };

  // Drag and drop logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setUploadName(file.name);
      setIsUploadOpen(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadName(file.name);
      setIsUploadOpen(true);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "Invoice": return "فواتير ومطالبات مالية";
      case "Contract": return "عقود وتوكيلات اتفاقيات";
      case "Tax": return "ملفات ضريبية ونماذج قانونية";
      case "Payroll": return "مسيرات رواتب وأجور موظفين";
      default: return "ملفات عامة ووثائق تأسيس";
    }
  };

  const getSecurityLabel = (sec: string) => {
    switch (sec) {
      case "Public": return "مستند عام";
      case "Internal": return "تداول داخلي";
      case "Confidential": return "سري ومحدود";
      default: return "سري للغاية وحساس";
    }
  };

  const getSecurityBadgeClass = (sec: string) => {
    switch (sec) {
      case "Public": return "bg-slate-800 text-slate-300 border border-slate-700";
      case "Internal": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "Confidential": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      default: return "bg-red-500/10 text-red-400 border border-red-500/20";
    }
  };

  // Calculate Metrics from genuine DB data
  const totalDocs = documents.length;
  const totalWithHold = documents.filter(d => d.isLegalHold).length;
  const totalWithSig = documents.filter(d => d.signatureStatus === "Signed").length;
  const totalStorageKB = documents.reduce((acc, d) => acc + (d.sizeBytes || 0), 0) / 1024;
  const storageString = totalStorageKB > 1024 
    ? `${(totalStorageKB / 1024).toFixed(1)} MB` 
    : `${totalStorageKB.toFixed(1)} KB`;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Alert Banner for errors */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3 justify-start font-sans text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 animate-bounce" />
          <div className="flex-1">
            <span className="font-bold block text-sm">خطأ في الأرشيف الإلكتروني</span>
            <p className="mt-0.5 text-slate-300">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Alert Banner for success */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 justify-start font-sans text-xs">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold block text-sm">تم بنجاح</span>
            <p className="mt-0.5 text-slate-300">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-100 flex items-center gap-2 justify-start">
            <FolderOpen className={`h-6 w-6 ${clr.text}`} /> إدارة الأرشيف الرقمي والمستندات (DocManager Module)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            نظام الحفظ والتوثيق القانوني المركزي المتطابق مع قوانين الضرائب وإدارة السجلات العالمية ISO 15489.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-end">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-750 text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> إنشاء مجلد أرشيفي
          </button>

          <label className={`px-4 py-2 rounded-lg text-slate-950 font-bold text-xs ${clr.accent} flex items-center gap-1.5 cursor-pointer hover:opacity-95 transition-all`}>
            <Upload className="h-4 w-4" /> أرشفة مستند جديد
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
            />
          </label>
        </div>
      </div>

      {/* High-Fidelity Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Documents */}
        <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold tracking-wider block">إجمالي المستندات المؤرشفة</span>
            <span className="text-xl font-mono font-bold text-slate-100 mt-1 block">
              {isLoading && totalDocs === 0 ? <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" /> : `${totalDocs} وثائق`}
            </span>
            <p className="text-[9px] text-slate-400 mt-1 font-sans">تخزين قانوني ممركز ومحمي بالكامل</p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FolderOpen className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 2: Storage used */}
        <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold tracking-wider block">سعة التخزين المستهلكة</span>
            <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">
              {isLoading && totalStorageKB === 0 ? <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" /> : storageString}
            </span>
            <p className="text-[9px] text-slate-400 mt-1 font-sans">توزيع سحابي مكرر (Redundant Storage)</p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Server className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 3: Under Legal Hold */}
        <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold tracking-wider block">مستندات تحت الوقف القانوني</span>
            <span className="text-xl font-mono font-bold text-amber-400 mt-1 block">
              {isLoading && totalWithHold === 0 ? <RefreshCw className="h-4 w-4 animate-spin text-amber-400" /> : `${totalWithHold} ملفات محمية`}
            </span>
            <p className="text-[9px] text-slate-400 mt-1 font-sans">ممنوعة تماماً من الحذف أو التعديل</p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 4: Signed Certificate Documents */}
        <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold tracking-wider block">التواقيع الرقمية والأختام</span>
            <span className="text-xl font-mono font-bold text-indigo-400 mt-1 block">
              {isLoading && totalWithSig === 0 ? <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" /> : `${totalWithSig} / ${totalDocs} معتمد`}
            </span>
            <p className="text-[9px] text-slate-400 mt-1 font-sans">موقعة ومصدقة بشهادة PKI الموحدة</p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FileSignature className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab("explorer")}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "explorer"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FolderOpen className="h-4 w-4" /> مستكشف الملفات والأرشيف
        </button>
        <button
          onClick={() => {
            setActiveTab("intelligent-search");
            fetchSearchFacets();
            fetchRecentAndPopular();
            fetchSearchAnalytics();
          }}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "intelligent-search"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-4 w-4" /> منصة البحث والتحري الذكي (Enterprise Discovery)
        </button>
      </div>

      {activeTab === "explorer" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Directory Tree */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 justify-start">
                  <Folder className="h-4.5 w-4.5 text-slate-400" /> هيكلية المجلدات والأدلة
                </h3>
                <span className="text-[10px] font-mono text-slate-500 font-bold">{folders.length} مجلدات</span>
              </div>

              {/* Folder Navigation */}
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolderId("all")}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-bold transition-all text-right ${
                    selectedFolderId === "all"
                      ? "bg-slate-850 text-slate-100 border border-slate-800"
                      : "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 justify-start">
                    <FolderOpen className="h-4.5 w-4.5 text-indigo-400" />
                    <span>كافة المستندات والأوراق</span>
                  </div>
                </button>

                {folders.map((fold) => {
                  const count = documents.filter(d => d.folderId === fold.id).length;
                  return (
                    <button
                      key={fold.id}
                      onClick={() => setSelectedFolderId(fold.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-all text-right ${
                        selectedFolderId === fold.id
                          ? "bg-slate-850 text-slate-100 border border-slate-800 font-bold"
                          : "hover:bg-slate-900/40 text-slate-400 hover:text-slate-200 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2 justify-start truncate">
                        <Folder className={`h-4.5 w-4.5 shrink-0 ${
                          selectedFolderId === fold.id ? "text-amber-400" : "text-slate-500"
                        }`} />
                        <span className="block truncate">{fold.name}</span>
                      </div>
                      <span className="font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850 text-slate-500 shrink-0">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                dragActive 
                  ? "border-emerald-500 bg-emerald-500/5 scale-[1.01]" 
                  : "border-slate-800 bg-[#070b13] hover:border-slate-700/80"
              }`}
            >
              <Upload className="h-8 w-8 text-slate-500 mb-2 animate-bounce" />
              <h4 className="text-xs font-bold text-slate-200">السحب السريع لغرفة التدقيق</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                ألقِ أي ملف هنا لتصنيفه وأرشفته فوراً على الخادم المركزي.
              </p>
            </div>
          </div>

          {/* Center Section: Filtering & List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="البحث بالاسم الكودي، الفئة، أو الوقف القانوني..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700 text-right"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <select
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs px-2.5 py-2 text-slate-300 focus:outline-none"
                >
                  <option value="all">كافة الفئات</option>
                  <option value="Invoice">فواتير ومستندات بيع</option>
                  <option value="Contract">عقود واتفاقيات</option>
                  <option value="Tax">ملفات ضريبية وقانونية</option>
                  <option value="Payroll">مسيرات رواتب وأجور</option>
                  <option value="General">أوراق عامة وتأسيس</option>
                </select>

                <select
                  value={selectedSec}
                  onChange={(e) => setSelectedSec(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs px-2.5 py-2 text-slate-300 focus:outline-none"
                >
                  <option value="all">كافة مستويات السرية</option>
                  <option value="Public">مستند عام</option>
                  <option value="Internal">تداول داخلي</option>
                  <option value="Confidential">سري ومحدود</option>
                  <option value="Highly Confidential">سري للغاية</option>
                </select>
              </div>
            </div>

            {/* List Table */}
            <div className="bg-[#0b0f19] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="p-3.5">الرمز الكودي</th>
                      <th className="p-3.5">اسم المستند والنوعية</th>
                      <th className="p-3.5">الإصدار</th>
                      <th className="p-3.5">مستوى الأمان</th>
                      <th className="p-3.5 text-left">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-300 divide-y divide-slate-850">
                    {documents.map((doc) => {
                      const isActive = activeDoc?.id === doc.id;
                      return (
                        <tr 
                          key={doc.id} 
                          onClick={() => setActiveDoc(doc)}
                          className={`transition-colors cursor-pointer ${
                            isActive ? "bg-slate-850/70 hover:bg-slate-850" : "hover:bg-slate-900/30"
                          }`}
                        >
                          <td className="p-3.5 font-mono text-slate-500 font-bold">{doc.id}</td>
                          <td className="p-3.5">
                            <div className="font-medium flex items-center gap-2 justify-start">
                              {doc.name.endsWith(".xlsx") || doc.name.endsWith(".xls") ? (
                                <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
                              ) : (
                                <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                              )}
                              <span className="line-clamp-1 text-slate-200 font-sans" title={doc.name}>{doc.name}</span>
                            </div>
                            
                            {/* Indicators */}
                            <div className="flex items-center gap-2 mt-1 justify-start">
                              {doc.isLegalHold && (
                                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/25 text-[8px] px-1 rounded flex items-center gap-0.5">
                                  <Lock className="h-2 w-2" /> وقف قانوني
                                </span>
                              )}
                              {doc.signatureStatus === "Signed" ? (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[8px] px-1 rounded flex items-center gap-0.5 font-bold">
                                  <CheckCircle2 className="h-2 w-2" /> ختم وتوقيع معتمد
                                </span>
                              ) : doc.signatureStatus === "PartiallySigned" ? (
                                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/25 text-[8px] px-1 rounded flex items-center gap-0.5">
                                  <FileSignature className="h-2 w-2" /> توقيع معلق
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-400 font-bold">{doc.version}</td>
                          <td className="p-3.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getSecurityBadgeClass(doc.securityLevel)}`}>
                              {getSecurityLabel(doc.securityLevel)}
                            </span>
                          </td>
                          <td className="p-3.5 text-left" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => launchOcrScanner(doc)}
                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded transition-all"
                                title="المستخلص الذكي OCR بالذكاء الاصطناعي"
                              >
                                <Sparkles className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleSecureDownload(doc)}
                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded transition-all"
                                title="تنزيل الملف آمن"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded transition-all"
                                title="حذف نهائي"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {documents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-slate-500 font-sans">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30 text-slate-400 animate-pulse" />
                          لا توجد مستندات مطابقة لمعايير البحث في الأرشيف حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel: Compliance Inspector */}
          <div className="lg:col-span-1 space-y-4">
            {activeDoc ? (
              <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-4 space-y-5 text-right">
                <div className="border-b border-slate-850 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30">
                      مفتش الامتثال الدولي
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{activeDoc.id}</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-200 mt-2 line-clamp-2 leading-relaxed">
                    {activeDoc.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-1">
                    أرشفة: {activeDoc.uploadedAt} بواسطة {activeDoc.uploadedBy}
                  </p>
                </div>

                {/* Compliance & Holds */}
                <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-850">
                  <h4 className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 justify-start">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> الحماية والامتثال الدولي (Legal hold)
                  </h4>
                  
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-300 font-sans">حماية وقف الحذف النشط:</span>
                    <button
                      onClick={() => handleToggleLegalHold(activeDoc)}
                      className={`px-2.5 py-1 rounded text-[9px] font-bold border transition-all ${
                        activeDoc.isLegalHold 
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/30" 
                          : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300"
                      }`}
                    >
                      {activeDoc.isLegalHold ? "نشط ومقفل 🔒" : "إيقاف خامل 🔓"}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">مدة الحفظ القانوني:</span>
                    <span className="font-mono text-slate-300 font-bold">{activeDoc.retentionYears} سنوات</span>
                  </div>

                  <div className="pt-2 border-t border-slate-900 space-y-1">
                    <span className="text-[9px] text-slate-500 block font-bold">بصمة النزاهة SHA-256:</span>
                    <code className="font-mono text-[8px] bg-[#050811] text-slate-400 block p-1 rounded break-all border border-slate-850">
                      {activeDoc.sha256}
                    </code>
                  </div>
                </div>

                {/* Version History */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 justify-start">
                      <History className="h-3.5 w-3.5 text-indigo-400" /> شجرة الإصدارات ({activeDoc.versions?.length || 0})
                    </h4>
                    <button
                      onClick={() => setIsVersionModalOpen(true)}
                      className="text-[9px] font-bold text-indigo-400 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> ترقية نسخة
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {activeDoc.versions?.map((ver, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-lg text-[10px] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-slate-200 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {ver.version}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(ver.modifiedAt).toISOString().split("T")[0]}
                          </span>
                        </div>
                        <p className="text-slate-300 font-sans text-[9px] pt-1">السبب: {ver.reason}</p>
                        <div className="flex items-center justify-between text-[8px] text-slate-500 pt-1">
                          <span>الحجم: {ver.size} • {ver.modifiedBy}</span>
                          {ver.version !== activeDoc.version && (
                            <button
                              onClick={() => handleRollbackVersion(ver.version)}
                              className="text-indigo-400 hover:underline font-bold"
                            >
                              استرجاع ↩
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature stamp */}
                <div className="space-y-3 pt-3 border-t border-slate-850">
                  <h4 className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 justify-start">
                    <FileSignature className="h-3.5 w-3.5 text-emerald-400" /> التوقيع والختم الرقمي (PKI Signature)
                  </h4>

                  {activeDoc.signatures && activeDoc.signatures.length > 0 ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg space-y-2 text-right font-sans">
                      <div className="flex items-center gap-1.5 justify-start">
                        <Check className="h-4 w-4 text-emerald-400 bg-emerald-500/10 rounded-full p-0.5" />
                        <span className="text-[10px] text-emerald-400 font-bold">مصدق رقمياً بالكامل</span>
                      </div>
                      {activeDoc.signatures.map((sig, sidx) => (
                        <div key={sidx} className="text-[9px] text-slate-300 space-y-0.5">
                          <p className="font-bold">الموقع: {sig.signer}</p>
                          <p className="text-slate-500 font-mono text-[8px]">البصمة: {sig.signatureHash?.substring(0, 20)}...</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-center space-y-2.5">
                      <p className="text-[10px] text-slate-500">هذا المستند غير موقع حالياً ومطالب بالختم المالي.</p>
                      <button
                        onClick={() => setIsSignatureModalOpen(true)}
                        className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold transition-all cursor-pointer"
                      >
                        تطبيق توقيع الختم المالي المعتمد
                      </button>
                    </div>
                  )}
                </div>

                {/* Trail Logs */}
                <div className="space-y-3 pt-3 border-t border-slate-850">
                  <h4 className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 justify-start">
                    <Clock className="h-3.5 w-3.5 text-slate-400" /> سجلات المراقبة والتدقيق الشامل (DMS Trail)
                  </h4>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {activeDoc.auditLogs?.map((log, lidx) => (
                      <div key={lidx} className="border-r-2 border-indigo-500/30 pr-2.5 space-y-0.5 text-right">
                        <div className="flex items-center gap-1.5 justify-start">
                          <span className={`text-[8px] px-1 rounded font-bold ${
                            log.action === "إنشاء" ? "bg-blue-500/10 text-blue-400" :
                            log.action === "توقيع" ? "bg-emerald-500/10 text-emerald-400" :
                            "bg-purple-500/10 text-purple-400"
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-[8px] text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-300 font-sans">{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-8 text-center text-slate-500 h-full flex flex-col items-center justify-center">
                <Info className="h-8 w-8 text-slate-600 mb-2.5 opacity-60" />
                <h4 className="text-xs font-bold text-slate-300">مفتش الامتثال والمراقبة</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-xs">
                  اختر مستنداً من الجدول لعرض تاريخ التعديلات، سياسات الاحتفاظ، وتطبيق التواقيع الإلكترونية المشفرة.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* --- ENTERPRISE DISCOVERY & ADVANCED INTELLIGENT SEARCH PANEL --- */
        <div className="bg-[#080b13] border border-slate-800 rounded-xl p-5 space-y-6 text-right" dir="rtl">
          
          {/* Diagnostic Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg">
              <span className="text-[9px] text-slate-500 font-bold block">زمن الاستجابة للبحث (Latency)</span>
              <span className="text-sm font-mono font-bold text-slate-100 mt-1 block">
                {searchLatencyMs > 0 ? `${searchLatencyMs} ms` : "0 ms"}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[8px] text-emerald-500 font-mono font-bold">GIN index optimised</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg">
              <span className="text-[9px] text-slate-500 font-bold block">إجمالي نتائج الاستعلام الأخير</span>
              <span className="text-sm font-mono font-bold text-indigo-400 mt-1 block">
                {searchTotalCount} وثيقة متطابقة
              </span>
              <span className="text-[8px] text-slate-500 mt-1 block">تم تصفيتها بقواعد أمن المعلومات RLS</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg">
              <span className="text-[9px] text-slate-500 font-bold block">نموذج الاستدلال والمطابقة (AI Mode)</span>
              <span className="text-sm font-mono font-bold text-emerald-400 mt-1 block">
                {searchIsSemantic ? "Gemini-Embedding v2" : "PostgreSQL FTS"}
              </span>
              <span className="text-[8px] text-slate-500 mt-1 block">Arabic & English stemming enabled</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg">
              <span className="text-[9px] text-slate-500 font-bold block">إجمالي عمليات البحث للمنشأة</span>
              <span className="text-sm font-mono font-bold text-amber-500 mt-1 block">
                {searchAnalytics.totalSearches} استعلام ممركز
              </span>
              <span className="text-[8px] text-slate-500 mt-1 block">متوسط زمن البحث: {searchAnalytics.averageLatencyMs}ms</span>
            </div>
          </div>

          {/* Core Advanced Search Controls */}
          <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-lg space-y-4 relative">
            <div className="flex flex-col md:flex-row items-stretch gap-3 relative">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="اكتب استعلامك البحثي المتقدم هنا (أو استعن بالذكاء الاصطناعي للفهم الدلالي)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleExecuteSearch();
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-slate-700 text-right"
                />
                <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
                
                {/* Autocomplete suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute right-0 left-0 top-12 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl z-30 divide-y divide-slate-900 overflow-hidden text-right">
                    {suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchQuery(sug);
                          setShowSuggestions(false);
                          setTimeout(handleExecuteSearch, 50);
                        }}
                        className="w-full text-right p-3 text-xs hover:bg-slate-900/80 text-slate-300 hover:text-slate-100 transition-colors flex items-center gap-2 justify-start cursor-pointer"
                      >
                        <Search className="h-3 w-3 text-indigo-400 shrink-0" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setSearchIsSemantic(false)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    !searchIsSemantic 
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  نصي متقدم (FTS)
                </button>
                <button
                  type="button"
                  onClick={() => setSearchIsSemantic(true)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    searchIsSemantic 
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/25" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Sparkles className="h-3 w-3" /> دلالي ذكي (AI Semantic)
                </button>
              </div>

              <button
                type="button"
                onClick={handleExecuteSearch}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 justify-center cursor-pointer shrink-0"
              >
                {searchLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>استعلام فوري</span>
              </button>
            </div>

            {/* Quick Terms: Popular & Recents */}
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500 pt-1">
              <div className="flex items-center gap-1">
                <span>عمليات البحث الأخيرة:</span>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearchesList.slice(0, 3).map((r, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSearchQuery(r.query);
                        setTimeout(handleExecuteSearch, 50);
                      }}
                      className="bg-slate-950 hover:bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-850 hover:text-slate-200 cursor-pointer transition-colors"
                    >
                      {r.query}
                    </button>
                  ))}
                  {recentSearchesList.length === 0 && <span className="text-slate-600">لا يوجد</span>}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span>الأكثر تداولاً:</span>
                <div className="flex flex-wrap gap-1.5">
                  {popularSearchesList.slice(0, 3).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSearchQuery(p.query);
                        setTimeout(handleExecuteSearch, 50);
                      }}
                      className="bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900/20 hover:text-indigo-300 cursor-pointer transition-colors"
                    >
                      {p.query}
                    </button>
                  ))}
                  {popularSearchesList.length === 0 && <span className="text-slate-600">لا يوجد</span>}
                </div>
              </div>

              <div className="mr-auto">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(true)}
                  disabled={!searchQuery}
                  className="text-indigo-400 hover:underline font-bold disabled:opacity-50 disabled:no-underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> حفظ هذا الاستعلام للرجوع السريع
                </button>
              </div>
            </div>
          </div>

          {/* Discovery Dashboard Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Intelligent Faceted Sidebar */}
            <div className="lg:col-span-1 bg-[#050811] border border-slate-850 p-4 rounded-lg space-y-5">
              <div className="border-b border-slate-850 pb-2">
                <h3 className="text-xs font-bold text-slate-200">مرشحات الاستكشاف الذكي (Facets)</h3>
              </div>

              {/* Category facets */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 block">فئات المستندات</label>
                <select
                  value={discCat}
                  onChange={(e) => setDiscCat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="all">كافة الفئات</option>
                  {facets.categories?.map((c: any, idx: number) => (
                    <option key={idx} value={c.name}>{getCategoryLabel(c.name)} ({c.count})</option>
                  ))}
                </select>
              </div>

              {/* Security facets */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 block">مستويات الأمان والسرية</label>
                <select
                  value={discSec}
                  onChange={(e) => setDiscSec(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="all">كافة مستويات السرية</option>
                  {facets.securityLevels?.map((s: any, idx: number) => (
                    <option key={idx} value={s.name}>{getSecurityLabel(s.name)} ({s.count})</option>
                  ))}
                </select>
              </div>

              {/* Extension facets */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 block">صيغ الملفات والملحقات</label>
                <select
                  value={discExt}
                  onChange={(e) => setDiscExt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="all">كافة الملحقات وصيغ التخزين</option>
                  {facets.extensions?.map((ext: any, idx: number) => (
                    <option key={idx} value={ext.name}>{ext.name.toUpperCase()} ({ext.count})</option>
                  ))}
                </select>
              </div>

              {/* Compliance checklist toggles */}
              <div className="space-y-2.5 pt-2 border-t border-slate-850">
                <label className="text-[10px] font-bold text-slate-400 block">حالة الامتثال والتواقيع</label>
                
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>تحت الوقف القانوني 🔒</span>
                  <input
                    type="checkbox"
                    checked={discHold === true}
                    onChange={(e) => setDiscHold(e.target.checked ? true : undefined)}
                    className="rounded bg-slate-900 border-slate-800 text-indigo-500 h-3.5 w-3.5"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>موقع ومختوم معتمد ✍️</span>
                  <input
                    type="checkbox"
                    checked={discSig === true}
                    onChange={(e) => setDiscSig(e.target.checked ? true : undefined)}
                    className="rounded bg-slate-900 border-slate-800 text-indigo-500 h-3.5 w-3.5"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>يحتوي على إصدارات قديمة ↪</span>
                  <input
                    type="checkbox"
                    checked={discVer === true}
                    onChange={(e) => setDiscVer(e.target.checked ? true : undefined)}
                    className="rounded bg-slate-900 border-slate-800 text-indigo-500 h-3.5 w-3.5"
                  />
                </div>
              </div>

              {/* Date ranges */}
              <div className="space-y-2 pt-2 border-t border-slate-850">
                <label className="text-[10px] font-bold text-slate-400 block">النطاق الزمني للأرشفة</label>
                <div className="space-y-1">
                  <input
                    type="date"
                    value={discDateFrom}
                    onChange={(e) => setDiscDateFrom(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                  />
                  <input
                    type="date"
                    value={discDateTo}
                    onChange={(e) => setDiscDateTo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* File size constraints */}
              <div className="space-y-2 pt-2 border-t border-slate-850">
                <label className="text-[10px] font-bold text-slate-400 block">نطاق حجم الملف (Size Range)</label>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <input
                    type="number"
                    placeholder="الأدنى (Bytes)"
                    value={discMinSize || ""}
                    onChange={(e) => setDiscMinSize(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none text-right font-mono"
                  />
                  <input
                    type="number"
                    placeholder="الأقصى (Bytes)"
                    value={discMaxSize || ""}
                    onChange={(e) => setDiscMaxSize(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none text-right font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDiscCat("all");
                    setDiscSec("all");
                    setDiscExt("all");
                    setDiscHold(undefined);
                    setDiscSig(undefined);
                    setDiscVer(undefined);
                    setDiscMinSize(undefined);
                    setDiscMaxSize(undefined);
                    setDiscDateFrom("");
                    setDiscDateTo("");
                    setSearchQuery("");
                    setSearchResults([]);
                    setSearchTotalCount(0);
                  }}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded text-[10px] font-bold transition-all cursor-pointer"
                >
                  تصفير الفلاتر والمرشحات
                </button>
              </div>

            </div>

            {/* Staggered Intelligent Search Results Grid */}
            <div className="lg:col-span-3 space-y-4">
              
              {searchLoading ? (
                <div className="bg-[#0b0f19] border border-slate-800 p-12 text-center text-slate-400 rounded-lg">
                  <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-indigo-500" />
                  <p className="text-xs font-bold">جاري استعلام ومعالجة قواعد البيانات ومطابقتها دلالياً...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((res, idx) => (
                    <div 
                      key={idx}
                      className="bg-[#0b0f19] border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition-all text-right"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2 justify-start">
                          <span className="font-mono text-[9px] font-bold text-slate-500">{res.documentId}</span>
                          <h4 className="text-xs font-bold text-slate-200 font-sans">{res.name}</h4>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            res.score > 0.8 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            res.score > 0.4 ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                            "bg-slate-800 text-slate-400"
                          }`}>
                            🎯 تطابق: {Math.round(res.score * 100)}%
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${getSecurityBadgeClass(res.securityLevel)}`}>
                            {getSecurityLabel(res.securityLevel)}
                          </span>
                        </div>

                        {/* OCR Highlights & Snippets */}
                        {res.snippet && (
                          <div className="bg-slate-950 p-2.5 rounded border border-slate-850 text-[10px] text-slate-400 leading-relaxed font-sans mt-1">
                            <span className="text-[8px] font-bold text-indigo-400 block mb-1">تطابق النص المستخلص (OCR Highlight):</span>
                            <p className="line-clamp-2" dangerouslySetInnerHTML={{ __html: res.snippet.replace(searchQuery, `<strong class="text-indigo-300 font-bold underline bg-indigo-500/10 px-1 py-0.5 rounded">${searchQuery}</strong>`) }} />
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[9px] text-slate-500 pt-0.5">
                          <span>الفئة: {getCategoryLabel(res.category)}</span>
                          <span>•</span>
                          <span>الحجم: {res.sizeBytes ? `${(res.sizeBytes / 1024).toFixed(1)} KB` : "N/A"}</span>
                          <span>•</span>
                          <span>صيغة الملف: {res.extension?.toUpperCase()}</span>
                          {res.isLegalHold && (
                            <>
                              <span>•</span>
                              <span className="text-amber-500 font-bold">تحت الحظر القانوني</span>
                            </>
                          )}
                          {res.hasSignature && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">مختوم رقمياً معتمد</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end border-t md:border-t-0 border-slate-850 pt-2 md:pt-0 shrink-0">
                        <button
                          onClick={async () => {
                            // Find matching original document and open compliance panel
                            const match = documents.find(d => d.id === res.documentId);
                            if (match) {
                              setActiveDoc(match);
                              setActiveTab("explorer");
                            } else {
                              setError("يرجى استكشاف وتعديل الملف مباشرة عبر شاشة المستكشف الرئيسي.");
                            }
                          }}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-300 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Info className="h-3 w-3" /> تفاصيل الامتثال
                        </button>

                        <button
                          onClick={async () => {
                            const match = documents.find(d => d.id === res.documentId);
                            if (match) handleSecureDownload(match);
                          }}
                          className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-slate-100 rounded transition-all cursor-pointer"
                          title="تنزيل الملف آمن"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#0b0f19] border border-slate-800 p-12 text-center text-slate-500 rounded-lg">
                  <Search className="h-10 w-10 mx-auto mb-3 opacity-30 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-300">أدخل معايير الاستعلام في المحرك الممركز</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-sm mx-auto">
                    استخدم الكلمات المفتاحية، الأرقام التعاقدية، أو صيغ الفواتير للحصول على نتائج مطابقة فورية مصحوبة بمستخلصات القراءة الضوئية OCR.
                  </p>
                </div>
              )}

              {/* Administrative Integrity & Index Management Panel */}
              <div className="bg-[#050811] border border-slate-850 p-4 rounded-lg space-y-4">
                <div className="border-b border-slate-850 pb-2">
                  <h3 className="text-xs font-bold text-slate-200">التحكم الإداري وصحة الفهارس الذكية</h3>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-right w-full">
                    <h4 className="text-[10px] font-bold text-slate-300">إدارة فهرس البحث المركزي</h4>
                    <p className="text-[9px] text-slate-500 font-sans leading-relaxed">
                      في حال تعديل أو أرشفة كمية ضخمة من المستندات خارج النظام، يوصى بإعادة بناء الفهرس لضمان دقة الاستعلام والبحث الدلالي.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleIntegrityCheck}
                      disabled={isVerifying}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {isVerifying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                      <span>فحص النزاهة والربط</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleManualRebuildIndex}
                      disabled={isRebuilding}
                      className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {isRebuilding ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      <span>إعادة بناء الفهرس بالكامل</span>
                    </button>
                  </div>
                </div>

                {/* Integrity results view */}
                {indexIntegrity && (
                  <div className="bg-slate-950 p-3 rounded border border-slate-850 space-y-2 text-[10px] font-mono leading-relaxed">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">الحالة الإجمالية للفهرس:</span>
                      <span className={indexIntegrity.isHealthy ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                        {indexIntegrity.isHealthy ? "سليم ومتطابق بالكامل 🟢" : "يوجد مفقودات ⚠️"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-right pt-1 border-t border-slate-900">
                      <div>
                        <span className="text-slate-500">فهارس يتيمة (Orphan indexes):</span>
                        <span className="text-slate-300 block font-bold">{indexIntegrity.orphanIndexes?.length || 0} فهارس</span>
                      </div>
                      <div>
                        <span className="text-slate-500">مستندات غير مفهرسة:</span>
                        <span className="text-slate-300 block font-bold">{indexIntegrity.missingIndexes?.length || 0} مستندات</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>

        </div>
      )}

      {/* --- MODALS --- */}

      {/* Save Search Query Dialog Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl w-full max-w-md shadow-2xl p-5 text-right space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Bookmark className="h-4 w-4 text-indigo-400" /> حفظ استعلام البحث المتقدم
              </h3>
              <button onClick={() => setIsSaveModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveSearchQuery} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block">اسم للاستعلام المحفوظ</label>
                <input
                  type="text"
                  placeholder="مثال: فواتير المشتريات المعلقة"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1 bg-slate-950 p-2.5 rounded border border-slate-900 text-[10px] font-mono text-slate-500">
                <span className="block font-bold">الاستعلام المسجل:</span>
                <span className="text-slate-300 break-all block">{searchQuery}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs font-bold transition-all"
                >
                  حفظ الاستعلام
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. OCR Laser Scanning Simulator */}
      {showOcrSimulator && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0b0f19] border border-slate-850 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[650px]">
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 justify-start">
                <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="text-xs font-bold text-slate-100">محلل القراءة الضوئية الذكي (AI OCR Data Extractor)</h3>
                  <span className="text-[9px] text-slate-500 font-mono">Powered by Gemini 3.5 AI Vision Core</span>
                </div>
              </div>
              <button onClick={() => setShowOcrSimulator(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden bg-[#070a12]">
              <div className="p-6 border-l border-slate-850 flex flex-col items-center justify-center bg-[#05070d] relative overflow-hidden">
                <div className="w-[310px] h-[400px] bg-slate-950 border border-slate-800 rounded-lg p-5 shadow-2xl relative flex flex-col justify-between overflow-hidden z-10">
                  {ocrStep === "scanning" && (
                    <div className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-bounce" />
                  )}
                  <div className="space-y-4 text-right">
                    <span className="text-[8px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded">رؤية حاسوبية نشطة</span>
                    <h5 className="text-[10px] font-bold text-slate-300">{ocrFileName}</h5>
                    <div className="border border-slate-900 p-4 rounded text-[9px] font-mono space-y-1 bg-slate-950/50">
                      <p>COMPANY: {ocrExtractedData.companyName || "PENDING..."}</p>
                      <p>TAX ID: {ocrExtractedData.taxId || "PENDING..."}</p>
                      <p>AMOUNT: {ocrExtractedData.totalAmount || "PENDING..."}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 flex flex-col justify-between bg-[#080d1a] text-right">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-200">النتائج المستخلصة بالذكاء الاصطناعي</h4>
                  <div className="space-y-3">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                      <label className="text-[10px] text-slate-500 font-bold block">اسم المنشأة/الجهة</label>
                      <span className="text-xs text-slate-200 font-bold block mt-0.5">{ocrExtractedData.companyName || "قيد المسح..."}</span>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                      <label className="text-[10px] text-slate-500 font-bold block">الرقم الضريبي الموحد</label>
                      <span className="text-xs text-slate-200 font-bold block mt-0.5">{ocrExtractedData.taxId || "قيد المسح..."}</span>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                      <label className="text-[10px] text-slate-500 font-bold block">القيمة الإجمالية ومطابقة القيمة المضافة</label>
                      <span className="text-xs text-slate-200 font-bold block mt-0.5">{ocrExtractedData.totalAmount || "قيد المسح..."}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-end pt-3">
                  <button onClick={() => setShowOcrSimulator(false)} className="px-4 py-2 border border-slate-850 hover:bg-slate-850 text-slate-400 text-xs font-bold rounded">إغلاق</button>
                  {ocrStep === "idle" && (
                    <button onClick={triggerOcrScanningProcess} className={`px-5 py-2 rounded text-slate-950 font-bold text-xs ${clr.accent}`}>بدء التحليل الضوئي</button>
                  )}
                  {ocrStep === "completed" && (
                    <button onClick={handleApplyOcrData} className={`px-5 py-2 rounded text-slate-950 font-bold text-xs ${clr.accent}`}>حفظ البيانات المستخلصة</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-2xl text-right">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2 justify-start mb-4">
              <FolderOpen className={`h-4.5 w-4.5 ${clr.text}`} /> فحص وتوثيق المستند الجديد (GDMS Central Sync)
            </h3>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block font-bold mb-1">اسم الملف الفعلي</label>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block font-bold mb-1">تصنيف المستند</label>
                  <select
                    value={uploadCat}
                    onChange={(e) => setUploadCat(e.target.value as ERPDocument["category"])}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none"
                  >
                    <option value="General">أوراق عامة وتأسيس</option>
                    <option value="Invoice">فواتير ومطالبات مالية</option>
                    <option value="Contract">عقود واتفاقيات</option>
                    <option value="Tax">ملفات ضريبية ونماذج قانونية</option>
                    <option value="Payroll">مسيرات رواتب وأجور</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block font-bold mb-1">سرية الوصول</label>
                  <select
                    value={uploadSec}
                    onChange={(e) => setUploadSec(e.target.value as ERPDocument["securityLevel"])}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none"
                  >
                    <option value="Public">تداول عام (Public)</option>
                    <option value="Internal">داخلي (Internal)</option>
                    <option value="Confidential">سري ومحدود (Confidential)</option>
                    <option value="Highly Confidential">سري للغاية وحساس</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block font-bold mb-1">المجلد الأرشيفي المستهدف</label>
                  <select
                    value={uploadFolder}
                    onChange={(e) => setUploadFolder(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none font-bold"
                  >
                    {folders.map(fold => (
                      <option key={fold.id} value={fold.id}>{fold.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block font-bold mb-1">مدة الحفظ القانوني</label>
                  <select
                    value={uploadRetention}
                    onChange={(e) => setUploadRetention(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none font-mono"
                  >
                    <option value={3}>3 سنوات (مؤقت)</option>
                    <option value={5}>5 سنوات (قياسي)</option>
                    <option value={7}>7 سنوات (قوانين ضرائب)</option>
                    <option value={10}>10 سنوات (تأسيسي)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 border-t border-slate-850">
                <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 border border-slate-850 hover:bg-slate-850 text-slate-400 text-xs font-bold rounded">إلغاء</button>
                <button type="submit" className={`px-5 py-2 rounded text-slate-950 font-bold text-xs ${clr.accent}`}>أرشفة وتشفير الوثيقة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create Custom Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl text-right">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2 justify-start mb-4">
              <FolderOpen className={`h-4.5 w-4.5 ${clr.text}`} /> إنشاء مجلد أرشيفي مخصص (Dynamic Directory)
            </h3>

            <form onSubmit={handleCreateFolder} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block font-bold mb-1">اسم المجلد</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block font-bold mb-1">وصف المجلد</label>
                <textarea
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none h-20"
                />
              </div>

              <div>
                <label className="text-slate-400 block font-bold mb-1">نمط الأيقونة</label>
                <select
                  value={newFolderIcon}
                  onChange={(e) => setNewFolderIcon(e.target.value as ERPFolder["iconType"])}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none"
                >
                  <option value="general">مجلد عام وأوراق تأسيس</option>
                  <option value="legal">عقود واتفاقيات قانونية</option>
                  <option value="finance">فواتير ومطالبات مالية</option>
                  <option value="tax">ملفات ضريبية مخصصة</option>
                  <option value="hr">مسيرات موارد بشرية</option>
                </select>
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 border-t border-slate-850">
                <button type="button" onClick={() => setIsFolderModalOpen(false)} className="px-4 py-2 border border-slate-850 hover:bg-slate-850 text-slate-400 text-xs font-bold rounded">إلغاء</button>
                <button type="submit" className={`px-5 py-2 rounded text-slate-950 font-bold text-xs ${clr.accent}`}>حفظ وتوثيق المجلد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Document Version Modal */}
      {isVersionModalOpen && activeDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl text-right">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2 justify-start mb-4">
              <History className={`h-4.5 w-4.5 ${clr.text}`} /> رفع وتحديث إصدار المستند (Version Control)
            </h3>

            <form onSubmit={handleAddVersion} className="space-y-4 text-xs">
              <div className="bg-slate-900/50 p-3 rounded border border-slate-850 space-y-1">
                <p className="text-slate-400">اسم المستند الحالي: <span className="text-slate-200 font-bold">{activeDoc.name}</span></p>
                <p className="text-slate-400">الإصدار النشط حالياً: <span className="font-mono text-indigo-400 font-bold">{activeDoc.version}</span></p>
              </div>

              <div>
                <label className="text-slate-400 block font-bold mb-1 font-sans">سبب ترقية ورفع هذا الإصدار الجديد</label>
                <input
                  type="text"
                  required
                  value={newVersionReason}
                  onChange={(e) => setNewVersionReason(e.target.value)}
                  placeholder="مثال: تعديل شروط الدفع والتحصيل النهائي"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block font-bold mb-1">اختر ملف النسخة الجديدة</label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedVersionFile(e.target.files[0]);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 border-t border-slate-850">
                <button type="button" onClick={() => setIsVersionModalOpen(false)} className="px-4 py-2 border border-slate-850 hover:bg-slate-850 text-slate-400 text-xs font-bold rounded">إلغاء</button>
                <button type="submit" className={`px-5 py-2 rounded text-slate-950 font-bold text-xs ${clr.accent}`}>إصدار الترقية الجديدة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Cryptographic Signature stamp */}
      {isSignatureModalOpen && activeDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl text-right">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2 justify-start mb-4">
              <FileSignature className={`h-4.5 w-4.5 ${clr.text}`} /> تصديق وتوقيع الختم المالي القومي (e-Sign)
            </h3>

            <form onSubmit={handleSignDocument} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850 space-y-1.5 text-[11px] text-slate-300 leading-relaxed font-sans">
                <p>مستند التوقيع المالي المعني: <span className="text-slate-100 font-bold">{activeDoc.name}</span></p>
                <p>سيتم استخدام التوقيع المصادق بجلسة المستخدم الحالي الموثقة لدى الخادم.</p>
                <p className="text-emerald-400 font-bold flex items-center gap-1 mt-1 justify-start">
                  <Lock className="h-3.5 w-3.5 animate-pulse" /> التوقيع يتم بتعميم الختم الرسمي وتوليد بصمة SHA-256 مشفرة مدموجة.
                </p>
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 border-t border-slate-850">
                <button type="button" onClick={() => setIsSignatureModalOpen(false)} className="px-4 py-2 border border-slate-850 hover:bg-slate-850 text-slate-400 text-xs font-bold rounded">إلغاء</button>
                <button type="submit" className={`px-5 py-2 rounded text-slate-950 font-bold text-xs ${clr.accent}`}>توليد الختم المالي</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
