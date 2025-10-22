/**
 * ROUTES TAXI MOTO TEMPS RÉEL
 * API complète avec Firestore et Supabase synchronisés
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
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
}

const db = admin.firestore();

// =====================================================
// 1. GESTION DES COURSES
// =====================================================

/**
 * @route POST /api/ride/request
 * @desc Crée une nouvelle demande de course
 */
router.post('/request', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            pickup,
            dropoff,
            vehicleType = 'moto_rapide',
            paymentMethod = 'wallet_224'
        } = req.body;

        if (!pickup || !dropoff) {
            return res.status(400).json({
                success: false,
                message: 'Données de départ et destination requises'
            });
        }

        // Calculer le prix
        const distance = calculateDistance(
            pickup.latitude, pickup.longitude,
            dropoff.latitude, dropoff.longitude
        );

        const pricing = calculatePricing(distance, vehicleType);

        // Créer la course dans Firestore
        const rideData = {
            customerId: userId,
            status: 'requested',
            pickup: {
                address: pickup.address,
                location: {
                    latitude: pickup.latitude,
                    longitude: pickup.longitude
                }
            },
            dropoff: {
                address: dropoff.address,
                location: {
                    latitude: dropoff.latitude,
                    longitude: dropoff.longitude
                }
            },
            pricing,
            distance,
            estimatedDuration: Math.round(distance * 2), // Estimation basique
            paymentMethod,
            paymentStatus: 'pending',
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const rideRef = await db.collection('rides').add(rideData);
        const rideId = rideRef.id;

        // Notifier les conducteurs à proximité
        await notifyNearbyDrivers(pickup.latitude, pickup.longitude, rideId);

        // Créer l'entrée dans Supabase pour le suivi
        await supabase.from('taxi_trips').insert({
            id: rideId,
            customer_id: userId,
            pickup_lat: pickup.latitude,
            pickup_lng: pickup.longitude,
            dropoff_lat: dropoff.latitude,
            dropoff_lng: dropoff.longitude,
            pickup_address: pickup.address,
            dropoff_address: dropoff.address,
            price_total: pricing.totalPrice,
            status: 'requested',
            requested_at: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            rideId,
            message: 'Demande de course créée avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur création course:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de la course'
        });
    }
});

/**
 * @route POST /api/ride/accept
 * @desc Accepte une course (conducteur)
 */
router.post('/accept', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { rideId } = req.body;

        if (!rideId) {
            return res.status(400).json({
                success: false,
                message: 'ID de course requis'
            });
        }

        // Vérifier que le conducteur est en ligne
        const driverDoc = await db.collection('drivers').where('userId', '==', userId).limit(1).get();

        if (driverDoc.empty) {
            return res.status(404).json({
                success: false,
                message: 'Conducteur non trouvé'
            });
        }

        const driverData = driverDoc.docs[0].data();
        const driverId = driverDoc.docs[0].id;

        if (driverData.status !== 'online') {
            return res.status(400).json({
                success: false,
                message: 'Conducteur non disponible'
            });
        }

        // Mettre à jour la course dans Firestore
        const rideRef = db.collection('rides').doc(rideId);
        await rideRef.update({
            driverId,
            status: 'accepted',
            acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Mettre à jour le statut du conducteur
        await db.collection('drivers').doc(driverId).update({
            status: 'busy',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Mettre à jour dans Supabase
        await supabase.from('taxi_trips').update({
            driver_id: driverId,
            status: 'accepted',
            accepted_at: new Date().toISOString()
        }).eq('id', rideId);

        // Notifier le client
        await sendNotificationToUser(rideData.customerId, {
            title: 'Course acceptée',
            body: `Votre course a été acceptée par ${driverData.name}`,
            data: {
                rideId,
                driverId,
                type: 'ride_accepted'
            }
        });

        res.json({
            success: true,
            message: 'Course acceptée avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur acceptation course:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'acceptation de la course'
        });
    }
});

/**
 * @route POST /api/ride/complete
 * @desc Termine une course et traite le paiement
 */
router.post('/complete', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { rideId, actualDistance, actualDuration, customerRating } = req.body;

        if (!rideId) {
            return res.status(400).json({
                success: false,
                message: 'ID de course requis'
            });
        }

        // Récupérer les données de la course
        const rideDoc = await db.collection('rides').doc(rideId).get();

        if (!rideDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Course non trouvée'
            });
        }

        const rideData = rideDoc.data();

        // Recalculer le prix avec la distance réelle
        const finalPricing = calculatePricing(actualDistance || rideData.distance, rideData.vehicle?.type);

        // Mettre à jour la course
        await db.collection('rides').doc(rideId).update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            actualDuration: actualDuration || rideData.estimatedDuration,
            pricing: finalPricing,
            customerRating: customerRating || null,
            paymentStatus: 'completed'
        });

        // Traiter le paiement
        const paymentResult = await processPayment({
            rideId,
            customerId: rideData.customerId,
            driverId: rideData.driverId,
            amount: finalPricing.totalPrice,
            driverShare: finalPricing.driverShare,
            platformFee: finalPricing.platformFee,
            paymentMethod: rideData.paymentMethod
        });

        if (!paymentResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Erreur lors du traitement du paiement'
            });
        }

        // Mettre à jour les statistiques du conducteur
        await updateDriverStats(rideData.driverId, finalPricing.driverShare);

        // Mettre à jour dans Supabase
        await supabase.from('taxi_trips').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            distance_km: actualDistance || rideData.distance,
            duration_min: actualDuration || rideData.estimatedDuration,
            price_total: finalPricing.totalPrice,
            driver_share: finalPricing.driverShare,
            platform_fee: finalPricing.platformFee
        }).eq('id', rideId);

        // Créer la transaction dans Supabase
        await supabase.from('transactions').insert({
            ride_id: rideId,
            customer_id: rideData.customerId,
            driver_id: rideData.driverId,
            amount: finalPricing.totalPrice,
            driver_share: finalPricing.driverShare,
            platform_fee: finalPricing.platformFee,
            payment_method: rideData.paymentMethod,
            status: 'completed',
            created_at: new Date().toISOString()
        });

        // Notifier le client
        await sendNotificationToUser(rideData.customerId, {
            title: 'Course terminée',
            body: `Votre course s'est bien déroulée. Montant: ${finalPricing.totalPrice} GNF`,
            data: {
                rideId,
                type: 'ride_completed'
            }
        });

        res.json({
            success: true,
            message: 'Course terminée avec succès',
            payment: paymentResult
        });

    } catch (error) {
        console.error('❌ Erreur finalisation course:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la finalisation de la course'
        });
    }
});

