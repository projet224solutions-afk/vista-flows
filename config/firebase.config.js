/**
 * 🔥 CONFIGURATION FIREBASE - 224SOLUTIONS
 * Configuration complète Firebase pour authentification et notifications
 */

// Configuration Firebase (remplacez par vos vraies clés)
const firebaseConfig = {
  // Configuration Web
  web: {
    apiKey: "AIzaSyC_your_web_api_key_here",
    authDomain: "solutions224-project.firebaseapp.com",
    projectId: "solutions224-project",
    storageBucket: "solutions224-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012345",
    measurementId: "G-ABCDEFGHIJ"
  },

  // Configuration Android
  android: {
    apiKey: "AIzaSyC_your_android_api_key_here",
    authDomain: "solutions224-project.firebaseapp.com",
    projectId: "solutions224-project",
    storageBucket: "solutions224-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:android:abcdef123456789012345"
  },

  // Configuration iOS
  ios: {
    apiKey: "AIzaSyC_your_ios_api_key_here",
    authDomain: "solutions224-project.firebaseapp.com",
    projectId: "solutions224-project",
    storageBucket: "solutions224-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:ios:abcdef123456789012345"
  }
};

// Configuration FCM (Firebase Cloud Messaging)
const fcmConfig = {
  // Clé serveur pour l'envoi de notifications depuis le backend
  serverKey: "AAAA_your_server_key_here:APA91bF...",
  
  // VAPID Key pour les notifications web
  vapidKey: "BF_your_vapid_key_here...",
  
  // Topics pour les notifications groupées
  topics: {
    allUsers: "all_users",
    clients: "clients",
    vendeurs: "vendeurs",
    transitaires: "transitaires",
    pdg: "pdg_admin",
    syndicats: "syndicats"
  }
};

// Configuration Google Cloud Storage
const gcsConfig = {
  projectId: "solutions224-project",
  keyFilename: "./config/gcs-service-account.json", // Clé de service
  bucketName: "solutions224-storage",
  
  // Dossiers par type de fichier
  folders: {
    documents: "documents/",
    images: "images/",
    videos: "videos/",
    receipts: "receipts/",
    avatars: "avatars/",
    invoices: "invoices/"
  }
};

// Configuration des rôles utilisateur
const userRoles = {
  CLIENT: "client",
  VENDEUR: "vendeur", 
  TRANSITAIRE: "transitaire",
  PDG: "pdg",
  ADMIN: "admin",
  SYNDICAT_PRESIDENT: "syndicat_president"
};

// Configuration des commissions et frais
const commissionConfig = {
  // Commission sur les transferts internes (1.5%)
  transferCommission: 0.015,
  
  // Frais fixes de retrait (1000 GNF)
  withdrawalFee: 1000,
  
  // Devise par défaut
  defaultCurrency: "GNF",
  
  // Montants minimum et maximum
  minTransfer: 1000,
  maxTransfer: 10000000,
  minWithdrawal: 5000,
  maxWithdrawal: 5000000
};

// Configuration des méthodes de paiement
const paymentMethods = {
  WALLET_TRANSFER: "wallet_transfer",
  PAYPAL: "paypal",
  STRIPE: "stripe",
  MOBILE_MONEY: "mobile_money",
  BANK_CARD: "bank_card"
};

// Configuration des notifications
const notificationTypes = {
  REGISTRATION_SUCCESS: "registration_success",
  TRANSACTION_SUCCESS: "transaction_success",
  TRANSACTION_FAILED: "transaction_failed",
  MESSAGE_RECEIVED: "message_received",
  WITHDRAWAL_APPROVED: "withdrawal_approved",
  WITHDRAWAL_REJECTED: "withdrawal_rejected",
  DELIVERY_UPDATE: "delivery_update",
  SYNDICATE_INVITATION: "syndicate_invitation",
  ORDER_STATUS_CHANGE: "order_status_change"
};

module.exports = {
  firebaseConfig,
  fcmConfig,
  gcsConfig,
  userRoles,
  commissionConfig,
  paymentMethods,
  notificationTypes
};

// Export pour ES6 modules
export {
  firebaseConfig,
  fcmConfig,
  gcsConfig,
  userRoles,
  commissionConfig,
  paymentMethods,
  notificationTypes
};
