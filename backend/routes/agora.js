/**
 * 🎥 ROUTES AGORA - 224SOLUTIONS
 * Endpoints pour la gestion des tokens et événements Agora
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration Agora
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

/**
 * Générer un token Agora
 */
function generateAgoraToken(channelName, uid, role = 'publisher', expireTime = 3600) {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    throw new Error('Configuration Agora manquante');
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTime + expireTime;

  // Créer le token
  const token = {
    appId: AGORA_APP_ID,
    channelName: channelName,
    uid: uid,
    privilegeExpiredTs: privilegeExpiredTs,
    role: role
  };

  // Signer le token avec l'App Certificate
  const tokenString = JSON.stringify(token);
  const signature = crypto
    .createHmac('sha256', AGORA_APP_CERTIFICATE)
    .update(tokenString)
    .digest('hex');

  return {
    token: tokenString,
    signature: signature,
    appId: AGORA_APP_ID,
    channelName: channelName,
    uid: uid,
    expireTime: privilegeExpiredTs
  };
}

/**
 * POST /api/agora/token
 * Générer un token Agora pour un utilisateur
 */
router.post('/token', async (req, res) => {
  try {
    const { channelName, uid, role = 'publisher', expireTime = 3600 } = req.body;

    if (!channelName || !uid) {
      return res.status(400).json({
        success: false,
        error: 'channelName et uid requis'
      });
    }

    // Vérifier que l'utilisateur existe
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', uid)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Générer le token
    const tokenData = generateAgoraToken(channelName, uid, role, expireTime);

    // Enregistrer l'événement de connexion
    await supabase
      .from('agora_events')
      .insert({
        user_id: uid,
        channel_name: channelName,
        event_type: 'token_generated',
        event_data: {
          role,
          expireTime,
          timestamp: new Date().toISOString()
        }
      });

    res.json({
      success: true,
      data: tokenData
    });

  } catch (error) {
    console.error('Erreur génération token Agora:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur génération token',
      details: error.message
    });
  }
});

/**
 * POST /api/agora/event
 * Enregistrer un événement Agora
 */
router.post('/event', async (req, res) => {
  try {
    const { userId, channelName, eventType, eventData } = req.body;

    if (!userId || !channelName || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'userId, channelName et eventType requis'
      });
    }

    // Enregistrer l'événement
    const { data, error } = await supabase
      .from('agora_events')
      .insert({
        user_id: userId,
        channel_name: channelName,
        event_type: eventType,
        event_data: eventData || {},
        created_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Erreur enregistrement événement Agora:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur enregistrement événement',
      details: error.message
    });
  }
});

/**
 * GET /api/agora/events/:userId
 * Récupérer les événements d'un utilisateur
 */
router.get('/events/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('agora_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Erreur récupération événements:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur récupération événements',
      details: error.message
    });
  }
});

/**
 * GET /api/agora/channels/:channelName/participants
 * Récupérer les participants d'un canal
 */
router.get('/channels/:channelName/participants', async (req, res) => {
  try {
    const { channelName } = req.params;

    const { data, error } = await supabase
      .from('agora_events')
      .select(`
        user_id,
        profiles!inner(
          first_name,
          last_name,
          avatar_url,
          status
        )
      `)
      .eq('channel_name', channelName)
      .eq('event_type', 'user_joined')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Erreur récupération participants:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur récupération participants',
      details: error.message
    });
  }
});

/**
 * POST /api/agora/channels/:channelName/leave
 * Quitter un canal
 */
router.post('/channels/:channelName/leave', async (req, res) => {
  try {
    const { channelName } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId requis'
      });
    }

    // Enregistrer l'événement de déconnexion
    await supabase
      .from('agora_events')
      .insert({
        user_id: userId,
        channel_name: channelName,
        event_type: 'user_left',
        event_data: {
          timestamp: new Date().toISOString()
        }
      });

    res.json({
      success: true,
      message: 'Canal quitté avec succès'
    });

  } catch (error) {
    console.error('Erreur quitter canal:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur quitter canal',
      details: error.message
    });
  }
});

module.exports = router;
