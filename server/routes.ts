import type { Express } from "express";
import { storage } from "./storage.js";
import { insertProfileSchema, insertVendorSchema, insertProductSchema } from "../shared/schema.js";

export function registerRoutes(app: Express) {
  app.get("/api/profiles/:id", async (req, res) => {
    const profile = await storage.getProfileById(req.params.id);
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

  app.get("/api/wallets/user/:userId", async (req, res) => {
    const wallets = await storage.getWalletsByUserId(req.params.userId);
    res.json(wallets);
  });

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
}
