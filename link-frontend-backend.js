/**
 * 🔗 LIAISON FRONTEND-BACKEND - 224SOLUTIONS
 * 
 * Ce script lie le frontend et le backend avec la base de données :
 * - Création des services de base de données
 * - Configuration des hooks React
 * - Intégration des composants
 * - Suppression du contenu de démonstration
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';

console.log('🔗 LIAISON FRONTEND-BACKEND');
console.log('='.repeat(60));
console.log(`📅 Date: ${new Date().toLocaleString()}`);
console.log('='.repeat(60));

// ===================================================
// CONFIGURATION SUPABASE POUR LE FRONTEND
// ===================================================

const supabaseConfig = `
// Configuration Supabase pour le frontend
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types TypeScript pour la base de données
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  location: string;
  custom_id: string;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  total_amount: number;
  status: string;
  delivery_address: string;
  delivery_city: string;
  delivery_country: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: string;
  created_at: string;
  updated_at: string;
}
`;

// ===================================================
// SERVICE DE GESTION DES UTILISATEURS
// ===================================================

const userService = `
// Service de gestion des utilisateurs
import { supabase } from './supabase';
import type { User } from './supabase';

export class UserService {
  // Créer un utilisateur complet
  static async createUser(userData: {
    email: string;
    full_name: string;
    phone: string;
    role?: string;
    location?: string;
  }) {
    const { data, error } = await supabase.rpc('create_user_complete', {
      p_email: userData.email,
      p_full_name: userData.full_name,
      p_phone: userData.phone,
      p_role: userData.role || 'client',
      p_location: userData.location || 'Conakry, Guinée'
    });

    if (error) throw error;
    return data;
  }

  // Obtenir les informations complètes d'un utilisateur
  static async getUserComplete(userId: string) {
    const { data, error } = await supabase.rpc('get_user_complete', {
      p_user_id: userId
    });

    if (error) throw error;
    return data;
  }

  // Obtenir tous les utilisateurs
  static async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Mettre à jour un utilisateur
  static async updateUser(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select();

    if (error) throw error;
    return data[0];
  }

  // Supprimer un utilisateur
  static async deleteUser(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return data;
  }
}
`;

// ===================================================
// SERVICE DE GESTION DES WALLETS
// ===================================================

const walletService = `
// Service de gestion des wallets
import { supabase } from './supabase';
import type { Wallet } from './supabase';

export class WalletService {
  // Obtenir le solde d'un wallet
  static async getWalletBalance(userId: string) {
    const { data, error } = await supabase.rpc('get_wallet_balance', {
      p_user_id: userId
    });

    if (error) throw error;
    return data;
  }

  // Effectuer une transaction
  static async processTransaction(transactionData: {
    from_user_id: string;
    to_user_id: string;
    amount: number;
    transaction_type: string;
    description?: string;
  }) {
    const { data, error } = await supabase.rpc('process_transaction', {
      p_from_user_id: transactionData.from_user_id,
      p_to_user_id: transactionData.to_user_id,
      p_amount: transactionData.amount,
      p_transaction_type: transactionData.transaction_type,
      p_description: transactionData.description || null
    });

    if (error) throw error;
    return data;
  }

  // Obtenir l'historique des transactions
  static async getTransactionHistory(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(\`
        *,
        from_wallet:from_wallet_id(user_id),
        to_wallet:to_wallet_id(user_id)
      \`)
      .or(\`from_wallet.user_id.eq.\${userId},to_wallet.user_id.eq.\${userId}\`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // Créditer un wallet
  static async creditWallet(userId: string, amount: number, description?: string) {
    const { data, error } = await supabase.rpc('process_transaction', {
      p_from_user_id: '00000000-0000-0000-0000-000000000000', // ID système
      p_to_user_id: userId,
      p_amount: amount,
      p_transaction_type: 'credit',
      p_description: description || 'Crédit système'
    });

    if (error) throw error;
    return data;
  }
}
`;

// ===================================================
// SERVICE DE GESTION DES COMMANDES
// ===================================================

const orderService = `
// Service de gestion des commandes
import { supabase } from './supabase';
import type { Order } from './supabase';

export class OrderService {
  // Créer une commande
  static async createOrder(orderData: {
    customer_id: string;
    vendor_id: string;
    items: Array<{
      product_id: string;
      quantity: number;
      price: number;
    }>;
    delivery_address: string;
    delivery_city?: string;
    delivery_country?: string;
  }) {
    const { data, error } = await supabase.rpc('create_order', {
      p_customer_id: orderData.customer_id,
      p_vendor_id: orderData.vendor_id,
      p_items: JSON.stringify(orderData.items),
      p_delivery_address: orderData.delivery_address,
      p_delivery_city: orderData.delivery_city || 'Conakry',
      p_delivery_country: orderData.delivery_country || 'Guinée'
    });

    if (error) throw error;
    return data;
  }

  // Mettre à jour le statut d'une commande
  static async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_status: status
    });

    if (error) throw error;
    return data;
  }

  // Obtenir les commandes d'un client
  static async getCustomerOrders(customerId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(\`
        *,
        vendor:vendor_id(*),
        items:order_items(*)
      \`)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Obtenir les commandes d'un vendeur
  static async getVendorOrders(vendorId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(\`
        *,
        customer:customer_id(*),
        items:order_items(*)
      \`)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
`;

// ===================================================
// HOOKS REACT
// ===================================================

const useAuth = `
// Hook d'authentification
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { UserService } from '../services/UserService';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtenir la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (data.user && !error) {
      // Créer le profil utilisateur
      await UserService.createUser({
        email,
        full_name: userData.full_name,
        phone: userData.phone,
        role: userData.role || 'client',
        location: userData.location || 'Conakry, Guinée'
      });
    }

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
`;

const useWallet = `
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
`;

// ===================================================
// FONCTIONS DE CRÉATION DES FICHIERS
// ===================================================

function createServices() {
    console.log('\n🔧 CRÉATION DES SERVICES');
    console.log('-'.repeat(40));

    // Créer le dossier services s'il n'existe pas
    if (!fs.existsSync('services')) {
        fs.mkdirSync('services', { recursive: true });
    }

    // Créer la configuration Supabase
    fs.writeFileSync('services/supabase.ts', supabaseConfig);
    console.log('✅ services/supabase.ts créé');

    // Créer le service utilisateurs
    fs.writeFileSync('services/UserService.ts', userService);
    console.log('✅ services/UserService.ts créé');

    // Créer le service wallets
    fs.writeFileSync('services/WalletService.ts', walletService);
    console.log('✅ services/WalletService.ts créé');

    // Créer le service commandes
    fs.writeFileSync('services/OrderService.ts', orderService);
    console.log('✅ services/OrderService.ts créé');
}

function createHooks() {
    console.log('\n🎣 CRÉATION DES HOOKS REACT');
    console.log('-'.repeat(40));

    // Créer le dossier hooks s'il n'existe pas
    if (!fs.existsSync('src/hooks')) {
        fs.mkdirSync('src/hooks', { recursive: true });
    }

    // Créer le hook d'authentification
    fs.writeFileSync('src/hooks/useAuth.ts', useAuth);
    console.log('✅ src/hooks/useAuth.ts créé');

    // Créer le hook de wallet
    fs.writeFileSync('src/hooks/useWallet.ts', useWallet);
    console.log('✅ src/hooks/useWallet.ts créé');
}

function removeDemoContent() {
    console.log('\n🗑️ SUPPRESSION DU CONTENU DE DÉMONSTRATION');
    console.log('-'.repeat(40));

    const demoFiles = [
        'test-*.js',
        'diagnose-*.js',
        'fix-*.js',
        'update-*.js',
        'create-*.js',
        'analyze-*.js',
        'execute-*.js'
    ];

    let deletedCount = 0;

    demoFiles.forEach(pattern => {
        try {
            const files = fs.readdirSync('.').filter(file => file.match(pattern.replace('*', '.*')));
            files.forEach(file => {
                fs.unlinkSync(file);
                console.log(`✅ Supprimé: ${file}`);
                deletedCount++;
            });
        } catch (err) {
            // Ignorer les erreurs
        }
    });

    console.log(`📊 Fichiers de démonstration supprimés: ${deletedCount}`);
}

function updateLocationToGuinea() {
    console.log('\n🇬🇳 MISE À JOUR DES LOCALISATIONS VERS LA GUINÉE');
    console.log('-'.repeat(40));

    const filesToUpdate = [
        'src',
        'services',
        'backend'
    ];

    let updatedFiles = 0;

    filesToUpdate.forEach(dir => {
        if (fs.existsSync(dir)) {
            updateFilesInDirectory(dir);
            updatedFiles++;
        }
    });

    console.log(`📊 Dossiers mis à jour: ${updatedFiles}`);
}

function updateFilesInDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    files.forEach(file => {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
            updateFilesInDirectory(fullPath);
        } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
            try {
                let content = fs.readFileSync(fullPath, 'utf8');

                // Remplacer Dakar/Sénégal par Guinée
                content = content.replace(/Dakar/gi, 'Conakry');
                content = content.replace(/Sénégal/gi, 'Guinée');
                content = content.replace(/Senegal/gi, 'Guinée');
                content = content.replace(/SENEGAL/gi, 'GUINÉE');

                fs.writeFileSync(fullPath, content);
                console.log(`✅ Mis à jour: ${fullPath}`);
            } catch (err) {
                // Ignorer les erreurs de lecture/écriture
            }
        }
    });
}

// ===================================================
// FONCTION PRINCIPALE
// ===================================================

async function linkFrontendBackend() {
    console.log('\n🚀 DÉMARRAGE DE LA LIAISON FRONTEND-BACKEND');
    console.log('='.repeat(60));

    try {
        createServices();
        createHooks();
        removeDemoContent();
        updateLocationToGuinea();

        console.log('\n📊 RÉSUMÉ DE LA LIAISON');
        console.log('='.repeat(60));
        console.log('✅ Services créés');
        console.log('✅ Hooks React créés');
        console.log('✅ Contenu de démonstration supprimé');
        console.log('✅ Localisations mises à jour vers la Guinée');

        console.log('\n🎯 PROCHAINES ÉTAPES:');
        console.log('1. Tester les services créés');
        console.log('2. Intégrer les hooks dans les composants');
        console.log('3. Tester le système complet');
        console.log('4. Déployer en production');

        console.log('\n🏁 FIN DE LA LIAISON FRONTEND-BACKEND');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ ERREUR CRITIQUE:', error);
        process.exit(1);
    }
}

// Lancer la liaison
linkFrontendBackend().catch(console.error);
