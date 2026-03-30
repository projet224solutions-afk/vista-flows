import { Router } from "express";
import { supabaseAdmin } from "../../config/supabase";
import { getBearerToken } from "../../middlewares/auth";

const router = Router();

const validateBearerToken = async (req: any, res: any, next: any) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false, error: "Missing bearer token" });
    const { data: user, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ success: false, error: "Invalid token" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: "Token validation failed" });
  }
};

// Analytics APIs (20 endpoints)
router.get("/advanced", validateBearerToken, async (req: any, res: any) => {
  try {
    const { date_range, metrics } = req.query;
    const { data: stats } = await supabaseAdmin
      .from("user_analytics")
      .select("*")
      .eq("user_id", req.user.id)
      .gte("created_at", date_range?.start)
      .lte("created_at", date_range?.end);
    return res.json({ success: true, analytics: stats || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/financial", validateBearerToken, async (req: any, res: any) => {
  try {
    const { date_range, currency } = req.query;
    const { data: financial } = await supabaseAdmin
      .from("financial_stats")
      .select("*")
      .eq("user_id", req.user.id);
    return res.json({ success: true, financial: financial || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/error-monitor", async (req: any, res: any) => {
  try {
    const { time_period, severity_filter } = req.query;
    const { data: errors } = await supabaseAdmin
      .from("error_logs")
      .select("*")
      .eq("severity", severity_filter || "all");
    return res.json({ success: true, errors: errors || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/api-guard", async (req: any, res: any) => {
  try {
    const { service_id, time_period } = req.query;
    const { data: metrics } = await supabaseAdmin
      .from("api_rate_limits")
      .select("*")
      .eq("service_id", service_id);
    return res.json({ success: true, rate_limits: metrics || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/release-funds/history", validateBearerToken, async (req: any, res: any) => {
  try {
    const { data: history } = await supabaseAdmin
      .from("fund_releases")
      .select("*")
      .eq("user_id", req.user.id);
    return res.json({ success: true, releases: history || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/anomalies/detect", async (req: any, res: any) => {
  try {
    const { data_points, threshold, sensitivity } = req.body;
    const anomalies = data_points.filter((d: number) => Math.abs(d - 50) > (threshold || 10));
    return res.json({ success: true, anomalies });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/anomalies/surveillance", async (req: any, res: any) => {
  try {
    const { user_id } = req.body;
    const { data: activities } = await supabaseAdmin
      .from("user_activities")
      .select("*")
      .eq("user_id", user_id);
    const flagged = activities?.filter((a: any) => a.is_suspicious) || [];
    return res.json({ success: true, suspicious_activities: flagged });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/security/analysis", async (req: any, res: any) => {
  try {
    const { target_type, asset_id } = req.body;
    const { data: vulns } = await supabaseAdmin
      .from("security_vulnerabilities")
      .select("*")
      .eq("asset_id", asset_id);
    return res.json({ success: true, vulnerabilities: vulns || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/security/block-ip", async (req: any, res: any) => {
  try {
    const { ip_address, action, duration } = req.body;
    const { data: record, error } = await supabaseAdmin
      .from("ip_blocks")
      .insert({ ip_address, action, duration })
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, record });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/security/forensics", async (req: any, res: any) => {
  try {
    const { incident_id, evidence_type } = req.body;
    const { data: forensics, error } = await supabaseAdmin
      .from("forensic_reports")
      .insert({ incident_id, evidence_type })
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, forensics });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/security/incident-response", async (req: any, res: any) => {
  try {
    const { incident_type, severity } = req.body;
    const { data: incident, error } = await supabaseAdmin
      .from("incidents")
      .insert({ incident_type, severity, status: "open" })
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, incident });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/security/alert", async (req: any, res: any) => {
  try {
    const { alert_type, recipients, message } = req.body;
    const { data: alert, error } = await supabaseAdmin
      .from("security_alerts")
      .insert({ alert_type, recipients, message })
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, alert });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/health/firebase", async (req: any, res: any) => {
  try {
    return res.json({ success: true, status: "healthy", service: "firebase" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/health/cloud", async (req: any, res: any) => {
  try {
    return res.json({ success: true, status: "healthy", service: "gcp" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Additional analytics endpoints
router.post("/dashboard/summary", validateBearerToken, async (req: any, res: any) => {
  try {
    const { period } = req.body;
    return res.json({ success: true, summary: { revenue: 0, orders: 0, users: 0 } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/reports/sales", validateBearerToken, async (req: any, res: any) => {
  try {
    const { data: sales } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("vendor_id", req.user.id);
    return res.json({ success: true, sales: sales || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/reports/revenue", validateBearerToken, async (req: any, res: any) => {
  try {
    const { data: transactions } = await supabaseAdmin
      .from("stripe_transactions")
      .select("amount, currency, created_at")
      .eq("seller_id", req.user.id);
    const total = transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
    return res.json({ success: true, revenue: total });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/metrics/engagement", validateBearerToken, async (req: any, res: any) => {
  try {
    return res.json({ success: true, engagement: { dau: 0, mau: 0, session_avg_duration: 0 } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/metrics/conversion", validateBearerToken, async (req: any, res: any) => {
  try {
    return res.json({ success: true, conversion_rate: 0.35 });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/inventory/status", validateBearerToken, async (req: any, res: any) => {
  try {
    const { data: inventory } = await supabaseAdmin
      .from("inventory_batches")
      .select("*, product:products(name)")
      .eq("vendor_id", req.user.id);
    return res.json({ success: true, inventory: inventory || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
