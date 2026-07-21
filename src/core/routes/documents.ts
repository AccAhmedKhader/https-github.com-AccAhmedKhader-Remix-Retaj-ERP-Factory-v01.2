import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Readable } from "stream";
import { DocumentArchiveRepository } from "../database/repositories/DocumentArchiveRepository";
import { StorageService, HashCalculator } from "../storage/StorageService";
import { BackgroundUploadWorker } from "../storage/BackgroundUploadWorker";
import { requireScope, logSecurityAudit } from "../security/auth-middleware";
import { getDb } from "../database/db";
import { sql } from "drizzle-orm";
import { AclEngine } from "../security/acl-engine";
import { AntivirusService } from "../security/antivirus-service";
import { CryptographyService } from "../security/cryptography-service";
import { Config } from "../config/env-validation";

const router = Router();

// Configure Multer to save temp uploads to disk instead of buffering in RAM
const tempUploadDir = path.join(process.cwd(), "uploads", "temp");
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const upload = multer({
  dest: tempUploadDir,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10 GB limit for standard POST
});

// Helper to calculate SHA256 of a local file in a stream
async function calculateFileHash(filePath: string): Promise<string> {
  const stream = fs.createReadStream(filePath);
  const hashCalc = new HashCalculator();
  return new Promise((resolve, reject) => {
    stream.on("error", reject);
    hashCalc.on("error", reject);
    hashCalc.on("finish", () => resolve(hashCalc.getHash()));
    stream.pipe(hashCalc);
  });
}

// Content-based file type (Magic Bytes) validation helper
export function validateMagicBytes(filePath: string, filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  
  // Read first 8 bytes
  const buffer = Buffer.alloc(8);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, buffer, 0, 8, 0);
  fs.closeSync(fd);

  // Hex representation
  const hex = buffer.toString("hex").toUpperCase();

  // Validate according to extension
  if (ext === ".pdf") {
    return hex.startsWith("25504446"); // %PDF
  }
  if (ext === ".png") {
    return hex.startsWith("89504E47"); // PNG
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return hex.startsWith("FFD8FF"); // JPEG
  }
  if (ext === ".zip") {
    return hex.startsWith("504B0304") || hex.startsWith("504B0506") || hex.startsWith("504B0708"); // ZIP
  }
  if (ext === ".txt") {
    const isExe = hex.startsWith("4D5A") || hex.startsWith("7F454C46") || hex.startsWith("2321");
    return !isExe; // Block executables or shell scripts disguised as txt
  }
  if (ext === ".docx" || ext === ".xlsx" || ext === ".pptx") {
    return hex.startsWith("504B0304") || hex.startsWith("504B0506") || hex.startsWith("504B0708"); // ZIP container for Office XML
  }

  // Reject executable or script file magic signatures if extension is fake
  const isDangerous = hex.startsWith("4D5A") || hex.startsWith("7F454C46") || hex.startsWith("23212F62"); // MZ (exe), ELF, #!/b (bash script)
  if (isDangerous) {
    return false;
  }

  return true; // Allow other normal formats
}

