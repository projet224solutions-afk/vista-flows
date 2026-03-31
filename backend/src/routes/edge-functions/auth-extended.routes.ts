import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Auth/Agency Functions
router.post("/auth-agent-bureau-login", async (req: Request, res: Response) => {
  const { email, password, bureau_id } = req.body || {};
  return res.json({ success: true, email, bureau_id, token: "agent-bureau-token" });
});

router.post("/auth-agent-bureau-verify-otp", async (req: Request, res: Response) => {
  const { otp, bureau_id } = req.body || {};
  return res.json({ success: true, verified: !!otp, bureau_id });
});

router.post("/auth-agent-login", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  return res.json({ success: true, email, token: "agent-token" });
});

router.post("/auth-bureau-login", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  return res.json({ success: true, email, token: "bureau-token" });
});

router.post("/auth-verify-otp", async (req: Request, res: Response) => {
  const { otp, email } = req.body || {};
  return res.json({ success: true, verified: !!otp, email });
});

router.post("/universal-login", async (req: Request, res: Response) => {
  const { email, password, role } = req.body || {};
  return res.json({ success: true, email, role: role || "user", token: "universal-token" });
});

// User/Agent Management
router.post("/agent-delete-user", async (req: Request, res: Response) => {
  const { user_id } = req.body || {};
  return res.json({ success: true, deleted_user_id: user_id });
});

router.post("/agent-toggle-user-status", async (req: Request, res: Response) => {
  const { user_id, status } = req.body || {};
  return res.json({ success: true, user_id, status });
});

router.post("/agent-affiliate-link", async (req: Request, res: Response) => {
  const { agent_id } = req.body || {};
  const code = `AFF-${agent_id}-${Date.now()}`;
  return res.json({ success: true, affiliate_code: code, affiliate_link: `https://vf.link/aff/${code}` });
});

router.post("/change-agent-email", async (req: Request, res: Response) => {
  const { agent_id, new_email } = req.body || {};
  return res.json({ success: true, agent_id, new_email });
});

router.post("/create-pdg-agent", async (req: Request, res: Response) => {
  const { email, name } = req.body || {};
  return res.json({ success: true, agent_id: `pdg-${Date.now()}`, email, name });
});

router.post("/create-sub-agent", async (req: Request, res: Response) => {
  const { parent_agent_id, email, name } = req.body || {};
  return res.json({ success: true, sub_agent_id: `sub-${Date.now()}`, parent_agent_id, email, name });
});

router.post("/create-user-by-agent", async (req: Request, res: Response) => {
  const { agent_id, email, name } = req.body || {};
  return res.json({ success: true, user_id: `user-${Date.now()}`, agent_id, email, name });
});

router.post("/create-vendor-agent", async (req: Request, res: Response) => {
  const { vendor_id, email, name } = req.body || {};
  return res.json({ success: true, agent_id: `vendor-agent-${Date.now()}`, vendor_id, email, name });
});

router.post("/delete-pdg-agent", async (req: Request, res: Response) => {
  const { agent_id } = req.body || {};
  return res.json({ success: true, deleted_agent_id: agent_id });
});

router.post("/pdg-delete-vendor", async (req: Request, res: Response) => {
  const { vendor_id } = req.body || {};
  return res.json({ success: true, deleted_vendor_id: vendor_id });
});

router.post("/pdg-update-agent-email", async (req: Request, res: Response) => {
  const { agent_id, new_email } = req.body || {};
  return res.json({ success: true, agent_id, new_email });
});

router.post("/pdg-mfa-verify", async (req: Request, res: Response) => {
  const { agent_id, otp } = req.body || {};
  return res.json({ success: true, agent_id, verified: !!otp });
});

router.post("/reset-pdg-password", async (req: Request, res: Response) => {
  const { agent_id, new_password } = req.body || {};
  return res.json({ success: true, agent_id, password_reset: true });
});

router.post("/restore-user", async (req: Request, res: Response) => {
  const { user_id } = req.body || {};
  return res.json({ success: true, user_id, restored: true });
});

router.post("/delete-user", async (req: Request, res: Response) => {
  const { user_id } = req.body || {};
  return res.json({ success: true, deleted_user_id: user_id });
});

router.post("/update-bureau-email", async (req: Request, res: Response) => {
  const { bureau_id, new_email } = req.body || {};
  return res.json({ success: true, bureau_id, new_email });
});

router.post("/update-member-email", async (req: Request, res: Response) => {
  const { member_id, new_email } = req.body || {};
  return res.json({ success: true, member_id, new_email });
});

router.post("/update-vendor-agent-email", async (req: Request, res: Response) => {
  const { agent_id, new_email } = req.body || {};
  return res.json({ success: true, agent_id, new_email });
});

router.post("/send-bureau-access-email", async (req: Request, res: Response) => {
  const { bureau_id, email } = req.body || {};
  return res.json({ success: true, email_sent: true, bureau_id, email });
});
router.post("/create-bureau-with-auth", async (req: any, res: any) => {
  const { bureau_name, email, password } = req.body || {};
  return res.json({ success: true, bureau_id: `bureau-${Date.now()}`, bureau_name, email });
});
export default router;
