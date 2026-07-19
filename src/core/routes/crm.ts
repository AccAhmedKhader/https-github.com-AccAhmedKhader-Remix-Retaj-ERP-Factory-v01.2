import { Router, Request, Response } from "express";
import { getDbForTenant } from "../database/db";
import { crmDeals } from "../database/schema";
import { eq, desc } from "drizzle-orm";
import { requireScope, logSecurityAudit } from "../security/auth-middleware";

const router = Router();

// Get deals
router.get("/deals", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(crmDeals).where(eq(crmDeals.tenantId, tenantId));
    
    const mapped = list.map((d: any) => ({
      id: d.id,
      clientName: d.clientName,
      title: d.title,
      value: Number(d.value),
      stage: d.stage,
      source: d.source,
      phone: d.phone,
      email: d.email,
      createdAt: d.createdAt,
      probability: Number(d.probability)
    }));

    res.json({ success: true, data: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add deal
router.post("/deals", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const deal = req.body;

    await db.insert(crmDeals).values({
      id: deal.id,
      tenantId,
      clientName: deal.clientName,
      title: deal.title,
      value: deal.value.toString(),
      stage: deal.stage || "Lead",
      source: deal.source || "Direct",
      phone: deal.phone,
      email: deal.email,
      createdAt: deal.createdAt || new Date().toISOString().split("T")[0],
      probability: Number(deal.probability || 0),
    });

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "CREATE_CRM_DEAL",
      "crm_deals",
      deal.id,
      { clientName: deal.clientName, title: deal.title, value: deal.value }
    );

    res.json({ success: true, data: deal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update deal
router.put("/deals/:id", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const { stage, probability, value, clientName, title, source, phone, email } = req.body;

    const updateFields: any = {};
    if (stage !== undefined) updateFields.stage = stage;
    if (probability !== undefined) updateFields.probability = Number(probability);
    if (value !== undefined) updateFields.value = value.toString();
    if (clientName !== undefined) updateFields.clientName = clientName;
    if (title !== undefined) updateFields.title = title;
    if (source !== undefined) updateFields.source = source;
    if (phone !== undefined) updateFields.phone = phone;
    if (email !== undefined) updateFields.email = email;

    await db.update(crmDeals)
      .set(updateFields)
      .where(eq(crmDeals.id, req.params.id));

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "UPDATE_CRM_DEAL",
      "crm_deals",
      req.params.id,
      updateFields
    );

    res.json({ success: true, message: "تم تحديث الصفقة بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete deal
router.delete("/deals/:id", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);

    await db.delete(crmDeals).where(eq(crmDeals.id, req.params.id));

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "DELETE_CRM_DEAL",
      "crm_deals",
      req.params.id,
      {}
    );

    res.json({ success: true, message: "تم حذف الصفقة بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
