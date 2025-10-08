import type { 
  Profile, InsertProfile, 
  Wallet, InsertWallet,
  Vendor, InsertVendor,
  Product, InsertProduct,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  EnhancedTransaction, InsertEnhancedTransaction,
  AuditLog, InsertAuditLog,
  CommissionConfig, InsertCommissionConfig
} from "../shared/schema.js";
import { db } from './db.js';
import { eq, or, sql } from 'drizzle-orm';
import * as schema from '../shared/schema.js';
import type { 
  Conversation, InsertConversation,
  Message, InsertMessage,
  Call, InsertCall
} from '../shared/schema.js';

type UserId = {
  id: string;
  userId: string;
  customId: string;
  createdAt: Date | null;
};

type InsertUserId = {
  userId: string;
  customId: string;
};

type VirtualCard = {
  id: string;
  userId: string;
  cardNumber: string;
  cardholderName: string;
  expiryDate: Date;
  cvv: string;
  isActive: boolean | null;
  dailyLimit: string | null;
  monthlyLimit: string | null;
  createdAt: Date | null;
};

type InsertVirtualCard = {
  userId: string;
  cardNumber: string;
  cardholderName: string;
  expiryDate: Date;
  cvv: string;
  isActive?: boolean;
  dailyLimit?: string;
  monthlyLimit?: string;
};

