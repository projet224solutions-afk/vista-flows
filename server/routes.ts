import type { Express } from "express";
import { storage } from "./storage.js";
import { authService, removePassword } from "./services/auth.js";
import { requireAuth, type AuthRequest } from "./middleware/auth.js";
import { agoraService } from "./services/agora.js";
import { z } from "zod";
import { 
  insertProfileSchema, insertWalletSchema, insertVendorSchema, insertProductSchema,
  insertEnhancedTransactionSchema, insertAuditLogSchema, insertCommissionConfigSchema,
  updateProfileSchema, updateProductSchema, updateWalletBalanceSchema,
  updateTransactionStatusSchema, updateCommissionStatusSchema,
  registerSchema, loginSchema
} from "../shared/schema.js";

export function registerRoutes(app: Express) {
  // ===== AUTHENTICATION =====
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await authService.register(validated);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        return res.status(409).json({ error: error.message });
      }
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated.email, validated.password);
      
      if (!result) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const profile = await storage.getProfileById(req.userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      res.json(removePassword(profile));
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req: AuthRequest, res) => {
    res.json({ message: "Logged out successfully" });
  });

  // ===== PROFILES =====
  app.get("/api/profiles/:id", requireAuth, async (req: AuthRequest, res) => {
    const profile = await storage.getProfileById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(removePassword(profile));
  });

  app.get("/api/profiles/email/:email", requireAuth, async (req: AuthRequest, res) => {
    const profile = await storage.getProfileByEmail(req.params.email);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(removePassword(profile));
  });

  app.post("/api/profiles", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = insertProfileSchema.parse(req.body);
      const profile = await storage.createProfile(validated);
      res.status(201).json(removePassword(profile));
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/profiles/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const profile = await storage.updateProfile(req.params.id, validated);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(removePassword(profile));
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ===== WALLETS =====
  app.get("/api/wallets/user/:userId", async (req, res) => {
    const wallets = await storage.getWalletsByUserId(req.params.userId);
    res.json(wallets);
  });

  app.get("/api/wallets/:userId/primary", async (req, res) => {
    const wallet = await storage.getWalletByUserId(req.params.userId);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json(wallet);
  });

  app.post("/api/wallets", async (req, res) => {
    try {
      const validated = insertWalletSchema.parse(req.body);
      const wallet = await storage.createWallet(validated);
      res.status(201).json(wallet);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/wallets/:id/balance", async (req, res) => {
    try {
      const validated = updateWalletBalanceSchema.parse(req.body);
      const wallet = await storage.updateWalletBalance(req.params.id, validated.balance);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      res.json(wallet);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ===== VENDORS =====
  app.get("/api/vendors", async (req, res) => {
    const vendors = await storage.getVendors();
    res.json(vendors);
  });

  app.get("/api/vendors/:id", async (req, res) => {
    const vendor = await storage.getVendorById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json(vendor);
  });

  app.get("/api/vendors/user/:userId", async (req, res) => {
    const vendor = await storage.getVendorByUserId(req.params.userId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json(vendor);
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      const validated = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(validated);
      res.status(201).json(vendor);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ===== PRODUCTS =====
  app.get("/api/products", async (req, res) => {
    const vendorId = req.query.vendorId as string | undefined;
    const products = await storage.getProducts(vendorId);
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validated = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validated);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const validated = updateProductSchema.parse(req.body);
      const product = await storage.updateProduct(req.params.id, validated);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ===== TRANSACTIONS =====
  app.get("/api/transactions/user/:userId", async (req, res) => {
    const transactions = await storage.getTransactionsByUserId(req.params.userId);
    res.json(transactions);
  });

  app.get("/api/transactions/:id", async (req, res) => {
    const transaction = await storage.getTransactionById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(transaction);
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validated = insertEnhancedTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validated);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/transactions/:id/status", async (req, res) => {
    try {
      const validated = updateTransactionStatusSchema.parse(req.body);
      const transaction = await storage.updateTransactionStatus(req.params.id, validated.status);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ===== AUDIT LOGS =====
  app.get("/api/audit-logs", async (req, res) => {
    const actorId = req.query.actorId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const logs = await storage.getAuditLogs(actorId, limit);
    res.json(logs);
  });

  app.post("/api/audit-logs", async (req, res) => {
    try {
      const validated = insertAuditLogSchema.parse(req.body);
      const log = await storage.createAuditLog(validated);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ===== COMMISSION CONFIG =====
  app.get("/api/commission-config", async (req, res) => {
    const configs = await storage.getCommissionConfigs();
    res.json(configs);
  });

  app.get("/api/commission-config/active", async (req, res) => {
    const configs = await storage.getActiveCommissionConfigs();
    res.json(configs);
  });

  app.post("/api/commission-config", async (req, res) => {
    try {
      const validated = insertCommissionConfigSchema.parse(req.body);
      const config = await storage.createCommissionConfig(validated);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/commission-config/:id/status", async (req, res) => {
    try {
      const validated = updateCommissionStatusSchema.parse(req.body);
      const config = await storage.updateCommissionConfigStatus(req.params.id, validated.isActive);
      if (!config) {
        return res.status(404).json({ error: "Commission config not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ===== AGORA COMMUNICATION =====
  const rtcTokenSchema = z.object({
    channelName: z.string().min(1).max(64),
    uid: z.union([z.string(), z.number()]),
    role: z.enum(['publisher', 'subscriber']).default('publisher'),
    expirationTime: z.number().int().min(60).max(86400).default(3600)
  });

  const rtmTokenSchema = z.object({
    userId: z.string().min(1).max(64),
    expirationTime: z.number().int().min(60).max(86400).default(3600)
  });

  const sessionTokenSchema = z.object({
    channelName: z.string().min(1).max(64),
    role: z.enum(['publisher', 'subscriber']).default('publisher'),
    expirationTime: z.number().int().min(60).max(86400).default(3600)
  });

  app.post("/api/agora/rtc-token", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = rtcTokenSchema.parse(req.body);
      const token = agoraService.generateRTCToken(
        validated.channelName,
        validated.uid,
        validated.role,
        validated.expirationTime
      );

      res.json({
        success: true,
        data: {
          token,
          appId: process.env.AGORA_APP_ID,
          channelName: validated.channelName,
          uid: validated.uid,
          role: validated.role,
          expiresIn: validated.expirationTime
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate RTC token'
      });
    }
  });

  app.post("/api/agora/rtm-token", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = rtmTokenSchema.parse(req.body);
      const token = agoraService.generateRTMToken(
        validated.userId,
        validated.expirationTime
      );

      res.json({
        success: true,
        data: {
          token,
          appId: process.env.AGORA_APP_ID,
          userId: validated.userId,
          expiresIn: validated.expirationTime
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate RTM token'
      });
    }
  });

  app.post("/api/agora/session-tokens", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = sessionTokenSchema.parse(req.body);
      const sessionData = agoraService.generateSessionTokens(
        req.userId!,
        validated.channelName,
        validated.role,
        validated.expirationTime
      );

      res.json({
        success: true,
        data: sessionData
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate session tokens'
      });
    }
  });

  app.post("/api/agora/generate-channel", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { targetUserId, isGroup, groupId } = req.body;

      if (isGroup && !groupId) {
        return res.status(400).json({
          success: false,
          error: 'groupId required for group channels'
        });
      }

      if (!isGroup && !targetUserId) {
        return res.status(400).json({
          success: false,
          error: 'targetUserId required for private conversations'
        });
      }

      let channelName;
      if (isGroup) {
        channelName = agoraService.generateGroupChannelName(groupId);
      } else {
        channelName = agoraService.generateChannelName(req.userId!, targetUserId);
      }

      res.json({
        success: true,
        data: {
          channelName,
          isGroup,
          participants: isGroup ? [groupId] : [req.userId, targetUserId]
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate channel'
      });
    }
  });

  app.get("/api/agora/config", requireAuth, async (req: AuthRequest, res) => {
    try {
      const config = agoraService.validateConfiguration();
      res.json({
        success: true,
        data: {
          appId: process.env.AGORA_APP_ID,
          isConfigured: config.isValid,
          timestamp: config.timestamp
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration'
      });
    }
  });
}
