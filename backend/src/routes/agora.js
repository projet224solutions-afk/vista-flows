/**
 * 🎯 ROUTES AGORA - 224SOLUTIONS
 * Routes pour la génération de tokens Agora et gestion des communications
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const agoraService = require('../services/agoraService');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting pour les tokens Agora
const agoraRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Maximum 50 tokens par 15 minutes
  message: {
    error: 'Trop de demandes de tokens Agora. Réessayez dans 15 minutes.',
    code: 'AGORA_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Schémas de validation
const rtcTokenSchema = Joi.object({
  channelName: Joi.string().min(1).max(64).required().messages({
    'string.min': 'Le nom du canal ne peut pas être vide',
    'string.max': 'Le nom du canal ne peut pas dépasser 64 caractères',
    'any.required': 'Le nom du canal est requis'
  }),
  uid: Joi.alternatives().try(
    Joi.string().min(1).max(255),
    Joi.number().integer().min(0)
  ).required().messages({
    'any.required': 'L\'ID utilisateur est requis'
  }),
  role: Joi.string().valid('publisher', 'subscriber').default('publisher'),
  expirationTime: Joi.number().integer().min(60).max(86400).default(3600) // 1 min à 24h
});

const rtmTokenSchema = Joi.object({
  userId: Joi.string().min(1).max(64).required().messages({
    'string.min': 'L\'ID utilisateur ne peut pas être vide',
    'string.max': 'L\'ID utilisateur ne peut pas dépasser 64 caractères',
    'any.required': 'L\'ID utilisateur est requis'
  }),
  expirationTime: Joi.number().integer().min(60).max(86400).default(3600)
});

const sessionTokenSchema = Joi.object({
  channelName: Joi.string().min(1).max(64).required(),
  role: Joi.string().valid('publisher', 'subscriber').default('publisher'),
  expirationTime: Joi.number().integer().min(60).max(86400).default(3600)
});

/**
 * POST /api/agora/rtc-token
 * Génère un token RTC pour les appels audio/vidéo
 */
router.post('/rtc-token', authMiddleware, agoraRateLimit, async (req, res) => {
  try {
    const { error, value } = rtcTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.details[0].message
      });
    }

    const { channelName, uid, role, expirationTime } = value;

    logger.info(`🎥 Demande token RTC`, {
      userId: req.user.id,
      channelName,
      uid,
      role
    });

    const token = agoraService.generateRTCToken(channelName, uid, role, expirationTime);

    res.json({
      success: true,
      data: {
        token,
        appId: process.env.AGORA_APP_ID,
        channelName,
        uid,
        role,
        expiresIn: expirationTime,
        expiresAt: new Date((Math.floor(Date.now() / 1000) + expirationTime) * 1000).toISOString()
      }
    });
  } catch (error) {
    logger.error('❌ Erreur route rtc-token:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du token RTC',
      details: error.message
    });
  }
});

/**
 * POST /api/agora/rtm-token
 * Génère un token RTM pour le chat temps réel
 */
router.post('/rtm-token', authMiddleware, agoraRateLimit, async (req, res) => {
  try {
    const { error, value } = rtmTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.details[0].message
      });
    }

    const { userId, expirationTime } = value;

    logger.info(`💬 Demande token RTM`, {
      requesterId: req.user.id,
      userId
    });

    const token = agoraService.generateRTMToken(userId, expirationTime);

    res.json({
      success: true,
      data: {
        token,
        appId: process.env.AGORA_APP_ID,
        userId,
        expiresIn: expirationTime,
        expiresAt: new Date((Math.floor(Date.now() / 1000) + expirationTime) * 1000).toISOString()
      }
    });
  } catch (error) {
    logger.error('❌ Erreur route rtm-token:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du token RTM',
      details: error.message
    });
  }
});

/**
 * POST /api/agora/session-tokens
 * Génère une session complète (RTC + RTM) pour un utilisateur
 */
router.post('/session-tokens', authMiddleware, agoraRateLimit, async (req, res) => {
  try {
    const { error, value } = sessionTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.details[0].message
      });
    }

    const { channelName, role, expirationTime } = value;
    const userId = req.user.id;

    logger.info(`🎯 Demande session complète`, {
      userId,
      channelName,
      role
    });

    const sessionData = agoraService.generateSessionTokens(
      userId,
      channelName,
      role,
      expirationTime
    );

    res.json({
      success: true,
      data: sessionData
    });
  } catch (error) {
    logger.error('❌ Erreur route session-tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de la session',
      details: error.message
    });
  }
});

/**
 * POST /api/agora/generate-channel
 * Génère un nom de canal unique pour une conversation
 */
router.post('/generate-channel', authMiddleware, async (req, res) => {
  try {
    const { targetUserId, isGroup = false, groupId } = req.body;

    if (isGroup && !groupId) {
      return res.status(400).json({
        success: false,
        error: 'groupId requis pour les canaux de groupe'
      });
    }

    if (!isGroup && !targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'targetUserId requis pour les conversations privées'
      });
    }

    let channelName;
    if (isGroup) {
      channelName = agoraService.generateGroupChannelName(groupId);
    } else {
      channelName = agoraService.generateChannelName(req.user.id, targetUserId);
    }

    logger.info(`📺 Canal généré`, {
      userId: req.user.id,
      channelName,
      isGroup,
      targetUserId,
      groupId
    });

    res.json({
      success: true,
      data: {
        channelName,
        isGroup,
        participants: isGroup ? [groupId] : [req.user.id, targetUserId]
      }
    });
  } catch (error) {
    logger.error('❌ Erreur route generate-channel:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du canal',
      details: error.message
    });
  }
});

/**
 * GET /api/agora/config
 * Retourne la configuration Agora (sans les secrets)
 */
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const config = agoraService.validateConfiguration();

    logger.info(`⚙️ Configuration Agora demandée`, {
      userId: req.user.id,
      isValid: config.isValid
    });

    res.json({
      success: true,
      data: {
        appId: process.env.AGORA_APP_ID,
        isConfigured: config.isValid,
        timestamp: config.timestamp
      }
    });
  } catch (error) {
    logger.error('❌ Erreur route config:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la configuration'
    });
  }
});

/**
 * GET /api/agora/health
 * Vérification de santé du service Agora
 */
router.get('/health', (req, res) => {
  try {
    const config = agoraService.validateConfiguration();
    
    res.json({
      success: true,
      message: 'Service Agora opérationnel',
      isConfigured: config.isValid,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Service Agora non configuré',
      details: error.message
    });
  }
});

module.exports = router;