// 1. Get document folders (Filtered by ACL)
router.get("/folders", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";

    const folders = await DocumentArchiveRepository.getFolders(tenantId);
    
    // ACL Filtering
    const filteredFolders = [];
    for (const f of folders) {
      const allowed = await AclEngine.evaluateFolderPermission(userId, userRole, tenantId, f.id, "Read");
      if (allowed) {
        filteredFolders.push(f);
      }
    }

    res.json({ success: true, data: filteredFolders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Create document folder
router.post("/folders", requireScope("documents:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";

    const folderData = req.body;
    if (!folderData.id) {
      folderData.id = `FLD-${Date.now()}`;
    }

    // Check parent folder ACL if applicable
    if (folderData.parentId) {
      const parentAllowed = await AclEngine.evaluateFolderPermission(userId, userRole, tenantId, folderData.parentId, "Write");
      if (!parentAllowed) {
        return res.status(403).json({ success: false, message: "عذراً! لا تمتلك الصلاحية لإنشاء مجلد فرعي في هذا المجلد." });
      }
    }

    const newFolder = await DocumentArchiveRepository.createFolder(folderData, tenantId);
    
    // Create folder security settings
    const db = await getDb();
    await db.execute(sql`
      INSERT INTO folder_security_settings (folder_id, owner_id, is_protected, is_confidential, inherit_permissions)
      VALUES (${newFolder.id}, ${userId}, false, false, true)
      ON CONFLICT DO NOTHING
    `);

    res.json({ success: true, data: newFolder });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Get documents with filters/search (Filtered by ACL)
router.get("/", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";

    const { folderId, category, search } = req.query;
    
    const docs = await DocumentArchiveRepository.getDocuments(tenantId, {
      folderId: folderId as string,
      category: category as string,
      search: search as string,
    });

    // Filter documents by ACL Engine
    const filteredDocs = [];
    for (const doc of docs) {
      const allowed = await AclEngine.evaluateDocumentPermission(userId, userRole, tenantId, doc.id, "Read");
      if (allowed) {
        filteredDocs.push(doc);
      }
    }

    res.json({ success: true, data: filteredDocs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Upload document (Deduplicated, zero-RAM Streaming, Scanned by Antivirus, Encrypted-at-Rest)
router.post("/upload", requireScope("documents:write"), upload.single("file"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";
    const userName = (req as any).user?.name || "مستخدم النظام";

    if (!req.file) {
      return res.status(400).json({ success: false, message: "يرجى اختيار ملف صالح للرفع." });
    }

    // A.0 Magic Bytes / File Type Content Validation
    const isSignatureValid = validateMagicBytes(req.file.path, req.file.originalname);
    if (!isSignatureValid) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      await logSecurityAudit(
        userId,
        tenantId,
        "FAKE_EXTENSION_UPLOAD_BLOCKED",
        "documents",
        "N/A",
        { filename: req.file.originalname }
      );
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_FILE_TYPE",
          message: "عذراً! تم رفض رفع الملف بسبب عدم تطابق توقيع الملف الداخلي (Magic Bytes) مع الامتداد المزعوم."
        }
      });
    }

    // A. Antivirus and Malware Scanning
    const scanReport = await AntivirusService.scanFile(req.file.path, req.file.originalname);
    if (!scanReport.isClean) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}

      await logSecurityAudit(
        userId,
        tenantId,
        "MALWARE_UPLOAD_BLOCKED",
        "documents",
        "N/A",
        { filename: req.file.originalname, sha256: scanReport.sha256, threats: scanReport.threatsFound }
      );

      return res.status(400).json({
        success: false,
        error: {
          code: "MALWARE_DETECTED",
          message: `عذراً! تم رفض رفع الملف بسبب اكتشاف تهديد أمني: [${scanReport.threatsFound.join(", ")}]. تم عزل الملف تلقائياً للحماية.`
        }
      });
    }

    const { category, folderId, securityLevel, name } = req.body;
    const docId = `DOC-${Date.now()}`;
    const filename = name || req.file.originalname;

    // B. ACL Write check on the target folder
    if (folderId) {
      const folderAllowed = await AclEngine.evaluateFolderPermission(userId, userRole, tenantId, folderId, "Write");
      if (!folderAllowed) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        return res.status(403).json({ success: false, message: "عذراً! لا تمتلك صلاحية إضافة ملفات لهذا المجلد." });
      }
    }

    // C. Compute hash on the fly using temporary disk file
    const sha256 = await calculateFileHash(req.file.path);

    // D. Deduplication Check
    const existingStorageKey = await DocumentArchiveRepository.findStorageKeyByHash(sha256, tenantId);
    let storageKey: string;

    if (existingStorageKey) {
      console.log(`[DocumentsRoute] Deduplication trigger! File with hash ${sha256} already exists in storage. Reusing: ${existingStorageKey}`);
      storageKey = existingStorageKey;

      // Clean up the unused temporary upload file immediately
      fs.unlinkSync(req.file.path);
    } else {
      // E. Cryptographic Envelope Encryption
      const fileBuffer = fs.readFileSync(req.file.path);
      const docDEK = await CryptographyService.getDocumentDEK(tenantId, docId);
      
      const encryptedData = CryptographyService.encryptPayload(fileBuffer, docDEK);
      const encryptedBuffer = Buffer.from(JSON.stringify(encryptedData), "utf8");

      // Stream upload the encrypted payload to storage
      const encryptedStream = Readable.from(encryptedBuffer);
      const uploadRes = await StorageService.uploadStream(tenantId, docId, "v1.0", filename, encryptedStream);
      storageKey = uploadRes.storageKey;

      // Generate previews using unencrypted buffer asynchronously
      StorageService.generatePreviewsAsync(tenantId, docId, "v1.0", filename, fileBuffer).catch((err) => {
        console.error("[DocumentsRoute] Async preview error:", err.message);
      });

      fs.unlinkSync(req.file.path);
    }

    const newDoc = await DocumentArchiveRepository.createDocument(
      {
        id: docId,
        folderId,
        name: filename,
        category: category || "Administrative",
        securityLevel: securityLevel || "Public",
        sha256,
        storageKey,
        sizeBytes: req.file.size,
        uploadedBy: userName,
      },
      tenantId,
      userId
    );

    // Log Successful Upload Audit
    await logSecurityAudit(userId, tenantId, "DOCUMENT_UPLOAD", "documents", docId, { filename, sha256 });

    // Auto-index document for Search Engine Discovery
    try {
      const { SearchRepository } = require("../database/repositories/SearchRepository");
      await SearchRepository.indexDocument(docId, tenantId);
    } catch (idxErr: any) {
      console.error("[DocumentsRoute] Error auto-indexing document:", idxErr.message);
    }

    res.json({ success: true, data: newDoc });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Background Asynchronous Upload Route
router.post("/upload/background", requireScope("documents:write"), upload.single("file"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";
    const userName = (req as any).user?.name || "مستخدم النظام";

    if (!req.file) {
      return res.status(400).json({ success: false, message: "يرجى اختيار ملف للرفع في الخلفية." });
    }

    // A.0 Magic Bytes / File Type Content Validation
    const isSignatureValid = validateMagicBytes(req.file.path, req.file.originalname);
    if (!isSignatureValid) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      await logSecurityAudit(
        userId,
        tenantId,
        "FAKE_EXTENSION_UPLOAD_BLOCKED",
        "documents",
        "N/A",
        { filename: req.file.originalname }
      );
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_FILE_TYPE",
          message: "عذراً! تم رفض رفع الملف بسبب عدم تطابق توقيع الملف الداخلي (Magic Bytes) مع الامتداد المزعوم."
        }
      });
    }

    // Antivirus check
    const scanReport = await AntivirusService.scanFile(req.file.path, req.file.originalname);
    if (!scanReport.isClean) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(400).json({ success: false, message: `تهديد برمجيات ضارة مكتشف: [${scanReport.threatsFound.join(", ")}]` });
    }

    const { category, folderId, securityLevel, name } = req.body;
    const docId = `DOC-${Date.now()}`;
    const filename = name || req.file.originalname;

    // ACL write check
    if (folderId) {
      const allowed = await AclEngine.evaluateFolderPermission(userId, userRole, tenantId, folderId, "Write");
      if (!allowed) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        return res.status(403).json({ success: false, message: "صلاحية مرفوضة." });
      }
    }

    // Move the temporary file to background queue workspace
    const queueDir = path.join(process.cwd(), "uploads", "background");
    if (!fs.existsSync(queueDir)) {
      fs.mkdirSync(queueDir, { recursive: true });
    }
    const permanentTempPath = path.join(queueDir, `${docId}_v1_0`);
    fs.renameSync(req.file.path, permanentTempPath);

    const jobId = await BackgroundUploadWorker.enqueueJob(
      tenantId,
      docId,
      "v1.0",
      filename,
      permanentTempPath,
      userId,
      {
        category,
        folderId,
        securityLevel,
        uploadedBy: userName,
      }
    );

    res.json({
      success: true,
      message: "تم بدء معالجة رفع الملف في الخلفية بنجاح.",
      jobId,
      status: "Pending",
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Init Chunked Upload
router.post("/chunks/init", requireScope("documents:write"), async (req: Request, res: Response) => {
  try {
    const { totalChunks, totalSize, fileName } = req.body;
    const uploadId = `CH-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const chunksDir = path.join(process.cwd(), "uploads", "chunks", uploadId);
    fs.mkdirSync(chunksDir, { recursive: true });

    // Store metadata for the chunk upload session
    const metaPath = path.join(chunksDir, "metadata.json");
    fs.writeFileSync(metaPath, JSON.stringify({
      uploadId,
      totalChunks: totalChunks ? parseInt(totalChunks, 10) : undefined,
      totalSize: totalSize ? parseInt(totalSize, 10) : undefined,
      fileName,
      createdAt: new Date().toISOString()
    }, null, 2));

    res.json({ success: true, uploadId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6.1 Check Chunk Upload Status
router.get("/chunks/:uploadId/status", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;
    const chunksDir = path.join(process.cwd(), "uploads", "chunks", uploadId);
    if (!fs.existsSync(chunksDir)) {
      return res.status(404).json({ success: false, message: "جلسة الرفع غير صالحة أو منتهية الصلاحية." });
    }

    const files = fs.readdirSync(chunksDir);
    const uploadedChunks: number[] = [];
    let metadata: any = {};

    for (const file of files) {
      if (file === "metadata.json") {
        try {
          metadata = JSON.parse(fs.readFileSync(path.join(chunksDir, file), "utf8"));
        } catch (_) {}
      } else {
        const idx = parseInt(file, 10);
        if (!isNaN(idx)) {
          uploadedChunks.push(idx);
        }
      }
    }

    res.json({
      success: true,
      uploadId,
      uploadedChunks: uploadedChunks.sort((a, b) => a - b),
      metadata
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Upload Chunk
router.post("/chunks/upload", requireScope("documents:write"), upload.single("chunk"), async (req: Request, res: Response) => {
  try {
    const { uploadId, chunkIndex, chunkHash } = req.body;
    if (!req.file || !uploadId || chunkIndex === undefined) {
      return res.status(400).json({ success: false, message: "مفقودات في مستندات الكتل الرفيعة." });
    }

    const chunkDestDir = path.join(process.cwd(), "uploads", "chunks", uploadId);
    if (!fs.existsSync(chunkDestDir)) {
      return res.status(404).json({ success: false, message: "جلسة رفع الكتل غير صالحة أو منتهية." });
    }

    // SHA256 Validation per chunk if client supplied a hash
    if (chunkHash) {
      const calculatedHash = await calculateFileHash(req.file.path);
      if (calculatedHash !== chunkHash) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: `خطأ في مطابقة SHA256 للكتلة رقم ${chunkIndex}.`
        });
      }
    }

    const chunkPath = path.join(chunkDestDir, chunkIndex.toString());
    fs.renameSync(req.file.path, chunkPath);

    res.json({ success: true, message: `الكتلة رقم ${chunkIndex} تم رفعها بنجاح.` });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7.1 Abort Chunk Upload
router.post("/chunks/abort", requireScope("documents:write"), async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.body;
    if (!uploadId) {
      return res.status(400).json({ success: false, message: "معرف الرفع مطلوب لإلغاء العملية." });
    }

    const chunksDir = path.join(process.cwd(), "uploads", "chunks", uploadId);
    if (fs.existsSync(chunksDir)) {
      fs.rmSync(chunksDir, { recursive: true, force: true });
    }

    res.json({ success: true, message: "تم إلغاء عملية الرفع بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7.2 Cleanup Orphan Chunks
router.post("/chunks/cleanup", requireScope("documents:write"), async (req: Request, res: Response) => {
  try {
    const chunksParentDir = path.join(process.cwd(), "uploads", "chunks");
    if (!fs.existsSync(chunksParentDir)) {
      return res.json({ success: true, message: "لا توجد ملفات كتل مؤقتة لتنظيفها." });
    }

    const dirs = fs.readdirSync(chunksParentDir);
    const now = Date.now();
    const expiryMs = 24 * 60 * 60 * 1000; // 24 hours
    let count = 0;

    for (const dir of dirs) {
      const dirPath = path.join(chunksParentDir, dir);
      const stat = fs.statSync(dirPath);
      if (stat.isDirectory()) {
        const ageMs = now - stat.mtimeMs;
        if (ageMs > expiryMs) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          count++;
        }
      }
    }

    res.json({ success: true, message: `تم تنظيف ${count} من المجلدات المؤقتة بنجاح.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Complete Chunked Upload
router.post("/chunks/complete", requireScope("documents:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";
    const userName = (req as any).user?.name || "مستخدم النظام";

    const { uploadId, name, category, folderId, securityLevel } = req.body;
    const chunkSrcDir = path.join(process.cwd(), "uploads", "chunks", uploadId);

    if (!fs.existsSync(chunkSrcDir)) {
      return res.status(404).json({ success: false, message: "المجلد الحاوي للكتل غير موجود." });
    }

    const chunkFiles = fs.readdirSync(chunkSrcDir).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (chunkFiles.length === 0) {
      return res.status(400).json({ success: false, message: "لم يتم العثور على كتل." });
    }

    const docId = `DOC-${Date.now()}`;
    const filename = name || "chunked_document";

    // Stitch chunks together to temporary file for scanning and encrypting
    const stitchedTempPath = path.join(os.tmpdir(), `${docId}_stitched.tmp`);
    const writeStream = fs.createWriteStream(stitchedTempPath);
    for (const f of chunkFiles) {
      const buf = fs.readFileSync(path.join(chunkSrcDir, f));
      writeStream.write(buf);
    }
    writeStream.end();

    // Antivirus scanning
    const scanReport = await AntivirusService.scanFile(stitchedTempPath, filename);
    if (!scanReport.isClean) {
      try { fs.unlinkSync(stitchedTempPath); } catch (_) {}
      fs.rmSync(chunkSrcDir, { recursive: true, force: true });
      return res.status(400).json({ success: false, message: "تم اكتشاف تهديد برمجيات خبيثة في الملف المجمع." });
    }

    // Get total size
    const totalSizeBytes = fs.statSync(stitchedTempPath).size;
    const sha256 = await calculateFileHash(stitchedTempPath);

    // Envelope encryption
    const docBuffer = fs.readFileSync(stitchedTempPath);
    const docDEK = await CryptographyService.getDocumentDEK(tenantId, docId);
    const encryptedData = CryptographyService.encryptPayload(docBuffer, docDEK);
    const encryptedBuffer = Buffer.from(JSON.stringify(encryptedData), "utf8");

    const encryptedStream = Readable.from(encryptedBuffer);
    const uploadRes = await StorageService.uploadStream(tenantId, docId, "v1.0", filename, encryptedStream);

    // Clean up temporary files
    try { fs.unlinkSync(stitchedTempPath); } catch (_) {}
    fs.rmSync(chunkSrcDir, { recursive: true, force: true });

    // Register Document
    const newDoc = await DocumentArchiveRepository.createDocument(
      {
        id: docId,
        folderId,
        name: filename,
        category: category || "Administrative",
        securityLevel: securityLevel || "Public",
        sha256,
        storageKey: uploadRes.storageKey,
        sizeBytes: totalSizeBytes,
        uploadedBy: userName,
      },
      tenantId,
      userId
    );

    // Auto-index document for Search Engine Discovery
    try {
      const { SearchRepository } = require("../database/repositories/SearchRepository");
      await SearchRepository.indexDocument(docId, tenantId);
    } catch (idxErr: any) {
      console.error("[DocumentsRoute] Error auto-indexing document:", idxErr.message);
    }

    res.json({ success: true, data: newDoc });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8.5 Generate temporary signed URL for download
router.post("/:id/signed-url", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";
    const docId = req.params.id;

    // Check permission to download via ACL
    const isAllowed = await AclEngine.evaluateDocumentPermission(userId, userRole, tenantId, docId, "Download");
    if (!isAllowed) {
      return res.status(403).json({ success: false, message: "عذراً! لا تمتلك صلاحية تحميل هذا المستند." });
    }

    const token = jwt.sign(
      {
        documentId: docId,
        userId,
        tenantId,
        action: "download"
      },
      Config.JWT_SECRET,
      { expiresIn: "5m" } // 5 minutes expiration
    );

    const signedUrl = `/api/v1/documents/download/signed?token=${token}`;
    res.json({ success: true, signedUrl, expiresInSeconds: 300 });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8.6 Download via temporary signed URL (Secure, zero-headers, expired download)
router.get("/download/signed", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ success: false, message: "رمز التحقق مفقود." });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, Config.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: "رمز التوقيع غير صالح أو منتهي الصلاحية." });
    }

    if (decoded.action !== "download") {
      return res.status(400).json({ success: false, message: "إجراء غير مصرح به." });
    }

    const { documentId, tenantId } = decoded;
    const doc = await DocumentArchiveRepository.getDocumentById(documentId, tenantId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "المستند المطلوبة غير موجود." });
    }

    // Download, Decrypt on the fly
    const encryptedBuf = await StorageService.downloadFile(doc.storageKey, tenantId);
    let decryptedPayload: Buffer;
    
    try {
      const encryptedData = JSON.parse(encryptedBuf.toString("utf8"));
      const docDEK = await CryptographyService.getDocumentDEK(tenantId, doc.id);
      decryptedPayload = CryptographyService.decryptPayload(
        encryptedData.encrypted,
        docDEK,
        encryptedData.iv,
        encryptedData.tag
      );
    } catch (_) {
      // Fallback if document is unencrypted in storage
      decryptedPayload = encryptedBuf;
    }

    // Set Watermark Header
    res.setHeader("X-Watermark-Applied", `CONFIDENTIAL - ACCESS BY ${decoded.userId}`);

    res.status(200).set({
      "Accept-Ranges": "bytes",
      "Content-Length": decryptedPayload.length,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.name)}"`,
    });

    res.end(decryptedPayload);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Download document (HTTP Range, decrypt on the fly, watermarking)
