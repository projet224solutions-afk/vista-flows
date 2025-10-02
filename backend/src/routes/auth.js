/**
 * 🔐 ROUTES AUTHENTIFICATION - 224SOLUTIONS
 * Routes pour l'authentification et la gestion des sessions
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const { generateToken, authMiddleware } = require('../middleware/auth');
const { getUserPermissions } = require('../middleware/permissions');
const logger = require('../utils/logger');
const { asyncHandler, createError } = require('../middleware/errorHandler');

const router = express.Router();

// Configuration Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =====================================================
// RATE LIMITING POUR AUTHENTIFICATION
// =====================================================

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives par IP
    message: {
        error: 'Trop de tentatives de connexion',
        message: 'Trop de tentatives de connexion depuis cette IP. Réessayez dans 15 minutes.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.security('Rate limit authentification dépassé', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            email: req.body.email
        });

        res.status(429).json({
            error: 'Trop de tentatives de connexion',
            message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

// =====================================================
// VALIDATIONS
// =====================================================

const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Email invalide')
        .normalizeEmail()
        .trim(),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Le mot de passe doit contenir au moins 6 caractères')
        .trim()
];

const registerValidation = [
    body('email')
        .isEmail()
        .withMessage('Email invalide')
        .normalizeEmail()
        .trim(),

    body('password')
        .isLength({ min: 8 })
        .withMessage('Le mot de passe doit contenir au moins 8 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
        .trim(),

    body('nom')
        .isLength({ min: 2, max: 50 })
        .withMessage('Le nom doit contenir entre 2 et 50 caractères')
        .trim()
        .escape(),

    body('prenom')
        .isLength({ min: 2, max: 50 })
        .withMessage('Le prénom doit contenir entre 2 et 50 caractères')
        .trim()
        .escape(),

    body('role')
        .isIn(['vendeur', 'livreur', 'taxi', 'client', 'syndicat', 'transitaire'])
        .withMessage('Rôle invalide')
];

// =====================================================
// ROUTES
// =====================================================

/**
 * 🔑 POST /login
 * Authentification utilisateur
 */
