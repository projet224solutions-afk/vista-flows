import type { Express } from "express";
import { storage } from "./storage.js";
import { authService, removePassword } from "./services/auth.js";
import { requireAuth, type AuthRequest } from "./middleware/auth.js";
import { agoraService } from "./services/agora.js";
import { TransactionFeeService } from "./services/transactionFees.js";
import { BadgeGeneratorService } from "./services/badgeGenerator.js";
import { DynamicPaymentService } from "./services/dynamicPayment.js";
import { z } from "zod";
import { 
  insertProfileSchema, insertWalletSchema, insertVendorSchema, insertProductSchema,
  insertOrderSchema, insertOrderItemSchema,
  insertEnhancedTransactionSchema, insertAuditLogSchema, insertCommissionConfigSchema,
  updateProfileSchema, updateProductSchema, updateOrderStatusSchema, updateOrderPaymentStatusSchema,
  updateWalletBalanceSchema, updateTransactionStatusSchema, updateCommissionStatusSchema,
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

  // ===== ORDERS =====
  app.get("/api/orders", async (req, res) => {
    const vendorId = req.query.vendorId as string | undefined;
    const customerId = req.query.customerId as string | undefined;
    const orders = await storage.getOrders(vendorId, customerId);
    res.json(orders);
  });

  app.get("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const validated = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validated);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const validated = updateOrderStatusSchema.parse(req.body);
      const order = await storage.updateOrderStatus(req.params.id, validated.status);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/orders/:id/payment", async (req, res) => {
    try {
      const validated = updateOrderPaymentStatusSchema.parse(req.body);
      const order = await storage.updateOrderPaymentStatus(req.params.id, validated.paymentStatus);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ===== ORDER ITEMS =====
  app.get("/api/orders/:orderId/items", async (req, res) => {
    const items = await storage.getOrderItems(req.params.orderId);
    res.json(items);
  });

  app.post("/api/orders/:orderId/items", async (req, res) => {
    try {
      const validated = insertOrderItemSchema.parse(req.body);
      const item = await storage.createOrderItem(req.params.orderId, validated);
      res.status(201).json(item);
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

  // ===== GEOLOCATION =====
  const positionSchema = z.object({
    position: z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
      altitude: z.number().optional(),
      speed: z.number().optional(),
      heading: z.number().optional(),
      timestamp: z.number()
    }),
    timestamp: z.number()
  });

  const nearbySchema = z.object({
    center: z.object({
      latitude: z.number(),
      longitude: z.number(),
      timestamp: z.number()
    }),
    radius: z.number().default(5000),
    userType: z.enum(['delivery', 'client']).optional()
  });

  const sharingSchema = z.object({
    id: z.string(),
    fromUserId: z.string(),
    toUserId: z.string(),
    position: z.object({
      latitude: z.number(),
      longitude: z.number(),
      timestamp: z.number()
    }),
    expiresAt: z.number(),
    isActive: z.boolean(),
    permissions: z.object({
      canView: z.boolean(),
      canTrack: z.boolean(),
      canShare: z.boolean()
    })
  });

  app.post("/api/geolocation/position", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = positionSchema.parse(req.body);
      
      console.log(`📍 Position saved for user ${req.userId}:`, validated.position);
      
      res.json({
        success: true,
        message: 'Position saved successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Invalid position data'
      });
    }
  });

  app.post("/api/geolocation/nearby", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = nearbySchema.parse(req.body);
      
      const users: any[] = [];
      
      res.json({
        success: true,
        users
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Invalid nearby search data'
      });
    }
  });

  app.post("/api/geolocation/sharing", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = sharingSchema.parse(req.body);
      
      console.log(`📍 Location sharing created:`, validated.id);
      
      res.json({
        success: true,
        data: validated
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Invalid sharing data'
      });
    }
  });

  app.delete("/api/geolocation/sharing/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const sharingId = req.params.id;
      
      console.log(`📍 Location sharing stopped:`, sharingId);
      
      res.json({
        success: true,
        message: 'Sharing stopped successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to stop sharing'
      });
    }
  });

  // ===== MULTI-CURRENCY TRANSACTIONS WITH AUTOMATIC FEES =====

  const calculateFeesSchema = z.object({
    amount: z.number().positive(),
    currency: z.string().default('GNF')
  });

  const crossCurrencySchema = z.object({
    amount: z.number().positive(),
    fromCurrency: z.string().default('GNF'),
    toCurrency: z.string().default('GNF')
  });

  const updateRateSchema = z.object({
    currency: z.string(),
    rate: z.number().positive()
  });

  app.post("/api/transactions/calculate-fees", async (req, res) => {
    try {
      const validated = calculateFeesSchema.parse(req.body);
      const fees = TransactionFeeService.calculateFees(validated.amount, validated.currency);
      
      res.json({
        success: true,
        data: fees
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Invalid request'
      });
    }
  });

  app.post("/api/transactions/calculate-cross-currency", async (req, res) => {
    try {
      const validated = crossCurrencySchema.parse(req.body);
      const result = TransactionFeeService.calculateCrossCurrencyFees(
        validated.amount,
        validated.fromCurrency,
        validated.toCurrency
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Invalid request'
      });
    }
  });

  app.get("/api/transactions/supported-currencies", async (req, res) => {
    try {
      const currencies = TransactionFeeService.getSupportedCurrencies();
      
      res.json({
        success: true,
        data: currencies
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch currencies'
      });
    }
  });

  app.get("/api/transactions/exchange-rate/:currency", async (req, res) => {
    try {
      const currency = req.params.currency.toUpperCase();
      const rate = TransactionFeeService.getExchangeRate(currency);
      
      res.json({
        success: true,
        data: {
          currency,
          rate
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch exchange rate'
      });
    }
  });

  app.post("/api/transactions/update-exchange-rate", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = updateRateSchema.parse(req.body);
      const success = TransactionFeeService.updateExchangeRate(
        validated.currency.toUpperCase(),
        validated.rate
      );
      
      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid exchange rate'
        });
      }
      
      res.json({
        success: true,
        message: 'Exchange rate updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update exchange rate'
      });
    }
  });

  // ===== TAXI-MOTO BADGE SYSTEM =====
  const createBadgeSchema = z.object({
    driverId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string(),
    vehicleNumber: z.string(),
    vehicleType: z.enum(['moto_economique', 'moto_rapide', 'moto_premium']),
    syndicateId: z.string().optional(),
    syndicateName: z.string().optional(),
    photoUrl: z.string().optional(),
    licenseNumber: z.string().optional(),
    city: z.string().optional()
  });

  const verifyBadgeSchema = z.object({
    badgeData: z.string()
  });

  app.post("/api/badges/create", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = createBadgeSchema.parse(req.body);
      const badge = await BadgeGeneratorService.createBadge({
        ...validated,
        id: validated.driverId
      });
      
      res.json({
        success: true,
        data: badge
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create badge'
      });
    }
  });

  app.post("/api/badges/verify", async (req, res) => {
    try {
      const validated = verifyBadgeSchema.parse(req.body);
      const result = await BadgeGeneratorService.verifyBadge(validated.badgeData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to verify badge'
      });
    }
  });

  app.post("/api/badges/:badgeId/deactivate", requireAuth, async (req: AuthRequest, res) => {
    try {
      const badgeId = req.params.badgeId;
      const success = await BadgeGeneratorService.deactivateBadge(badgeId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Badge not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Badge deactivated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate badge'
      });
    }
  });

  app.post("/api/badges/:badgeId/renew", requireAuth, async (req: AuthRequest, res) => {
    try {
      const badgeId = req.params.badgeId;
      const validated = createBadgeSchema.parse(req.body);
      const newBadge = await BadgeGeneratorService.renewBadge(badgeId, {
        ...validated,
        id: validated.driverId
      });
      
      res.json({
        success: true,
        data: newBadge
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to renew badge'
      });
    }
  });

  app.get("/api/badges/:badgeId/svg", async (req, res) => {
    try {
      const badgeId = req.params.badgeId;
      // TODO: Récupérer le badge et le driver depuis la DB
      // Pour l'instant, on retourne une erreur
      res.status(404).json({
        success: false,
        error: 'Badge SVG generation not yet implemented'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate badge SVG'
      });
    }
  });

  // ===== DYNAMIC PAYMENT LINKS =====

  const createPaymentLinkSchema = z.object({
    createdBy: z.string(),
    createdByType: z.enum(['delivery', 'taxi_moto']),
    amount: z.number().positive(),
    currency: z.string().optional(),
    description: z.string().min(1),
    customerPhone: z.string().optional(),
    customerName: z.string().optional(),
    expiryMinutes: z.number().positive().optional()
  });

  const processPaymentSchema = z.object({
    linkId: z.string(),
    paymentMethod: z.enum(['mobile_money', 'card', 'wallet']),
    customerInfo: z.object({
      name: z.string(),
      phone: z.string(),
      email: z.string().optional()
    }).optional()
  });

  app.post("/api/payment-links/create", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = createPaymentLinkSchema.parse(req.body);
      const paymentLink = await DynamicPaymentService.createPaymentLink(validated);
      
      res.json({
        success: true,
        data: paymentLink
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create payment link'
      });
    }
  });

  app.get("/api/payment-links/:linkId", async (req, res) => {
    try {
      const linkId = req.params.linkId;
      const paymentLink = await DynamicPaymentService.getPaymentLink(linkId);
      
      if (!paymentLink) {
        return res.status(404).json({
          success: false,
          error: 'Payment link not found'
        });
      }

      if (DynamicPaymentService.isExpired(paymentLink)) {
        return res.status(410).json({
          success: false,
          error: 'Payment link has expired'
        });
      }
      
      res.json({
        success: true,
        data: paymentLink
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment link'
      });
    }
  });

  app.post("/api/payment-links/:linkId/pay", async (req, res) => {
    try {
      const linkId = req.params.linkId;
      const validated = processPaymentSchema.parse({ ...req.body, linkId });
      
      const result = await DynamicPaymentService.processPayment(
        linkId,
        {
          paymentMethod: validated.paymentMethod,
          customerInfo: validated.customerInfo
        }
      );
      
      res.json({
        success: result.success,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Payment processing failed'
      });
    }
  });

  app.post("/api/payment-links/:linkId/cancel", requireAuth, async (req: AuthRequest, res) => {
    try {
      const linkId = req.params.linkId;
      const success = await DynamicPaymentService.cancelPaymentLink(linkId, req.userId!);
      
      if (!success) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to cancel this payment link'
        });
      }
      
      res.json({
        success: true,
        message: 'Payment link cancelled'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to cancel payment link'
      });
    }
  });

  app.get("/api/payment-links/user/:userId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.params.userId;
      const status = req.query.status as any;
      
      const links = await DynamicPaymentService.getUserPaymentLinks(userId, status);
      
      res.json({
        success: true,
        data: links
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment links'
      });
    }
  });

  app.get("/api/payment-links/user/:userId/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.params.userId;
      const stats = await DynamicPaymentService.getPaymentStats(userId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment stats'
      });
    }
  });

  // ===== SYNDICATE BUREAU MANAGEMENT =====
  const createBureauSchema = z.object({
    name: z.string().min(1),
    city: z.string().min(1),
    address: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
    manager: z.string().optional()
  });

  const updateBureauStatusSchema = z.object({
    status: z.enum(['active', 'inactive'])
  });

  app.get("/api/syndicate-bureaus", requireAuth, async (req: AuthRequest, res) => {
    try {
      // TODO: Récupérer depuis la DB
      const bureaus: any[] = [];
      
      res.json({
        success: true,
        data: bureaus
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch syndicate bureaus'
      });
    }
  });

  app.post("/api/syndicate-bureaus", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = createBureauSchema.parse(req.body);
      
      const bureau = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...validated,
        status: 'active' as const,
        createdAt: new Date().toISOString()
      };
      
      // TODO: Sauvegarder en DB
      
      res.json({
        success: true,
        data: bureau
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create bureau'
      });
    }
  });

  app.post("/api/syndicate-bureaus/:bureauId/install", requireAuth, async (req: AuthRequest, res) => {
    try {
      const bureauId = req.params.bureauId;
      
      // TODO: Implémenter la logique d'installation
      // - Générer un package d'installation
      // - Créer un lien de téléchargement
      // - Enregistrer l'installation
      
      res.json({
        success: true,
        data: {
          installUrl: `/downloads/bureau-app-${bureauId}.zip`,
          installedAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to initiate installation'
      });
    }
  });

  app.patch("/api/syndicate-bureaus/:bureauId/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const bureauId = req.params.bureauId;
      const validated = updateBureauStatusSchema.parse(req.body);
      
      // TODO: Mettre à jour en DB
      
      res.json({
        success: true,
        data: {
          id: bureauId,
          status: validated.status,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update bureau status'
      });
    }
  });
}
