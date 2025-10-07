import type { 
  Profile, InsertProfile, 
  Wallet, InsertWallet,
  Vendor, InsertVendor,
  Product, InsertProduct,
  EnhancedTransaction, InsertEnhancedTransaction
} from "@shared/schema";

class APIClient {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  profiles = {
    getById: (id: string) => 
      this.request<Profile>(`/api/profiles/${id}`),
    
    getByEmail: (email: string) => 
      this.request<Profile>(`/api/profiles/email/${email}`),
    
    create: (data: InsertProfile) => 
      this.request<Profile>('/api/profiles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: Partial<InsertProfile>) => 
      this.request<Profile>(`/api/profiles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  };

  wallets = {
    getByUserId: (userId: string) => 
      this.request<Wallet[]>(`/api/wallets/user/${userId}`),
    
    getPrimary: (userId: string) => 
      this.request<Wallet>(`/api/wallets/${userId}/primary`),
    
    create: (data: InsertWallet) => 
      this.request<Wallet>('/api/wallets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    updateBalance: (id: string, balance: string) => 
      this.request<Wallet>(`/api/wallets/${id}/balance`, {
        method: 'PATCH',
        body: JSON.stringify({ balance }),
      }),
  };

  vendors = {
    getAll: () => 
      this.request<Vendor[]>('/api/vendors'),
    
    getById: (id: string) => 
      this.request<Vendor>(`/api/vendors/${id}`),
    
    getByUserId: (userId: string) => 
      this.request<Vendor>(`/api/vendors/user/${userId}`),
    
    create: (data: InsertVendor) => 
      this.request<Vendor>('/api/vendors', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  products = {
    getAll: (vendorId?: string) => {
      const url = vendorId 
        ? `/api/products?vendorId=${vendorId}` 
        : '/api/products';
      return this.request<Product[]>(url);
    },
    
    getById: (id: string) => 
      this.request<Product>(`/api/products/${id}`),
    
    create: (data: InsertProduct) => 
      this.request<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: Partial<InsertProduct>) => 
      this.request<Product>(`/api/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  };

  transactions = {
    getByUserId: (userId: string) => 
      this.request<EnhancedTransaction[]>(`/api/transactions/user/${userId}`),
    
    getById: (id: string) => 
      this.request<EnhancedTransaction>(`/api/transactions/${id}`),
    
    create: (data: InsertEnhancedTransaction) => 
      this.request<EnhancedTransaction>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    updateStatus: (id: string, status: 'pending' | 'completed' | 'failed' | 'refunded') => 
      this.request<EnhancedTransaction>(`/api/transactions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  };

  auditLogs = {
    getAll: (actorId?: string, limit: number = 50) => {
      const url = actorId 
        ? `/api/audit-logs?actorId=${actorId}&limit=${limit}` 
        : `/api/audit-logs?limit=${limit}`;
      return this.request<any[]>(url);
    },
    
    create: (data: any) => 
      this.request<any>('/api/audit-logs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  commissionConfig = {
    getAll: () => 
      this.request<any[]>('/api/commission-config'),
    
    getActive: () => 
      this.request<any[]>('/api/commission-config/active'),
    
    create: (data: any) => 
      this.request<any>('/api/commission-config', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    updateStatus: (id: string, isActive: boolean) => 
      this.request<any>(`/api/commission-config/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
  };
}

export const api = new APIClient();
