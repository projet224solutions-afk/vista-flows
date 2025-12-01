/**
 * 🛡️ MIDDLEWARE DE PROTECTION AVANCÉE - BACKEND
 * Sécurisation de toutes les routes et fonctionnalités
 * S'ajoute aux middlewares existants sans les modifier
 */

import { logger } from '../config/logger.js';
import crypto from 'crypto';

/**
 * Stockage en mémoire des tentatives de connexion (à remplacer par Redis en production)
 */
const loginAttempts = new Map();
const suspiciousIPs = new Set();
const rateLimitStore = new Map();

/**
 * Middleware de validation avancée des entrées
 */
export const advancedInputValidation = (req, res, next) => {
  try {
    // Patterns dangereux
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // onclick, onerror, etc.
      /(\bor\b|\band\b).*?=.*?/gi, // SQL injection basique
      /\.\.\/\.\.\//g, // Path traversal
      /\${.*?}/g, // Template injection
      /<iframe/gi,
      /eval\(/gi,
      /exec\(/gi
    ];

    // Vérifier tous les champs de la requête
    const checkObject = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string') {
          for (const pattern of dangerousPatterns) {
            if (pattern.test(value)) {
              logger.warn(`🚨 Injection détectée dans ${currentPath}: ${value.substring(0, 100)}`);
              return false;
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          if (!checkObject(value, currentPath)) {
            return false;
          }
        }
      }
      return true;
    };

    if (req.body && !checkObject(req.body, 'body')) {
      return res.status(400).json({
        success: false,
        error: 'Données suspectes détectées'
      });
    }

    if (req.query && !checkObject(req.query, 'query')) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres suspects détectés'
      });
    }

    next();
  } catch (error) {
    logger.error('Erreur dans advancedInputValidation:', error);
    next();
  }
};

/**
 * Middleware anti-brute force pour login
 */
export const antiBruteForce = (req, res, next) => {
  const identifier = req.ip || 'unknown';
  const maxAttempts = 5;
  const lockoutTime = 15 * 60 * 1000; // 15 minutes

  const attempts = loginAttempts.get(identifier);
  const now = Date.now();

  if (attempts) {
    // Vérifier si le lockout est expiré
    if (now - attempts.lastAttempt > lockoutTime) {
      loginAttempts.delete(identifier);
    } else if (attempts.count >= maxAttempts) {
      const remainingTime = Math.ceil((lockoutTime - (now - attempts.lastAttempt)) / 1000 / 60);
      logger.warn(`🚨 Tentative de connexion bloquée pour ${identifier} (${attempts.count} tentatives)`);
      
      return res.status(429).json({
        success: false,
        error: `Trop de tentatives. Réessayez dans ${remainingTime} minutes`
      });
    }
  }

  // Enregistrer la tentative (mise à jour après la route de login)
  res.locals.recordLoginAttempt = (success) => {
    if (success) {
      loginAttempts.delete(identifier);
    } else {
      const current = loginAttempts.get(identifier) || { count: 0, lastAttempt: now };
      loginAttempts.set(identifier, {
        count: current.count + 1,
        lastAttempt: now
      });
    }
  };

  next();
};

/**
 * Middleware de détection d'activités suspectes
 */
export const suspiciousActivityDetector = (req, res, next) => {
  const ip = req.ip || 'unknown';
  
  // Vérifier si l'IP est déjà marquée comme suspecte
  if (suspiciousIPs.has(ip)) {
    logger.warn(`🚨 Requête depuis IP suspecte: ${ip}`);
    
    // Ajouter des headers de sécurité supplémentaires
    res.setHeader('X-Security-Warning', 'Suspicious activity detected');
  }

  // Détecter des patterns suspects
  const suspiciousIndicators = [
    req.headers['user-agent']?.includes('bot') && !req.headers['user-agent']?.includes('Googlebot'),
    req.path.includes('..'),
    req.path.includes('%00'),
    req.query.toString().length > 5000,
    Object.keys(req.query).length > 50
  ];

  const suspiciousCount = suspiciousIndicators.filter(Boolean).length;
  
  if (suspiciousCount >= 2) {
    suspiciousIPs.add(ip);
    logger.error(`🚨 Activité suspecte détectée depuis ${ip}: ${req.method} ${req.path}`);
  }

  next();
};

/**
 * Middleware de protection CSRF
 */
