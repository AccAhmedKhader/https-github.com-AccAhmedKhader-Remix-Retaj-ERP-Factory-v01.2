import { Router, Request, Response } from "express";
import { getDbForTenant } from "../database/db";
import { boms as bomsTable, bomComponents as bomComponentsTable, productionOrders as productionOrdersTable, stockItems, warehouses } from "../database/schema";
import { eq } from "drizzle-orm";
import { requireScope, logSecurityAudit } from "../security/auth-middleware";
import { EnterpriseDBEngine } from "../database/db-engine";

const router = Router();

// 1. Get BOMs
router.get("/boms", requireScope("inventory:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const db = await getDbForTenant(tenantId);
    const bomsList = await db.select().from(bomsTable).where(eq(bomsTable.tenantId, tenantId));
    const compsList = await db.select().from(bomComponentsTable).where(eq(bomComponentsTable.tenantId, tenantId));

    const mapped = bomsList.map((bom: any) => {
      const components = compsList
        .filter((c: any) => c.bomId === bom.id)
        .map((c: any) => ({
          sku: c.sku,
          name: c.name,
          quantityRequired: Number(c.quantityRequired)
        }));
      return {
        id: bom.id,
        productSku: bom.productSku,
        productName: bom.productName,
        laborCost: Number(bom.laborCost),
        components
      };
    });

    res.json({ success: true, data: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Add BOM
router.post("/boms", requireScope("inventory:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const db = await getDbForTenant(tenantId);
    const { id, productSku, productName, laborCost, components } = req.body;

    await db.insert(bomsTable).values({
      id,
      tenantId,
      productSku,
      productName,
      laborCost: laborCost.toString()
    });

    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      await db.insert(bomComponentsTable).values({
        id: `${id}-comp-${i}-${Date.now().toString().slice(-4)}`,
        tenantId,
        bomId: id,
        sku: comp.sku,
        name: comp.name || "عنصر تجميع",
        quantityRequired: Number(comp.quantityRequired)
      });
    }

    // Update memory engine state
    const currentFullState = EnterpriseDBEngine.initForTenant(tenantId);
    currentFullState.boms.push({
      id,
      productSku,
      productName,
      laborCost: Number(laborCost),
      components: components.map((c: any) => ({
        sku: c.sku,
        name: c.name || "عنصر تجميع",
        quantityRequired: Number(c.quantityRequired)
      }))
    });

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "CREATE_BOM",
      "boms",
      id,
      { productSku, productName }
    );

    res.json({ success: true, message: "تم تسجيل معيار تجميع المواد بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Get Production Orders
router.get("/production-orders", requireScope("inventory:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(productionOrdersTable).where(eq(productionOrdersTable.tenantId, tenantId));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
