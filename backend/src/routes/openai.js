/**
 * 🤖 ROUTES OPENAI - 224SOLUTIONS
 * Routes pour l'intégration OpenAI avec sécurité et rate limiting
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const openaiService = require('../services/openaiService');
const permissionMiddleware = require('../middleware/permissions');
const logger = require('../utils/logger');

// =====================================================
// RATE LIMITING SPÉCIFIQUE OPENAI
// =====================================================

const openaiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_OPENAI_WINDOW_MS) || 60 * 60 * 1000, // 1 heure
    max: parseInt(process.env.RATE_LIMIT_OPENAI_MAX_REQUESTS) || 50, // 50 requêtes par heure
    message: {
        error: 'Limite de requêtes OpenAI dépassée',
        message: 'Trop de demandes d\'analyse. Réessayez dans une heure.',
        retryAfter: '1 heure'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limiting par utilisateur ET par IP
        return `${req.user?.id || 'anonymous'}_${req.ip}`;
    },
    handler: (req, res) => {
        logger.warn('Rate limit OpenAI dépassé', {
            userId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(429).json({
            error: 'Limite de requêtes OpenAI dépassée',
            message: 'Vous avez atteint la limite de 50 analyses par heure. Réessayez plus tard.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
            currentUsage: req.rateLimit.used,
            maxRequests: req.rateLimit.limit
        });
    }
});

// =====================================================
// VALIDATIONS
// =====================================================

const analyzeProjectValidation = [
    body('texte')
        .notEmpty()
        .withMessage('Le texte du projet est requis')
        .isLength({ min: 10, max: 50000 })
        .withMessage('Le texte doit contenir entre 10 et 50 000 caractères')
        .trim()
        .escape(),

    body('options.focusArea')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Le focus ne peut pas dépasser 200 caractères')
        .trim()
        .escape(),

    body('options.budget')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Le budget ne peut pas dépasser 100 caractères')
        .trim()
        .escape(),

    body('options.timeline')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Le délai ne peut pas dépasser 100 caractères')
        .trim()
        .escape()
];

// =====================================================
// ROUTES
// =====================================================

/**
 * 🎯 POST /analyse-projet
 * Analyser un projet avec OpenAI GPT-4o-mini
 * Accès: PDG/Admin uniquement
 */
