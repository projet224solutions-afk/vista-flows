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
  currency: 'GNF',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-001',
    transaction_id: 'WELCOME_BONUS',
    transaction_type: 'credit',
    amount: 10000,
    net_amount: 10000,
    fee: 0,
    currency: 'GNF',
    description: 'Bonus de bienvenue 224Solutions',
    status: 'completed',
    sender_wallet_id: null,
    receiver_wallet_id: 'demo-wallet-001',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    completed_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'tx-002',
    transaction_id: 'SALE_001',
    transaction_type: 'credit',
    amount: 75000,
    net_amount: 75000,
    fee: 0,
    currency: 'GNF',
    description: 'Vente produit - Smartphone Galaxy',
    status: 'completed',
    sender_wallet_id: null,
    receiver_wallet_id: 'demo-wallet-001',
    created_at: new Date(Date.now() - 43200000).toISOString(),
    completed_at: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: 'tx-003',
    transaction_id: 'SALE_002',
    transaction_type: 'credit',
    amount: 50000,
    net_amount: 50000,
    fee: 0,
    currency: 'GNF',
    description: 'Vente produit - Casque Bluetooth',
    status: 'completed',
    sender_wallet_id: null,
    receiver_wallet_id: 'demo-wallet-001',
    created_at: new Date(Date.now() - 21600000).toISOString(),
    completed_at: new Date(Date.now() - 21600000).toISOString()
  },
  {
    id: 'tx-004',
    transaction_id: 'FEE_001',
    transaction_type: 'debit',
    amount: 10000,
    net_amount: 10000,
    fee: 0,
    currency: 'GNF',
    description: 'Frais de transaction',
    status: 'completed',
    sender_wallet_id: 'demo-wallet-001',
    receiver_wallet_id: null,
    created_at: new Date(Date.now() - 10800000).toISOString(),
    completed_at: new Date(Date.now() - 10800000).toISOString()
  }
];

const DEMO_STATS: WalletStats = {
  totalBalance: 125000,
  totalTransactions: 4,
  totalCredits: 135000,
  totalDebits: 10000,
  pendingTransactions: 0,
  monthlyVolume: 145000
};

class MockWalletService {
  async getUserWallet(userId: string): Promise<Wallet | null> {
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 500));
    return DEMO_WALLET;
  }

  async createUserWallet(userId: string, initialBalance: number = 10000): Promise<Wallet | null> {
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
      transaction_id: transactionData.transaction_id || `REF_${Date.now()}`,
      transaction_type: transactionData.transaction_type || 'credit',
      amount: transactionData.amount || 0,
      net_amount: transactionData.net_amount || 0,
      fee: transactionData.fee || 0,
      currency: transactionData.currency || 'GNF',
      description: transactionData.description || 'Transaction',
      status: 'completed',
      sender_wallet_id: transactionData.sender_wallet_id || null,
      receiver_wallet_id: transactionData.receiver_wallet_id || null,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    DEMO_TRANSACTIONS.unshift(newTransaction);
    return newTransaction;
  }

  async transferFunds(fromWalletId: string, toWalletId: string, amount: number, description: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const fee = amount * 0.01;
    const net_amount = amount - fee;

    // Simuler un transfert réussi
    const transferTransaction: Transaction = {
      id: `tx-transfer-${Date.now()}`,
      transaction_id: `TRANSFER_${Date.now()}`,
      transaction_type: 'transfer',
      amount,
      net_amount,
      fee,
      currency: 'GNF',
      description,
      status: 'completed',
      sender_wallet_id: fromWalletId,
      receiver_wallet_id: toWalletId,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
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

  async onUserRegistration(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Wallet démo créé pour:', userId);
  }

  formatAmount(amount: number, currency: string = 'GNF'): string {
    return `${amount.toLocaleString()} ${currency}`;
  }

  validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 10000000;
  }
}

export const mockWalletService = new MockWalletService();
export default mockWalletService;
