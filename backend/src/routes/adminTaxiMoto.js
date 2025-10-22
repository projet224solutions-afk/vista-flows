/**
 * ROUTES ADMIN TAXI MOTO
 * Interface d'administration en temps réel
 * 224Solutions - Taxi-Moto System
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Configuration Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration Firebase Admin
const db = admin.firestore();

// =====================================================
// 1. DASHBOARD ADMIN
// =====================================================

/**
 * @route GET /api/admin/dashboard
 * @desc Tableau de bord admin en temps réel
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        // Vérifier les permissions admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé - Réservé aux administrateurs'
            });
        }

        // Statistiques générales
        const [
            activeDrivers,
            activeRides,
            todayEarnings,
            totalUsers
        ] = await Promise.all([
            getActiveDriversCount(),
            getActiveRidesCount(),
            getTodayEarnings(),
            getTotalUsersCount()
        ]);

        // Revenus par période
        const earningsData = await getEarningsData();

        // Top conducteurs
        const topDrivers = await getTopDrivers();

        // Courses récentes
        const recentRides = await getRecentRides();

        res.json({
            success: true,
            dashboard: {
                stats: {
                    activeDrivers,
                    activeRides,
                    todayEarnings,
                    totalUsers
                },
                earningsData,
                topDrivers,
                recentRides
            }
        });

    } catch (error) {
        console.error('❌ Erreur dashboard admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du chargement du dashboard'
        });
    }
});

/**
 * @route GET /api/admin/rides
 * @desc Liste des courses avec filtres
 */
router.get('/rides', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé'
            });
        }

        const {
            status,
            dateFrom,
            dateTo,
            driverId,
            customerId,
            limit = 50,
            offset = 0
        } = req.query;

        // Construire la requête
        let query = db.collection('rides');

        if (status) {
            query = query.where('status', '==', status);
        }

        if (dateFrom) {
            query = query.where('requestedAt', '>=', new Date(dateFrom));
        }

        if (dateTo) {
            query = query.where('requestedAt', '<=', new Date(dateTo));
        }

        if (driverId) {
            query = query.where('driverId', '==', driverId);
        }

        if (customerId) {
            query = query.where('customerId', '==', customerId);
        }

        // Exécuter la requête
        const snapshot = await query
            .orderBy('requestedAt', 'desc')
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .get();

        const rides = [];
        snapshot.forEach(doc => {
            rides.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({
            success: true,
            rides,
            total: rides.length
        });

    } catch (error) {
        console.error('❌ Erreur récupération courses:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des courses'
        });
    }
});

/**
 * @route GET /api/admin/drivers
 * @desc Liste des conducteurs
 */
router.get('/drivers', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé'
            });
        }

        const { status, limit = 50, offset = 0 } = req.query;

        let query = db.collection('drivers');

        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query
            .orderBy('lastSeen', 'desc')
            .limit(parseInt(limit))
            .offset(parseInt(offset))
            .get();

        const drivers = [];
        snapshot.forEach(doc => {
            drivers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({
            success: true,
            drivers,
            total: drivers.length
        });

    } catch (error) {
        console.error('❌ Erreur récupération conducteurs:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des conducteurs'
        });
    }
});

/**
 * @route POST /api/admin/driver/block
 * @desc Bloquer un conducteur
 */
router.post('/driver/block', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé'
            });
        }

        const { driverId, reason } = req.body;

        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: 'ID conducteur requis'
            });
        }

        // Bloquer dans Firestore
        await db.collection('drivers').doc(driverId).update({
            isActive: false,
            blockedAt: admin.firestore.FieldValue.serverTimestamp(),
            blockReason: reason || 'Bloqué par l\'administrateur',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Bloquer dans Supabase
        await supabase.from('taxi_drivers').update({
            is_active: false,
            blocked_at: new Date().toISOString(),
            block_reason: reason || 'Bloqué par l\'administrateur'
        }).eq('id', driverId);

        // Notifier le conducteur
        await sendNotificationToDriver(driverId, {
            title: 'Compte bloqué',
            body: `Votre compte a été bloqué. Raison: ${reason || 'Non spécifiée'}`,
            data: {
                type: 'account_blocked',
                reason
            }
        });

        res.json({
            success: true,
            message: 'Conducteur bloqué avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur blocage conducteur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du blocage du conducteur'
        });
    }
});

