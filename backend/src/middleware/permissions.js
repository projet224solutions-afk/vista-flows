/**
 * 🛡️ MIDDLEWARE PERMISSIONS - 224SOLUTIONS
 * Système de permissions basé sur les rôles pour sécuriser l'accès aux endpoints
 */

const logger = require('../utils/logger');

/**
 * 🎯 Rôles disponibles dans 224Solutions
 */
const ROLES = {
    ADMIN: 'admin',
    PDG: 'pdg',
    VENDEUR: 'vendeur',
    LIVREUR: 'livreur',
    TAXI: 'taxi',
    SYNDICAT: 'syndicat',
    TRANSITAIRE: 'transitaire',
    CLIENT: 'client'
};

/**
 * 📊 Hiérarchie des rôles (du plus élevé au plus bas)
 */
const ROLE_HIERARCHY = {
    [ROLES.ADMIN]: 100,
    [ROLES.PDG]: 90,
    [ROLES.SYNDICAT]: 80,
    [ROLES.TRANSITAIRE]: 70,
    [ROLES.VENDEUR]: 60,
    [ROLES.LIVREUR]: 50,
    [ROLES.TAXI]: 40,
    [ROLES.CLIENT]: 10
};

/**
 * 🔐 Middleware pour vérifier les rôles requis
 * @param {Array<string>} allowedRoles - Rôles autorisés
 * @returns {Function} Middleware Express
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            // Vérification que l'utilisateur est authentifié
            if (!req.user) {
                logger.warn('Tentative d\'accès sans authentification', {
                    ip: req.ip,
                    endpoint: req.originalUrl,
                    method: req.method
                });

                return res.status(401).json({
                    error: 'Authentification requise',
                    message: 'Vous devez être connecté pour accéder à cette ressource.',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Vérification du rôle utilisateur
            const userRole = req.user.role;

            if (!userRole) {
                logger.warn('Utilisateur sans rôle défini', {
                    userId: req.user.id,
                    endpoint: req.originalUrl
                });

                return res.status(403).json({
                    error: 'Rôle non défini',
                    message: 'Votre compte n\'a pas de rôle défini. Contactez l\'administrateur.',
                    code: 'ROLE_UNDEFINED'
                });
            }

            // Vérification si le rôle est dans la liste autorisée
            if (!allowedRoles.includes(userRole)) {
                logger.warn('Accès refusé - rôle insuffisant', {
                    userId: req.user.id,
                    userRole: userRole,
                    requiredRoles: allowedRoles,
                    endpoint: req.originalUrl,
                    method: req.method,
                    ip: req.ip
                });

                return res.status(403).json({
                    error: 'Permissions insuffisantes',
                    message: `Accès refusé. Rôles requis: ${allowedRoles.join(', ')}. Votre rôle: ${userRole}`,
                    code: 'INSUFFICIENT_PERMISSIONS',
                    details: {
                        userRole: userRole,
                        requiredRoles: allowedRoles
                    }
                });
            }

            // Logging de l'accès autorisé
            logger.info('Accès autorisé', {
                userId: req.user.id,
                userRole: userRole,
                endpoint: req.originalUrl,
                method: req.method
            });

            next();

        } catch (error) {
            logger.error('Erreur dans le middleware de permissions', {
                error: error.message,
                stack: error.stack,
                userId: req.user?.id,
                endpoint: req.originalUrl
            });

            res.status(500).json({
                error: 'Erreur interne de permissions',
                message: 'Une erreur est survenue lors de la vérification des permissions.',
                code: 'PERMISSION_INTERNAL_ERROR'
            });
        }
    };
};

/**
 * 🔝 Middleware pour vérifier un niveau de rôle minimum
 * @param {string} minimumRole - Rôle minimum requis
 * @returns {Function} Middleware Express
 */
const requireMinimumRole = (minimumRole) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentification requise',
                    message: 'Vous devez être connecté pour accéder à cette ressource.',
                    code: 'AUTH_REQUIRED'
                });
            }

            const userRole = req.user.role;
            const userLevel = ROLE_HIERARCHY[userRole] || 0;
            const minimumLevel = ROLE_HIERARCHY[minimumRole] || 0;

            if (userLevel < minimumLevel) {
                logger.warn('Accès refusé - niveau de rôle insuffisant', {
                    userId: req.user.id,
                    userRole: userRole,
                    userLevel: userLevel,
                    minimumRole: minimumRole,
                    minimumLevel: minimumLevel,
                    endpoint: req.originalUrl
                });

                return res.status(403).json({
                    error: 'Niveau de permissions insuffisant',
                    message: `Accès refusé. Niveau minimum requis: ${minimumRole}. Votre niveau: ${userRole}`,
                    code: 'INSUFFICIENT_ROLE_LEVEL',
                    details: {
                        userRole: userRole,
                        minimumRole: minimumRole
                    }
                });
            }

            next();

        } catch (error) {
            logger.error('Erreur dans le middleware de niveau de rôle', {
                error: error.message,
                userId: req.user?.id,
                endpoint: req.originalUrl
            });

            res.status(500).json({
                error: 'Erreur interne de permissions',
                message: 'Une erreur est survenue lors de la vérification du niveau de rôle.',
                code: 'PERMISSION_INTERNAL_ERROR'
            });
        }
    };
};

