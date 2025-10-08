/**
 * Helpers pour l'authentification unifiée (Custom JWT)
 * Remplace les appels Supabase Auth
 */

import { api } from './api';

/**
 * Récupère l'utilisateur actuel depuis le token JWT
 * Équivalent de supabase.auth.getUser()
 */
export async function getCurrentUser() {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return { data: { user: null }, error: null };
  }

  try {
    const profile = await api.auth.me();
    return { 
      data: { user: profile }, 
      error: null 
    };
  } catch (error) {
    return { 
      data: { user: null }, 
      error: error instanceof Error ? error : new Error('Failed to get user') 
    };
  }
}

/**
 * Récupère la session actuelle
 * Équivalent de supabase.auth.getSession()
 */
export async function getCurrentSession() {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return { data: { session: null }, error: null };
  }

  try {
    const profile = await api.auth.me();
    return { 
      data: { 
        session: { 
          access_token: token,
          user: profile 
        } 
      }, 
      error: null 
    };
  } catch (error) {
    return { 
      data: { session: null }, 
      error: error instanceof Error ? error : new Error('Failed to get session') 
    };
  }
}

/**
 * Déconnexion
 * Équivalent de supabase.auth.signOut()
 */
export async function signOut() {
  try {
    await api.auth.logout();
    localStorage.removeItem('auth_token');
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to sign out') };
  }
}
