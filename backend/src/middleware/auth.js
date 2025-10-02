/**
 * 🔐 MIDDLEWARE AUTHENTIFICATION - 224SOLUTIONS
 * Middleware JWT pour sécuriser les routes backend
 */

const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Configuration Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 🛡️ Middleware d'authentification JWT
 * Vérifie le token JWT et charge les informations utilisateur
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Extraction du token depuis l'en-tête Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: 'Token d\'authentification manquant',
                message: 'Veuillez fournir un token d\'authentification dans l\'en-tête Authorization'
            });
        }

        // Vérification du format "Bearer <token>"
        const tokenParts = authHeader.split(' ');
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
            return res.status(401).json({
                error: 'Format de token invalide',
                message: 'Le token doit être au format: Bearer <token>'
            });
        }

        const token = tokenParts[1];

        // Vérification et décodage du JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            logger.warn('Token JWT invalide', {
                error: jwtError.message,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expiré',
                    message: 'Votre session a expiré. Veuillez vous reconnecter.',
                    code: 'TOKEN_EXPIRED'
                });
            }

            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    error: 'Token invalide',
                    message: 'Le token fourni n\'est pas valide.',
                    code: 'TOKEN_INVALID'
                });
            }

            return res.status(401).json({
                error: 'Erreur d\'authentification',
                message: 'Impossible de vérifier le token.',
                code: 'AUTH_ERROR'
            });
        }

        // Récupération des informations utilisateur depuis Supabase
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select(`
        id,
        email,
        role,
        nom,
        prenom,
        status,
        created_at,
        updated_at
      `)
            .eq('id', decoded.userId)
            .single();

        if (userError || !user) {
            logger.warn('Utilisateur non trouvé pour le token', {
                userId: decoded.userId,
                error: userError?.message,
                ip: req.ip
            });

            return res.status(401).json({
                error: 'Utilisateur non trouvé',
                message: 'L\'utilisateur associé à ce token n\'existe plus.',
                code: 'USER_NOT_FOUND'
            });
        }

        // Vérification du statut utilisateur
        if (user.status !== 'active') {
            logger.warn('Tentative d\'accès avec compte inactif', {
                userId: user.id,
                status: user.status,
                ip: req.ip
            });

            return res.status(403).json({
                error: 'Compte inactif',
                message: 'Votre compte est désactivé. Contactez l\'administrateur.',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Ajout des informations utilisateur à la requête
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            nom: user.nom,
            prenom: user.prenom,
            status: user.status,
            fullName: `${user.prenom} ${user.nom}`.trim()
        };

        // Logging de l'authentification réussie
        logger.info('Authentification réussie', {
            userId: user.id,
            role: user.role,
            ip: req.ip,
            endpoint: req.originalUrl
        });

        next();

    } catch (error) {
        logger.error('Erreur dans le middleware d\'authentification', {
            error: error.message,
            stack: error.stack,
            ip: req.ip,
            endpoint: req.originalUrl
        });

        res.status(500).json({
            error: 'Erreur interne d\'authentification',
            message: 'Une erreur est survenue lors de la vérification de l\'authentification.',
            code: 'AUTH_INTERNAL_ERROR'
        });
    }
};

/**
 * 🔑 Générer un token JWT pour un utilisateur
 * @param {Object} user - Informations utilisateur
 * @returns {string} Token JWT
 */
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
    };

    const options = {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: '224solutions-backend',
        audience: '224solutions-frontend'
    };

    return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * 🔍 Vérifier un token JWT sans middleware
 * @param {string} token - Token à vérifier
 * @returns {Object|null} Payload décodé ou null si invalide
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        logger.warn('Token JWT invalide lors de la vérification', {
            error: error.message
        });
        return null;
    }
};

/**
 * 🔄 Middleware optionnel d'authentification
 * N'interrompt pas la requête si pas de token, mais charge l'utilisateur si présent
 */
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            req.user = null;
            return next();
        }

        const tokenParts = authHeader.split(' ');
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
            req.user = null;
            return next();
        }

        const token = tokenParts[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            req.user = null;
            return next();
        }

        // Récupération utilisateur
        const { data: user } = await supabase
            .from('profiles')
            .select('id, email, role, nom, prenom, status')
            .eq('id', decoded.userId)
            .single();

        if (user && user.status === 'active') {
            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
                nom: user.nom,
                prenom: user.prenom,
                status: user.status,
                fullName: `${user.prenom} ${user.nom}`.trim()
            };
        } else {
            req.user = null;
        }

        next();

    } catch (error) {
        logger.error('Erreur dans le middleware d\'authentification optionnel', {
            error: error.message
        });
        req.user = null;
        next();
    }
};

module.exports = {
    authMiddleware,
    optionalAuthMiddleware,
    generateToken,
    verifyToken
};
