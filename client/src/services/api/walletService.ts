import { apiRequest } from "@/lib/queryClient";

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  createdAt?: string;
}

export interface Transaction {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  type: string;
  description?: string;
  createdAt?: string;
}

export interface CreateWalletData {
  userId: string;
  currency?: string;
  initialBalance?: number;
}

export class WalletApiService {
  static async getWalletByUserId(userId: string): Promise<Wallet> {
    return apiRequest(`/api/wallets/${userId}/primary`);
  }

  static async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    return apiRequest(`/api/wallets/user/${userId}`);
  }

  static async createWallet(data: CreateWalletData): Promise<Wallet> {
    return apiRequest('/api/wallets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateWalletBalance(walletId: string, balance: number): Promise<Wallet> {
    return apiRequest(`/api/wallets/${walletId}/balance`, {
      method: 'PATCH',
      body: JSON.stringify({ balance }),
    });
  }

  static async getTransactions(walletId: string): Promise<Transaction[]> {
    return apiRequest(`/api/transactions/wallet/${walletId}`);
  }

  static async createTransaction(data: {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    type: string;
    description?: string;
  }): Promise<Transaction> {
    return apiRequest('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
