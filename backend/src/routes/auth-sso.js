/**
 * 🔐 SSO AUTHENTICATION - 224SOLUTIONS
 * Endpoints pour l'authentification SSO (Keycloak/Okta) avec fallback local
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Configuration Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration SSO
const SSO_CONFIG = {
  keycloak: {
    enabled: process.env.KEYCLOAK_ENABLED === 'true',
    baseUrl: process.env.KEYCLOAK_BASE_URL,
    realm: process.env.KEYCLOAK_REALM,
    clientId: process.env.KEYCLOAK_CLIENT_ID,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    redirectUri: process.env.KEYCLOAK_REDIRECT_URI
  },
  okta: {
    enabled: process.env.OKTA_ENABLED === 'true',
    baseUrl: process.env.OKTA_BASE_URL,
    clientId: process.env.OKTA_CLIENT_ID,
    clientSecret: process.env.OKTA_CLIENT_SECRET,
    redirectUri: process.env.OKTA_REDIRECT_URI
  }
};

// =====================================================
// 1. SSO PROVIDER DETECTION
// =====================================================

/**
 * GET /auth/sso/providers
 * Retourne les providers SSO disponibles
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = [];

    if (SSO_CONFIG.keycloak.enabled) {
      providers.push({
        id: 'keycloak',
        name: 'Keycloak',
        enabled: true,
        authUrl: `${SSO_CONFIG.keycloak.baseUrl}/realms/${SSO_CONFIG.keycloak.realm}/protocol/openid-connect/auth`,
        clientId: SSO_CONFIG.keycloak.clientId,
        redirectUri: SSO_CONFIG.keycloak.redirectUri
      });
    }

    if (SSO_CONFIG.okta.enabled) {
      providers.push({
        id: 'okta',
        name: 'Okta',
        enabled: true,
        authUrl: `${SSO_CONFIG.okta.baseUrl}/oauth2/v1/authorize`,
        clientId: SSO_CONFIG.okta.clientId,
        redirectUri: SSO_CONFIG.okta.redirectUri
      });
    }

    res.json({
      success: true,
      providers,
      fallback_enabled: true // Toujours disponible
    });

  } catch (error) {
    console.error('Erreur récupération providers SSO:', error);
    res.status(500).json({ 
      error: 'Erreur récupération providers SSO' 
    });
  }
});

// =====================================================
// 2. KEYCLOAK SSO
// =====================================================

/**
 * GET /auth/sso/keycloak/authorize
 * Redirige vers Keycloak pour l'authentification
 */
