/**
 * 🔐 MIDDLEWARE DE SÉCURITÉ POUR EDGE FUNCTIONS SUPABASE
 * Protection complète des fonctions serverless
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Configuration de sécurité
 */
const SECURITY_CONFIG = {
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX: 50,
  ALLOWED_ORIGINS: [
    'https://224solutions.com',
    'https://www.224solutions.com',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ]
};

/**
 * Store en mémoire pour rate limiting (remplacer par Redis en production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Classe principale de sécurité pour Edge Functions
 */
export class EdgeFunctionSecurity {
  
  /**
   * Validation et authentification de la requête
   */
  static async validateRequest(req: Request): Promise<{
    valid: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      // Vérifier la taille de la requête
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
        return {
          valid: false,
          error: 'Requête trop volumineuse'
        };
      }

      // Vérifier l'origine
      const origin = req.headers.get('origin');
      if (origin && !SECURITY_CONFIG.ALLOWED_ORIGINS.includes(origin)) {
        console.warn(`🚨 Origine non autorisée: ${origin}`);
        // Ne pas bloquer en dev/test mais logger
      }

      // Vérifier le token d'authentification
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return {
          valid: false,
          error: 'Token d\'authentification requis'
        };
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Créer le client Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Vérifier le token
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return {
          valid: false,
          error: 'Token invalide ou expiré'
        };
      }

      return {
        valid: true,
        user
      };
    } catch (error) {
      console.error('Erreur validation requête:', error);
      return {
        valid: false,
        error: 'Erreur de validation'
      };
    }
  }

  /**
   * Rate limiting
   */
  static checkRateLimit(identifier: string): {
    allowed: boolean;
    remaining?: number;
    resetAt?: number;
  } {
    const now = Date.now();
    const key = `ratelimit:${identifier}`;
    const limit = rateLimitStore.get(key);

    if (limit) {
      if (now < limit.resetTime) {
        if (limit.count >= SECURITY_CONFIG.RATE_LIMIT_MAX) {
          return {
            allowed: false,
            remaining: 0,
            resetAt: limit.resetTime
          };
        }
        
        limit.count++;
        return {
          allowed: true,
          remaining: SECURITY_CONFIG.RATE_LIMIT_MAX - limit.count,
          resetAt: limit.resetTime
        };
      } else {
        // Fenêtre expirée, réinitialiser
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW
        });
        return {
          allowed: true,
          remaining: SECURITY_CONFIG.RATE_LIMIT_MAX - 1,
          resetAt: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW
        };
      }
    } else {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW
      });
      return {
        allowed: true,
        remaining: SECURITY_CONFIG.RATE_LIMIT_MAX - 1,
        resetAt: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW
      };
    }
  }

  /**
   * Validation des données entrantes
   */
  static validateInputData(data: any, schema: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required?: boolean;
      min?: number;
      max?: number;
      pattern?: RegExp;
    }
  }): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Vérifier si requis
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`Le champ ${field} est requis`);
        continue;
      }

      if (value !== undefined && value !== null) {
        // Vérifier le type
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`Le champ ${field} doit être de type ${rules.type}`);
          continue;
        }

        // Vérifications spécifiques selon le type
        if (rules.type === 'string') {
          if (rules.min !== undefined && value.length < rules.min) {
            errors.push(`Le champ ${field} doit contenir au moins ${rules.min} caractères`);
          }
          if (rules.max !== undefined && value.length > rules.max) {
            errors.push(`Le champ ${field} ne peut pas dépasser ${rules.max} caractères`);
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(`Le champ ${field} ne respecte pas le format attendu`);
          }
        }

        if (rules.type === 'number') {
          if (rules.min !== undefined && value < rules.min) {
            errors.push(`Le champ ${field} doit être supérieur ou égal à ${rules.min}`);
          }
          if (rules.max !== undefined && value > rules.max) {
            errors.push(`Le champ ${field} doit être inférieur ou égal à ${rules.max}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Sanitization des données
   */
  static sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return data
        .trim()
        .replace(/[<>]/g, '')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .substring(0, 10000);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Génération de réponse sécurisée avec headers
   */
  static secureResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      }
    });
  }

  /**
   * Logging sécurisé (sans données sensibles)
   */
  static secureLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const sanitizedData = data ? this.obfuscateSensitiveFields(data) : null;
    
    const logEntry = {
      timestamp,
      level,
      message,
      data: sanitizedData
    };

    console[level](JSON.stringify(logEntry));
  }

  /**
   * Obfuscation des champs sensibles
   */
  private static obfuscateSensitiveFields(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = [
      'password', 'token', 'secret', 'apiKey', 'authorization',
      'creditCard', 'cvv', 'pin', 'ssn', 'privateKey'
    ];

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
   * Vérification des permissions utilisateur
   */
  static async checkUserPermission(
    userId: string,
    requiredRole: string | string[]
  ): Promise<{ authorized: boolean; userRole?: string }> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        return { authorized: false };
      }

      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const authorized = roles.includes(profile.role);

      return {
        authorized,
        userRole: profile.role
      };
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
      return { authorized: false };
    }
  }

  /**
   * Génération de signature pour vérification d'intégrité
   */
  static async generateSignature(data: any, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const keyData = encoder.encode(secret);
    const dataBuffer = encoder.encode(dataString);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Vérification de signature
   */
  static async verifySignature(
    data: any,
    signature: string,
    secret: string
  ): Promise<boolean> {
    const computed = await this.generateSignature(data, secret);
    return computed === signature;
  }
}

/**
 * Wrapper de sécurité pour Edge Functions
 */
export function secureEdgeFunction(
  handler: (req: Request, context: { user: any }) => Promise<Response>,
  options?: {
    requireAuth?: boolean;
    requiredRole?: string | string[];
    rateLimit?: boolean;
  }
) {
  return async (req: Request): Promise<Response> => {
    const opts = {
      requireAuth: true,
      rateLimit: true,
      ...options
    };

    try {
      // 1. Validation de la requête
      if (opts.requireAuth) {
        const validation = await EdgeFunctionSecurity.validateRequest(req);
        if (!validation.valid) {
          return EdgeFunctionSecurity.secureResponse(
            { error: validation.error },
            401
          );
        }

        // 2. Rate limiting
        if (opts.rateLimit) {
          const rateLimit = EdgeFunctionSecurity.checkRateLimit(validation.user!.id);
          if (!rateLimit.allowed) {
            return EdgeFunctionSecurity.secureResponse(
              {
                error: 'Trop de requêtes',
                retryAfter: Math.ceil((rateLimit.resetAt! - Date.now()) / 1000)
              },
              429
            );
          }
        }

        // 3. Vérification des permissions
        if (opts.requiredRole) {
          const permission = await EdgeFunctionSecurity.checkUserPermission(
            validation.user!.id,
            opts.requiredRole
          );
          if (!permission.authorized) {
            return EdgeFunctionSecurity.secureResponse(
              { error: 'Permissions insuffisantes' },
              403
            );
          }
        }

        // 4. Exécuter le handler
        return await handler(req, { user: validation.user });
      }

      return await handler(req, { user: null });
    } catch (error) {
      EdgeFunctionSecurity.secureLog('error', 'Erreur Edge Function', { error });
      return EdgeFunctionSecurity.secureResponse(
        { error: 'Erreur interne du serveur' },
        500
      );
    }
  };
}
