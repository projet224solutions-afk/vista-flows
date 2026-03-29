/**
 * 🛡️ COUCHE DE SÉCURITÉ AVANCÉE - 224SOLUTIONS
 * Protection complète de toutes les fonctionnalités
 * Ne modifie aucune fonctionnalité existante, ajoute uniquement des protections
 */

import CryptoJS from 'crypto-js';

// Clé de chiffrement (doit être en variable d'environnement en production)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Classe principale de sécurité
 */
export class SecurityLayer {
  
  /**
   * Chiffrement AES-256 des données sensibles
   */
  static encrypt(data: string | object): string {
    try {
      const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
      return CryptoJS.AES.encrypt(dataString, ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Erreur chiffrement:', error);
      throw new Error('Échec du chiffrement');
    }
  }

  /**
   * Déchiffrement AES-256 des données
   */
  static decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Erreur déchiffrement:', error);
      throw new Error('Échec du déchiffrement');
    }
  }

  /**
   * Validation et sanitization des entrées utilisateur
   */
  static sanitizeInput(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Supprime < et > pour prévenir XSS
      .replace(/[\x00-\x1F\x7F]/g, '') // Supprime caractères de contrôle
      .substring(0, 10000); // Limite la taille
  }

  /**
   * Validation d'email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validation de numéro de téléphone (format Guinée)
   */
  static validatePhone(phone: string): boolean {
    // Format: +224XXXXXXXXX ou 224XXXXXXXXX ou 6XXXXXXXX
    const phoneRegex = /^(\+?224)?[6-7][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  /**
   * Génération de token CSRF
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validation de token CSRF
   */
  static validateCSRFToken(token: string, storedToken: string): boolean {
    return token === storedToken && token.length === 64;
  }

  /**
   * Protection contre les injections SQL (pour paramètres)
   */
  static sanitizeSQLInput(input: string): string {
    return input.replace(/['";\\]/g, '');
  }

  /**
   * Hash sécurisé SHA-256
   */
  static hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Vérification d'intégrité des données
   */
  static verifyIntegrity(data: any, signature: string): boolean {
    const computed = this.hash(JSON.stringify(data));
    return computed === signature;
  }

  /**
   * Rate limiting côté client (stockage local)
   */
  static checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const storageKey = `rateLimit_${key}`;
    
    try {
      const stored = localStorage.getItem(storageKey);
      const requests: number[] = stored ? JSON.parse(stored) : [];
      
      // Filtrer les requêtes dans la fenêtre de temps
      const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);
      
      if (recentRequests.length >= maxRequests) {
        return false; // Rate limit dépassé
      }
      
      // Ajouter la nouvelle requête
      recentRequests.push(now);
      localStorage.setItem(storageKey, JSON.stringify(recentRequests));
      return true;
    } catch (error) {
      console.error('Erreur rate limiting:', error);
      return true; // En cas d'erreur, on autorise
    }
  }

  /**
   * Validation de montant (transactions financières)
   */
  static validateAmount(amount: number): { valid: boolean; error?: string } {
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, error: 'Montant invalide' };
    }
    
    if (amount > 100000000) { // 100 millions max
      return { valid: false, error: 'Montant trop élevé' };
    }
    
    if (amount < 0.01) {
      return { valid: false, error: 'Montant trop faible' };
    }
    
    return { valid: true };
  }

  /**
   * Validation de devise
   */
  static validateCurrency(currency: string): boolean {
    const allowedCurrencies = ['GNF', 'USD', 'EUR', 'XOF'];
    return allowedCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Protection contre les attaques de timing
   */
  static async constantTimeCompare(a: string, b: string): Promise<boolean> {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    // Ajouter un délai aléatoire pour masquer le timing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    
    return result === 0;
  }

  /**
   * Génération d'identifiant unique sécurisé
   */
  static generateSecureId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    const cryptoPart = Array.from(array, byte => byte.toString(36)).join('');
    
    return `${timestamp}-${randomPart}-${cryptoPart}`;
  }

  /**
   * Obfuscation de données sensibles pour logs
   */
  static obfuscate(data: string, visibleChars: number = 4): string {
    if (!data || data.length <= visibleChars) return '***';
    
    const visible = data.substring(0, visibleChars);
    const hidden = '*'.repeat(Math.min(data.length - visibleChars, 10));
    
    return `${visible}${hidden}`;
  }

  /**
   * Validation de session utilisateur
   */
  static validateSession(sessionData: any): { valid: boolean; reason?: string } {
    if (!sessionData) {
      return { valid: false, reason: 'Session inexistante' };
    }
    
    if (!sessionData.userId || !sessionData.token) {
      return { valid: false, reason: 'Données de session incomplètes' };
    }
    
    // Vérifier l'expiration
    if (sessionData.expiresAt && new Date(sessionData.expiresAt) < new Date()) {
      return { valid: false, reason: 'Session expirée' };
    }
    
    return { valid: true };
  }

  /**
   * Détection de comportement suspect
   */
  static detectSuspiciousBehavior(actions: string[]): boolean {
    // Détection de patterns suspects
    const suspiciousPatterns = [
      /script/gi,
      /eval/gi,
      /exec/gi,
      /\.\.\/\.\./g, // Path traversal
      /DROP TABLE/gi,
      /DELETE FROM/gi,
      /INSERT INTO/gi,
      /UPDATE.*SET/gi
    ];
    
    for (const action of actions) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(action)) {
          console.warn('⚠️ Comportement suspect détecté:', action);
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Validation de fichier uploadé
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (file.size > maxSize) {
      return { valid: false, error: 'Fichier trop volumineux (max 10MB)' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Type de fichier non autorisé' };
    }
    
    // Vérifier l'extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      return { valid: false, error: 'Extension de fichier invalide' };
    }
    
    return { valid: true };
  }

  /**
   * Nettoyage des données avant stockage
   */
  static cleanForStorage(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeInput(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.cleanForStorage(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        cleaned[key] = this.cleanForStorage(value);
      }
      return cleaned;
    }
    
    return data;
  }
}

