
// Hook de gestion des wallets
import { useState, useEffect } from 'react';
import { WalletService } from '../services/WalletService';

export function useWallet(userId: string) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadWalletData();
    }
  }, [userId]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [balanceData, transactionData] = await Promise.all([
        WalletService.getWalletBalance(userId),
        WalletService.getTransactionHistory(userId)
      ]);
      
      setBalance(balanceData.balance);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTransaction = async (transactionData: any) => {
    try {
      const result = await WalletService.processTransaction(transactionData);
      await loadWalletData(); // Recharger les données
      return result;
    } catch (error) {
      console.error('Erreur transaction:', error);
      throw error;
    }
  };

  const creditWallet = async (amount: number, description?: string) => {
    try {
      const result = await WalletService.creditWallet(userId, amount, description);
      await loadWalletData(); // Recharger les données
      return result;
    } catch (error) {
      console.error('Erreur crédit:', error);
      throw error;
    }
  };

  return {
    balance,
    transactions,
    loading,
    processTransaction,
    creditWallet,
    refresh: loadWalletData
  };
}