export interface IStorage {
  // Profiles
  getProfileById(id: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile | undefined>;
  
  // User IDs
  createUserId(userId: InsertUserId): Promise<UserId>;
  
  // Wallets
  getWalletByUserId(userId: string): Promise<Wallet | undefined>;
  getWalletsByUserId(userId: string): Promise<Wallet[]>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(id: string, balance: string): Promise<Wallet | undefined>;
  
  // Virtual Cards
  createVirtualCard(card: InsertVirtualCard): Promise<VirtualCard>;
  
  // Vendors
  getVendors(): Promise<Vendor[]>;
  getVendorById(id: string): Promise<Vendor | undefined>;
  getVendorByUserId(userId: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  
  // Products
  getProducts(vendorId?: string): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  
  // Orders
  getOrders(vendorId?: string, customerId?: string): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderPaymentStatus(id: string, paymentStatus: string): Promise<Order | undefined>;
  
  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(orderId: string, item: InsertOrderItem): Promise<OrderItem>;
  
  // Enhanced Transactions
  getTransactionsByUserId(userId: string): Promise<EnhancedTransaction[]>;
  getTransactionById(id: string): Promise<EnhancedTransaction | undefined>;
  createTransaction(transaction: InsertEnhancedTransaction): Promise<EnhancedTransaction>;
  updateTransactionStatus(id: string, status: string): Promise<EnhancedTransaction | undefined>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(actorId?: string, limit?: number): Promise<AuditLog[]>;
  
  // Commission Config
  getCommissionConfigs(): Promise<CommissionConfig[]>;
  getActiveCommissionConfigs(): Promise<CommissionConfig[]>;
  createCommissionConfig(config: InsertCommissionConfig): Promise<CommissionConfig>;
  updateCommissionConfigStatus(id: string, isActive: boolean): Promise<CommissionConfig | undefined>;
  
  // Communication - Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversationById(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, conversation: Partial<InsertConversation>): Promise<Conversation | undefined>;
  
  // Communication - Messages
  getMessages(conversationId: string, limit?: number): Promise<Message[]>;
  getMessageById(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<Message | undefined>;
  
  // Communication - Calls
  getCalls(userId: string): Promise<Call[]>;
  getCallById(id: string): Promise<Call | undefined>;
  createCall(call: InsertCall): Promise<Call>;
  updateCallStatus(id: string, status: string): Promise<Call | undefined>;
  endCall(id: string, duration: number): Promise<Call | undefined>;
}

export class MemStorage implements IStorage {
  private profiles: Map<string, Profile> = new Map();
  private userIds: Map<string, UserId> = new Map();
  private wallets: Map<string, Wallet> = new Map();
  private virtualCards: Map<string, VirtualCard> = new Map();
  private vendors: Map<string, Vendor> = new Map();
  private products: Map<string, Product> = new Map();
  private orders: Map<string, Order> = new Map();
  private orderItems: Map<string, OrderItem> = new Map();
  private transactions: Map<string, EnhancedTransaction> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();
  private commissionConfigs: Map<string, CommissionConfig> = new Map();

  // Profiles
  async getProfileById(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find(p => p.email === email);
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const id = crypto.randomUUID();
    const newProfile: Profile = {
      id,
      email: profile.email,
      password: profile.password,
      phone: profile.phone ?? null,
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      role: profile.role ?? "client",
      isActive: profile.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.profiles.set(id, newProfile);
    return newProfile;
  }

  async updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile | undefined> {
    const existing = this.profiles.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...profile, updatedAt: new Date() };
    this.profiles.set(id, updated);
    return updated;
  }

  // User IDs
  async createUserId(data: InsertUserId): Promise<UserId> {
    const id = crypto.randomUUID();
    const newUserId: UserId = {
      id,
      userId: data.userId,
      customId: data.customId,
      createdAt: new Date()
    };
    this.userIds.set(id, newUserId);
    return newUserId;
  }

  // Wallets
  async getWalletByUserId(userId: string): Promise<Wallet | undefined> {
    return Array.from(this.wallets.values()).find(w => w.userId === userId);
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    return Array.from(this.wallets.values()).filter(w => w.userId === userId);
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const id = crypto.randomUUID();
    const newWallet: Wallet = {
      id,
      ...wallet,
      balance: wallet.balance || "0",
      currency: wallet.currency || "GNF",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.wallets.set(id, newWallet);
    return newWallet;
  }

  async updateWalletBalance(id: string, balance: string): Promise<Wallet | undefined> {
    const wallet = this.wallets.get(id);
    if (!wallet) return undefined;
    const updated = { ...wallet, balance, updatedAt: new Date() };
    this.wallets.set(id, updated);
    return updated;
  }

  // Virtual Cards
  async createVirtualCard(card: InsertVirtualCard): Promise<VirtualCard> {
    const id = crypto.randomUUID();
    const newCard: VirtualCard = {
      id,
      userId: card.userId,
      cardNumber: card.cardNumber,
      cardholderName: card.cardholderName,
      expiryDate: card.expiryDate,
      cvv: card.cvv,
      isActive: card.isActive ?? true,
      dailyLimit: card.dailyLimit ?? '500000',
      monthlyLimit: card.monthlyLimit ?? '2000000',
      createdAt: new Date()
    };
    this.virtualCards.set(id, newCard);
    return newCard;
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }

  async getVendorByUserId(userId: string): Promise<Vendor | undefined> {
    return Array.from(this.vendors.values()).find(v => v.userId === userId);
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const id = crypto.randomUUID();
    const newVendor: Vendor = {
      id,
      userId: vendor.userId,
      businessName: vendor.businessName,
      description: vendor.description ?? null,
      address: vendor.address ?? null,
      phone: vendor.phone ?? null,
      email: vendor.email ?? null,
      logoUrl: vendor.logoUrl ?? null,
      isVerified: vendor.isVerified ?? false,
      isActive: vendor.isActive ?? true,
      rating: vendor.rating ?? "0",
      totalReviews: vendor.totalReviews ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.vendors.set(id, newVendor);
    return newVendor;
  }

  // Products
  async getProducts(vendorId?: string): Promise<Product[]> {
    const products = Array.from(this.products.values());
    if (vendorId) {
      return products.filter(p => p.vendorId === vendorId);
    }
    return products;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = crypto.randomUUID();
    const newProduct: Product = {
      id,
      vendorId: product.vendorId,
      categoryId: product.categoryId ?? null,
      name: product.name,
      description: product.description ?? null,
      price: product.price,
      comparePrice: product.comparePrice ?? null,
      sku: product.sku ?? null,
      images: product.images ?? null,
      isActive: product.isActive ?? true,
      stockQuantity: product.stockQuantity ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...product, updatedAt: new Date() };
    this.products.set(id, updated);
    return updated;
  }

  // Orders
  async getOrders(vendorId?: string, customerId?: string): Promise<Order[]> {
    let result = Array.from(this.orders.values());
    if (vendorId) {
      result = result.filter(o => o.vendorId === vendorId);
    }
    if (customerId) {
      result = result.filter(o => o.customerId === customerId);
    }
    return result;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newOrder: Order = {
      id,
      orderNumber,
      customerId: order.customerId,
      vendorId: order.vendorId,
      status: order.status ?? "pending",
      paymentStatus: order.paymentStatus ?? "pending",
      paymentMethod: order.paymentMethod ?? null,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount ?? "0",
      shippingAmount: order.shippingAmount ?? "0",
      discountAmount: order.discountAmount ?? "0",
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress ?? null,
      billingAddress: order.billingAddress ?? null,
      notes: order.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, status: status as Order["status"], updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  async updateOrderPaymentStatus(id: string, paymentStatus: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, paymentStatus: paymentStatus as Order["paymentStatus"], updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(item => item.orderId === orderId);
  }

  async createOrderItem(orderId: string, item: InsertOrderItem): Promise<OrderItem> {
    const id = crypto.randomUUID();
    const newItem: OrderItem = {
      id,
      orderId: item.orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      createdAt: new Date()
    };
    this.orderItems.set(id, newItem);
    return newItem;
  }

  // Enhanced Transactions
  async getTransactionsByUserId(userId: string): Promise<EnhancedTransaction[]> {
    return Array.from(this.transactions.values()).filter(
      t => t.senderId === userId || t.receiverId === userId
    );
  }

  async getTransactionById(id: string): Promise<EnhancedTransaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(transaction: InsertEnhancedTransaction): Promise<EnhancedTransaction> {
    const id = crypto.randomUUID();
    const customId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTransaction: EnhancedTransaction = {
      id,
      senderId: transaction.senderId,
      receiverId: transaction.receiverId,
      amount: transaction.amount,
      currency: transaction.currency ?? "GNF",
      method: transaction.method ?? "wallet_transfer",
      status: transaction.status ?? "pending",
      customId: customId,
      metadata: transaction.metadata ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransactionStatus(id: string, status: string): Promise<EnhancedTransaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    const updated = { ...transaction, status, updatedAt: new Date() };
    this.transactions.set(id, updated);
    return updated;
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const id = crypto.randomUUID();
    const newLog: AuditLog = {
      id,
      actorId: log.actorId,
      action: log.action,
      targetType: log.targetType ?? null,
      targetId: log.targetId ?? null,
      dataJson: log.dataJson ?? null,
      ipAddress: log.ipAddress ?? null,
      userAgent: log.userAgent ?? null,
      hash: log.hash ?? null,
      createdAt: new Date()
    };
    this.auditLogs.set(id, newLog);
    return newLog;
  }

  async getAuditLogs(actorId?: string, limit: number = 50): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());
    if (actorId) {
      logs = logs.filter(l => l.actorId === actorId);
    }
    return logs.sort((a, b) => {
      const timeA = a.createdAt?.getTime() ?? 0;
      const timeB = b.createdAt?.getTime() ?? 0;
      return timeB - timeA;
    }).slice(0, limit);
  }

  // Commission Config
  async getCommissionConfigs(): Promise<CommissionConfig[]> {
    return Array.from(this.commissionConfigs.values());
  }

  async getActiveCommissionConfigs(): Promise<CommissionConfig[]> {
    return Array.from(this.commissionConfigs.values()).filter(c => c.isActive);
  }

  async createCommissionConfig(config: InsertCommissionConfig): Promise<CommissionConfig> {
    const id = crypto.randomUUID();
    const newConfig: CommissionConfig = {
      id,
      serviceName: config.serviceName,
      transactionType: config.transactionType,
      commissionType: config.commissionType,
      commissionValue: config.commissionValue,
      minAmount: config.minAmount ?? null,
      maxAmount: config.maxAmount ?? null,
      isActive: config.isActive ?? true,
      createdBy: config.createdBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.commissionConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateCommissionConfigStatus(id: string, isActive: boolean): Promise<CommissionConfig | undefined> {
    const config = this.commissionConfigs.get(id);
    if (!config) return undefined;
    const updated = { ...config, isActive, updatedAt: new Date() };
    this.commissionConfigs.set(id, updated);
    return updated;
  }

  // Communication - Conversations (MemStorage stubs)
  async getConversations(userId: string): Promise<Conversation[]> {
    throw new Error("Communication not implemented in MemStorage");
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    throw new Error("Communication not implemented in MemStorage");
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    throw new Error("Communication not implemented in MemStorage");
  }

  async updateConversation(id: string, conversation: Partial<InsertConversation>): Promise<Conversation | undefined> {
    throw new Error("Communication not implemented in MemStorage");
  }

  // Communication - Messages (MemStorage stubs)
  async getMessages(conversationId: string, limit?: number): Promise<Message[]> {
    throw new Error("Communication not implemented in MemStorage");
  }

  async getMessageById(id: string): Promise<Message | undefined> {
    throw new Error("Communication not implemented in MemStorage");
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    throw new Error("Communication not implemented in MemStorage");
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    throw new Error("Communication not implemented in MemStorage");
  }

  // Communication - Calls (MemStorage stubs)
  async getCalls(userId: string): Promise<Call[]> {
    throw new Error("Communication not implemented in MemStorage");
  }

  async getCallById(id: string): Promise<Call | undefined> {
    throw new Error("Communication not implemented in MemStorage");
  }

  async createCall(call: InsertCall): Promise<Call> {
    throw new Error("Communication not implemented in MemStorage");
  }

  async updateCallStatus(id: string, status: string): Promise<Call | undefined> {
    throw new Error("Communication not implemented in MemStorage");
  }

  async endCall(id: string, duration: number): Promise<Call | undefined> {
    throw new Error("Communication not implemented in MemStorage");
  }
}

export class DbStorage implements IStorage {
  async getProfileById(id: string): Promise<Profile | undefined> {
    const result = await db.select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, id))
      .limit(1);
    return result[0];
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    const result = await db.select()
      .from(schema.profiles)
      .where(eq(schema.profiles.email, email))
      .limit(1);
    return result[0];
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const result = await db.insert(schema.profiles)
      .values(profile)
      .returning();
    return result[0];
  }

  async updateProfile(id: string, profileData: Partial<InsertProfile>): Promise<Profile | undefined> {
    const result = await db.update(schema.profiles)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(schema.profiles.id, id))
      .returning();
    return result[0];
  }

  async createUserId(data: InsertUserId): Promise<UserId> {
    const result = await db.insert(schema.userIds)
      .values(data)
      .returning();
    return result[0];
  }

  async getWalletByUserId(userId: string): Promise<Wallet | undefined> {
    const result = await db.select()
      .from(schema.wallets)
      .where(eq(schema.wallets.userId, userId))
      .limit(1);
    return result[0];
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    return await db.select()
      .from(schema.wallets)
      .where(eq(schema.wallets.userId, userId));
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const result = await db.insert(schema.wallets)
      .values(wallet)
      .returning();
    return result[0];
  }

  async updateWalletBalance(id: string, balance: string): Promise<Wallet | undefined> {
    const result = await db.update(schema.wallets)
      .set({ balance, updatedAt: new Date() })
      .where(eq(schema.wallets.id, id))
      .returning();
    return result[0];
  }

  async createVirtualCard(card: InsertVirtualCard): Promise<VirtualCard> {
    const result = await db.insert(schema.virtualCards)
      .values(card)
      .returning();
    return result[0];
  }

  async getVendors(): Promise<Vendor[]> {
    return await db.select()
      .from(schema.vendors);
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    const result = await db.select()
      .from(schema.vendors)
      .where(eq(schema.vendors.id, id))
      .limit(1);
    return result[0];
  }

  async getVendorByUserId(userId: string): Promise<Vendor | undefined> {
    const result = await db.select()
      .from(schema.vendors)
      .where(eq(schema.vendors.userId, userId))
      .limit(1);
    return result[0];
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const result = await db.insert(schema.vendors)
      .values(vendor)
      .returning();
    return result[0];
  }

  async getProducts(vendorId?: string): Promise<Product[]> {
    if (vendorId) {
      return await db.select()
        .from(schema.products)
        .where(eq(schema.products.vendorId, vendorId));
    }
    return await db.select().from(schema.products);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const result = await db.select()
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1);
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(schema.products)
      .values(product)
      .returning();
    return result[0];
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(schema.products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(schema.products.id, id))
      .returning();
    return result[0];
  }

  async getOrders(vendorId?: string, customerId?: string): Promise<Order[]> {
    let query = db.select().from(schema.orders);
    
    if (vendorId && customerId) {
      return await query.where(
        or(
          eq(schema.orders.vendorId, vendorId),
          eq(schema.orders.customerId, customerId)
        )
      );
    } else if (vendorId) {
      return await query.where(eq(schema.orders.vendorId, vendorId));
    } else if (customerId) {
      return await query.where(eq(schema.orders.customerId, customerId));
    }
    
    return await query;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const result = await db.select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id))
      .limit(1);
    return result[0];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(schema.orders)
      .values(order)
      .returning();
    return result[0];
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const result = await db.update(schema.orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(schema.orders.id, id))
      .returning();
    return result[0];
  }

  async updateOrderPaymentStatus(id: string, paymentStatus: string): Promise<Order | undefined> {
    const result = await db.update(schema.orders)
      .set({ paymentStatus: paymentStatus as any, updatedAt: new Date() })
      .where(eq(schema.orders.id, id))
      .returning();
    return result[0];
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderId));
  }

