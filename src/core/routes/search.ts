import { Router, Request, Response } from "express";
import { SearchRepository } from "../database/repositories/SearchRepository";
import { requireScope, logSecurityAudit } from "../security/auth-middleware";

const router = Router();

// 1. Core Enterprise Search Engine (GET /search)
router.get("/", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";

    const {
      q,
      category,
      securityLevel,
      extension,
      hasSignature,
      hasVersions,
      isLegalHold,
      dateFrom,
      dateTo,
      minSize,
      maxSize,
      tags,
      limit,
      offset,
      semantic
    } = req.query;

    const searchParams = {
      query: q as string,
      category: category as string,
      securityLevel: securityLevel as string,
      extension: extension as string,
      hasSignature: hasSignature === "true" ? true : hasSignature === "false" ? false : undefined,
      hasVersions: hasVersions === "true" ? true : hasVersions === "false" ? false : undefined,
      isLegalHold: isLegalHold === "true" ? true : isLegalHold === "false" ? false : undefined,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      minSize: minSize ? parseInt(minSize as string) : undefined,
      maxSize: maxSize ? parseInt(maxSize as string) : undefined,
      tags: tags ? (tags as string).split(",") : undefined,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
      semanticSearch: semantic === "true"
    };

    const searchResults = await SearchRepository.search(
      tenantId,
      userId,
      userRole,
      searchParams
    );

    // Audit the search activity securely
    if (q) {
      await logSecurityAudit(
        userId,
        tenantId,
        "ENTERPRISE_DOCUMENT_SEARCH",
        "document_search_index",
        "N/A",
        { query: q, resultsCount: searchResults.totalCount, isSemantic: semantic === "true" }
      );
    }

    res.json({
      success: true,
      data: {
        results: searchResults.results,
        total: searchResults.totalCount,
        latencyMs: searchResults.latencyMs
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Search Autocomplete Suggestions (GET /search/suggestions)
router.get("/suggestions", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const { prefix } = req.query;

    if (!prefix || (prefix as string).trim() === "") {
      return res.json({ success: true, data: [] });
    }

    const suggestions = await SearchRepository.getSuggestions(tenantId, userId, prefix as string);
    res.json({ success: true, data: suggestions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Get Recent Searches (GET /search/recent)
router.get("/recent", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const userId = (req as any).user?.userId || "USER-SYSTEM";

    const recents = await SearchRepository.getRecentSearches(tenantId, userId);
    res.json({ success: true, data: recents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Get Popular/Trending Searches (GET /search/popular)
router.get("/popular", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const populars = await SearchRepository.getPopularSearches(tenantId);
    res.json({ success: true, data: populars });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Get Dynamic Facets (GET /search/facets)
router.get("/facets", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const userRole = (req as any).user?.role || "Employee";

    const facets = await SearchRepository.getFacets(tenantId, userId, userRole);
    res.json({ success: true, data: facets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Get Search Analytics (GET /search/analytics)
router.get("/analytics", requireScope("documents:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const analytics = await SearchRepository.getAnalytics(tenantId);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Reindex Specific Document (POST /search/reindex)
router.post("/reindex", requireScope("documents:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const { documentId, ocrText } = req.body;

    if (!documentId) {
      return res.status(400).json({ success: false, message: "documentId is required." });
    }

    await SearchRepository.indexDocument(documentId, tenantId, ocrText);
    
    await logSecurityAudit(
      userId,
      tenantId,
      "MANUAL_DOCUMENT_REINDEX",
      "document_search_index",
      documentId,
      { triggeredBy: userId }
    );

    res.json({ success: true, message: "تمت إعادة فهرسة المستند بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Rebuild Entire Search Index (POST /search/rebuild)
router.post("/rebuild", requireScope("documents:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const userId = (req as any).user?.userId || "USER-SYSTEM";

    const rebuildResult = await SearchRepository.rebuildIndex(tenantId);

    await logSecurityAudit(
      userId,
      tenantId,
      "FULL_SEARCH_INDEX_REBUILD",
      "document_search_index",
      "ALL",
      { totalIndexed: rebuildResult.indexedCount }
    );

    res.json({
      success: true,
      message: "تمت إعادة بناء فهرس البحث بالكامل بنجاح.",
      data: { indexedCount: rebuildResult.indexedCount }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Verify Search Index Integrity (POST /search/verify)
router.post("/verify", requireScope("documents:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const verifyResult = await SearchRepository.verifyIntegrity(tenantId);
    res.json({ success: true, data: verifyResult });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Save A Search Query (POST /search/saved)
router.post("/saved", requireScope("documents:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const userId = (req as any).user?.userId || "USER-SYSTEM";
    const { name, query, filters } = req.body;

    if (!name || !query) {
      return res.status(400).json({ success: false, message: "Name and Query are required." });
    }

    const saved = await SearchRepository.saveSearch(tenantId, userId, name, query, filters);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
