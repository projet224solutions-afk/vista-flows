/**
 * MODULE DE CRYPTAGE LOCAL
 * Cryptage AES-256 pour les données stockées localement
 * 224SOLUTIONS - Système de sécurité
 */

import CryptoJS from 'crypto-js';

// Clé de cryptage basée sur l'appareil (à améliorer avec une clé utilisateur)
const ENCRYPTION_KEY = '224SOLUTIONS_SECURE_KEY_v1';

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