router.post('/analyse-projet',
    openaiLimiter,
    permissionMiddleware.requireRole(['pdg', 'admin']),
    analyzeProjectValidation,
    async (req, res) => {
        try {
            // Vérification des erreurs de validation
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.warn('Validation échouée pour analyse projet', {
                    userId: req.user.id,
                    errors: errors.array()
                });

                return res.status(400).json({
                    error: 'Données invalides',
                    message: 'Veuillez vérifier les données envoyées',
                    details: errors.array()
                });
            }

            const { texte, options = {} } = req.body;

            // Logging de la requête
            logger.info('Début analyse projet', {
                userId: req.user.id,
                userRole: req.user.role,
                textLength: texte.length,
                hasOptions: Object.keys(options).length > 0
            });

            // Appel du service OpenAI
            const startTime = Date.now();
            const result = await openaiService.analyzeProject(texte, req.user, options);
            const duration = Date.now() - startTime;

            // Logging du succès
            logger.info('Analyse projet terminée avec succès', {
                userId: req.user.id,
                duration: `${duration}ms`,
                tokensUsed: result.metadata.tokensUsed
            });

            // Réponse structurée
            res.status(200).json({
                success: true,
                message: 'Analyse terminée avec succès',
                data: result.analysis,
                metadata: {
                    ...result.metadata,
                    requestDuration: duration,
                    rateLimitRemaining: req.rateLimit.remaining,
                    rateLimitReset: new Date(req.rateLimit.resetTime).toISOString()
                }
            });

        } catch (error) {
            // Logging de l'erreur
            logger.error('Erreur lors de l\'analyse projet', {
                userId: req.user?.id,
                error: error.message,
                stack: error.stack
            });

            // Gestion des erreurs spécifiques
            if (error.message.includes('Quota OpenAI dépassé')) {
                return res.status(503).json({
                    error: 'Service temporairement indisponible',
                    message: 'Quota OpenAI dépassé. Contactez l\'administrateur.',
                    code: 'QUOTA_EXCEEDED'
                });
            }

            if (error.message.includes('Limite de taux OpenAI dépassée')) {
                return res.status(429).json({
                    error: 'Trop de requêtes',
                    message: 'Limite OpenAI dépassée. Réessayez dans quelques minutes.',
                    code: 'RATE_LIMIT_EXCEEDED'
                });
            }

            // Erreur générique
            res.status(500).json({
                error: 'Erreur interne du serveur',
                message: 'Une erreur est survenue lors de l\'analyse',
                code: 'INTERNAL_ERROR',
                requestId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
        }
    }
);

/**
 * 📊 GET /stats
 * Obtenir les statistiques d'utilisation OpenAI
 * Accès: PDG/Admin uniquement
 */
router.get('/stats',
    permissionMiddleware.requireRole(['pdg', 'admin']),
    async (req, res) => {
        try {
            const stats = openaiService.getUsageStats();

            res.status(200).json({
                success: true,
                message: 'Statistiques OpenAI récupérées',
                data: {
                    ...stats,
                    rateLimits: {
                        windowMs: parseInt(process.env.RATE_LIMIT_OPENAI_WINDOW_MS) || 3600000,
                        maxRequests: parseInt(process.env.RATE_LIMIT_OPENAI_MAX_REQUESTS) || 50,
                        currentUsage: req.rateLimit?.used || 0,
                        remaining: req.rateLimit?.remaining || 50
                    }
                }
            });
        } catch (error) {
            logger.error('Erreur récupération stats OpenAI', {
                userId: req.user.id,
                error: error.message
            });

            res.status(500).json({
                error: 'Erreur interne',
                message: 'Impossible de récupérer les statistiques'
            });
        }
    }
);

/**
 * 🔍 GET /test-connection
 * Tester la connexion OpenAI
 * Accès: PDG/Admin uniquement
 */
router.get('/test-connection',
    permissionMiddleware.requireRole(['pdg', 'admin']),
    async (req, res) => {
        try {
            logger.info('Test connexion OpenAI demandé', {
                userId: req.user.id,
                userRole: req.user.role
            });

            const testResult = await openaiService.testConnection();

            if (testResult.success) {
                logger.info('Test connexion OpenAI réussi', {
                    userId: req.user.id,
                    model: testResult.model
                });
            } else {
                logger.error('Test connexion OpenAI échoué', {
                    userId: req.user.id,
                    error: testResult.error
                });
            }

            res.status(testResult.success ? 200 : 503).json({
                success: testResult.success,
                message: testResult.message,
                data: testResult.success ? {
                    model: testResult.model,
                    response: testResult.response,
                    timestamp: new Date().toISOString()
                } : {
                    error: testResult.error
                }
            });

        } catch (error) {
            logger.error('Erreur test connexion OpenAI', {
                userId: req.user.id,
                error: error.message
            });

            res.status(500).json({
                success: false,
                message: 'Erreur lors du test de connexion',
                error: error.message
            });
        }
    }
);

/**
 * 📋 GET /
 * Informations sur les endpoints OpenAI disponibles
 * Accès: PDG/Admin uniquement
 */
router.get('/',
    permissionMiddleware.requireRole(['pdg', 'admin']),
    (req, res) => {
        res.status(200).json({
            message: '🤖 API OpenAI 224Solutions',
            version: '1.0.0',
            endpoints: {
                'POST /analyse-projet': {
                    description: 'Analyser un projet avec GPT-4o-mini',
                    access: 'PDG/Admin uniquement',
                    rateLimit: '50 requêtes/heure',
                    parameters: {
                        texte: 'string (10-50000 caractères)',
                        options: {
                            focusArea: 'string (optionnel)',
                            budget: 'string (optionnel)',
                            timeline: 'string (optionnel)'
                        }
                    }
                },
                'GET /stats': {
                    description: 'Statistiques d\'utilisation OpenAI',
                    access: 'PDG/Admin uniquement'
                },
                'GET /test-connection': {
                    description: 'Tester la connexion OpenAI',
                    access: 'PDG/Admin uniquement'
                }
            },
            security: {
                authentication: 'JWT Token requis',
                authorization: 'Rôle PDG ou Admin requis',
                rateLimiting: '50 requêtes par heure par utilisateur'
            }
        });
    }
);

module.exports = router;