/**
 * @route POST /api/admin/driver/unblock
 * @desc Débloquer un conducteur
 */
router.post('/driver/unblock', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé'
            });
        }

        const { driverId } = req.body;

        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: 'ID conducteur requis'
            });
        }

        // Débloquer dans Firestore
        await db.collection('drivers').doc(driverId).update({
            isActive: true,
            unblockedAt: admin.firestore.FieldValue.serverTimestamp(),
            blockReason: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Débloquer dans Supabase
        await supabase.from('taxi_drivers').update({
            is_active: true,
            unblocked_at: new Date().toISOString(),
            block_reason: null
        }).eq('id', driverId);

        // Notifier le conducteur
        await sendNotificationToDriver(driverId, {
            title: 'Compte débloqué',
            body: 'Votre compte a été débloqué. Vous pouvez maintenant reprendre votre activité.',
            data: {
                type: 'account_unblocked'
            }
        });

        res.json({
            success: true,
            message: 'Conducteur débloqué avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur déblocage conducteur:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du déblocage du conducteur'
        });
    }
});

/**
 * @route POST /api/admin/ride/cancel
 * @desc Annuler une course (admin)
 */
router.post('/ride/cancel', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé'
            });
        }

        const { rideId, reason } = req.body;

        if (!rideId) {
            return res.status(400).json({
                success: false,
                message: 'ID course requis'
            });
        }

        // Récupérer la course
        const rideDoc = await db.collection('rides').doc(rideId).get();

        if (!rideDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Course non trouvée'
            });
        }

        const rideData = rideDoc.data();

        // Annuler dans Firestore
        await db.collection('rides').doc(rideId).update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancellationReason: reason || 'Annulée par l\'administrateur',
            cancelledBy: 'admin',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Annuler dans Supabase
        await supabase.from('taxi_trips').update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason || 'Annulée par l\'administrateur'
        }).eq('id', rideId);

        // Notifier le client
        await sendNotificationToUser(rideData.customerId, {
            title: 'Course annulée',
            body: `Votre course a été annulée. Raison: ${reason || 'Non spécifiée'}`,
            data: {
                rideId,
                type: 'ride_cancelled_admin'
            }
        });

        // Notifier le conducteur si assigné
        if (rideData.driverId) {
            await sendNotificationToDriver(rideData.driverId, {
                title: 'Course annulée',
                body: 'La course a été annulée par l\'administrateur',
                data: {
                    rideId,
                    type: 'ride_cancelled_admin'
                }
            });
        }

        res.json({
            success: true,
            message: 'Course annulée avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur annulation course:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'annulation de la course'
        });
    }
});

/**
 * @route GET /api/admin/analytics
 * @desc Analytics détaillées
 */
router.get('/analytics', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé'
            });
        }

        const { period = '7d' } = req.query;

        // Calculer la période
        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
            case '1d':
                startDate.setDate(endDate.getDate() - 1);
                break;
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
        }

        // Analytics depuis Supabase
        const { data: analytics, error } = await supabase.rpc('get_taxi_analytics', {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
        });

        if (error) throw error;

        res.json({
            success: true,
            analytics: analytics || {}
        });

    } catch (error) {
        console.error('❌ Erreur analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du chargement des analytics'
        });
    }
});

// =====================================================
// 2. FONCTIONS UTILITAIRES
// =====================================================

/**
 * Obtient le nombre de conducteurs actifs
 */
async function getActiveDriversCount() {
    try {
        const snapshot = await db.collection('drivers')
            .where('status', '==', 'online')
            .where('isActive', '==', true)
            .get();

        return snapshot.size;
    } catch (error) {
        console.error('Erreur comptage conducteurs actifs:', error);
        return 0;
    }
}

/**
 * Obtient le nombre de courses actives
 */
