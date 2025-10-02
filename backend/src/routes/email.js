/**
 * 📧 ROUTES EMAIL - 224SOLUTIONS
 * Routes pour l'envoi d'emails sécurisés
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const emailService = require('../services/emailService');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting pour les emails
const emailRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 emails par 15 minutes
  message: {
    error: 'Trop de tentatives d\'envoi d\'email. Réessayez dans 15 minutes.',
    code: 'EMAIL_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Schéma de validation pour l'envoi d'email
const emailSchema = Joi.object({
  to: Joi.string().email().required().messages({
    'string.email': 'Adresse email invalide',
    'any.required': 'L\'adresse email est requise'
  }),
  subject: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Le sujet ne peut pas être vide',
    'string.max': 'Le sujet ne peut pas dépasser 200 caractères',
    'any.required': 'Le sujet est requis'
  }),
  html: Joi.string().required().messages({
    'any.required': 'Le contenu HTML est requis'
  }),
  text: Joi.string().optional()
});

// Schéma pour l'email de test
const testEmailSchema = Joi.object({
  to: Joi.string().email().required().messages({
    'string.email': 'Adresse email invalide',
    'any.required': 'L\'adresse email est requise'
  })
});

/**
 * POST /api/email/send
 * Envoie un email générique (authentification requise)
 */
router.post('/send', authMiddleware, emailRateLimit, async (req, res) => {
  try {
    // Validation des données
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.details[0].message
      });
    }

    const { to, subject, html, text } = value;

    // Log de la tentative d'envoi
    logger.info(`📧 Tentative d'envoi email`, {
      userId: req.user.id,
      to,
      subject,
      timestamp: new Date().toISOString()
    });

    // Envoi de l'email
    const result = await emailService.sendEmail({ to, subject, html, text });

    if (result.success) {
      res.json({
        success: true,
        message: 'Email envoyé avec succès',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'envoi de l\'email',
        details: result.error
      });
    }
  } catch (error) {
    logger.error('❌ Erreur route email/send:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

/**
 * POST /api/email/test
 * Envoie un email de test (authentification requise)
 */
router.post('/test', authMiddleware, emailRateLimit, async (req, res) => {
  try {
    // Validation des données
    const { error, value } = testEmailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.details[0].message
      });
    }

    const { to } = value;

    // Log de la tentative d'envoi de test
    logger.info(`🧪 Tentative d'envoi email de test`, {
      userId: req.user.id,
      to,
      timestamp: new Date().toISOString()
    });

    // Envoi de l'email de test
    const result = await emailService.sendTestEmail(to);

    if (result.success) {
      res.json({
        success: true,
        message: 'Email de test envoyé avec succès',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'envoi de l\'email de test',
        details: result.error
      });
    }
  } catch (error) {
    logger.error('❌ Erreur route email/test:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

/**
 * GET /api/email/verify
 * Vérifie la configuration email (authentification requise)
 */
router.get('/verify', authMiddleware, async (req, res) => {
  try {
    logger.info(`🔍 Vérification configuration email`, {
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    const result = await emailService.verifyConnection();

    if (result.success) {
      res.json({
        success: true,
        message: 'Configuration email valide'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Configuration email invalide',
        details: result.error
      });
    }
  } catch (error) {
    logger.error('❌ Erreur route email/verify:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
});

/**
 * GET /api/email/health
 * Vérification de santé du service email
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Service email opérationnel',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