/**
 * 👤 Middleware pour vérifier que l'utilisateur accède à ses propres données
 * @param {string} paramName - Nom du paramètre contenant l'ID utilisateur
 * @returns {Function} Middleware Express
 */
const requireOwnership = (paramName = 'userId') => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentification requise',
                    code: 'AUTH_REQUIRED'
                });
            }

            const targetUserId = req.params[paramName] || req.body[paramName];
            const currentUserId = req.user.id;

            // Les admins et PDG peuvent accéder aux données de tous les utilisateurs
            const isPrivileged = ['admin', 'pdg'].includes(req.user.role);

            if (!isPrivileged && targetUserId !== currentUserId) {
                logger.warn('Tentative d\'accès aux données d\'un autre utilisateur', {
                    userId: currentUserId,
                    targetUserId: targetUserId,
                    endpoint: req.originalUrl,
                    userRole: req.user.role
                });

                return res.status(403).json({
                    error: 'Accès non autorisé',
                    message: 'Vous ne pouvez accéder qu\'à vos propres données.',
                    code: 'OWNERSHIP_REQUIRED'
                });
            }

            next();

        } catch (error) {
            logger.error('Erreur dans le middleware de propriété', {
                error: error.message,
                userId: req.user?.id,
                endpoint: req.originalUrl
            });

            res.status(500).json({
                error: 'Erreur interne de permissions',
                code: 'PERMISSION_INTERNAL_ERROR'
            });
        }
    };
};

/**
 * 🏢 Middleware pour vérifier l'accès aux ressources d'entreprise
 * @param {string} companyParamName - Nom du paramètre contenant l'ID de l'entreprise
 * @returns {Function} Middleware Express
 */
const requireCompanyAccess = (companyParamName = 'companyId') => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Authentification requise',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Les admins ont accès à toutes les entreprises
            if (req.user.role === 'admin') {
                return next();
            }

            const targetCompanyId = req.params[companyParamName] || req.body[companyParamName];

            // TODO: Implémenter la vérification d'appartenance à l'entreprise
            // Pour l'instant, on autorise l'accès pour les PDG et syndicats
            const hasCompanyAccess = ['pdg', 'syndicat'].includes(req.user.role);

            if (!hasCompanyAccess) {
                logger.warn('Accès refusé aux ressources d\'entreprise', {
                    userId: req.user.id,
                    userRole: req.user.role,
                    targetCompanyId: targetCompanyId,
                    endpoint: req.originalUrl
                });

                return res.status(403).json({
                    error: 'Accès aux ressources d\'entreprise refusé',
                    message: 'Vous n\'avez pas accès aux ressources de cette entreprise.',
                    code: 'COMPANY_ACCESS_DENIED'
                });
            }

            next();

        } catch (error) {
            logger.error('Erreur dans le middleware d\'accès entreprise', {
                error: error.message,
                userId: req.user?.id,
                endpoint: req.originalUrl
            });

            res.status(500).json({
                error: 'Erreur interne de permissions',
                code: 'PERMISSION_INTERNAL_ERROR'
            });
        }
    };
};

/**
 * 📋 Obtenir les informations sur les permissions d'un utilisateur
 * @param {Object} user - Objet utilisateur
 * @returns {Object} Informations sur les permissions
 */
const getUserPermissions = (user) => {
    if (!user || !user.role) {
        return {
            role: null,
            level: 0,
            canAccessOpenAI: false,
            canManageUsers: false,
            canViewAnalytics: false,
            isPrivileged: false
        };
    }

    const role = user.role;
    const level = ROLE_HIERARCHY[role] || 0;

    return {
        role: role,
        level: level,
        canAccessOpenAI: ['admin', 'pdg'].includes(role),
        canManageUsers: ['admin', 'pdg'].includes(role),
        canViewAnalytics: ['admin', 'pdg', 'syndicat'].includes(role),
        isPrivileged: ['admin', 'pdg'].includes(role),
        canAccessCompanyData: ['admin', 'pdg', 'syndicat'].includes(role)
    };
};

module.exports = {
    ROLES,
    ROLE_HIERARCHY,
    requireRole,
    requireMinimumRole,
    requireOwnership,
    requireCompanyAccess,
    getUserPermissions
};
