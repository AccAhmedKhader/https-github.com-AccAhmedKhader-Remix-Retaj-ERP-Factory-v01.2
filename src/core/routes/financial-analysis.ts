import { Router, Request, Response } from "express";
import { FinancialAnalysisRepository } from "../database/repositories/FinancialAnalysisRepository";
import { requireScope } from "../security/auth-middleware";
import { querySecureAI } from "../security/ai-service";
import Decimal from "decimal.js";

const router = Router();

// Default Helper Dates
const getDefaultDates = () => {
  const now = new Date();
  const toDate = now.toISOString().split("T")[0];
  const fromDate = `${now.getFullYear()}-01-01`;
  return { fromDate, toDate, asOfDate: toDate };
};

// 1. Trial Balance (ميزان المراجعة)
router.get("/trial-balance", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const asOfDate = (req.query.asOfDate as string) || defaults.asOfDate;

    const result = await FinancialAnalysisRepository.getTrialBalance(tenantId, asOfDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Income Statement (قائمة الدخل - Common-Size + YoY Horizontal Comparison)
router.get("/income-statement", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const fromDate = (req.query.fromDate as string) || defaults.fromDate;
    const toDate = (req.query.toDate as string) || defaults.toDate;
    const compareWithPrior = req.query.compareWithPrior === "true";

    const result = await FinancialAnalysisRepository.getIncomeStatement(tenantId, fromDate, toDate, compareWithPrior);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Balance Sheet (الميزانية العمومية والمركز المالي)
router.get("/balance-sheet", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const asOfDate = (req.query.asOfDate as string) || defaults.asOfDate;
    const compareWithPrior = req.query.compareWithPrior === "true";

    const result = await FinancialAnalysisRepository.getBalanceSheet(tenantId, asOfDate, compareWithPrior);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Cash Flow Statement (قائمة التدفقات النقدية)
router.get("/cash-flow-statement", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const fromDate = (req.query.fromDate as string) || defaults.fromDate;
    const toDate = (req.query.toDate as string) || defaults.toDate;

    const result = await FinancialAnalysisRepository.getCashFlowStatement(tenantId, fromDate, toDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Financial Ratios (النسب المالية القياسية)
router.get("/ratios", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const asOfDate = (req.query.asOfDate as string) || defaults.asOfDate;
    const fromDate = (req.query.fromDate as string) || defaults.fromDate;
    const toDate = (req.query.toDate as string) || defaults.toDate;

    const result = await FinancialAnalysisRepository.getRatios(tenantId, asOfDate, fromDate, toDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. DuPont Analysis (تحليل دوبونت)
router.get("/dupont", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const asOfDate = (req.query.asOfDate as string) || defaults.asOfDate;
    const fromDate = (req.query.fromDate as string) || defaults.fromDate;
    const toDate = (req.query.toDate as string) || defaults.toDate;

    const result = await FinancialAnalysisRepository.getDuPont(tenantId, asOfDate, fromDate, toDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Vertical Analysis (التحليل الرأسي)
router.get("/vertical-analysis", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const statement = (req.query.statement as "income" | "balance") || "income";
    const asOfDate = (req.query.asOfDate as string) || defaults.asOfDate;
    const fromDate = (req.query.fromDate as string) || defaults.fromDate;
    const toDate = (req.query.toDate as string) || defaults.toDate;

    const result = await FinancialAnalysisRepository.getVerticalAnalysis(tenantId, statement, asOfDate, fromDate, toDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Horizontal Analysis (التحليل الأفقي)
router.get("/horizontal-analysis", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const statement = (req.query.statement as "income" | "balance") || "income";
    const periods = Number(req.query.periods) || 6;
    const interval = (req.query.interval as "month" | "quarter" | "year") || "month";
    const asOfDate = (req.query.asOfDate as string) || defaults.asOfDate;

    const result = await FinancialAnalysisRepository.getHorizontalAnalysis(tenantId, statement, periods, interval, asOfDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Break-Even Analysis (تحليل نقطة التعادل)
router.get("/break-even", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const costCenterId = req.query.costCenterId as string;

    const result = await FinancialAnalysisRepository.getBreakEven(tenantId, costCenterId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Altman Z-Score (مؤشر التنبؤ بالتعثر المالي)
router.get("/altman-z-score", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const asOfDate = (req.query.asOfDate as string) || defaults.asOfDate;

    const result = await FinancialAnalysisRepository.getAltmanZScore(tenantId, asOfDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. Aging Report (أعمار الديون)
router.get("/aging-report", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const type = (req.query.type as "receivables" | "payables") || "receivables";
    const asOfDate = (req.query.asOfDate as string) || defaults.asOfDate;

    const result = await FinancialAnalysisRepository.getAgingReport(tenantId, type, asOfDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. Cost Center Profitability (ربحية مراكز التكلفة والربحية)
router.get("/cost-center-profitability", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    const fromDate = (req.query.fromDate as string) || defaults.fromDate;
    const toDate = (req.query.toDate as string) || defaults.toDate;

    const result = await FinancialAnalysisRepository.getCostCenterProfitability(tenantId, fromDate, toDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 13. What-If Simulator (محاكاة سيناريوهات القرار - POST)
router.post("/what-if", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user!.tenantId;
    const defaults = getDefaultDates();
    
    // Body parameters
    const revenueChangePercent = Number(req.body.revenueChangePercent || 0);
    const cogsChangePercent = Number(req.body.cogsChangePercent || 0);
    const opexChangePercent = Number(req.body.opexChangePercent || 0);
    
    const fromDate = (req.body.fromDate as string) || defaults.fromDate;
    const toDate = (req.body.toDate as string) || defaults.toDate;

    const actual = await FinancialAnalysisRepository.getIncomeStatement(tenantId, fromDate, toDate, false);
    
    // Pro-forma projection calculations using decimal.js
    const scaleRev = new Decimal(1).plus(new Decimal(revenueChangePercent).dividedBy(100));
    const scaleCogs = new Decimal(1).plus(new Decimal(cogsChangePercent).dividedBy(100));
    const scaleOpex = new Decimal(1).plus(new Decimal(opexChangePercent).dividedBy(100));

    const projRevenue = new Decimal(actual.current.totalRevenue).times(scaleRev);
    const projCogs = new Decimal(actual.current.totalCogs).times(scaleCogs);
    const projGross = projRevenue.minus(projCogs);
    const projOpex = new Decimal(actual.current.totalOpex).times(scaleOpex);
    const projOperating = projGross.minus(projOpex);
    const projNet = projOperating.minus(actual.current.totalInterest).minus(actual.current.totalTax);

    res.json({
      success: true,
      data: {
        inputs: {
          revenueChangePercent,
          cogsChangePercent,
          opexChangePercent
        },
        fromDate,
        toDate,
        actual: actual.current,
        projected: {
          totalRevenue: projRevenue.round().toNumber(),
          totalCogs: projCogs.round().toNumber(),
          grossProfit: projGross.round().toNumber(),
          totalOpex: projOpex.round().toNumber(),
          operatingProfit: projOperating.round().toNumber(),
          totalInterest: actual.current.totalInterest,
          totalTax: actual.current.totalTax,
          netProfit: projNet.round().toNumber(),
          commonSize: {
            revenue: 100,
            cogs: projRevenue.isZero() ? 0 : projCogs.dividedBy(projRevenue).times(100).toDecimalPlaces(2).toNumber(),
            grossProfit: projRevenue.isZero() ? 0 : projGross.dividedBy(projRevenue).times(100).toDecimalPlaces(2).toNumber(),
            opex: projRevenue.isZero() ? 0 : projOpex.dividedBy(projRevenue).times(100).toDecimalPlaces(2).toNumber(),
            operatingProfit: projRevenue.isZero() ? 0 : projOperating.dividedBy(projRevenue).times(100).toDecimalPlaces(2).toNumber(),
            netProfit: projRevenue.isZero() ? 0 : projNet.dividedBy(projRevenue).times(100).toDecimalPlaces(2).toNumber()
          }
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 14. Interactive AI Chat Assistant Endpoint for Ratios
router.post("/ai-chat", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const { query, ratioContext } = req.body;
    const tenantId = (req as any).user!.tenantId || "tenant-default";
    const userId = (req as any).user!.id || "user-default";

    if (!query) {
      return res.status(400).json({ success: false, error: "النص المطلوب للاستفسار المالي غير موجود" });
    }

    let replyText = "";
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `أنت الخبير المالي والمستشار التنفيذي الذكي لنظام ApexSaaS ERP.
المستعلم يسأل عن المؤشر المالي التالي:
- اسم النسبة: ${ratioContext?.titleAr || "نسبة مالية"}
- القيمة الحالية: ${ratioContext?.value || ""}
- الوضع الحالي: ${ratioContext?.status || ""}
- المعايير المستهدفة: ${JSON.stringify(ratioContext?.benchmarks || {})}
- تاريخ السجلات: ${ratioContext?.asOfDate || ""}

السؤال المطلوب من المستخدم:
"${query}"

قدم إجابة مالية احترافية، دقيقة، ومبسطة باللغة العربية مع خطوات تنفيذية عملية مستندة لقواعد المحاسبة الدولية IFRS والواقع التشغيلي للشركات.`;

        const aiRes = await querySecureAI(prompt, tenantId, userId);
        replyText = aiRes.text;
      } catch (aiErr) {
        replyText = `بناءً على البيانات المسجلة بالـ ERP لمؤشر (${ratioContext?.titleAr || "النسبة المالية"}) البالغة (${ratioContext?.value}):\n\n` +
          `• التشخيص المالي: الوضع الحالي يقع ضمن النطاق (${ratioContext?.status || "الطبيعي"}).\n` +
          `• النصيحة التنفيذية: يُوصى بمتابعة كفاءة تحصيل الديون وحركة المخزون بانتظام لضمان استقرار التدفقات النقدية.`;
      }
    } else {
      replyText = `بناءً على البيانات المسجلة بالـ ERP لمؤشر (${ratioContext?.titleAr || "النسبة المالية"}) البالغة (${ratioContext?.value}):\n\n` +
        `• التشخيص المالي: الوضع الحالي يقع ضمن النطاق (${ratioContext?.status || "الطبيعي"}).\n` +
        `• النصيحة التنفيذية: يُوصى بمتابعة كفاءة تحصيل الديون وحركة المخزون بانتظام لضمان استقرار التدفقات النقدية.`;
    }

    res.json({ success: true, reply: replyText });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