  async createOrderItem(orderId: string, item: InsertOrderItem): Promise<OrderItem> {
    const result = await db.insert(schema.orderItems)
      .values({ ...item, orderId })
      .returning();
    return result[0];
  }

  async getTransactionsByUserId(userId: string): Promise<EnhancedTransaction[]> {
    const result = await db.select()
      .from(schema.enhancedTransactions)
      .where(or(
        eq(schema.enhancedTransactions.senderId, userId),
        eq(schema.enhancedTransactions.receiverId, userId)
      ))
      .orderBy(schema.enhancedTransactions.createdAt);
    
    return result;
  }

  async getTransactionById(id: string): Promise<EnhancedTransaction | undefined> {
    const result = await db.select()
      .from(schema.enhancedTransactions)
      .where(eq(schema.enhancedTransactions.id, id))
      .limit(1);
    return result[0];
  }

  async createTransaction(transaction: InsertEnhancedTransaction): Promise<EnhancedTransaction> {
    const result = await db.insert(schema.enhancedTransactions)
      .values(transaction)
      .returning();
    return result[0];
  }

  async updateTransactionStatus(id: string, status: string): Promise<EnhancedTransaction | undefined> {
    const result = await db.update(schema.enhancedTransactions)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.enhancedTransactions.id, id))
      .returning();
    return result[0];
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(schema.auditLogs)
      .values(log)
      .returning();
    return result[0];
  }

  async getAuditLogs(actorId?: string, limit: number = 100): Promise<AuditLog[]> {
    if (actorId) {
      return await db.select()
        .from(schema.auditLogs)
        .where(eq(schema.auditLogs.actorId, actorId))
        .orderBy(schema.auditLogs.createdAt)
        .limit(limit);
    }
    return await db.select()
      .from(schema.auditLogs)
      .orderBy(schema.auditLogs.createdAt)
      .limit(limit);
  }

  async getCommissionConfigs(): Promise<CommissionConfig[]> {
    return await db.select().from(schema.commissionConfig);
  }

  async getActiveCommissionConfigs(): Promise<CommissionConfig[]> {
    return await db.select()
      .from(schema.commissionConfig)
      .where(eq(schema.commissionConfig.isActive, true));
  }

  async createCommissionConfig(config: InsertCommissionConfig): Promise<CommissionConfig> {
    const result = await db.insert(schema.commissionConfig)
      .values(config)
      .returning();
    return result[0];
  }

  async updateCommissionConfigStatus(id: string, isActive: boolean): Promise<CommissionConfig | undefined> {
    const result = await db.update(schema.commissionConfig)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(schema.commissionConfig.id, id))
      .returning();
    return result[0];
  }

  // Communication - Conversations
  async getConversations(userId: string): Promise<Conversation[]> {
    const result = await db.select()
      .from(schema.conversations)
      .where(
        // Find conversations where user is in participants jsonb array
        sql`${schema.conversations.participants}::jsonb ? ${userId}`
      );
    return result;
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    const result = await db.select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id))
      .limit(1);
    return result[0];
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(schema.conversations)
      .values(conversation)
      .returning();
    return result[0];
  }

  async updateConversation(id: string, conversationData: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const result = await db.update(schema.conversations)
      .set({ ...conversationData, updatedAt: new Date() })
      .where(eq(schema.conversations.id, id))
      .returning();
    return result[0];
  }

  // Communication - Messages
  async getMessages(conversationId: string, limit: number = 100): Promise<Message[]> {
    const result = await db.select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(schema.messages.createdAt)
      .limit(limit);
    return result;
  }

  async getMessageById(id: string): Promise<Message | undefined> {
    const result = await db.select()
      .from(schema.messages)
      .where(eq(schema.messages.id, id))
      .limit(1);
    return result[0];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(schema.messages)
      .values(message)
      .returning();
    return result[0];
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const result = await db.update(schema.messages)
      .set({ isRead: true })
      .where(eq(schema.messages.id, id))
      .returning();
    return result[0];
  }

  // Communication - Calls
  async getCalls(userId: string): Promise<Call[]> {
    const result = await db.select()
      .from(schema.calls)
      .where(or(
        eq(schema.calls.initiatorId, userId),
        eq(schema.calls.receiverId, userId)
      ))
      .orderBy(schema.calls.createdAt);
    return result;
  }

  async getCallById(id: string): Promise<Call | undefined> {
    const result = await db.select()
      .from(schema.calls)
      .where(eq(schema.calls.id, id))
      .limit(1);
    return result[0];
  }

  async createCall(call: InsertCall): Promise<Call> {
    const result = await db.insert(schema.calls)
      .values(call)
      .returning();
    return result[0];
  }

  async updateCallStatus(id: string, status: string): Promise<Call | undefined> {
    const result = await db.update(schema.calls)
      .set({ status: status as any })
      .where(eq(schema.calls.id, id))
      .returning();
    return result[0];
  }

  async endCall(id: string, duration: number): Promise<Call | undefined> {
    const result = await db.update(schema.calls)
      .set({ 
        status: 'completed' as any, 
        duration,
        endedAt: new Date()
      })
      .where(eq(schema.calls.id, id))
      .returning();
    return result[0];
  }
}

// Use DbStorage for production persistence with PostgreSQL
// Critical methods implemented: auth (profiles), wallet, transactions
// Note: vendor/product/order methods still use fallback throws - to be implemented
export const storage = new DbStorage();

// Legacy in-memory storage (deprecated):
// export const storage = new MemStorage();
