import type { Express } from "express";
import { storage } from "./storage.js";
import { 
  insertProfileSchema, insertWalletSchema, insertVendorSchema, insertProductSchema,
  insertEnhancedTransactionSchema, insertAuditLogSchema, insertCommissionConfigSchema,
  updateProfileSchema, updateProductSchema
} from "../shared/schema.js";

export function registerRoutes(app: Express) {
  // ===== PROFILES =====
  app.get("/api/profiles/:id", async (req, res) => {
    const profile = await storage.getProfileById(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  });

  app.get("/api/profiles/email/:email", async (req, res) => {
    const profile = await storage.getProfileByEmail(req.params.email);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  });

  app.post("/api/profiles", async (req, res) => {
    try {
      const validated = insertProfileSchema.parse(req.body);
      const profile = await storage.createProfile(validated);
      res.status(201).json(profile);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.patch("/api/profiles/:id", async (req, res) => {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const profile = await storage.updateProfile(req.params.id, validated);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
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
      const { balance } = req.body;
      const wallet = await storage.updateWalletBalance(req.params.id, balance);
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
      const { status } = req.body;
      const transaction = await storage.updateTransactionStatus(req.params.id, status);
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
      const { isActive } = req.body;
      const config = await storage.updateCommissionConfigStatus(req.params.id, isActive);
      if (!config) {
        return res.status(404).json({ error: "Commission config not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });
}
