/**
 * MODULE DE CRYPTAGE LOCAL
 * Cryptage AES-256 pour les données stockées localement
 * 224SOLUTIONS - Système de sécurité
 */

import CryptoJS from 'crypto-js';

// Clé de cryptage depuis les secrets Supabase
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('❌ VITE_ENCRYPTION_KEY manquante dans les secrets Supabase');
}

/**
 * Crypte des données avec AES-256
 */
export function encryptData(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Erreur de cryptage:', error);
    throw new Error('Échec du cryptage des données');
  }
}

/**
 * Décrypte des données AES-256
 */
export function decryptData<T = any>(encryptedData: string): T {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Erreur de décryptage:', error);
    throw new Error('Échec du décryptage des données');
  }
}

/**
 * Hash une valeur (pour les identifiants uniques)
 */
export function hashValue(value: string): string {
  return CryptoJS.SHA256(value).toString();
}

/**
 * Génère un token sécurisé
 */
export function generateSecureToken(): string {
  return CryptoJS.lib.WordArray.random(32).toString();
}