/**
 * Décorateur pour sécuriser les fonctions sensibles
 */
export function SecureFunction(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    try {
      // Log de l'appel
      console.log(`🔒 Fonction sécurisée appelée: ${propertyKey}`);
      
      // Vérification de l'intégrité des arguments
      if (SecurityLayer.detectSuspiciousBehavior(args.map(String))) {
        throw new Error('Comportement suspect détecté');
      }
      
      // Exécution de la fonction originale
      const result = await originalMethod.apply(this, args);
      
      return result;
    } catch (error) {
      console.error(`❌ Erreur dans fonction sécurisée ${propertyKey}:`, error);
      throw error;
    }
  };

  return descriptor;
}

/**
 * Gestionnaire de logs de sécurité
 */
export class SecurityLogger {
  private static logs: Array<{ timestamp: Date; event: string; details: any }> = [];
  private static maxLogs = 1000;

  /**
   * Enregistrer un événement de sécurité
   */
  static log(event: string, details?: any) {
    this.logs.push({
      timestamp: new Date(),
      event,
      details: details ? SecurityLayer.cleanForStorage(details) : null
    });

    // Limiter la taille du buffer
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log en console en mode développement
    if (import.meta.env.DEV) {
      console.log(`🔐 [SECURITY] ${event}`, details);
    }
  }

  /**
   * Récupérer les logs de sécurité
   */
  static getLogs(limit?: number): Array<{ timestamp: Date; event: string; details: any }> {
    return limit ? this.logs.slice(-limit) : [...this.logs];
  }

  /**
   * Nettoyer les logs
   */
  static clearLogs() {
    this.logs = [];
  }

  /**
   * Exporter les logs pour audit
   */
  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}
