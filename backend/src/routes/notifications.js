/**
 * 🔔 ROUTES NOTIFICATIONS - 224SOLUTIONS
 * Routes pour la gestion des notifications Firebase FCM
 */

const express = require('express');
const router = express.Router();
let firebaseService;
try {
    firebaseService = require('../../../services/firebase.service.cjs');
} catch (_) {
    firebaseService = null;
}
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');

// Client Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Middleware de validation des erreurs
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Erreurs de validation',
            errors: errors.array()
        });
    }
    next();
};

/**
 * 📱 GESTION DES TOKENS FCM
 */

/**
 * POST /api/notifications/register-token - Enregistrer un token FCM
 */
router.post('/register-token', authMiddleware, [
    body('fcmToken').isString().isLength({ min: 10 }).withMessage('Token FCM invalide')
], handleValidationErrors, async (req, res) => {
    try {
        const userId = req.user.id;
        const { fcmToken } = req.body;

        // Mettre à jour le token FCM de l'utilisateur
        const { error } = await supabase
            .from('users')
            .update({
                fcm_token: fcmToken,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            throw error;
        }

        // Abonner l'utilisateur aux topics selon son rôle
        const user = await getUserById(userId);
        if (user) {
            await subscribeUserToTopics(fcmToken, user.role);
        }

        console.log('✅ Token FCM enregistré pour utilisateur:', userId);

        res.json({
            success: true,
            message: 'Token FCM enregistré avec succès'
        });
    } catch (error) {
        console.error('❌ Erreur enregistrement token FCM:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * DELETE /api/notifications/unregister-token - Supprimer un token FCM
 */
router.delete('/unregister-token', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Supprimer le token FCM de l'utilisateur
        const { error } = await supabase
            .from('users')
            .update({
                fcm_token: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            throw error;
        }

        console.log('✅ Token FCM supprimé pour utilisateur:', userId);

        res.json({
            success: true,
            message: 'Token FCM supprimé avec succès'
        });
    } catch (error) {
        console.error('❌ Erreur suppression token FCM:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * 📤 ENVOI DE NOTIFICATIONS
 */

/**
 * POST /api/notifications/send - Envoyer une notification à un utilisateur
 */
router.post('/send', [
    authMiddleware,
    body('userId').isUUID().withMessage('ID utilisateur invalide'),
    body('title').isString().isLength({ min: 1, max: 255 }).withMessage('Titre requis (1-255 caractères)'),
    body('body').isString().isLength({ min: 1, max: 1000 }).withMessage('Corps requis (1-1000 caractères)'),
    body('type').isString().withMessage('Type de notification requis'),
    body('data').optional().isObject().withMessage('Données additionnelles doivent être un objet')
], handleValidationErrors, async (req, res) => {
    try {
        const { userId, title, body, type, data = {} } = req.body;

        // Récupérer le token FCM de l'utilisateur
        const user = await getUserById(userId);
        if (!user || !user.fcm_token) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé ou token FCM manquant'
            });
        }

        // Envoyer la notification
        const result = await firebaseService.sendNotificationToUser(
            user.fcm_token,
            { title, body, type },
            data
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Erreur envoi notification',
                error: result.error
            });
        }

        // Enregistrer la notification dans la base de données
        await saveNotificationToDatabase(userId, { title, body, type, data }, result.messageId);

        res.json({
            success: true,
            message: 'Notification envoyée avec succès',
            messageId: result.messageId
        });
    } catch (error) {
        console.error('❌ Erreur envoi notification:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * POST /api/notifications/send-topic - Envoyer une notification à un topic
 */
router.post('/send-topic', [
    authMiddleware,
    body('topic').isString().withMessage('Topic requis'),
    body('title').isString().isLength({ min: 1, max: 255 }).withMessage('Titre requis'),
    body('body').isString().isLength({ min: 1, max: 1000 }).withMessage('Corps requis'),
    body('type').isString().withMessage('Type de notification requis'),
    body('data').optional().isObject().withMessage('Données additionnelles doivent être un objet')
], handleValidationErrors, async (req, res) => {
    try {
        const { topic, title, body, type, data = {} } = req.body;

        // Vérifier que l'utilisateur a les permissions pour envoyer à ce topic
        if (!canSendToTopic(req.user.role, topic)) {
            return res.status(403).json({
                success: false,
                message: 'Permission insuffisante pour envoyer à ce topic'
            });
        }

        // Envoyer la notification au topic
        const result = await firebaseService.sendNotificationToTopic(
            topic,
            { title, body, type },
            data
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Erreur envoi notification topic',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Notification topic envoyée avec succès',
            messageId: result.messageId
        });
    } catch (error) {
        console.error('❌ Erreur envoi notification topic:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * POST /api/notifications/send-batch - Envoyer des notifications en lot
 */
router.post('/send-batch', [
    authMiddleware,
    body('notifications').isArray().withMessage('Liste de notifications requise'),
    body('notifications.*.userId').isUUID().withMessage('ID utilisateur invalide'),
    body('notifications.*.title').isString().withMessage('Titre requis'),
    body('notifications.*.body').isString().withMessage('Corps requis'),
    body('notifications.*.type').isString().withMessage('Type requis')
], handleValidationErrors, async (req, res) => {
    try {
        const { notifications } = req.body;

        // Préparer les messages FCM
        const messages = [];
        const dbNotifications = [];

        for (const notif of notifications) {
            const user = await getUserById(notif.userId);
            if (user && user.fcm_token) {
                messages.push({
                    token: user.fcm_token,
                    notification: {
                        title: notif.title,
                        body: notif.body
                    },
                    data: {
                        type: notif.type,
                        ...(notif.data || {})
                    }
                });

                dbNotifications.push({
                    user_id: notif.userId,
                    title: notif.title,
                    body: notif.body,
                    type: notif.type,
                    data: notif.data || {}
                });
            }
        }

        if (messages.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucun utilisateur valide trouvé'
            });
        }

        // Envoyer les notifications en lot
        const result = await firebaseService.sendBatchNotifications(messages);

        // Enregistrer les notifications dans la base de données
        if (dbNotifications.length > 0) {
            await supabase
                .from('notifications')
                .insert(dbNotifications.map(notif => ({
                    ...notif,
                    is_sent: true,
                    sent_at: new Date().toISOString()
                })));
        }

        res.json({
            success: true,
            message: 'Notifications batch envoyées',
            successCount: result.successCount,
            failureCount: result.failureCount
        });
    } catch (error) {
        console.error('❌ Erreur envoi notifications batch:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * 📋 GESTION DES NOTIFICATIONS UTILISATEUR
 */

/**
 * GET /api/notifications - Obtenir les notifications de l'utilisateur
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0, unreadOnly = false } = req.query;

        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (unreadOnly === 'true') {
            query = query.eq('is_read', false);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            notifications: data,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: data.length
            }
        });
    } catch (error) {
        console.error('❌ Erreur récupération notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * PUT /api/notifications/:id/read - Marquer une notification comme lue
 */
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: 'Notification marquée comme lue'
        });
    } catch (error) {
        console.error('❌ Erreur marquage notification:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * PUT /api/notifications/read-all - Marquer toutes les notifications comme lues
 */
router.put('/read-all', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const { error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: 'Toutes les notifications marquées comme lues'
        });
    } catch (error) {
        console.error('❌ Erreur marquage toutes notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * GET /api/notifications/unread-count - Obtenir le nombre de notifications non lues
 */
router.get('/unread-count', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            unreadCount: count
        });
    } catch (error) {
        console.error('❌ Erreur comptage notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * 🛠️ FONCTIONS UTILITAIRES
 */

/**
 * Récupère un utilisateur par ID
 */
async function getUserById(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('❌ Erreur récupération utilisateur:', error);
        return null;
    }
}

/**
 * Abonne un utilisateur aux topics selon son rôle
 */
async function subscribeUserToTopics(fcmToken, userRole) {
    try {
        const topics = ['all_users']; // Topic pour tous les utilisateurs

        // Ajouter des topics spécifiques selon le rôle
        switch (userRole) {
            case 'client':
                topics.push('clients');
                break;
            case 'vendeur':
                topics.push('vendeurs');
                break;
            case 'transitaire':
                topics.push('transitaires');
                break;
            case 'pdg':
            case 'admin':
                topics.push('pdg_admin');
                break;
            case 'syndicat_president':
                topics.push('syndicats');
                break;
        }

        // Abonner aux topics
        for (const topic of topics) {
            await firebaseService.subscribeToTopic([fcmToken], topic);
        }

        console.log('✅ Utilisateur abonné aux topics:', topics);
    } catch (error) {
        console.error('❌ Erreur abonnement topics:', error);
    }
}

/**
 * Vérifie si un utilisateur peut envoyer à un topic
 */
function canSendToTopic(userRole, topic) {
    // Seuls les PDG/Admin peuvent envoyer à tous les topics
    if (userRole === 'pdg' || userRole === 'admin') {
        return true;
    }

    // Les autres rôles ont des restrictions
    const allowedTopics = {
        'vendeur': ['clients'],
        'transitaire': ['clients', 'vendeurs'],
        'syndicat_president': ['syndicats']
    };

    return allowedTopics[userRole]?.includes(topic) || false;
}

/**
 * Enregistre une notification dans la base de données
 */
async function saveNotificationToDatabase(userId, notification, fcmMessageId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title: notification.title,
                body: notification.body,
                type: notification.type,
                data: notification.data || {},
                fcm_message_id: fcmMessageId,
                is_sent: true,
                sent_at: new Date().toISOString()
            });

        if (error) {
            throw error;
        }

        console.log('✅ Notification enregistrée en base');
    } catch (error) {
        console.error('❌ Erreur enregistrement notification:', error);
    }
}

module.exports = router;
