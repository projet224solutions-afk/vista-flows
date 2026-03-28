/**
 * 🚀 AWS LAMBDA - AUTH GATEWAY
 * Fonction Lambda pour API Gateway
 * Point d'entrée centralisé pour l'authentification Cognito
 * 
 * Déploiement: AWS Lambda + API Gateway (HTTP API)
 * Runtime: Node.js 20.x
 */

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Configuration
const REGION = process.env.AWS_COGNITO_REGION;
const USER_POOL_ID = process.env.AWS_COGNITO_USER_POOL_ID;
const JWKS_URI = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Cache JWKS
const client = jwksClient({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
});

function getSigningKey(kid) {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) reject(err);
      else resolve(key.getPublicKey());
    });
  });
}

/**
 * Handler principal Lambda
 */
export const handler = async (event) => {
  const { routeKey, body, headers } = event;
  const parsedBody = body ? JSON.parse(body) : {};

  if (routeKey === 'OPTIONS /{proxy+}' || routeKey?.startsWith('OPTIONS ')) {
    return response(204, null, headers);
  }

  try {
    switch (routeKey) {
      case 'POST /auth/validate-token':
        return await validateToken(headers);

      case 'POST /auth/sync-profile':
        return await syncProfile(headers, parsedBody);

      case 'GET /auth/me':
        return await getProfile(headers);

      default:
        return response(404, { error: 'Route not found' }, headers);
    }
  } catch (error) {
    console.error('Lambda error:', error);
    return response(500, { error: 'Internal server error' }, headers);
  }
};

/**
 * Valider un token Cognito
 */
async function validateToken(headers) {
  const token = extractToken(headers);
  if (!token) return response(401, { error: 'Token requis' }, headers);

  try {
    const user = await verifyCognitoJWT(token);
    return response(200, { valid: true, user }, headers);
  } catch (error) {
    return response(401, { valid: false, error: error.message }, headers);
  }
}

/**
 * Synchroniser le profil après login
 */
async function syncProfile(headers, body) {
  const token = extractToken(headers);
  if (!token) return response(401, { error: 'Token requis' }, headers);

  try {
    const user = await verifyCognitoJWT(token);

    // TODO: Connecter à Cloud SQL via pg
    // const dbUser = await syncToCloudSQL(user, body.additionalData);

    return response(200, {
      success: true,
      message: 'Profil synchronisé',
      user: {
        cognitoUserId: user.sub,
        email: user.email,
        role: user.role,
      },
    }, headers);
  } catch (error) {
    return response(403, { error: 'Token invalide' }, headers);
  }
}

/**
 * Récupérer le profil
 */
async function getProfile(headers) {
  const token = extractToken(headers);
  if (!token) return response(401, { error: 'Token requis' }, headers);

  try {
    const user = await verifyCognitoJWT(token);

    // TODO: Récupérer depuis Cloud SQL
    return response(200, {
      success: true,
      user: {
        cognitoUserId: user.sub,
        email: user.email,
        role: user.role,
      },
    }, headers);
  } catch (error) {
    return response(403, { error: 'Token invalide' }, headers);
  }
}

/**
 * Vérifier le JWT Cognito
 */
async function verifyCognitoJWT(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) throw new Error('Token malformé');

  const signingKey = await getSigningKey(decoded.header.kid);
  const payload = jwt.verify(token, signingKey, {
    issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
    algorithms: ['RS256'],
  });

  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    role: payload['custom:role'] || 'client',
    phone: payload.phone_number,
    fullName: payload.name,
  };
}

/**
 * Extraire le Bearer token
 */
function extractToken(headers) {
  const auth = headers?.authorization || headers?.Authorization;
  return auth?.replace('Bearer ', '') || null;
}

/**
 * Helper réponse Lambda
 */
function resolveAllowedOrigin(headers) {
  const requestOrigin = headers?.origin || headers?.Origin;

  if (!requestOrigin) {
    return ALLOWED_ORIGINS[0] || 'https://224solution.net';
  }

  if (ALLOWED_ORIGINS.length === 0) {
    const fallbackOrigins = [
      'https://224solution.net',
      'https://www.224solution.net',
      'http://localhost:5173',
      'https://localhost:5173',
    ];
    return fallbackOrigins.includes(requestOrigin) ? requestOrigin : 'https://224solution.net';
  }

  return ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
}

function response(statusCode, body, requestHeaders = {}) {
  const allowedOrigin = resolveAllowedOrigin(requestHeaders);

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: body === null ? '' : JSON.stringify(body),
  };
}
