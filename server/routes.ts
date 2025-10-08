import type { Express } from "express";
import { storage } from "./storage.js";
import { authService, removePassword } from "./services/auth.js";
import { requireAuth, type AuthRequest } from "./middleware/auth.js";
import { authLimiter, apiLimiter, paymentLimiter } from "./middleware/rateLimiter.js";
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

  app.post("/api/auth/login", authLimiter, async (req, res) => {
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
  app.get("/api/wallets/user/:userId", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
    // SÉCURITÉ: Vérifier que l'utilisateur demande ses propres wallets
    if (req.params.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }
    const wallets = await storage.getWalletsByUserId(req.params.userId);
    res.json(wallets);
  });

  app.get("/api/wallets/:userId/primary", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
    // SÉCURITÉ: Vérifier que l'utilisateur demande son propre wallet
    if (req.params.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }
    const wallet = await storage.getWalletByUserId(req.params.userId);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json(wallet);
  });

  app.post("/api/wallets", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
    try {
      const validated = insertWalletSchema.parse(req.body);
      const wallet = await storage.createWallet(validated);
      res.status(201).json(wallet);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // DEPRECATED: This endpoint is unsafe - allows direct balance modification
  // Use /api/wallet/transfer instead for secure transfers
  app.patch("/api/wallets/:id/balance", requireAuth, async (req: AuthRequest, res) => {
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

  // Secure wallet transfer with ACID transaction
  app.post("/api/wallet/transfer", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Validation schema for transfer
      const transferSchema = z.object({
        toUserId: z.string().uuid("Invalid recipient ID"),
        amount: z.number().positive("Amount must be positive").or(z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format")),
        transactionType: z.string().optional().default('transfer'),
        description: z.string().optional().nullable()
      });

      const validated = transferSchema.parse(req.body);
      
      const { pool } = await import('./db.js');
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Call the stored procedure for atomic transfer
        const result = await client.query(
          'SELECT process_transaction($1, $2, $3, $4, $5) as result',
          [
            req.userId, // from_user_id
            validated.toUserId, // to_user_id
            validated.amount, // amount
            validated.transactionType, // transaction_type
            validated.description || null // description
          ]
        );
        
        const transferResult = result.rows[0]?.result;
        
        if (transferResult.error) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: transferResult.error });
        }
        
        await client.query('COMMIT');
        res.json(transferResult);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Transfer failed" });
    }
  });

  // ===== COMMUNICATION - CONVERSATIONS =====
  app.get("/api/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversations = await storage.getConversations(req.userId!);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversation = await storage.getConversationById(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Verify user is participant
      const participants = conversation.participants as string[];
      if (!participants.includes(req.userId!)) {
        return res.status(403).json({ error: "Access denied - not a participant" });
      }
      
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversationSchema = z.object({
        type: z.enum(['private', 'group']).default('private'),
        channelName: z.string(),
        participants: z.array(z.string()).min(1),
        metadata: z.any().optional()
      });
      
      const validated = conversationSchema.parse(req.body);
      
      // Ensure requester is included in participants
      if (!validated.participants.includes(req.userId!)) {
        validated.participants.push(req.userId!);
      }
      
      const conversation = await storage.createConversation(validated);
      res.status(201).json(conversation);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to create conversation" });
    }
  });

  // ===== COMMUNICATION - MESSAGES =====
  app.get("/api/conversations/:conversationId/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Verify user is participant in conversation
      const conversation = await storage.getConversationById(req.params.conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const participants = conversation.participants as string[];
      if (!participants.includes(req.userId!)) {
        return res.status(403).json({ error: "Access denied - not a participant" });
      }
      
      const limit = parseInt(req.query.limit as string) || 100;
      const messages = await storage.getMessages(req.params.conversationId, limit);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:conversationId/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Verify user is participant in conversation
      const conversation = await storage.getConversationById(req.params.conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const participants = conversation.participants as string[];
      if (!participants.includes(req.userId!)) {
        return res.status(403).json({ error: "Access denied - not a participant" });
      }
      
      const messageSchema = z.object({
        content: z.string().min(1),
        type: z.enum(['text', 'image', 'video', 'audio', 'file']).default('text'),
        metadata: z.any().optional()
      });
      
      const validated = messageSchema.parse(req.body);
      const message = await storage.createMessage({
        conversationId: req.params.conversationId,
        senderId: req.userId!,
        ...validated
      });
      res.status(201).json(message);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to create message" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      const message = await storage.getMessageById(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      // Verify user is participant in the conversation
      const conversation = await storage.getConversationById(message.conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const participants = conversation.participants as string[];
      if (!participants.includes(req.userId!)) {
        return res.status(403).json({ error: "Access denied - not a participant" });
      }
      
      const updatedMessage = await storage.markMessageAsRead(req.params.id);
      res.json(updatedMessage);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to mark message as read" });
    }
  });

  // ===== COMMUNICATION - CALLS =====
  app.get("/api/calls", requireAuth, async (req: AuthRequest, res) => {
    try {
      const calls = await storage.getCalls(req.userId!);
      res.json(calls);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch calls" });
    }
  });

  app.post("/api/calls", requireAuth, async (req: AuthRequest, res) => {
    try {
      const callSchema = z.object({
        receiverId: z.string().uuid(),
        type: z.enum(['audio', 'video']),
        conversationId: z.string().uuid().optional()
      });
      
      const validated = callSchema.parse(req.body);
      
      // If conversationId provided, verify user is participant
      if (validated.conversationId) {
        const conversation = await storage.getConversationById(validated.conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }
        
        const participants = conversation.participants as string[];
        if (!participants.includes(req.userId!)) {
          return res.status(403).json({ error: "Access denied - not a participant" });
        }
      }
      
      // Generate Agora channel name and token
      const channelName = `call_${Date.now()}_${crypto.randomUUID()}`;
      const token = agoraService.generateRTCToken(channelName, req.userId!);
      
      const call = await storage.createCall({
        initiatorId: req.userId!,
        receiverId: validated.receiverId,
        type: validated.type,
        channelName,
        conversationId: validated.conversationId
      });
      
      res.status(201).json({ ...call, token });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to create call" });
    }
  });

  app.patch("/api/calls/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const statusSchema = z.object({
        status: z.enum(['pending', 'ringing', 'active', 'completed', 'missed', 'rejected'])
      });
      
      const validated = statusSchema.parse(req.body);
      
      // Fetch call and verify user is participant
      const existingCall = await storage.getCallById(req.params.id);
      if (!existingCall) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      // Verify user is initiator or receiver
      if (existingCall.initiatorId !== req.userId && existingCall.receiverId !== req.userId) {
        return res.status(403).json({ error: "Access denied - not a call participant" });
      }
      
      const call = await storage.updateCallStatus(req.params.id, validated.status);
      res.json(call);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to update call status" });
    }
  });

  app.patch("/api/calls/:id/end", requireAuth, async (req: AuthRequest, res) => {
    try {
      const endSchema = z.object({
        duration: z.number().min(0)
      });
      
      const validated = endSchema.parse(req.body);
      
      // Fetch call and verify user is participant
      const existingCall = await storage.getCallById(req.params.id);
      if (!existingCall) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      // Verify user is initiator or receiver
      if (existingCall.initiatorId !== req.userId && existingCall.receiverId !== req.userId) {
        return res.status(403).json({ error: "Access denied - not a call participant" });
      }
      
      const call = await storage.endCall(req.params.id, validated.duration);
      res.json(call);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to end call" });
    }
  });

  // Agora token generation endpoint
  app.post("/api/agora/token", requireAuth, async (req: AuthRequest, res) => {
    try {
      const tokenSchema = z.object({
        channelName: z.string().min(1),
        uid: z.string().optional()
      });
      
      const validated = tokenSchema.parse(req.body);
      const token = agoraService.generateRTCToken(
        validated.channelName, 
        validated.uid || req.userId!
      );
      
      res.json({ token, channelName: validated.channelName });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to generate token" });
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

  app.post("/api/vendors", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
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

  app.post("/api/products", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
    try {
      const validated = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validated);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/products/:id", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
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

  app.post("/api/orders", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
    try {
      const validated = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validated);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/orders/:id/status", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
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

  app.patch("/api/orders/:id/payment", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
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

  app.post("/api/orders/:orderId/items", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
    try {
      const validated = insertOrderItemSchema.parse(req.body);
      const item = await storage.createOrderItem(req.params.orderId, validated);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ===== TRANSACTIONS =====
  app.get("/api/transactions/user/:userId", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
    // SÉCURITÉ: Vérifier que l'utilisateur demande ses propres transactions
    if (req.params.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }
    const transactions = await storage.getTransactionsByUserId(req.params.userId);
    res.json(transactions);
  });

  app.get("/api/transactions/:id", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
    const transaction = await storage.getTransactionById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    // SÉCURITÉ: Vérifier que l'utilisateur est sender ou receiver
    if (transaction.senderId !== req.userId && transaction.receiverId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }
    res.json(transaction);
  });

  app.post("/api/transactions", requireAuth, paymentLimiter, async (req: AuthRequest, res) => {
    try {
      const validated = insertEnhancedTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validated);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/transactions/:id/status", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
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

  app.post("/api/audit-logs", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
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

  app.post("/api/commission-config", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
    try {
      const validated = insertCommissionConfigSchema.parse(req.body);
      const config = await storage.createCommissionConfig(validated);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/commission-config/:id/status", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
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
      const fees = await TransactionFeeService.calculateFees(validated.amount, validated.currency);
      
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
      const result = await TransactionFeeService.calculateCrossCurrencyFees(
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
      const currencies = await TransactionFeeService.getSupportedCurrencies();
      
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
      const rate = await TransactionFeeService.getExchangeRate(currency);
      
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
      const success = await TransactionFeeService.updateExchangeRate(
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

  app.post("/api/badges/verify", requireAuth, apiLimiter, async (req: AuthRequest, res) => {
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
    paymentMethod: z.enum(['wallet_224', 'mobile_money', 'card', 'cash', 'bank_transfer'])
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

      if (paymentLink.expiresAt && new Date(paymentLink.expiresAt) < new Date()) {
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

  app.post("/api/payment-links/:linkId/pay", requireAuth, async (req: AuthRequest, res) => {
    try {
      const linkId = req.params.linkId;
      const validated = processPaymentSchema.parse(req.body);
      
      const result = await DynamicPaymentService.processPayment(
        linkId,
        {
          paidBy: req.userId!,
          paymentMethod: validated.paymentMethod
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

  // ===== VENDOR PAYMENTS (MIGRATION FROM NEXT.JS API) =====
  
  const createVendorPaymentSchema = z.object({
    produit: z.string().min(1),
    description: z.string().optional(),
    montant: z.number().positive(),
    devise: z.string().default('GNF'),
    client_id: z.string().optional(),
    vendeur_id: z.string()
  });

  const confirmPaymentSchema = z.object({
    payment_id: z.string(),
    payment_method: z.enum(['wallet_224', 'mobile_money', 'card', 'bank_transfer']),
    transaction_id: z.string().optional()
  });

  app.post("/api/payments/create", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = createVendorPaymentSchema.parse(req.body);
      
      // SÉCURITÉ: Vérifier que vendeur_id correspond à l'utilisateur authentifié
      if (validated.vendeur_id !== req.userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: You can only create payments for yourself'
        });
      }
      
      // Créer via DynamicPaymentService pour cohérence
      const paymentLink = await DynamicPaymentService.createPaymentLink({
        createdBy: validated.vendeur_id,
        createdByType: 'delivery',
        amount: validated.montant,
        currency: validated.devise,
        description: validated.produit + (validated.description ? ` - ${validated.description}` : ''),
        recipientName: validated.client_id || '',
        expiryMinutes: 10080 // 7 jours
      });
      
      res.status(201).json({
        success: true,
        payment_link: {
          id: paymentLink.id,
          payment_id: paymentLink.linkId,
          url: `/payment/${paymentLink.linkId}`,
          produit: validated.produit,
          montant: validated.montant,
          frais: validated.montant * 0.01,
          total: validated.montant * 1.01,
          devise: validated.devise,
          status: 'pending',
          expires_at: paymentLink.expiresAt,
          created_at: paymentLink.createdAt
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create payment'
      });
    }
  });

  app.post("/api/payments/confirm", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = confirmPaymentSchema.parse(req.body);
      
      const result = await DynamicPaymentService.processPayment(
        validated.payment_id,
        {
          paidBy: req.userId!,
          paymentMethod: validated.payment_method
        }
      );
      
      res.json({
        success: result.success,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Payment confirmation failed'
      });
    }
  });

  app.get("/api/payments/:paymentId", async (req, res) => {
    try {
      const paymentLink = await DynamicPaymentService.getPaymentLink(req.params.paymentId);
      
      if (!paymentLink) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }
      
      res.json({
        success: true,
        data: paymentLink
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment'
      });
    }
  });

  app.get("/api/payments/vendor/:vendorId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status, limit = '50' } = req.query;
      const vendorId = req.params.vendorId;
      
      const links = await DynamicPaymentService.getUserPaymentLinks(vendorId);
      
      let filtered = links;
      if (status && status !== 'all') {
        filtered = links.filter(link => link.status === status);
      }
      
      const limitNum = parseInt(limit as string);
      filtered = filtered.slice(0, limitNum);
      
      res.json({
        success: true,
        data: filtered
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch vendor payments'
      });
    }
  });

  app.get("/api/payments/admin/all", requireAuth, async (req: AuthRequest, res) => {
    try {
      // TODO: Vérifier permissions admin
      // Pour l'instant retourne vide
      res.json({
        success: true,
        data: []
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch all payments'
      });
    }
  });

  // ===== COMMUNICATION (MIGRATION FROM NEXT.JS API) =====

  app.get("/api/communication/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { user_id } = req.query;
      
      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id required'
        });
      }
      
      const conversations = await storage.getConversations(user_id as string);
      
      res.json({
        success: true,
        conversations: conversations || []
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversations',
        details: error.message
      });
    }
  });

  app.post("/api/communication/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { participants, type = 'private', name, description } = req.body;
      
      if (!participants || participants.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'At least 2 participants required'
        });
      }
      
      const conversation = await storage.createConversation({
        type,
        channelName: name || `conv_${Date.now()}`,
        participants,
        metadata: description ? { description } : null
      });
      
      res.status(201).json({
        success: true,
        conversation
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to create conversation',
        details: error.message
      });
    }
  });

  app.get("/api/communication/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { conversation_id, limit = '100' } = req.query;
      
      if (!conversation_id) {
        return res.status(400).json({
          success: false,
          error: 'conversation_id required'
        });
      }
      
      const messages = await storage.getMessages(
        conversation_id as string,
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        messages: messages || []
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch messages',
        details: error.message
      });
    }
  });

  app.post("/api/communication/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { conversation_id, sender_id, content, type = 'text' } = req.body;
      
      if (!conversation_id || !sender_id || !content) {
        return res.status(400).json({
          success: false,
          error: 'conversation_id, sender_id and content required'
        });
      }
      
      const message = await storage.createMessage({
        conversationId: conversation_id,
        senderId: sender_id,
        content,
        type,
        isRead: false
      });
      
      res.status(201).json({
        success: true,
        message
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to create message',
        details: error.message
      });
    }
  });

  // ===== TRANSPORT (MIGRATION FROM NEXT.JS API) =====

  const createTransportRequestSchema = z.object({
    id: z.string(),
    clientId: z.string(),
    clientName: z.string(),
    clientPhone: z.string(),
    pickupAddress: z.string(),
    deliveryAddress: z.string(),
    pickupPosition: z.object({
      lat: z.number(),
      lng: z.number()
    }),
    deliveryPosition: z.object({
      lat: z.number(),
      lng: z.number()
    }),
    distance: z.number(),
    estimatedTime: z.number(),
    price: z.number(),
    fees: z.number(),
    totalPrice: z.number(),
    notes: z.string().optional(),
    status: z.string().default('pending')
  });

  app.post("/api/transport/request", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = createTransportRequestSchema.parse(req.body);
      
      // TODO: Sauvegarder en DB via storage
      // Pour l'instant simulation
      const request = {
        ...validated,
        created_at: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: request,
        message: 'Transport request created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create transport request'
      });
    }
  });

  app.get("/api/transport/request", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { userId, status, limit = '50' } = req.query;
      
      // TODO: Récupérer depuis DB
      // Pour l'instant vide
      res.json({
        success: true,
        data: []
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transport requests'
      });
    }
  });

  app.post("/api/transport/request/:requestId/accept", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { requestId } = req.params;
      const { driverId, driverName, vehicleInfo } = req.body;
      
      // TODO: Mettre à jour DB
      res.json({
        success: true,
        data: {
          requestId,
          status: 'accepted',
          driverId,
          driverName,
          vehicleInfo,
          acceptedAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to accept transport request'
      });
    }
  });

  app.post("/api/transport/request/:requestId/picked-up", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { requestId } = req.params;
      
      // TODO: Mettre à jour DB
      res.json({
        success: true,
        data: {
          requestId,
          status: 'picked_up',
          pickedUpAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to update transport request'
      });
    }
  });

  app.post("/api/transport/request/:requestId/delivered", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { requestId } = req.params;
      
      // TODO: Mettre à jour DB
      res.json({
        success: true,
        data: {
          requestId,
          status: 'delivered',
          deliveredAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to update transport request'
      });
    }
  });

  // ===== DELIVERY (MIGRATION FROM NEXT.JS API) =====
  
  const createDeliveryRequestSchema = z.object({
    clientId: z.string(),
    clientName: z.string().optional(),
    clientPhone: z.string().optional(),
    clientPhoto: z.string().optional(),
    pickupAddress: z.string(),
    deliveryAddress: z.string(),
    pickupPosition: z.object({
      latitude: z.number(),
      longitude: z.number()
    }),
    deliveryPosition: z.object({
      latitude: z.number(),
      longitude: z.number()
    }),
    distance: z.number().optional(),
    estimatedTime: z.number().optional(),
    price: z.number().optional(),
    fees: z.number().optional(),
    totalPrice: z.number().optional(),
    notes: z.string().optional()
  });

  app.post("/api/delivery/request", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = createDeliveryRequestSchema.parse(req.body);
      
      // TODO: Créer dans delivery_requests table via storage
      // Pour l'instant, retourne une réponse simulée
      const deliveryId = `delivery_${Date.now()}`;
      
      res.status(201).json({
        success: true,
        delivery: {
          id: deliveryId,
          clientId: validated.clientId,
          pickupAddress: validated.pickupAddress,
          deliveryAddress: validated.deliveryAddress,
          distance: validated.distance || 0,
          estimatedTime: validated.estimatedTime || 0,
          price: validated.price || 0,
          fees: validated.fees || 0,
          totalPrice: validated.totalPrice || 0,
          status: 'pending',
          createdAt: Date.now()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create delivery request'
      });
    }
  });

  app.get("/api/delivery/request", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { userId, status, limit = 50, offset = 0 } = req.query;
      
      // TODO: Récupérer depuis delivery_requests table via storage
      // Pour l'instant, retourne une liste vide
      res.json({
        success: true,
        deliveries: []
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch delivery requests'
      });
    }
  });

  app.post("/api/delivery/request/:deliveryId/accept", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { deliveryId } = req.params;
      const { deliveryUserId, deliveryUserName } = req.body;
      
      // TODO: Mettre à jour DB
      res.json({
        success: true,
        data: {
          deliveryId,
          status: 'accepted',
          deliveryUserId,
          acceptedAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to accept delivery request'
      });
    }
  });

  app.post("/api/delivery/request/:deliveryId/picked-up", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { deliveryId } = req.params;
      
      // TODO: Mettre à jour DB
      res.json({
        success: true,
        data: {
          deliveryId,
          status: 'picked_up',
          pickedUpAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to update delivery request'
      });
    }
  });

  app.post("/api/delivery/request/:deliveryId/delivered", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { deliveryId } = req.params;
      
      // TODO: Mettre à jour DB
      res.json({
        success: true,
        data: {
          deliveryId,
          status: 'delivered',
          deliveredAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Failed to update delivery request'
      });
    }
  });

  app.get("/api/delivery/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.query;
      
      // TODO: Récupérer depuis delivery_requests table
      res.json({
        success: true,
        status: 'offline',
        activeDeliveries: 0
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch delivery status'
      });
    }
  });

  app.get("/api/delivery/users/online", requireAuth, async (req: AuthRequest, res) => {
    try {
      // TODO: Récupérer les livreurs en ligne
      res.json({
        success: true,
        users: []
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch online delivery users'
      });
    }
  });

  // ===== ESCROW (MIGRATION FROM NEXT.JS API) =====
  
  const createEscrowInvoiceSchema = z.object({
    driverId: z.string(),
    driverName: z.string().optional(),
    driverPhone: z.string().optional(),
    amount: z.number(),
    feePercent: z.number().optional(),
    startLocation: z.string(),
    endLocation: z.string(),
    startCoordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional(),
    endCoordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional(),
    distance: z.number().optional(),
    duration: z.number().optional()
  });

  app.post("/api/escrow/invoice", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = createEscrowInvoiceSchema.parse(req.body);
      
      // TODO: Créer dans escrow_invoices table via storage
      const invoiceId = `invoice_${Date.now()}`;
      
      res.status(201).json({
        success: true,
        invoice: {
          id: invoiceId,
          driverId: validated.driverId,
          amount: validated.amount,
          feePercent: validated.feePercent || 5,
          status: 'pending',
          startLocation: validated.startLocation,
          endLocation: validated.endLocation,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create escrow invoice'
      });
    }
  });

  const initiateEscrowSchema = z.object({
    transaction: z.object({
      id: z.string().optional(),
      invoiceId: z.string(),
      clientId: z.string(),
      driverId: z.string(),
      amount: z.number(),
      feePercent: z.number(),
      feeAmount: z.number(),
      totalAmount: z.number(),
      startLocation: z.string(),
      endLocation: z.string(),
      startCoordinates: z.object({
        latitude: z.number(),
        longitude: z.number()
      }).optional(),
      endCoordinates: z.object({
        latitude: z.number(),
        longitude: z.number()
      }).optional()
    }),
    paymentMethod: z.string(),
    paymentData: z.any().optional()
  });

  app.post("/api/escrow/initiate", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validated = initiateEscrowSchema.parse(req.body);
      
      // TODO: Créer dans escrow_transactions table via storage
      // TODO: Bloquer les fonds dans le wallet
      // TODO: Créer les notifications
      
      const transactionId = validated.transaction.id || `escrow_${Date.now()}`;
      
      res.status(201).json({
        success: true,
        transaction: {
          id: transactionId,
          invoiceId: validated.transaction.invoiceId,
          clientId: validated.transaction.clientId,
          driverId: validated.transaction.driverId,
          amount: validated.transaction.amount,
          totalAmount: validated.transaction.totalAmount,
          status: 'pending',
          paymentMethod: validated.paymentMethod,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to initiate escrow transaction'
      });
    }
  });

  // Routes escrow non implémentées (appelées par frontend mais n'existent pas en legacy)
  app.post("/api/escrow/release", requireAuth, async (req: AuthRequest, res) => {
    res.status(501).json({ success: false, error: 'Not implemented yet - migration pending' });
  });

  app.post("/api/escrow/refund", requireAuth, async (req: AuthRequest, res) => {
    res.status(501).json({ success: false, error: 'Not implemented yet - migration pending' });
  });

  app.post("/api/escrow/dispute", requireAuth, async (req: AuthRequest, res) => {
    res.status(501).json({ success: false, error: 'Not implemented yet - migration pending' });
  });

  app.post("/api/escrow/dispute/resolve", requireAuth, async (req: AuthRequest, res) => {
    res.status(501).json({ success: false, error: 'Not implemented yet - migration pending' });
  });

  app.get("/api/escrow/qr-code", requireAuth, async (req: AuthRequest, res) => {
    res.status(501).json({ success: false, error: 'Not implemented yet - migration pending' });
  });

  app.get("/api/escrow/transactions/active", requireAuth, async (req: AuthRequest, res) => {
    res.status(501).json({ success: false, error: 'Not implemented yet - migration pending' });
  });
}
