/**
 * 🔥 SERVICE FIREBASE - 224SOLUTIONS
 * Service complet Firebase : Authentication + Cloud Messaging + Storage
 */

const admin = require('firebase-admin');
const { firebaseConfig, fcmConfig, notificationTypes } = require('../config/firebase.config');

class FirebaseService {
    constructor() {
        this.initializeFirebase();
    }

    /**
     * Initialise Firebase Admin SDK
     */
    initializeFirebase() {
        try {
            // Initialiser avec la clé de service
            const serviceAccount = require('../config/firebase-service-account.json');
            
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: firebaseConfig.web.projectId,
                storageBucket: firebaseConfig.web.storageBucket
            });

            console.log('✅ Firebase Admin SDK initialisé');
        } catch (error) {
            console.error('❌ Erreur initialisation Firebase:', error);
        }
    }

    /**
     * 🔐 AUTHENTIFICATION FIREBASE
     */

    /**
     * Vérifie un token Firebase
     */
    async verifyToken(idToken) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            return {
                success: true,
                uid: decodedToken.uid,
                email: decodedToken.email,
                phone: decodedToken.phone_number,
                emailVerified: decodedToken.email_verified
            };
        } catch (error) {
            console.error('❌ Erreur vérification token:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crée un utilisateur Firebase
     */
    async createUser(userData) {
        try {
            const userRecord = await admin.auth().createUser({
                email: userData.email,
                password: userData.password,
                phoneNumber: userData.phone,
                displayName: `${userData.first_name} ${userData.last_name}`,
                emailVerified: false
            });

            return {
                success: true,
                uid: userRecord.uid,
                user: userRecord
            };
        } catch (error) {
            console.error('❌ Erreur création utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Met à jour un utilisateur Firebase
     */
    async updateUser(uid, updateData) {
        try {
            const userRecord = await admin.auth().updateUser(uid, updateData);
            return { success: true, user: userRecord };
        } catch (error) {
            console.error('❌ Erreur mise à jour utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Supprime un utilisateur Firebase
     */
    async deleteUser(uid) {
        try {
            await admin.auth().deleteUser(uid);
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur suppression utilisateur:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 📱 FIREBASE CLOUD MESSAGING (FCM)
     */

    /**
     * Envoie une notification à un utilisateur spécifique
     */
    async sendNotificationToUser(fcmToken, notification, data = {}) {
        try {
            const message = {
                token: fcmToken,
                notification: {
                    title: notification.title,
                    body: notification.body,
                    imageUrl: notification.imageUrl || null
                },
                data: {
                    type: notification.type,
                    ...data
                },
                android: {
                    notification: {
                        icon: 'ic_notification',
                        color: '#3B82F6',
                        sound: 'default',
                        priority: 'high'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                }
            };

            const response = await admin.messaging().send(message);
            console.log('✅ Notification envoyée:', response);
            
            return {
                success: true,
                messageId: response
            };
        } catch (error) {
            console.error('❌ Erreur envoi notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Envoie une notification à un topic (groupe d'utilisateurs)
     */
    async sendNotificationToTopic(topic, notification, data = {}) {
        try {
            const message = {
                topic: topic,
                notification: {
                    title: notification.title,
                    body: notification.body
                },
                data: {
                    type: notification.type,
                    ...data
                }
            };

            const response = await admin.messaging().send(message);
            console.log('✅ Notification topic envoyée:', response);
            
            return {
                success: true,
                messageId: response
            };
        } catch (error) {
            console.error('❌ Erreur envoi notification topic:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Envoie des notifications en lot
     */
    async sendBatchNotifications(messages) {
        try {
            const response = await admin.messaging().sendAll(messages);
            console.log('✅ Notifications batch envoyées:', response.successCount, 'succès,', response.failureCount, 'échecs');
            
            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
                responses: response.responses
            };
        } catch (error) {
            console.error('❌ Erreur envoi notifications batch:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Abonne un utilisateur à un topic
     */
    async subscribeToTopic(fcmTokens, topic) {
        try {
            const response = await admin.messaging().subscribeToTopic(fcmTokens, topic);
            console.log('✅ Abonnement topic réussi:', response);
            return { success: true, response };
        } catch (error) {
            console.error('❌ Erreur abonnement topic:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 📧 NOTIFICATIONS PRÉDÉFINIES
     */

    /**
     * Notification d'inscription réussie
     */
    async sendRegistrationSuccessNotification(fcmToken, userName) {
        return await this.sendNotificationToUser(fcmToken, {
            title: '🎉 Bienvenue sur 224Solutions !',
            body: `Bonjour ${userName}, votre compte a été créé avec succès. Votre wallet est maintenant actif !`,
            type: notificationTypes.REGISTRATION_SUCCESS
        }, {
            action: 'open_wallet',
            welcome_bonus: '1000'
        });
    }

    /**
     * Notification de transaction réussie
     */
    async sendTransactionSuccessNotification(fcmToken, transactionData) {
        const { amount, currency, type, recipientName } = transactionData;
        
        let title, body;
        if (type === 'transfer') {
            title = '✅ Transfert réussi';
            body = `Vous avez envoyé ${amount} ${currency} à ${recipientName}`;
        } else if (type === 'withdrawal') {
            title = '💰 Retrait traité';
            body = `Votre retrait de ${amount} ${currency} a été traité`;
        } else {
            title = '✅ Transaction réussie';
            body = `Transaction de ${amount} ${currency} effectuée`;
        }

        return await this.sendNotificationToUser(fcmToken, {
            title,
            body,
            type: notificationTypes.TRANSACTION_SUCCESS
        }, {
            transaction_id: transactionData.id,
            amount: amount.toString(),
            currency
        });
    }

    /**
     * Notification de transaction échouée
     */
    async sendTransactionFailedNotification(fcmToken, transactionData) {
        return await this.sendNotificationToUser(fcmToken, {
            title: '❌ Transaction échouée',
            body: `Votre transaction de ${transactionData.amount} ${transactionData.currency} n'a pas pu être traitée`,
            type: notificationTypes.TRANSACTION_FAILED
        }, {
            transaction_id: transactionData.id,
            reason: transactionData.failureReason || 'Erreur inconnue'
        });
    }

    /**
     * Notification de nouveau message
     */
    async sendNewMessageNotification(fcmToken, messageData) {
        return await this.sendNotificationToUser(fcmToken, {
            title: `💬 Nouveau message de ${messageData.senderName}`,
            body: messageData.preview || 'Vous avez reçu un nouveau message',
            type: notificationTypes.MESSAGE_RECEIVED
        }, {
            conversation_id: messageData.conversationId,
            sender_id: messageData.senderId,
            message_id: messageData.messageId
        });
    }

    /**
     * Notification de retrait approuvé
     */
    async sendWithdrawalApprovedNotification(fcmToken, withdrawalData) {
        return await this.sendNotificationToUser(fcmToken, {
            title: '✅ Retrait approuvé',
            body: `Votre retrait de ${withdrawalData.amount} ${withdrawalData.currency} a été approuvé et sera traité sous peu`,
            type: notificationTypes.WITHDRAWAL_APPROVED
        }, {
            withdrawal_id: withdrawalData.id,
            amount: withdrawalData.amount.toString(),
            method: withdrawalData.method
        });
    }

    /**
     * Notification de retrait rejeté
     */
    async sendWithdrawalRejectedNotification(fcmToken, withdrawalData) {
        return await this.sendNotificationToUser(fcmToken, {
            title: '❌ Retrait rejeté',
            body: `Votre retrait de ${withdrawalData.amount} ${withdrawalData.currency} a été rejeté. ${withdrawalData.reason}`,
            type: notificationTypes.WITHDRAWAL_REJECTED
        }, {
            withdrawal_id: withdrawalData.id,
            reason: withdrawalData.reason
        });
    }

    /**
     * Notification de mise à jour de livraison
     */
    async sendDeliveryUpdateNotification(fcmToken, deliveryData) {
        return await this.sendNotificationToUser(fcmToken, {
            title: '📦 Mise à jour livraison',
            body: `Votre commande ${deliveryData.orderNumber} : ${deliveryData.status}`,
            type: notificationTypes.DELIVERY_UPDATE
        }, {
            order_id: deliveryData.orderId,
            order_number: deliveryData.orderNumber,
            status: deliveryData.status,
            tracking_url: deliveryData.trackingUrl
        });
    }

    /**
     * Notification d'invitation bureau syndicat
     */
    async sendSyndicateInvitationNotification(fcmToken, syndicateData) {
        return await this.sendNotificationToUser(fcmToken, {
            title: '🏛️ Invitation Bureau Syndical',
            body: `Vous avez été invité à rejoindre le bureau ${syndicateData.bureauCode}`,
            type: notificationTypes.SYNDICATE_INVITATION
        }, {
            bureau_id: syndicateData.bureauId,
            bureau_code: syndicateData.bureauCode,
            invitation_link: syndicateData.invitationLink
        });
    }

    /**
     * 📊 ANALYTICS ET MONITORING
     */

    /**
     * Enregistre une notification dans la base de données
     */
    async logNotification(userId, notification, fcmMessageId = null) {
        try {
            // Cette fonction sera appelée depuis le backend pour enregistrer
            // les notifications dans Supabase
            return {
                user_id: userId,
                title: notification.title,
                body: notification.body,
                type: notification.type,
                fcm_message_id: fcmMessageId,
                is_sent: true,
                sent_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Erreur log notification:', error);
            return null;
        }
    }
}

// Export singleton
const firebaseService = new FirebaseService();
module.exports = firebaseService;
