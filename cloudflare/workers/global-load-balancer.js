/**
 * 🌐 Cloudflare Workers - Global Load Balancer
 * Configuration pour le routage intelligent multi-région
 * 
 * DÉPLOIEMENT:
 * 1. Créer un compte Cloudflare Workers
 * 2. npm install -g wrangler
 * 3. wrangler login
 * 4. wrangler publish
 */

// Configuration des régions backend
const REGIONS = {
  'africa-west': {
    origin: 'https://api-africa.224solutions.com',
    priority: 1,
    weight: 100,
    healthCheck: '/health',
  },
  'europe-west': {
    origin: 'https://api-eu.224solutions.com',
    priority: 2,
    weight: 80,
    healthCheck: '/health',
  },
  'europe-central': {
    origin: 'https://api-eu-central.224solutions.com',
    priority: 3,
    weight: 70,
    healthCheck: '/health',
  },
  'us-east': {
    origin: 'https://api-us-east.224solutions.com',
    priority: 4,
    weight: 60,
    healthCheck: '/health',
  },
  'us-west': {
    origin: 'https://api-us-west.224solutions.com',
    priority: 5,
    weight: 50,
    healthCheck: '/health',
  },
};

// Mapping continent -> région préférée
const CONTINENT_TO_REGION = {
  'AF': 'africa-west',      // Africa
  'EU': 'europe-west',      // Europe
  'NA': 'us-east',          // North America
  'SA': 'us-east',          // South America (closest to US-East)
  'AS': 'europe-central',   // Asia (until asia-east is enabled)
  'OC': 'us-west',          // Oceania
};

// Mapping pays -> région préférée (override)
const COUNTRY_TO_REGION = {
  // Afrique de l'Ouest
  'GN': 'africa-west',  // Guinea
  'SN': 'africa-west',  // Senegal
  'ML': 'africa-west',  // Mali
  'CI': 'africa-west',  // Ivory Coast
  'BF': 'africa-west',  // Burkina Faso
  'NE': 'africa-west',  // Niger
  'TG': 'africa-west',  // Togo
  'BJ': 'africa-west',  // Benin
  'GH': 'africa-west',  // Ghana
  'NG': 'africa-west',  // Nigeria
  'SL': 'africa-west',  // Sierra Leone
  'LR': 'africa-west',  // Liberia
  'GM': 'africa-west',  // Gambia
  'GW': 'africa-west',  // Guinea-Bissau
  'MR': 'africa-west',  // Mauritania
  'CV': 'africa-west',  // Cape Verde
  
  // Europe francophone
  'FR': 'europe-west',
  'BE': 'europe-west',
  'CH': 'europe-west',
  'LU': 'europe-west',
  'MC': 'europe-west',
  
  // Europe centrale
  'DE': 'europe-central',
  'AT': 'europe-central',
  'PL': 'europe-central',
  'CZ': 'europe-central',
  'NL': 'europe-central',
  
  // Amérique du Nord
  'US': 'us-east',
  'CA': 'us-east',
  'MX': 'us-east',
};

/**
 * Obtenir la région optimale pour une requête
 */
function getOptimalRegion(request) {
  const cf = request.cf || {};
  
  // 1. Vérifier le pays spécifique
  if (cf.country && COUNTRY_TO_REGION[cf.country]) {
    return COUNTRY_TO_REGION[cf.country];
  }
  
  // 2. Vérifier le continent
  if (cf.continent && CONTINENT_TO_REGION[cf.continent]) {
    return CONTINENT_TO_REGION[cf.continent];
  }
  
  // 3. Fallback vers la région principale
  return 'africa-west';
}

/**
 * Vérifier la santé d'une région
 */
async function checkRegionHealth(regionId) {
  const region = REGIONS[regionId];
  if (!region) return false;
  
  try {
    const response = await fetch(`${region.origin}${region.healthCheck}`, {
      method: 'GET',
      headers: { 'User-Agent': '224Solutions-HealthCheck' },
      cf: { cacheTtl: 0 },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Obtenir la prochaine région de failover
 */
function getFailoverRegion(currentRegion) {
  const sorted = Object.entries(REGIONS)
    .filter(([id]) => id !== currentRegion)
    .sort((a, b) => a[1].priority - b[1].priority);
  
  return sorted.length > 0 ? sorted[0][0] : 'africa-west';
}

/**
 * Handler principal du Worker
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check du load balancer lui-même
    if (url.pathname === '/lb-health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        regions: Object.keys(REGIONS),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Status de toutes les régions
    if (url.pathname === '/lb-status') {
      const statuses = await Promise.all(
        Object.entries(REGIONS).map(async ([id, config]) => ({
          id,
          origin: config.origin,
          healthy: await checkRegionHealth(id),
          priority: config.priority,
        }))
      );
      
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        regions: statuses,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Déterminer la région optimale
    let targetRegion = getOptimalRegion(request);
    
    // Vérifier la santé de la région cible
    const isHealthy = await checkRegionHealth(targetRegion);
    if (!isHealthy) {
      console.log(`Region ${targetRegion} unhealthy, failing over...`);
      targetRegion = getFailoverRegion(targetRegion);
    }

    const region = REGIONS[targetRegion];
    if (!region) {
      return new Response('No healthy region available', { status: 503 });
    }

    // Construire la nouvelle URL
    const targetUrl = new URL(url.pathname + url.search, region.origin);
    
    // Cloner les headers
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Region', targetRegion);
    headers.set('X-Original-Host', url.hostname);
    headers.set('X-Client-Country', request.cf?.country || 'unknown');
    headers.set('X-Client-Continent', request.cf?.continent || 'unknown');
    
    // Faire la requête vers le backend
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' 
        ? await request.arrayBuffer() 
        : undefined,
    });

    // Ajouter les headers de réponse
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-Served-By-Region', targetRegion);
    responseHeaders.set('X-Load-Balancer', '224solutions-glb');
    
    // CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