export const csrfProtection = (req, res, next) => {
  // Ignorer pour les requêtes GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.csrfToken;

  if (!token || !cookieToken || token !== cookieToken) {
    logger.warn(`🚨 Token CSRF invalide pour ${req.ip}`);
    return res.status(403).json({
      success: false,
      error: 'Token CSRF invalide'
    });
  }

  next();
};

/**
 * Middleware de rate limiting avancé par endpoint
 */
export const advancedRateLimit = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute par défaut
    maxRequests = 30,
    keyGenerator = (req) => `${req.ip}-${req.path}`
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const limit = rateLimitStore.get(key);

    if (limit) {
      if (now < limit.resetTime) {
        if (limit.count >= maxRequests) {
          const retryAfter = Math.ceil((limit.resetTime - now) / 1000);
          res.setHeader('Retry-After', retryAfter.toString());
          
          return res.status(429).json({
            success: false,
            error: 'Trop de requêtes',
            retryAfter
          });
        }
        
        limit.count++;
      } else {
        // Fenêtre expirée, réinitialiser
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs
        });
      }
    } else {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
    }

    next();
  };
};

/**
 * Middleware de validation de session sécurisée
 */
export const secureSessionValidation = (req, res, next) => {
  if (req.user) {
    const sessionData = {
      userId: req.user.id,
      lastActivity: Date.now(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Stocker dans req pour utilisation ultérieure
    req.secureSession = sessionData;

    // Vérifier la cohérence de la session
    const storedSession = req.session?.secureData;
    if (storedSession && storedSession.ip !== req.ip) {
      logger.warn(`🚨 Changement d'IP détecté pour user ${req.user.id}: ${storedSession.ip} -> ${req.ip}`);
      // Ne pas bloquer mais logger pour audit
    }
  }

  next();
};

/**
 * Middleware de logging sécurité avancé
 */
export const securityAuditLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capturer la réponse
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const duration = Date.now() - startTime;
    
    // Logger les informations de sécurité
    const auditLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: req.user?.id || 'anonymous',
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      duration,
      // Obfusquer les données sensibles
      body: obfuscateSensitiveData(body)
    };

    logger.info('Security audit:', auditLog);
    
    return originalJson(body);
  };

  next();
};

/**
 * Obfuscation des données sensibles dans les logs
 */
function obfuscateSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'cvv', 'pin'];
  const obfuscated = { ...data };

  for (const field of sensitiveFields) {
    if (field in obfuscated) {
      const value = obfuscated[field];
      obfuscated[field] = typeof value === 'string' && value.length > 0
        ? `${value.substring(0, 2)}***`
        : '***';
    }
  }

  return obfuscated;
}

/**
 * Middleware de protection contre l'énumération d'utilisateurs
 */
export const antiEnumeration = (req, res, next) => {
  // Ajouter un délai aléatoire pour masquer le timing
  const delay = Math.random() * 200 + 100; // 100-300ms
  
  setTimeout(next, delay);
};

/**
 * Middleware de validation de Content-Type
 */
export const strictContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    const contentType = req.headers['content-type'];
    
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        logger.warn(`🚨 Content-Type invalide: ${contentType}`);
        return res.status(415).json({
          success: false,
          error: 'Type de contenu non supporté'
        });
      }
    }
    
    next();
  };
};

/**
 * Middleware de chiffrement des réponses sensibles
 */
export const encryptSensitiveResponse = (encryptionKey) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function (data) {
      if (req.query.encrypted === 'true' && data.sensitive) {
        const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
        let encrypted = cipher.update(JSON.stringify(data.sensitive), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        data.sensitive = encrypted;
        data.encrypted = true;
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Nettoyage périodique des stores en mémoire
 */
setInterval(() => {
  const now = Date.now();
  const expirationTime = 60 * 60 * 1000; // 1 heure

  // Nettoyer loginAttempts
  for (const [key, value] of loginAttempts.entries()) {
    if (now - value.lastAttempt > expirationTime) {
      loginAttempts.delete(key);
    }
  }

  // Nettoyer rateLimitStore
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }

  logger.info('🧹 Nettoyage des stores de sécurité effectué');
}, 60 * 60 * 1000); // Toutes les heures

/**
 * Export des métriques de sécurité
 */
export const getSecurityMetrics = () => ({
  loginAttempts: loginAttempts.size,
  suspiciousIPs: suspiciousIPs.size,
  rateLimitEntries: rateLimitStore.size,
  timestamp: new Date().toISOString()
});