/**
 * @route GET /api/ride/history
 * @desc Récupère l'historique des courses
 */
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        // Récupérer depuis Supabase pour les performances
        const { data: rides, error } = await supabase
            .from('taxi_trips')
            .select(`
        *,
        profiles:customer_id (full_name, phone),
        drivers:driver_id (name, rating)
      `)
            .or(`customer_id.eq.${userId},driver_id.eq.${userId}`)
            .order('requested_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            rides: rides || []
        });

    } catch (error) {
        console.error('❌ Erreur récupération historique:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'historique'
        });
    }
});

// =====================================================
// 2. GESTION DES CONDUCTEURS
// =====================================================

/**
 * @route POST /api/driver/status
 * @desc Met à jour le statut du conducteur
 */
router.post('/status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { isOnline, location } = req.body;

        // Trouver le conducteur
        const driverQuery = await db.collection('drivers').where('userId', '==', userId).limit(1).get();

        if (driverQuery.empty) {
            return res.status(404).json({
                success: false,
                message: 'Conducteur non trouvé'
            });
        }

        const driverDoc = driverQuery.docs[0];
        const driverId = driverDoc.id;

        // Mettre à jour le statut
        const updates = {
            status: isOnline ? 'online' : 'offline',
            lastSeen: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (location) {
            updates.location = {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                heading: location.heading,
                speed: location.speed
            };
        }

        await db.collection('drivers').doc(driverId).update(updates);

        res.json({
            success: true,
            message: `Conducteur ${isOnline ? 'en ligne' : 'hors ligne'}`
        });

    } catch (error) {
        console.error('❌ Erreur mise à jour statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du statut'
        });
    }
});

/**
 * @route POST /api/driver/location
 * @desc Met à jour la position du conducteur
 */
router.post('/location', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { latitude, longitude, accuracy, heading, speed } = req.body;

        // Trouver le conducteur
        const driverQuery = await db.collection('drivers').where('userId', '==', userId).limit(1).get();

        if (driverQuery.empty) {
            return res.status(404).json({
                success: false,
                message: 'Conducteur non trouvé'
            });
        }

        const driverDoc = driverQuery.docs[0];
        const driverId = driverDoc.id;

        // Mettre à jour la position
        await db.collection('drivers').doc(driverId).update({
            location: {
                latitude,
                longitude,
                accuracy,
                heading,
                speed
            },
            lastSeen: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Position mise à jour'
        });

    } catch (error) {
        console.error('❌ Erreur mise à jour position:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour de la position'
        });
    }
});

// =====================================================
// 3. NOTIFICATIONS
// =====================================================

/**
 * @route POST /api/notifications/send
 * @desc Envoie une notification à un utilisateur
 */
router.post('/send', authMiddleware, async (req, res) => {
    try {
        const { userId, notification } = req.body;

        const result = await sendNotificationToUser(userId, notification);

        res.json({
            success: result,
            message: result ? 'Notification envoyée' : 'Erreur envoi notification'
        });

    } catch (error) {
        console.error('❌ Erreur envoi notification:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi de la notification'
        });
    }
});

