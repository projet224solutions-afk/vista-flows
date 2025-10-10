/**
 * 🔥 SERVICE FIREBASE - 224SOLUTIONS (CommonJS)
 */

const admin = require('firebase-admin');
const { firebaseConfig, fcmConfig, notificationTypes } = require('../config/firebase.config');

class FirebaseService {
    constructor() {
        this.initializeFirebase();
    }

    initializeFirebase() {
        try {
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
        return await this.sendNotificationToUser(fcmToken, { title, body, type: notificationTypes.TRANSACTION_SUCCESS }, { transaction_id: transactionData.id, amount: amount.toString(), currency });
    }

    async sendNotificationToUser(fcmToken, notification, data = {}) {
        try {
            const message = {
                token: fcmToken,
                notification: { title: notification.title, body: notification.body },
                data: { type: notification.type, ...data }
            };
            const response = await admin.messaging().send(message);
            return { success: true, messageId: response };
        } catch (error) {
            console.error('❌ Erreur envoi notification:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new FirebaseService();


