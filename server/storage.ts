import type { 
  Profile, InsertProfile, 
  Wallet, InsertWallet,
  Vendor, InsertVendor,
  Product, InsertProduct,
  EnhancedTransaction, InsertEnhancedTransaction,
  AuditLog, InsertAuditLog,
  CommissionConfig, InsertCommissionConfig
} from "../shared/schema.js";

export interface IStorage {
  // Profiles
  getProfileById(id: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile | undefined>;
  
  // Wallets
  getWalletByUserId(userId: string): Promise<Wallet | undefined>;
  getWalletsByUserId(userId: string): Promise<Wallet[]>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(id: string, balance: string): Promise<Wallet | undefined>;
  
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
}

export class MemStorage implements IStorage {
  private profiles: Map<string, Profile> = new Map();
  private wallets: Map<string, Wallet> = new Map();
  private vendors: Map<string, Vendor> = new Map();
  private products: Map<string, Product> = new Map();
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
}

export class DbStorage implements IStorage {
  async getProfileById(id: string): Promise<Profile | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    throw new Error("DbStorage not implemented yet");
  }

  async updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async getWalletByUserId(userId: string): Promise<Wallet | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    throw new Error("DbStorage not implemented yet");
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    throw new Error("DbStorage not implemented yet");
  }

  async updateWalletBalance(id: string, balance: string): Promise<Wallet | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async getVendors(): Promise<Vendor[]> {
    throw new Error("DbStorage not implemented yet");
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async getVendorByUserId(userId: string): Promise<Vendor | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    throw new Error("DbStorage not implemented yet");
  }

  async getProducts(vendorId?: string): Promise<Product[]> {
    throw new Error("DbStorage not implemented yet");
  }

  async getProductById(id: string): Promise<Product | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    throw new Error("DbStorage not implemented yet");
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async getTransactionsByUserId(userId: string): Promise<EnhancedTransaction[]> {
    throw new Error("DbStorage not implemented yet");
  }

  async getTransactionById(id: string): Promise<EnhancedTransaction | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async createTransaction(transaction: InsertEnhancedTransaction): Promise<EnhancedTransaction> {
    throw new Error("DbStorage not implemented yet");
  }

  async updateTransactionStatus(id: string, status: string): Promise<EnhancedTransaction | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    throw new Error("DbStorage not implemented yet");
  }

  async getAuditLogs(actorId?: string, limit?: number): Promise<AuditLog[]> {
    throw new Error("DbStorage not implemented yet");
  }

  async getCommissionConfigs(): Promise<CommissionConfig[]> {
    throw new Error("DbStorage not implemented yet");
  }

  async getActiveCommissionConfigs(): Promise<CommissionConfig[]> {
    throw new Error("DbStorage not implemented yet");
  }

  async createCommissionConfig(config: InsertCommissionConfig): Promise<CommissionConfig> {
    throw new Error("DbStorage not implemented yet");
  }

  async updateCommissionConfigStatus(id: string, isActive: boolean): Promise<CommissionConfig | undefined> {
    throw new Error("DbStorage not implemented yet");
  }
}

export const storage = new MemStorage();
