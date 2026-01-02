/**
 * Configuration Upstash Redis pour rate limiting distribué
 * Alternative à rate limiting local pour production
 */

// Configuration Upstash Redis (à mettre dans .env)
// UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
// UPSTASH_REDIS_REST_TOKEN=xxx

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Rate limiter avec Upstash Redis (production)
 */
export const checkRateLimit = async (config: RateLimitConfig): Promise<RateLimitResult> => {
  const { maxRequests, windowMs, identifier } = config;
  
  // Vérifier si Upstash est configuré
  const upstashUrl = import.meta.env.VITE_UPSTASH_REDIS_REST_URL;
  const upstashToken = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN;
  
  if (!upstashUrl || !upstashToken) {
    console.warn('⚠️ Upstash Redis non configuré, utilisation rate limit local');
    return checkRateLimitLocal(config);
  }
  
  try {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Nettoyer anciennes entrées et compter requêtes dans fenêtre
    const commands = [
      ['ZREMRANGEBYSCORE', key, 0, windowStart],
      ['ZCARD', key],
      ['ZADD', key, now, `${now}-${Math.random()}`],
      ['EXPIRE', key, Math.ceil(windowMs / 1000)]
    ];
    
    const response = await fetch(`${upstashUrl}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upstashToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });
    
    if (!response.ok) {
      throw new Error('Upstash request failed');
    }
    
    const results = await response.json();
    const count = results[1].result; // Résultat de ZCARD
    
    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetAt = new Date(now + windowMs);
    
    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(windowMs / 1000)
    };
  } catch (error) {
    console.error('❌ Erreur rate limit Upstash:', error);
    // Fallback sur rate limit local
    return checkRateLimitLocal(config);
  }
};

/**
 * Rate limiter local (fallback)
 */
const checkRateLimitLocal = (config: RateLimitConfig): RateLimitResult => {
  const { maxRequests, windowMs, identifier } = config;
  const key = `ratelimit_${identifier}`;
  const now = Date.now();
  
  // Récupérer historique
  const stored = localStorage.getItem(key);
  let requests: number[] = stored ? JSON.parse(stored) : [];
  
  // Filtrer requêtes hors fenêtre
  requests = requests.filter(timestamp => now - timestamp < windowMs);
  
  // Ajouter nouvelle requête
  requests.push(now);
  
  // Sauvegarder
  localStorage.setItem(key, JSON.stringify(requests));
  
  const allowed = requests.length <= maxRequests;
  const remaining = Math.max(0, maxRequests - requests.length);
  const oldestRequest = requests[0] || now;
  const resetAt = new Date(oldestRequest + windowMs);
  
  return {
    allowed,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : Math.ceil((oldestRequest + windowMs - now) / 1000)
  };
};

/**
 * Présets de configuration
 */
export const RATE_LIMIT_PRESETS = {
  // Authentification: 5 tentatives par 5 minutes
  auth: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000
  },
  
  // API standard: 100 requêtes par minute
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000
  },
  
  // API stricte: 10 requêtes par minute
  apiStrict: {
    maxRequests: 10,
    windowMs: 60 * 1000
  },
  
  // Wallet operations: 20 requêtes par minute
  wallet: {
    maxRequests: 20,
    windowMs: 60 * 1000
  },
  
  // Email/SMS: 3 par heure
  notifications: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000
  }
};

/**
 * Helper pour appliquer rate limit facilement
 */
export const withRateLimit = async <T>(
  identifier: string,
  preset: keyof typeof RATE_LIMIT_PRESETS,
  fn: () => Promise<T>
): Promise<T> => {
  const config = {
    ...RATE_LIMIT_PRESETS[preset],
    identifier
  };
  
  const result = await checkRateLimit(config);
  
  if (!result.allowed) {
    throw new Error(
      `Rate limit dépassé. Réessayez dans ${result.retryAfter} secondes.`
    );
  }
  
  return fn();
};