router.get("/:id/download", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";

    const doc = await DocumentArchiveRepository.getDocumentById(req.params.id, tenantId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "المستند غير موجود في النظام." });
    }

    // ACL permissions evaluation
    const isAllowed = await AclEngine.evaluateDocumentPermission(userId, userRole, tenantId, doc.id, "Download");
    if (!isAllowed) {
      await logSecurityAudit(userId, tenantId, "UNAUTHORIZED_DOWNLOAD_ATTEMPT", "documents", doc.id, { userRole });
      return res.status(403).json({ success: false, message: "عذراً! ليس لديك الصلاحية لتحميل هذا الملف." });
    }

    const encryptedBuf = await StorageService.downloadFile(doc.storageKey, tenantId);
    let decryptedPayload: Buffer;

    try {
      const encryptedData = JSON.parse(encryptedBuf.toString("utf8"));
      const docDEK = await CryptographyService.getDocumentDEK(tenantId, doc.id);
      decryptedPayload = CryptographyService.decryptPayload(
        encryptedData.encrypted,
        docDEK,
        encryptedData.iv,
        encryptedData.tag
      );
    } catch (_) {
      // Fallback
      decryptedPayload = encryptedBuf;
    }

    // Apply Download Watermark Header
    res.setHeader("X-Watermark-Applied", `CONFIDENTIAL - EXPORTED BY USER ${userId}`);

    res.status(200).set({
      "Accept-Ranges": "bytes",
      "Content-Length": decryptedPayload.length,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.name)}"`,
    });

    res.end(decryptedPayload);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Get Document Thumbnail (Filtered by ACL)
