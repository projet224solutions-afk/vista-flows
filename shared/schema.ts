import { pgTable, uuid, text, timestamp, boolean, decimal, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "vendeur", "livreur", "taxi", "syndicat", "transitaire", "client"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "preparing", "ready", "in_transit", "delivered", "cancelled"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);
export const paymentMethodEnum = pgEnum("payment_method", ["mobile_money", "card", "cash", "bank_transfer"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("client"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const userIds = pgTable("user_ids", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }).unique(),
  customId: text("custom_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow()
});

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("GNF"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  transactionId: text("transaction_id").notNull().unique(),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("GNF"),
  status: paymentStatusEnum("status").default("pending"),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

export const virtualCards = pgTable("virtual_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }).unique(),
  cardNumber: text("card_number").notNull().unique(),
  cardholderName: text("cardholder_name").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  cvv: text("cvv").notNull(),
  isActive: boolean("is_active").default(true),
  dailyLimit: decimal("daily_limit", { precision: 15, scale: 2 }).default("500000"),
  monthlyLimit: decimal("monthly_limit", { precision: 15, scale: 2 }).default("2000000"),
  createdAt: timestamp("created_at").defaultNow()
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: uuid("parent_id").references((): any => categories.id),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }).unique(),
  businessName: text("business_name").notNull(),
  description: text("description"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  logoUrl: text("logo_url"),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("total_reviews").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
  sku: text("sku"),
  images: text("images").array(),
  isActive: boolean("is_active").default(true),
  stockQuantity: integer("stock_quantity").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const enhancedTransactions = pgTable("enhanced_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull().references(() => profiles.id),
  receiverId: uuid("receiver_id").notNull().references(() => profiles.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("GNF"),
  method: text("method").notNull().default("wallet_transfer"),
  status: text("status").notNull().default("pending"),
  customId: text("custom_id").notNull().unique().$defaultFn(() => `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  dataJson: jsonb("data_json"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  hash: text("hash"),
  createdAt: timestamp("created_at").defaultNow()
});

export const commissionConfig = pgTable("commission_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceName: text("service_name").notNull(),
  transactionType: text("transaction_type").notNull(),
  commissionType: text("commission_type").notNull(),
  commissionValue: decimal("commission_value", { precision: 10, scale: 4 }).notNull(),
  minAmount: decimal("min_amount", { precision: 15, scale: 2 }),
  maxAmount: decimal("max_amount", { precision: 15, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const copilotConversations = pgTable("copilot_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  pdgUserId: uuid("pdg_user_id").notNull().references(() => profiles.id),
  messageIn: text("message_in").notNull(),
  messageOut: text("message_out").notNull(),
  actions: jsonb("actions"),
  executed: boolean("executed").default(false),
  mfaVerified: boolean("mfa_verified").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const fraudDetectionLogs = pgTable("fraud_detection_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => profiles.id),
  transactionId: uuid("transaction_id"),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: text("risk_level").notNull(),
  flags: jsonb("flags").notNull(),
  actionTaken: text("action_taken"),
  reviewed: boolean("reviewed").default(false),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnhancedTransactionSchema = createInsertSchema(enhancedTransactions).omit({ id: true, createdAt: true, updatedAt: true, customId: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertCommissionConfigSchema = createInsertSchema(commissionConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCopilotConversationSchema = createInsertSchema(copilotConversations).omit({ id: true, createdAt: true });
export const insertFraudDetectionLogSchema = createInsertSchema(fraudDetectionLogs).omit({ id: true, createdAt: true });
export const insertUserIdSchema = createInsertSchema(userIds).omit({ id: true, createdAt: true });
export const insertVirtualCardSchema = createInsertSchema(virtualCards).omit({ id: true, createdAt: true });
export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true });

export const updateProfileSchema = insertProfileSchema.partial().omit({ password: true });
export const updateProductSchema = insertProductSchema.partial();
export const updateWalletBalanceSchema = z.object({
  balance: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid balance format")
});
export const updateTransactionStatusSchema = z.object({
  status: z.enum(["pending", "completed", "failed", "refunded"])
});
export const updateCommissionStatusSchema = z.object({
  isActive: z.boolean()
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["admin", "vendeur", "livreur", "taxi", "syndicat", "transitaire", "client"]).default("client")
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type EnhancedTransaction = typeof enhancedTransactions.$inferSelect;
export type InsertEnhancedTransaction = z.infer<typeof insertEnhancedTransactionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type CommissionConfig = typeof commissionConfig.$inferSelect;
export type InsertCommissionConfig = z.infer<typeof insertCommissionConfigSchema>;
export type CopilotConversation = typeof copilotConversations.$inferSelect;
export type InsertCopilotConversation = z.infer<typeof insertCopilotConversationSchema>;
export type FraudDetectionLog = typeof fraudDetectionLogs.$inferSelect;
export type InsertFraudDetectionLog = z.infer<typeof insertFraudDetectionLogSchema>;
