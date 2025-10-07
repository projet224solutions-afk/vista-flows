/**
 * 🤖 HOOK USE COPILOTE
 * Hook React pour gérer les interactions avec le Copilote 224
 * État, actions et gestion des conversations
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { copiloteService, Message, UserContext, BusinessAction } from '@/services/CopiloteService';

interface UseCopiloteReturn {
  // État
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  userContext: UserContext | null;
  isConnected: boolean;
  
  // Actions
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  loadHistory: () => Promise<void>;
  executeBusinessAction: (action: BusinessAction) => Promise<any>;
  
  // Utilitaires
  getWalletBalance: () => Promise<{ balance: number; currency: string }>;
  getTransactionHistory: (limit?: number) => Promise<any[]>;
  simulateConversion: (amount: number, from: string, to: string) => Promise<any>;
  getExchangeRates: () => Promise<any[]>;
  getAIStats: () => Promise<any>;
}

export function useCopilote(): UseCopiloteReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Vérifier la connexion au service
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await copiloteService.getStatus();
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
        console.error('Copilote 224 non disponible:', error);
      }
    };

    checkConnection();
  }, []);

  // Charger l'historique au montage
  useEffect(() => {
    if (isConnected) {
      loadHistory();
    }
  }, [isConnected]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await copiloteService.sendMessage(message);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        timestamp: response.timestamp
      };

      setMessages(prev => [...prev, assistantMessage]);
      setUserContext(response.user_context);
      
      toast.success('Réponse reçue du Copilote 224');
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Erreur de communication avec le Copilote');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [isLoading]);

  const clearHistory = useCallback(async () => {
    try {
      await copiloteService.clearHistory();
      setMessages([]);
      setUserContext(null);
      toast.success('Historique effacé');
    } catch (error) {
      console.error('Erreur lors de l\'effacement:', error);
      toast.error('Erreur lors de l\'effacement de l\'historique');
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const history = await copiloteService.getHistory();
      setMessages(history);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  }, []);

  const executeBusinessAction = useCallback(async (action: BusinessAction) => {
    try {
      const result = await copiloteService.executeBusinessAction(action);
      toast.success('Action métier exécutée');
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'exécution de l\'action:', error);
      toast.error('Erreur lors de l\'exécution de l\'action métier');
      throw error;
    }
  }, []);

  const getWalletBalance = useCallback(async () => {
    try {
      return await copiloteService.getWalletBalance();
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
      throw error;
    }
  }, []);

  const getTransactionHistory = useCallback(async (limit: number = 10) => {
    try {
      return await copiloteService.getTransactionHistory(limit);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      throw error;
    }
  }, []);

  const simulateConversion = useCallback(async (amount: number, from: string, to: string) => {
    try {
      return await copiloteService.simulateCurrencyConversion(amount, from, to);
    } catch (error) {
      console.error('Erreur lors de la simulation:', error);
      throw error;
    }
  }, []);

  const getExchangeRates = useCallback(async () => {
    try {
      return await copiloteService.getExchangeRates();
    } catch (error) {
      console.error('Erreur lors de la récupération des taux:', error);
      throw error;
    }
  }, []);

  const getAIStats = useCallback(async () => {
    try {
      return await copiloteService.getAIStats();
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      throw error;
    }
  }, []);

  return {
    // État
    messages,
    isLoading,
    isTyping,
    userContext,
    isConnected,
    
    // Actions
    sendMessage,
    clearHistory,
    loadHistory,
    executeBusinessAction,
    
    // Utilitaires
    getWalletBalance,
    getTransactionHistory,
    simulateConversion,
    getExchangeRates,
    getAIStats
  };
}

export default useCopilote;
