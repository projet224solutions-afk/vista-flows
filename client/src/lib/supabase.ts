/**
 * 🔧 CONFIGURATION SUPABASE - 224SOLUTIONS
 * Configuration et initialisation du client Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase depuis les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

// Mode démo si les variables ne sont pas configurées
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

if (isDemoMode) {
  console.warn('⚠️ Mode démo Supabase activé - Configurez vos variables d\'environnement');
}

// Création du client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Types pour l'authentification (custom JWT)
export type User = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

// Helper pour obtenir l'utilisateur actuel (utilise custom JWT, pas Supabase Auth)
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const authHelpers = await import('./auth-helpers');
    const { data } = await authHelpers.getCurrentUser();
    return data.user;
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    return null;
  }
};

// Helper pour la déconnexion (utilise custom JWT, pas Supabase Auth)
export const signOut = async (): Promise<void> => {
  try {
    const authHelpers = await import('./auth-helpers');
    await authHelpers.signOut();
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    throw error;
  }
};

export default supabase;
