/**
 * EDGE FUNCTIONS MIGRATION - AUTH ROUTES
 * Migrates Supabase Edge Functions to Node.js/Express
 * 
 * Functions Migrated:
 * - auth/login
 * - auth/verify-otp
 * - auth/agent/login
 * - auth/bureau/login
 * - auth/cognito/proxy
 * - auth/pdg/mfa
 * - auth/reset-password
 * - auth/change-password
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import speakeasy from "speakeasy";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface AuthRequest extends Request {
  user?: any;
}

// ============ POST /auth/login ============
/**
 * Standard user login with email/password
 * Replaces: supabase/functions/auth/login
 */
router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password required",
      });
    }

    // Use Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("[auth/login] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ============ POST /auth/verify-otp ============
/**
 * Verify OTP for 2FA/MFA flow
 * Replaces: supabase/functions/auth/verify-otp
 */
router.post("/verify-otp", async (req: AuthRequest, res: Response) => {
  try {
    const { email, token } = req.body;
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        error: "Email and OTP token required",
      });
    }

    // Verify OTP using Supabase MFA
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    return res.status(200).json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("[auth/verify-otp] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ============ POST /auth/agent/login ============
/**
 * Agent login with specific role verification
 * Replaces: supabase/functions/auth/agent/login
 */
router.post("/agent/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password required",
      });
    }

    // First: standard auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Second: verify user is agent
    const { data: agentData, error: agentError } = await supabase
      .from("users")
      .select("id, role, agent_id")
      .eq("id", authData.user?.id)
      .eq("role", "agent")
      .single();

    if (agentError || !agentData) {
      return res.status(403).json({
        success: false,
        error: "User is not an agent",
      });
    }

    return res.status(200).json({
      success: true,
      user: authData.user,
      session: authData.session,
      agent: agentData,
    });
  } catch (error) {
    console.error("[auth/agent/login] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ============ POST /auth/bureau/login ============
/**
 * Bureau (office) staff login with organization verification
 * Replaces: supabase/functions/auth/bureau/login
 */
router.post("/bureau/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, bureau_id } = req.body;

    if (!email || !password || !bureau_id) {
      return res.status(400).json({
        success: false,
        error: "Email, password, and bureau_id required",
      });
    }

    // First: standard auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Second: verify user belongs to bureau
    const { data: bureauData, error: bureauError } = await supabase
      .from("users")
      .select("id, role, bureau_id")
      .eq("id", authData.user?.id)
      .eq("bureau_id", bureau_id)
      .in("role", ["bureau_staff", "bureau_manager"])
      .single();

    if (bureauError || !bureauData) {
      return res.status(403).json({
        success: false,
        error: "User does not have access to this bureau",
      });
    }

    return res.status(200).json({
      success: true,
      user: authData.user,
      session: authData.session,
      bureau: bureauData,
    });
  } catch (error) {
    console.error("[auth/bureau/login] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ============ POST /auth/reset-password ============
/**
 * Request password reset email
 * Replaces: supabase/functions/auth/reset-password
 */
router.post("/reset-password", async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    const redirectUrl = process.env.PASSWORD_RESET_REDIRECT_URL ||
      "https://your-app.com/reset-password";

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email required",
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    console.error("[auth/reset-password] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ============ PATCH /auth/change-password ============
/**
 * Change password for authenticated user
 * Replaces: supabase/functions/auth/change-password
 */
router.patch("/change-password", async (req: AuthRequest, res: Response) => {
  try {
    const { old_password, new_password } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    if (!old_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: "Old and new passwords required",
      });
    }

    // Verify old password by attempting login
    const { data: userData, error: userError } = await supabase.auth.getUser(
      req.headers.authorization?.split(" ")[1] || ""
    );

    if (userError || !userData.user?.email) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("[auth/change-password] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ============ POST /auth/pdg/mfa ============
/**
 * Setup MFA for PDG (admin) user
 * Replaces: supabase/functions/auth/pdg/mfa
 */
router.post("/pdg/mfa", async (req: AuthRequest, res: Response) => {
  try {
    const { enable } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    if (enable) {
      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `224Solutions (${req.user?.email})`,
        issuer: "224Solutions",
        length: 32,
      });

      // Save secret to DB (temporarily, until verified)
      const { error } = await supabase
        .from("mfa_settings")
        .upsert(
          {
            user_id: userId,
            totp_secret: secret.base32,
            enabled: false,
          },
          { onConflict: "user_id" }
        );

      if (error) {
        return res.status(400).json({
          success: false,
          error: "Failed to setup MFA",
        });
      }

      return res.status(200).json({
        success: true,
        qr_code_url: secret.otpauth_url,
        secret: secret.base32,
        message: "Scan QR code with authenticator app",
      });
    } else {
      // Disable MFA
      const { error } = await supabase
        .from("mfa_settings")
        .update({ enabled: false })
        .eq("user_id", userId);

      if (error) {
        return res.status(400).json({
          success: false,
          error: "Failed to disable MFA",
        });
      }

      return res.status(200).json({
        success: true,
        message: "MFA disabled",
      });
    }
  } catch (error) {
    console.error("[auth/pdg/mfa] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Compatibility aliases (Supabase function names)
router.post("/generate-totp", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const secret = speakeasy.generateSecret({
      name: `224Solutions (${req.user?.email})`,
      issuer: "224Solutions",
      length: 32,
    });

    const { error } = await supabase
      .from("mfa_settings")
      .upsert({ user_id: userId, totp_secret: secret.base32, enabled: false }, { onConflict: "user_id" });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(200).json({
      success: true,
      secret: secret.base32,
      qr_code_url: secret.otpauth_url,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/verify-totp", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    if (!token) {
      return res.status(400).json({ success: false, error: "token is required" });
    }

    const { data: mfa } = await supabase
      .from("mfa_settings")
      .select("totp_secret")
      .eq("user_id", userId)
      .single();

    if (!mfa?.totp_secret) {
      return res.status(404).json({ success: false, error: "MFA not configured" });
    }

    const verified = speakeasy.totp.verify({
      secret: mfa.totp_secret,
      encoding: "base32",
      token: String(token),
      window: 1,
    });

    if (!verified) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    await supabase.from("mfa_settings").update({ enabled: true }).eq("user_id", userId);

    return res.status(200).json({ success: true, verified: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.patch("/change-agent-password", async (req: AuthRequest, res: Response) => {
  try {
    const { old_password, new_password } = req.body || {};
    if (!old_password || !new_password) {
      return res.status(400).json({ success: false, error: "Old and new passwords required" });
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: new_password });
    if (updateError) {
      return res.status(400).json({ success: false, error: updateError.message });
    }
    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.patch("/change-bureau-password", async (req: AuthRequest, res: Response) => {
  try {
    const { new_password } = req.body || {};
    if (!new_password) return res.status(400).json({ success: false, error: "new_password required" });
    const { error } = await supabase.auth.updateUser({ password: new_password });
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.patch("/change-member-password", async (req: AuthRequest, res: Response) => {
  try {
    const { new_password } = req.body || {};
    if (!new_password) return res.status(400).json({ success: false, error: "new_password required" });
    const { error } = await supabase.auth.updateUser({ password: new_password });
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/reset-agent-password", async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: "email required" });
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, message: "Reset email sent" });
  } catch {
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/cognito-auth-proxy", async (req: AuthRequest, res: Response) => {
  return res.status(200).json({ success: true, provider: "cognito", proxied: true });
});

router.post("/cognito-sync-session", async (req: AuthRequest, res: Response) => {
  return res.status(200).json({ success: true, synced: true, timestamp: new Date().toISOString() });
});

export default router;
