/**
 * Système de protection CSRF (Cross-Site Request Forgery)
 * Génère et valide des tokens uniques par session
 */

import CryptoJS from 'crypto-js';

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_EXPIRY_MS = 3600000; // 1 heure

interface CSRFTokenData {
  token: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Générer un token CSRF unique et sécurisé
 */
export const generateCSRFToken = (): string => {
  // Générer token aléatoire (32 bytes = 64 hex chars)
  const randomBytes = CryptoJS.lib.WordArray.random(32);
  const token = randomBytes.toString(CryptoJS.enc.Hex);
  
  // Ajouter timestamp pour traçabilité
  const timestamp = Date.now().toString(36);
  const finalToken = `${token}.${timestamp}`;
  
  // Stocker avec expiration
  const tokenData: CSRFTokenData = {
    token: finalToken,
    expiresAt: new Date(Date.now() + CSRF_TOKEN_EXPIRY_MS).toISOString(),
    createdAt: new Date().toISOString()
  };
  
  sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(tokenData));
  
  return finalToken;
};

/**
 * Récupérer le token CSRF actuel
 */
export const getCSRFToken = (): string | null => {
  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (!stored) {
      return generateCSRFToken();
    }
    
    const tokenData: CSRFTokenData = JSON.parse(stored);
    
    // Vérifier expiration
    if (new Date(tokenData.expiresAt) < new Date()) {
      sessionStorage.removeItem(CSRF_TOKEN_KEY);
      return generateCSRFToken();
    }
    
    return tokenData.token;
  } catch {
    return generateCSRFToken();
  }
};

/**
 * Valider un token CSRF
 */
export const validateCSRFToken = (token: string): boolean => {
  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (!stored) {
      console.error('🔴 CSRF: Aucun token stocké');
      return false;
    }
    
    const tokenData: CSRFTokenData = JSON.parse(stored);
    
    // Vérifier expiration
    if (new Date(tokenData.expiresAt) < new Date()) {
      console.error('🔴 CSRF: Token expiré');
      sessionStorage.removeItem(CSRF_TOKEN_KEY);
      return false;
    }
    
    // Comparer tokens (timing-safe comparison simulé)
    const isValid = tokenData.token === token;
    
    if (!isValid) {
      console.error('🔴 CSRF: Token invalide');
    }
    
    return isValid;
  } catch (error) {
    console.error('🔴 CSRF: Erreur validation', error);
    return false;
  }
};

/**
 * Invalider le token CSRF actuel (logout, etc.)
 */
export const invalidateCSRFToken = (): void => {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
};

/**
 * Hook React pour gérer les tokens CSRF
 */
export const useCSRF = () => {
  const getToken = () => getCSRFToken();
  const validate = (token: string) => validateCSRFToken(token);
  const invalidate = () => invalidateCSRFToken();
  const regenerate = () => {
    invalidateCSRFToken();
    return generateCSRFToken();
  };
  
  return {
    getToken,
    validate,
    invalidate,
    regenerate
  };
};