async function getActiveRidesCount() {
    try {
        const snapshot = await db.collection('rides')
            .where('status', 'in', ['requested', 'accepted', 'driver_arriving', 'picked_up', 'in_progress'])
            .get();

        return snapshot.size;
    } catch (error) {
        console.error('Erreur comptage courses actives:', error);
        return 0;
    }
}

/**
 * Obtient les revenus du jour
 */
async function getTodayEarnings() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const snapshot = await db.collection('rides')
            .where('status', '==', 'completed')
            .where('completedAt', '>=', today)
            .get();

        let totalEarnings = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            totalEarnings += data.pricing?.platformFee || 0;
        });

        return totalEarnings;
    } catch (error) {
        console.error('Erreur calcul revenus jour:', error);
        return 0;
    }
}

/**
 * Obtient le nombre total d'utilisateurs
 */
async function getTotalUsersCount() {
    try {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        return count || 0;
    } catch (error) {
        console.error('Erreur comptage utilisateurs:', error);
        return 0;
    }
}

/**
 * Obtient les données de revenus
 */
async function getEarningsData() {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('amount, created_at')
            .eq('status', 'completed')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Grouper par jour
        const dailyEarnings = {};
        data?.forEach(transaction => {
            const date = new Date(transaction.created_at).toISOString().split('T')[0];
            dailyEarnings[date] = (dailyEarnings[date] || 0) + transaction.amount;
        });

        return dailyEarnings;
    } catch (error) {
        console.error('Erreur données revenus:', error);
        return {};
    }
}

/**
 * Obtient les top conducteurs
 */
async function getTopDrivers() {
    try {
        const { data, error } = await supabase
            .from('taxi_drivers')
            .select(`
        id,
        total_earnings,
        total_rides,
        rating,
        profiles:user_id (full_name, phone)
      `)
            .order('total_earnings', { ascending: false })
            .limit(10);

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Erreur top conducteurs:', error);
        return [];
    }
}

/**
 * Obtient les courses récentes
 */
async function getRecentRides() {
    try {
        const snapshot = await db.collection('rides')
            .orderBy('requestedAt', 'desc')
            .limit(10)
            .get();

        const rides = [];
        snapshot.forEach(doc => {
            rides.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return rides;
    } catch (error) {
        console.error('Erreur courses récentes:', error);
        return [];
    }
}

/**
 * Envoie une notification à un conducteur
 */
async function sendNotificationToDriver(driverId, notification) {
    try {
        // Récupérer le token FCM du conducteur
        const driverDoc = await db.collection('drivers').doc(driverId).get();

        if (!driverDoc.exists) {
            console.warn('Conducteur non trouvé:', driverId);
            return false;
        }

        const driverData = driverDoc.data();
        const fcmToken = driverData.fcmToken;

        if (!fcmToken) {
            console.warn('Token FCM non trouvé pour conducteur:', driverId);
            return false;
        }

        // Envoyer la notification
        const message = {
            token: fcmToken,
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: notification.data || {},
            android: {
                notification: {
                    icon: 'ic_notification',
                    color: '#2196F3'
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log('📱 Notification conducteur envoyée:', response);
        return true;

    } catch (error) {
        console.error('❌ Erreur notification conducteur:', error);
        return false;
    }
}

/**
 * Envoie une notification à un utilisateur
 */
async function sendNotificationToUser(userId, notification) {
    try {
        // Récupérer le token FCM de l'utilisateur
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            console.warn('Utilisateur non trouvé:', userId);
            return false;
        }

        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;

        if (!fcmToken) {
            console.warn('Token FCM non trouvé pour utilisateur:', userId);
            return false;
        }

        // Envoyer la notification
        const message = {
            token: fcmToken,
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: notification.data || {},
            android: {
                notification: {
                    icon: 'ic_notification',
                    color: '#2196F3'
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log('📱 Notification utilisateur envoyée:', response);
        return true;

    } catch (error) {
        console.error('❌ Erreur notification utilisateur:', error);
        return false;
    }
}

module.exports = router;
