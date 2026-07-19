import { Router, Request, Response } from "express";
import { InventoryRepository } from "../database/repositories/InventoryRepository";
import { requireScope, logSecurityAudit } from "../security/auth-middleware";

const router = Router();

// 1. Get stock items with optional pagination
router.get("/stock", requireScope("inventory:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const { items, total } = await InventoryRepository.getStockItems(tenantId, page, limit);
    res.json({ 
      success: true, 
      data: items,
      pagination: page && limit ? { page, limit, total } : undefined
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Update stock item with Optimistic Locking
router.put("/stock/:sku", requireScope("inventory:write"), async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
  const item = req.body;
  item.sku = req.params.sku;

  try {
    await InventoryRepository.updateStockItem(item, tenantId);
    res.json({ success: true, message: "تم تحديث كمية المخزون بنجاح." });
  } catch (error: any) {
    if (error.message === "CONCURRENT_WRITE_CONFLICT") {
      await logSecurityAudit(
        (req as any).user?.id || "SYSTEM",
        tenantId,
        "CONCURRENT_WRITE_CONFLICT",
        "stock_items",
        req.params.sku,
        { conflictOnUpdate: item }
      );
      return res.status(409).json({
        success: false,
        error: "CONCURRENT_WRITE_CONFLICT",
        message: "تعارض في الكتابة المتزامنة! تم تعديل هذا الصنف بواسطة مستخدم آخر."
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Get Warehouses
router.get("/warehouses", requireScope("inventory:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const list = await InventoryRepository.getWarehouses(tenantId);
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Get Sales Invoices with optional pagination
router.get("/sales-invoices", requireScope("inventory:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const { items, total } = await InventoryRepository.getSalesInvoices(tenantId, page, limit);
    res.json({ 
      success: true, 
      data: items,
      pagination: page && limit ? { page, limit, total } : undefined
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Get Purchase Invoices with optional pagination
router.get("/purchase-invoices", requireScope("inventory:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const { items, total } = await InventoryRepository.getPurchaseInvoices(tenantId, page, limit);
    res.json({ 
      success: true, 
      data: items,
      pagination: page && limit ? { page, limit, total } : undefined
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
