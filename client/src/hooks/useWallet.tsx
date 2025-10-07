/**
 * Stub temporaire pour useWallet hook
 * Le système de wallet sera réimplémenté ultérieurement
 */

import { useState } from 'react';

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface VirtualCard {
  id: string;
  user_id: string;
  card_number: string;
  expiry_date: string;
  cvv: string;
  status: string;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  order_id?: string;
  amount: number;
  method: string;
  status: string;
  reference_number?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const useWallet = () => {
  const [wallet] = useState<Wallet | null>(null);
  const [virtualCards] = useState<VirtualCard[]>([]);
  const [transactions] = useState<Transaction[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const refetch = async () => {
    // Stub implementation
  };

  const createVirtualCard = async () => {
    // Stub implementation
    return {
      id: '',
      user_id: '',
      card_number: '',
      expiry_date: '',
      cvv: '',
      status: '',
      created_at: ''
    };
  };

  const createTransaction = async (
    amount: number,
    method: string,
    description?: string,
    orderId?: string
  ) => {
    // Stub implementation
    return {
      id: '',
      user_id: '',
      order_id: orderId,
      amount,
      method,
      status: '',
      reference_number: '',
      description,
      created_at: '',
      updated_at: ''
    };
  };

  return {
    wallet,
    virtualCards,
    transactions,
    loading,
    error,
    refetch,
    createVirtualCard,
    createTransaction
  };
};