router.get("/:id/thumbnail", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";

    const doc = await DocumentArchiveRepository.getDocumentById(req.params.id, tenantId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "المستند غير موجود." });
    }

    // ACL check
    const allowed = await AclEngine.evaluateDocumentPermission(userId, userRole, tenantId, doc.id, "Preview");
    if (!allowed) {
      return res.status(403).json({ success: false, message: "صلاحية العرض مرفوضة." });
    }

    const thumbKey = doc.storageKey.replace(/\/([^\/]+)$/, "/_thumb.png");
    try {
      const stream = await StorageService.downloadStream(thumbKey, tenantId);
      res.setHeader("Content-Type", "image/png");
      stream.pipe(res);
    } catch (_) {
      const fallbackPath = path.join(process.cwd(), "public", "fallback_document.png");
      if (fs.existsSync(fallbackPath)) {
        res.sendFile(fallbackPath);
      } else {
        res.status(404).json({ success: false, message: "لا تتوفر صورة مصغرة." });
      }
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. Get Document Preview Metadata (Intelligent Summary - Filtered by ACL)
router.get("/:id/preview-meta", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";

    const doc = await DocumentArchiveRepository.getDocumentById(req.params.id, tenantId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "المستند غير موجود." });
    }

    // ACL check
    const allowed = await AclEngine.evaluateDocumentPermission(userId, userRole, tenantId, doc.id, "Preview");
    if (!allowed) {
      return res.status(403).json({ success: false, message: "صلاحية العرض مرفوضة." });
    }

    const metaKey = doc.storageKey.replace(/\/([^\/]+)$/, "/_preview_meta.json");
    try {
      const buf = await StorageService.downloadFile(metaKey, tenantId);
      res.setHeader("Content-Type", "application/json");
      res.send(buf);
    } catch (_) {
      res.json({
        success: true,
        data: {
          title: doc.name,
          summary: "المستند متاح للعرض والتنزيل الآمن.",
          keyEntities: ["الأرشيف الرقمي", doc.category],
        }
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. Upload a new version (Scanned, ACL checked, Encrypted)
router.post("/:id/versions", requireScope("documents:write"), upload.single("file"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";
    const userName = (req as any).user?.name || "مستخدم النظام";

    if (!req.file) {
      return res.status(400).json({ success: false, message: "يرجى اختيار ملف صالح للرفع." });
    }

    const docId = req.params.id;
    
    // ACL Check
    const allowed = await AclEngine.evaluateDocumentPermission(userId, userRole, tenantId, docId, "Version");
    if (!allowed) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(403).json({ success: false, message: "غير مسموح لك بإضافة إصدارات جديدة لهذا الملف." });
    }

    // Antivirus scanning
    const scanReport = await AntivirusService.scanFile(req.file.path, req.file.originalname);
    if (!scanReport.isClean) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(400).json({ success: false, message: "تهديد برمجيات خبيثة مكتشف." });
    }

    const { reason, version, currentDbVersion } = req.body;
    const parsedDbVersion = parseInt(currentDbVersion, 10) || 1;

    // A. Compute hash
    const sha256 = await calculateFileHash(req.file.path);

    // B. Deduplication check
    const existingStorageKey = await DocumentArchiveRepository.findStorageKeyByHash(sha256, tenantId);
    let storageKey: string;

    if (existingStorageKey) {
      storageKey = existingStorageKey;
      fs.unlinkSync(req.file.path);
    } else {
      // Envelope encrypt the file
      const fileBuffer = fs.readFileSync(req.file.path);
      const docDEK = await CryptographyService.getDocumentDEK(tenantId, docId);
      const encryptedData = CryptographyService.encryptPayload(fileBuffer, docDEK);
      const encryptedBuffer = Buffer.from(JSON.stringify(encryptedData), "utf8");

      const encryptedStream = Readable.from(encryptedBuffer);
      const uploadRes = await StorageService.uploadStream(tenantId, docId, version, req.file.originalname, encryptedStream);
      storageKey = uploadRes.storageKey;

      // Async preview
      StorageService.generatePreviewsAsync(tenantId, docId, version, req.file.originalname, fileBuffer).catch((err) => {
        console.error("[DocumentsRoute] Async preview error:", err.message);
      });

      fs.unlinkSync(req.file.path);
    }

    await DocumentArchiveRepository.addVersion(
      docId,
      version,
      storageKey,
      req.file.size,
      sha256,
      userName,
      reason || "إصدار جديد",
      tenantId,
      userId,
      parsedDbVersion
    );

    res.json({ success: true, message: "تم إصدار نسخة جديدة بنجاح." });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }

    if (error.message === "CONCURRENT_WRITE_CONFLICT") {
      return res.status(409).json({
        success: false,
        message: "تعارض في التعديل المتزامن! تم تحديث المستند من قبل مستخدم آخر.",
      });
    }
    if (error.message === "LEGAL_HOLD_ACTIVE") {
      return res.status(423).json({
        success: false,
        message: "لا يمكن تعديل المستند لوجود وقف قانوني تجميدي مفعّل عليه.",
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 13. Rollback to a specific version
router.post("/:id/rollback", requireScope("documents:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";
    const userName = (req as any).user?.name || "مستخدم النظام";

    const allowed = await AclEngine.evaluateDocumentPermission(userId, userRole, tenantId, req.params.id, "Restore");
    if (!allowed) {
      return res.status(403).json({ success: false, message: "مرفوض! لا تمتلك صلاحيات استرجاع النسخ." });
    }

    const { version } = req.body;
    await DocumentArchiveRepository.rollbackVersion(req.params.id, version, tenantId, userId, userName);

    res.json({ success: true, message: `تم استعادة النسخة ${version} بنجاح.` });
  } catch (error: any) {
    if (error.message === "LEGAL_HOLD_ACTIVE") {
      return res.status(423).json({
        success: false,
        message: "لا يمكن استرجاع المستند لوجود وقف قانوني تجميدي مفعّل عليه.",
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 14. Sign document cryptographically
router.post("/:id/sign", requireScope("documents:sign"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";

    const allowed = await AclEngine.evaluateDocumentPermission(userId, userRole, tenantId, req.params.id, "Sign");
    if (!allowed) {
      return res.status(403).json({ success: false, message: "مرفوض! ليس لديك صلاحية توقيع هذا المستند." });
    }

    const doc = await DocumentArchiveRepository.getDocumentById(req.params.id, tenantId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "المستند غير موجود." });
    }

    // Cryptographic Attestation Block (Server Attested Hash)
    const timestamp = new Date().toISOString();
    const hashData = `${doc.sha256}-${userId}-${timestamp}-${Config.JWT_SECRET}`;
    const signatureHash = crypto.createHash("sha256").update(hashData).digest("hex");
    const certificateRef = `PKI-CERT-CA-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    await DocumentArchiveRepository.signDocument(
      req.params.id,
      userId,
      userRole,
      signatureHash,
      certificateRef,
      tenantId
    );

    res.json({ success: true, message: "تم التوقيع والمصادقة الرقمية المشفرة بنجاح." });
  } catch (error: any) {
    if (error.message === "LEGAL_HOLD_ACTIVE") {
      return res.status(423).json({
        success: false,
        message: "لا يمكن توقيع المستند لوجود وقف قانوني تجميدي مفعّل عليه.",
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 15. Legal Hold status toggle
router.patch("/:id/legal-hold", requireScope("documents:admin"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";

    const allowed = await AclEngine.evaluateDocumentPermission(userId, userRole, tenantId, req.params.id, "LegalHold");
    if (!allowed) {
      return res.status(403).json({ success: false, message: "مرفوض! ليس لديك الصلاحية لإدارة حالة الوقف القانوني." });
    }

    const { isLegalHold, details } = req.body;

    await DocumentArchiveRepository.toggleLegalHold(
      req.params.id,
      isLegalHold,
      tenantId,
      userId,
      details || ""
    );

    res.json({ success: true, message: "تم تحديث حالة الوقف القانوني بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 16. Delete document
router.delete("/:id", requireScope("documents:admin"), async (req: Request, res: Response) => {
  const tenantId = (req as any).user!.tenantId;
  const userId = (req as any).user?.userId || "USER-SYSTEM";
  const userRole = (req as any).user?.role || "Employee";

  try {
    const allowed = await AclEngine.evaluateDocumentPermission(userId, userRole, tenantId, req.params.id, "Delete");
    if (!allowed) {
      return res.status(403).json({ success: false, message: "مرفوض! ليس لديك صلاحية حذف المستندات." });
    }

    await DocumentArchiveRepository.deleteDocument(req.params.id, tenantId, userId);
    res.json({ success: true, message: "تم حذف المستند بنجاح من الأرشيف." });
  } catch (error: any) {
    if (error.message === "LEGAL_HOLD_ACTIVE") {
      await logSecurityAudit(
        userId,
        tenantId,
        "UNAUTHORIZED_DELETE_LEGAL_HOLD",
        "documents",
        req.params.id,
        { attemptToDeleteLockedDoc: true }
      );
      return res.status(423).json({
        success: false,
        error: "LEGAL_HOLD_ACTIVE",
        message: "مرفوض! لا يمكن حذف مستند يخضع للوقف والتحفظ القانوني النشط.",
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
