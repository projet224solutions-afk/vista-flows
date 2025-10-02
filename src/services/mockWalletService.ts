/**
 * 💰 SERVICE WALLET DÉMO - 224SOLUTIONS
 * Service de démonstration pour wallet quand Supabase n'est pas configuré
 */

import { Wallet, Transaction, WalletStats } from './walletService';

// Données de démonstration
const DEMO_WALLET: Wallet = {
  id: 'demo-wallet-001',
  user_id: 'demo-user-001',
  balance: 125000,
  currency: 'FCFA',
  status: 'active',
  wallet_address: '224SOL_DEMO_001_12345678',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-001',
    wallet_id: 'demo-wallet-001',
    type: 'credit',
    amount: 1000,
    currency: 'FCFA',
    description: 'Bonus de bienvenue 224Solutions',
    reference: 'WELCOME_BONUS',
    status: 'completed',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'tx-002',
    wallet_id: 'demo-wallet-001',
    type: 'credit',
    amount: 75000,
    currency: 'FCFA',
    description: 'Vente produit - Smartphone Galaxy',
    reference: 'SALE_001',
    status: 'completed',
    created_at: new Date(Date.now() - 43200000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: 'tx-003',
    wallet_id: 'demo-wallet-001',
    type: 'credit',
    amount: 50000,
    currency: 'FCFA',
    description: 'Vente produit - Casque Bluetooth',
    reference: 'SALE_002',
    status: 'completed',
    created_at: new Date(Date.now() - 21600000).toISOString(),
    updated_at: new Date(Date.now() - 21600000).toISOString()
  },
  {
    id: 'tx-004',
    wallet_id: 'demo-wallet-001',
    type: 'debit',
    amount: 1000,
    currency: 'FCFA',
    description: 'Frais de transaction',
    reference: 'FEE_001',
    status: 'completed',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString()
  }
];

const DEMO_STATS: WalletStats = {
  totalBalance: 125000,
  totalTransactions: 4,
  totalCredits: 126000,
  totalDebits: 1000,
  pendingTransactions: 0,
  monthlyVolume: 126000
};

class MockWalletService {
  async getUserWallet(userId: string): Promise<Wallet | null> {
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    return DEMO_WALLET;
  }

  async createUserWallet(userId: string, userEmail: string): Promise<Wallet | null> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return DEMO_WALLET;
  }

  async getWalletTransactions(walletId: string, limit: number = 50): Promise<Transaction[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return DEMO_TRANSACTIONS.slice(0, limit);
  }

  async createTransaction(transactionData: Partial<Transaction>): Promise<Transaction | null> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      wallet_id: transactionData.wallet_id || 'demo-wallet-001',
      type: transactionData.type || 'credit',
      amount: transactionData.amount || 0,
      currency: transactionData.currency || 'FCFA',
      description: transactionData.description || 'Transaction',
      reference: transactionData.reference || `REF_${Date.now()}`,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    DEMO_TRANSACTIONS.unshift(newTransaction);
    return newTransaction;
  }

  async transferFunds(fromWalletId: string, toWalletId: string, amount: number, description: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simuler un transfert réussi
    const transferTransaction: Transaction = {
      id: `tx-transfer-${Date.now()}`,
      wallet_id: fromWalletId,
      type: 'transfer',
      amount,
      currency: 'FCFA',
      description,
      reference: `TRANSFER_${Date.now()}`,
      status: 'completed',
      from_wallet_id: fromWalletId,
      to_wallet_id: toWalletId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    DEMO_TRANSACTIONS.unshift(transferTransaction);
    
    // Mettre à jour le solde
    DEMO_WALLET.balance -= amount;
    
    return true;
  }

  async getWalletStats(walletId: string): Promise<WalletStats> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return DEMO_STATS;
  }

  async updateWalletStatus(walletId: string, status: Wallet['status']): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    DEMO_WALLET.status = status;
    return true;
  }

  async onUserRegistration(userId: string, userEmail: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Wallet démo créé pour:', userEmail);
  }

  formatAmount(amount: number, currency: string = 'FCFA'): string {
    return `${amount.toLocaleString()} ${currency}`;
  }

  validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 10000000;
  }

  generateWalletQR(walletAddress: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress)}`;
  }
}

export const mockWalletService = new MockWalletService();
export default mockWalletService;
