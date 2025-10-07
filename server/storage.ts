import type { Profile, InsertProfile, Wallet, Vendor, Product } from "../shared/schema.js";

export interface IStorage {
  getProfileById(id: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  
  getWalletByUserId(userId: string): Promise<Wallet | undefined>;
  getWalletsByUserId(userId: string): Promise<Wallet[]>;
  
  getVendors(): Promise<Vendor[]>;
  getVendorById(id: string): Promise<Vendor | undefined>;
  
  getProducts(vendorId?: string): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
}

export class MemStorage implements IStorage {
  private profiles: Map<string, Profile> = new Map();
  private wallets: Map<string, Wallet> = new Map();
  private vendors: Map<string, Vendor> = new Map();
  private products: Map<string, Product> = new Map();

  async getProfileById(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const id = crypto.randomUUID();
    const newProfile: Profile = {
      id,
      ...profile,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.profiles.set(id, newProfile);
    return newProfile;
  }

  async getWalletByUserId(userId: string): Promise<Wallet | undefined> {
    return Array.from(this.wallets.values()).find(w => w.userId === userId);
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    return Array.from(this.wallets.values()).filter(w => w.userId === userId);
  }

  async getVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }

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
}

export class DbStorage implements IStorage {
  async getProfileById(id: string): Promise<Profile | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    throw new Error("DbStorage not implemented yet");
  }

  async getWalletByUserId(userId: string): Promise<Wallet | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    throw new Error("DbStorage not implemented yet");
  }

  async getVendors(): Promise<Vendor[]> {
    throw new Error("DbStorage not implemented yet");
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    throw new Error("DbStorage not implemented yet");
  }

  async getProducts(vendorId?: string): Promise<Product[]> {
    throw new Error("DbStorage not implemented yet");
  }

  async getProductById(id: string): Promise<Product | undefined> {
    throw new Error("DbStorage not implemented yet");
  }
}

export const storage = new MemStorage();
