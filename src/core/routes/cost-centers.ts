import { Router, Request, Response } from "express";
import { getDbForTenant } from "../database/db";
import { costCenters as costCentersTable, profitCenters as profitCentersTable } from "../database/schema";
import { eq } from "drizzle-orm";
import { requireScope } from "../security/auth-middleware";

const router = Router();

// 1. Get Cost Centers
router.get("/cost-centers", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(costCentersTable).where(eq(costCentersTable.tenantId, tenantId));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Get Profit Centers
router.get("/profit-centers", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(profitCentersTable).where(eq(profitCentersTable.tenantId, tenantId));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
