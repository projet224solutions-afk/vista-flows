import { pgTable, uuid, text, timestamp, boolean, decimal, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "vendeur", "livreur", "taxi", "syndicat", "transitaire", "client"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "preparing", "ready", "in_transit", "delivered", "cancelled"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);
export const paymentMethodEnum = pgEnum("payment_method", ["mobile_money", "card", "cash", "bank_transfer"]);
export const conversationTypeEnum = pgEnum("conversation_type", ["private", "group"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "image", "file", "audio", "video"]);
export const callStatusEnum = pgEnum("call_status", ["pending", "active", "ended", "missed", "rejected"]);
export const callTypeEnum = pgEnum("call_type", ["audio", "video"]);
export const userPresenceStatusEnum = pgEnum("user_presence_status", ["online", "offline", "away", "busy"]);
export const paymentLinkStatusEnum = pgEnum("payment_link_status", ["active", "expired", "used", "cancelled"]);
export const badgeStatusEnum = pgEnum("badge_status", ["active", "expired", "suspended", "revoked"]);
export const syndicateBureauStatusEnum = pgEnum("syndicate_bureau_status", ["pending", "active", "suspended", "dissolved"]);
export const syndicateMemberStatusEnum = pgEnum("syndicate_member_status", ["active", "inactive", "suspended"]);
export const cotisationStatusEnum = pgEnum("cotisation_status", ["paid", "pending", "overdue"]);
export const vehicleStatusEnum = pgEnum("vehicle_status", ["active", "maintenance", "retired"]);
export const syndicateTransactionTypeEnum = pgEnum("syndicate_transaction_type", ["cotisation", "fine", "bonus", "expense"]);
export const syndicateTransactionStatusEnum = pgEnum("syndicate_transaction_status", ["completed", "pending", "cancelled"]);
export const sosAlertTypeEnum = pgEnum("sos_alert_type", ["emergency", "breakdown", "accident", "theft"]);
export const sosSeverityEnum = pgEnum("sos_severity", ["low", "medium", "high", "critical"]);
export const sosStatusEnum = pgEnum("sos_status", ["active", "resolved", "false_alarm"]);

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

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique().$defaultFn(() => `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
  customerId: uuid("customer_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").default("pending"),
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  paymentMethod: paymentMethodEnum("payment_method"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb("shipping_address"),
  billingAddress: jsonb("billing_address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
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

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: conversationTypeEnum("type").notNull().default("private"),
  channelName: text("channel_name").notNull().unique(),
  participants: jsonb("participants").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  type: messageTypeEnum("type").default("text"),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  initiatorId: uuid("initiator_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id").references(() => profiles.id, { onDelete: "set null" }),
  type: callTypeEnum("type").notNull(),
  status: callStatusEnum("status").default("pending"),
  channelName: text("channel_name").notNull(),
  duration: integer("duration").default(0),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const userPresence = pgTable("user_presence", {
  userId: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  status: userPresenceStatusEnum("status").default("offline"),
  lastSeen: timestamp("last_seen").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const dynamicPaymentLinks = pgTable("dynamic_payment_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkId: text("link_id").notNull().unique().$defaultFn(() => `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
  createdBy: uuid("created_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdByType: text("created_by_type").notNull(),
  recipientName: text("recipient_name"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("GNF"),
  description: text("description"),
  status: paymentLinkStatusEnum("status").default("active"),
  expiresAt: timestamp("expires_at").notNull(),
  paidAt: timestamp("paid_at"),
  paidBy: uuid("paid_by").references(() => profiles.id, { onDelete: "set null" }),
  paymentMethod: paymentMethodEnum("payment_method"),
  transactionId: text("transaction_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const taxiMotoBadges = pgTable("taxi_moto_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  badgeNumber: text("badge_number").notNull().unique(),
  driverId: uuid("driver_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  syndicateId: text("syndicate_id"),
  syndicateName: text("syndicate_name"),
  photoUrl: text("photo_url"),
  licenseNumber: text("license_number"),
  city: text("city"),
  status: badgeStatusEnum("status").default("active"),
  qrCodeData: text("qr_code_data").notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  renewedFrom: uuid("renewed_from").references((): any => taxiMotoBadges.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const currencyExchangeRates = pgTable("currency_exchange_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  baseCurrency: text("base_currency").notNull().default("GNF"),
  targetCurrency: text("target_currency").notNull(),
  rate: decimal("rate", { precision: 15, scale: 6 }).notNull(),
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const syndicateBureaus = pgTable("syndicate_bureaus", {
  id: uuid("id").primaryKey().defaultRandom(),
  bureauCode: text("bureau_code").notNull().unique(),
  prefecture: text("prefecture").notNull(),
  commune: text("commune").notNull(),
  fullLocation: text("full_location").notNull(),
  presidentName: text("president_name").notNull(),
  presidentEmail: text("president_email").notNull(),
  presidentPhone: text("president_phone"),
  permanentLink: text("permanent_link").notNull(),
  accessToken: text("access_token").notNull().unique(),
  status: syndicateBureauStatusEnum("status").default("pending"),
  totalMembers: integer("total_members").default(0),
  activeMembers: integer("active_members").default(0),
  totalVehicles: integer("total_vehicles").default(0),
  totalCotisations: decimal("total_cotisations", { precision: 15, scale: 2 }).default("0"),
  treasuryBalance: decimal("treasury_balance", { precision: 15, scale: 2 }).default("0"),
  emailSentCount: integer("email_sent_count").default(0),
  smsSentCount: integer("sms_sent_count").default(0),
  isLinkPermanent: boolean("is_link_permanent").default(true),
  qrCode: text("qr_code"),
  downloadCount: integer("download_count").default(0),
  mobileAccessCount: integer("mobile_access_count").default(0),
  desktopAccessCount: integer("desktop_access_count").default(0),
  tabletAccessCount: integer("tablet_access_count").default(0),
  linkSentAt: timestamp("link_sent_at"),
  linkAccessedAt: timestamp("link_accessed_at"),
  lastActivity: timestamp("last_activity").defaultNow(),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const syndicateMembers = pgTable("syndicate_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  bureauId: uuid("bureau_id").notNull().references(() => syndicateBureaus.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  licenseNumber: text("license_number"),
  vehicleType: text("vehicle_type"),
  vehicleSerial: text("vehicle_serial"),
  status: syndicateMemberStatusEnum("status").default("active"),
  cotisationStatus: cotisationStatusEnum("cotisation_status").default("pending"),
  joinDate: timestamp("join_date").defaultNow(),
  lastCotisationDate: timestamp("last_cotisation_date"),
  totalCotisations: integer("total_cotisations").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const syndicateVehicles = pgTable("syndicate_vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  bureauId: uuid("bureau_id").notNull().references(() => syndicateBureaus.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => syndicateMembers.id, { onDelete: "cascade" }),
  serialNumber: text("serial_number").notNull().unique(),
  type: text("type").notNull(),
  brand: text("brand"),
  model: text("model"),
  year: integer("year"),
  status: vehicleStatusEnum("status").default("active"),
  insuranceExpiry: timestamp("insurance_expiry"),
  lastInspection: timestamp("last_inspection"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const syndicateTransactions = pgTable("syndicate_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bureauId: uuid("bureau_id").notNull().references(() => syndicateBureaus.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").references(() => syndicateMembers.id, { onDelete: "set null" }),
  type: syndicateTransactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  status: syndicateTransactionStatusEnum("status").default("completed"),
  receiptUrl: text("receipt_url"),
  transactionDate: timestamp("transaction_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const syndicateSosAlerts = pgTable("syndicate_sos_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  bureauId: uuid("bureau_id").notNull().references(() => syndicateBureaus.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => syndicateMembers.id, { onDelete: "cascade" }),
  alertType: sosAlertTypeEnum("alert_type").notNull(),
  severity: sosSeverityEnum("severity").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  address: text("address"),
  description: text("description").notNull(),
  status: sosStatusEnum("status").default("active"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true, orderNumber: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true, createdAt: true });
export const insertEnhancedTransactionSchema = createInsertSchema(enhancedTransactions).omit({ id: true, createdAt: true, updatedAt: true, customId: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertCommissionConfigSchema = createInsertSchema(commissionConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCopilotConversationSchema = createInsertSchema(copilotConversations).omit({ id: true, createdAt: true });
export const insertFraudDetectionLogSchema = createInsertSchema(fraudDetectionLogs).omit({ id: true, createdAt: true });
export const insertUserIdSchema = createInsertSchema(userIds).omit({ id: true, createdAt: true });
export const insertVirtualCardSchema = createInsertSchema(virtualCards).omit({ id: true, createdAt: true });
export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertCallSchema = createInsertSchema(calls).omit({ id: true, createdAt: true });
export const insertUserPresenceSchema = createInsertSchema(userPresence).omit({ updatedAt: true });
export const insertDynamicPaymentLinkSchema = createInsertSchema(dynamicPaymentLinks).omit({ id: true, createdAt: true, updatedAt: true, linkId: true });
export const insertTaxiMotoBadgeSchema = createInsertSchema(taxiMotoBadges).omit({ id: true, createdAt: true, updatedAt: true, badgeNumber: true, qrCodeData: true, issuedAt: true });
export const insertCurrencyExchangeRateSchema = createInsertSchema(currencyExchangeRates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSyndicateBureauSchema = createInsertSchema(syndicateBureaus).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSyndicateMemberSchema = createInsertSchema(syndicateMembers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSyndicateVehicleSchema = createInsertSchema(syndicateVehicles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSyndicateTransactionSchema = createInsertSchema(syndicateTransactions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSyndicateSosAlertSchema = createInsertSchema(syndicateSosAlerts).omit({ id: true, createdAt: true, updatedAt: true });

export const updateProfileSchema = insertProfileSchema.partial().omit({ password: true });
export const updateProductSchema = insertProductSchema.partial();
export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "preparing", "ready", "in_transit", "delivered", "cancelled"])
});
export const updateOrderPaymentStatusSchema = z.object({
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"])
});
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
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
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
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type UserPresence = typeof userPresence.$inferSelect;
export type InsertUserPresence = z.infer<typeof insertUserPresenceSchema>;
export type DynamicPaymentLink = typeof dynamicPaymentLinks.$inferSelect;
export type InsertDynamicPaymentLink = z.infer<typeof insertDynamicPaymentLinkSchema>;
export type TaxiMotoBadge = typeof taxiMotoBadges.$inferSelect;
export type InsertTaxiMotoBadge = z.infer<typeof insertTaxiMotoBadgeSchema>;
export type CurrencyExchangeRate = typeof currencyExchangeRates.$inferSelect;
export type InsertCurrencyExchangeRate = z.infer<typeof insertCurrencyExchangeRateSchema>;
export type SyndicateBureau = typeof syndicateBureaus.$inferSelect;
export type InsertSyndicateBureau = z.infer<typeof insertSyndicateBureauSchema>;
export type SyndicateMember = typeof syndicateMembers.$inferSelect;
export type InsertSyndicateMember = z.infer<typeof insertSyndicateMemberSchema>;
export type SyndicateVehicle = typeof syndicateVehicles.$inferSelect;
export type InsertSyndicateVehicle = z.infer<typeof insertSyndicateVehicleSchema>;
export type SyndicateTransaction = typeof syndicateTransactions.$inferSelect;
export type InsertSyndicateTransaction = z.infer<typeof insertSyndicateTransactionSchema>;
export type SyndicateSosAlert = typeof syndicateSosAlerts.$inferSelect;
export type InsertSyndicateSosAlert = z.infer<typeof insertSyndicateSosAlertSchema>;