router.get('/keycloak/authorize', (req, res) => {
  if (!SSO_CONFIG.keycloak.enabled) {
    return res.status(400).json({ error: 'Keycloak SSO non activé' });
  }

  const authUrl = new URL(`${SSO_CONFIG.keycloak.baseUrl}/realms/${SSO_CONFIG.keycloak.realm}/protocol/openid-connect/auth`);
  
  authUrl.searchParams.set('client_id', SSO_CONFIG.keycloak.clientId);
  authUrl.searchParams.set('redirect_uri', SSO_CONFIG.keycloak.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', generateState());

  res.redirect(authUrl.toString());
});

/**
 * POST /auth/sso/keycloak/callback
 * Traite le callback Keycloak
 */
router.post('/keycloak/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code d\'autorisation manquant' });
    }

    // Échanger le code contre un token
    const tokenResponse = await axios.post(
      `${SSO_CONFIG.keycloak.baseUrl}/realms/${SSO_CONFIG.keycloak.realm}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SSO_CONFIG.keycloak.clientId,
        client_secret: SSO_CONFIG.keycloak.clientSecret,
        code: code,
        redirect_uri: SSO_CONFIG.keycloak.redirectUri
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, id_token } = tokenResponse.data;

    // Récupérer les informations utilisateur
    const userResponse = await axios.get(
      `${SSO_CONFIG.keycloak.baseUrl}/realms/${SSO_CONFIG.keycloak.realm}/protocol/openid-connect/userinfo`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );

    const userInfo = userResponse.data;

    // Créer ou mettre à jour l'utilisateur
    const user = await createOrUpdateUser({
      provider: 'keycloak',
      external_id: userInfo.sub,
      email: userInfo.email,
      first_name: userInfo.given_name,
      last_name: userInfo.family_name,
      avatar_url: userInfo.picture
    });

    // Générer un token JWT pour l'application
    const jwtToken = jwt.sign(
      { 
        user_id: user.id, 
        email: user.email,
        role: user.role,
        provider: 'keycloak'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur callback Keycloak:', error);
    res.status(500).json({ 
      error: 'Erreur authentification Keycloak' 
    });
  }
});

// =====================================================
// 3. OKTA SSO
// =====================================================

/**
 * GET /auth/sso/okta/authorize
 * Redirige vers Okta pour l'authentification
 */
router.get('/okta/authorize', (req, res) => {
  if (!SSO_CONFIG.okta.enabled) {
    return res.status(400).json({ error: 'Okta SSO non activé' });
  }

  const authUrl = new URL(`${SSO_CONFIG.okta.baseUrl}/oauth2/v1/authorize`);
  
  authUrl.searchParams.set('client_id', SSO_CONFIG.okta.clientId);
  authUrl.searchParams.set('redirect_uri', SSO_CONFIG.okta.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', generateState());

  res.redirect(authUrl.toString());
});

/**
 * POST /auth/sso/okta/callback
 * Traite le callback Okta
 */
router.post('/okta/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code d\'autorisation manquant' });
    }

    // Échanger le code contre un token
    const tokenResponse = await axios.post(
      `${SSO_CONFIG.okta.baseUrl}/oauth2/v1/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SSO_CONFIG.okta.clientId,
        client_secret: SSO_CONFIG.okta.clientSecret,
        code: code,
        redirect_uri: SSO_CONFIG.okta.redirectUri
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, id_token } = tokenResponse.data;

    // Décoder le token ID pour obtenir les informations utilisateur
    const decodedToken = jwt.decode(id_token);
    const userInfo = decodedToken;

    // Créer ou mettre à jour l'utilisateur
    const user = await createOrUpdateUser({
      provider: 'okta',
      external_id: userInfo.sub,
      email: userInfo.email,
      first_name: userInfo.given_name,
      last_name: userInfo.family_name,
      avatar_url: userInfo.picture
    });

    // Générer un token JWT pour l'application
    const jwtToken = jwt.sign(
      { 
        user_id: user.id, 
        email: user.email,
        role: user.role,
        provider: 'okta'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur callback Okta:', error);
    res.status(500).json({ 
      error: 'Erreur authentification Okta' 
    });
  }
});

// =====================================================
// 4. FALLBACK LOCAL AUTH
// =====================================================

/**
 * POST /auth/sso/fallback/login
 * Authentification locale de fallback
 */
router.post('/fallback/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email et mot de passe requis' 
      });
    }

    // Vérifier les credentials locaux
    const { data: user, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ 
        error: 'Credentials invalides' 
      });
    }

    // Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ 
        error: 'Erreur récupération profil' 
      });
    }

    // Générer un token JWT
    const jwtToken = jwt.sign(
      { 
        user_id: user.user.id, 
        email: user.user.email,
        role: profile.role,
        provider: 'local'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.user.id,
        email: user.user.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role
      }
    });

  } catch (error) {
    console.error('Erreur authentification locale:', error);
    res.status(500).json({ 
      error: 'Erreur authentification locale' 
    });
  }
});

// =====================================================
// 5. UTILITAIRES
// =====================================================

/**
 * Crée ou met à jour un utilisateur depuis un provider SSO
 */
async function createOrUpdateUser(userData) {
  const { provider, external_id, email, first_name, last_name, avatar_url } = userData;

  // Vérifier si l'utilisateur existe déjà
  const { data: existingUser, error: findError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    throw new Error('Erreur recherche utilisateur');
  }

  if (existingUser) {
    // Mettre à jour l'utilisateur existant
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: first_name || existingUser.first_name,
        last_name: last_name || existingUser.last_name,
        avatar_url: avatar_url || existingUser.avatar_url,
        sso_provider: provider,
        sso_external_id: external_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.id)
      .select()
      .single();

    if (updateError) {
      throw new Error('Erreur mise à jour utilisateur');
    }

    return updatedUser;
  } else {
    // Créer un nouvel utilisateur
    const { data: newUser, error: createError } = await supabase
      .from('profiles')
      .insert({
        email,
        first_name: first_name || '',
        last_name: last_name || '',
        avatar_url: avatar_url || '',
        role: 'client', // Rôle par défaut
        sso_provider: provider,
        sso_external_id: external_id,
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      throw new Error('Erreur création utilisateur');
    }

    return newUser;
  }
}

/**
 * Génère un state aléatoire pour la sécurité OAuth
 */
function generateState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

module.exports = router;