// =====================================================
// 4. FONCTIONS UTILITAIRES
// =====================================================

/**
 * Calcule la distance entre deux points
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Calcule le prix d'une course
 */
function calculatePricing(distance, vehicleType) {
    const baseRates = {
        moto_economique: { base: 800, perKm: 150, perMin: 30 },
        moto_rapide: { base: 1000, perKm: 200, perMin: 40 },
        moto_premium: { base: 1500, perKm: 300, perMin: 60 }
    };

    const rates = baseRates[vehicleType] || baseRates.moto_rapide;
    const basePrice = rates.base;
    const distancePrice = distance * rates.perKm;
    const timePrice = Math.round(distance * 2) * rates.perMin; // Estimation temps
    const totalPrice = basePrice + distancePrice + timePrice;

    const driverShare = Math.round(totalPrice * 0.8);
    const platformFee = totalPrice - driverShare;

    return {
        basePrice,
        distancePrice,
        timePrice,
        totalPrice,
        driverShare,
        platformFee,
        surgeMultiplier: 1.0
    };
}

/**
 * Notifie les conducteurs à proximité
 */
async function notifyNearbyDrivers(latitude, longitude, rideId) {
    try {
        // Trouver les conducteurs dans un rayon de 5km
        const driversQuery = await db.collection('drivers')
            .where('status', '==', 'online')
            .where('isActive', '==', true)
            .get();

        const nearbyDrivers = [];

        driversQuery.forEach(doc => {
            const driver = doc.data();
            const distance = calculateDistance(
                latitude, longitude,
                driver.location.latitude, driver.location.longitude
            );

            if (distance <= 5) {
                nearbyDrivers.push({
                    id: doc.id,
                    ...driver,
                    distance
                });
            }
        });

        // Envoyer les notifications
        for (const driver of nearbyDrivers) {
            await sendNotificationToUser(driver.userId, {
                title: 'Nouvelle demande de course',
                body: `Course disponible à ${driver.distance.toFixed(1)}km`,
                data: {
                    rideId,
                    type: 'ride_request'
                }
            });
        }

        console.log(`📢 ${nearbyDrivers.length} conducteurs notifiés`);
    } catch (error) {
        console.error('❌ Erreur notification conducteurs:', error);
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
            console.warn('Token FCM non trouvé pour:', userId);
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
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default'
                    }
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log('📱 Notification envoyée:', response);
        return true;

    } catch (error) {
        console.error('❌ Erreur envoi notification:', error);
        return false;
    }
}

/**
 * Traite un paiement
 */
async function processPayment({ rideId, customerId, driverId, amount, driverShare, platformFee, paymentMethod }) {
    try {
        switch (paymentMethod) {
            case 'wallet_224':
                return await processWalletPayment(customerId, amount, driverId, driverShare);

            case 'mobile_money':
                return await processMobileMoneyPayment(customerId, amount);

            case 'card':
                return await processCardPayment(customerId, amount);

            case 'cash':
                return { success: true, method: 'cash' };

            default:
                return { success: false, error: 'Méthode de paiement non supportée' };
        }
    } catch (error) {
        console.error('❌ Erreur traitement paiement:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Traite un paiement par wallet
 */
async function processWalletPayment(customerId, amount, driverId, driverShare) {
    try {
        // Débiter le client
        const { error: debitError } = await supabase.rpc('debit_wallet', {
            user_id: customerId,
            amount: amount,
            description: `Paiement course ${rideId}`
        });

        if (debitError) throw debitError;

        // Créditer le conducteur
        const { error: creditError } = await supabase.rpc('credit_wallet', {
            user_id: driverId,
            amount: driverShare,
            description: `Gains course ${rideId}`
        });

        if (creditError) throw creditError;

        return { success: true, method: 'wallet_224' };
    } catch (error) {
        console.error('❌ Erreur paiement wallet:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Traite un paiement mobile money
 */
async function processMobileMoneyPayment(customerId, amount) {
    // Simulation - intégrer avec l'API Orange Money/MTN Money
    return { success: true, method: 'mobile_money' };
}

/**
 * Traite un paiement par carte
 */
async function processCardPayment(customerId, amount) {
    // Simulation - intégrer avec Stripe/Flutterwave
    return { success: true, method: 'card' };
}

/**
 * Met à jour les statistiques du conducteur
 */
async function updateDriverStats(driverId, earnings) {
    try {
        const driverRef = db.collection('drivers').doc(driverId);
        await driverRef.update({
            totalEarnings: admin.firestore.FieldValue.increment(earnings),
            totalRides: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('❌ Erreur mise à jour stats conducteur:', error);
    }
}

module.exports = router;