router.post('/login',
    authLimiter,
    loginValidation,
    asyncHandler(async (req, res) => {
        // Vérification des erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Tentative de connexion avec données invalides', {
                ip: req.ip,
                errors: errors.array()
            });

            throw createError.validation('Données de connexion invalides', errors.array());
        }

        const { email, password } = req.body;

        // Recherche de l'utilisateur
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select(`
        id,
        email,
        password_hash,
        role,
        nom,
        prenom,
        status,
        created_at,
        last_login
      `)
            .eq('email', email)
            .single();

        if (userError || !user) {
            logger.security('Tentative de connexion avec email inexistant', {
                email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            throw createError.authentication('Email ou mot de passe incorrect');
        }

        // Vérification du statut du compte
        if (user.status !== 'active') {
            logger.security('Tentative de connexion avec compte inactif', {
                userId: user.id,
                email,
                status: user.status,
                ip: req.ip
            });

            throw createError.authorization('Compte désactivé. Contactez l\'administrateur.');
        }

        // Vérification du mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            logger.security('Tentative de connexion avec mot de passe incorrect', {
                userId: user.id,
                email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            throw createError.authentication('Email ou mot de passe incorrect');
        }

        // Mise à jour de la dernière connexion
        await supabase
            .from('profiles')
            .update({
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        // Génération du token JWT
        const token = generateToken(user);

        // Informations utilisateur (sans mot de passe)
        const userInfo = {
            id: user.id,
            email: user.email,
            role: user.role,
            nom: user.nom,
            prenom: user.prenom,
            fullName: `${user.prenom} ${user.nom}`.trim(),
            status: user.status,
            permissions: getUserPermissions(user)
        };

        // Logging de la connexion réussie
        logger.info('Connexion réussie', {
            userId: user.id,
            email: user.email,
            role: user.role,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(200).json({
            success: true,
            message: 'Connexion réussie',
            data: {
                user: userInfo,
                token,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            }
        });
    })
);

/**
 * 📝 POST /register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register',
    registerValidation,
    asyncHandler(async (req, res) => {
        // Vérification des erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw createError.validation('Données d\'inscription invalides', errors.array());
        }

        const { email, password, nom, prenom, role } = req.body;

        // Vérification si l'email existe déjà
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            logger.warn('Tentative d\'inscription avec email existant', {
                email,
                ip: req.ip
            });

            throw createError.validation('Cet email est déjà utilisé');
        }

        // Hashage du mot de passe
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Création de l'utilisateur
        const { data: newUser, error: createError } = await supabase
            .from('profiles')
            .insert({
                email,
                password_hash: passwordHash,
                nom,
                prenom,
                role,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select(`
        id,
        email,
        role,
        nom,
        prenom,
        status,
        created_at
      `)
            .single();

        if (createError) {
            logger.error('Erreur lors de la création d\'utilisateur', {
                error: createError.message,
                email,
                ip: req.ip
            });

            throw createError.internal('Erreur lors de la création du compte');
        }

        // Génération du token JWT
        const token = generateToken(newUser);

        // Informations utilisateur
        const userInfo = {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            nom: newUser.nom,
            prenom: newUser.prenom,
            fullName: `${newUser.prenom} ${newUser.nom}`.trim(),
            status: newUser.status,
            permissions: getUserPermissions(newUser)
        };

        // Logging de l'inscription réussie
        logger.info('Inscription réussie', {
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            success: true,
            message: 'Inscription réussie',
            data: {
                user: userInfo,
                token,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            }
        });
    })
);

/**
 * 👤 GET /me
 * Obtenir les informations de l'utilisateur connecté
 */
router.get('/me',
    authMiddleware,
    asyncHandler(async (req, res) => {
        const userInfo = {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            nom: req.user.nom,
            prenom: req.user.prenom,
            fullName: req.user.fullName,
            status: req.user.status,
            permissions: getUserPermissions(req.user)
        };

        res.status(200).json({
            success: true,
            message: 'Informations utilisateur récupérées',
            data: { user: userInfo }
        });
    })
);

/**
 * 🔄 POST /refresh
 * Renouveler le token JWT
 */
router.post('/refresh',
    authMiddleware,
    asyncHandler(async (req, res) => {
        // Génération d'un nouveau token
        const newToken = generateToken(req.user);

        logger.info('Token renouvelé', {
            userId: req.user.id,
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Token renouvelé',
            data: {
                token: newToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            }
        });
    })
);

/**
 * 🚪 POST /logout
 * Déconnexion (côté client principalement)
 */
router.post('/logout',
    authMiddleware,
    asyncHandler(async (req, res) => {
        logger.info('Déconnexion', {
            userId: req.user.id,
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            message: 'Déconnexion réussie'
        });
    })
);

/**
 * 📋 GET /
 * Informations sur les endpoints d'authentification
 */
router.get('/', (req, res) => {
    res.status(200).json({
        message: '🔐 API Authentification 224Solutions',
        version: '1.0.0',
        endpoints: {
            'POST /login': {
                description: 'Connexion utilisateur',
                rateLimit: '5 tentatives/15min',
                parameters: ['email', 'password']
            },
            'POST /register': {
                description: 'Inscription utilisateur',
                parameters: ['email', 'password', 'nom', 'prenom', 'role']
            },
            'GET /me': {
                description: 'Informations utilisateur connecté',
                authentication: 'JWT Token requis'
            },
            'POST /refresh': {
                description: 'Renouveler le token JWT',
                authentication: 'JWT Token requis'
            },
            'POST /logout': {
                description: 'Déconnexion utilisateur',
                authentication: 'JWT Token requis'
            }
        }
    });
});

module.exports = router;
