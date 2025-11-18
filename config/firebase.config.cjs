// CommonJS exports for backend services
const firebaseConfig = {
  web: {
    apiKey: process.env.FIREBASE_WEB_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
  }
};

const fcmConfig = {
  serverKey: process.env.FCM_SERVER_KEY || '',
  vapidKey: process.env.FCM_VAPID_KEY || '',
  topics: {
    allUsers: 'all_users',
    clients: 'clients',
    vendeurs: 'vendeurs',
    transitaires: 'transitaires',
    pdg: 'pdg_admin',
    syndicats: 'syndicats'
  }
};

const gcsConfig = {
  projectId: process.env.GC_PROJECT_ID || '',
  keyFilename: process.env.GC_KEY_FILE || './config/gcs-service-account.json',
  bucketName: process.env.GC_BUCKET || ''
};

const userRoles = {
  CLIENT: 'client',
  VENDEUR: 'vendeur',
  TRANSITAIRE: 'transitaire',
  PDG: 'pdg',
  ADMIN: 'admin',
  SYNDICAT_PRESIDENT: 'syndicat_president'
};

const commissionConfig = {
  transferCommission: 0.015,
  withdrawalFee: 1000,
  defaultCurrency: 'GNF',
  minTransfer: 1000,
  maxTransfer: 10000000,
  minWithdrawal: 5000,
  maxWithdrawal: 5000000
};

const paymentMethods = {
  WALLET_TRANSFER: 'wallet_transfer',
  PAYPAL: 'paypal',
  STRIPE: 'stripe',
  MOBILE_MONEY: 'mobile_money',
  BANK_CARD: 'bank_card'
};

const notificationTypes = {
  REGISTRATION_SUCCESS: 'registration_success',
  TRANSACTION_SUCCESS: 'transaction_success',
  TRANSACTION_FAILED: 'transaction_failed',
  MESSAGE_RECEIVED: 'message_received',
  WITHDRAWAL_APPROVED: 'withdrawal_approved',
  WITHDRAWAL_REJECTED: 'withdrawal_rejected',
  DELIVERY_UPDATE: 'delivery_update',
  SYNDICATE_INVITATION: 'syndicate_invitation',
  ORDER_STATUS_CHANGE: 'order_status_change'
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


