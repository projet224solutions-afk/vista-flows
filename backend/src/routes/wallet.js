/**
 * 💰 ROUTES WALLET - 224SOLUTIONS
 * Routes complètes pour la gestion des wallets et transactions
 */

const express = require('express');
const router = express.Router();
const walletService = require('../../../services/wallet.service.cjs');
const firebaseService = require('../../../services/firebase.service');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

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
 * 🏦 GESTION DES WALLETS
 */

/**
 * GET /api/wallet - Obtenir les informations du wallet
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await walletService.getWallet(userId);
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: 'Wallet non trouvé',
                error: result.error
            });
        }

        res.json({
            success: true,
            wallet: result.wallet
        });
    } catch (error) {
        console.error('❌ Erreur récupération wallet:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * POST /api/wallet/create - Créer un wallet (pour nouveaux utilisateurs)
 */
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { initialBalance = 1000 } = req.body;
        
        const result = await walletService.createWallet(userId, initialBalance);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Erreur création wallet',
                error: result.error
            });
        }

        res.status(201).json({
            success: true,
            message: 'Wallet créé avec succès',
            walletId: result.walletId,
            initialBalance: result.initialBalance
        });
    } catch (error) {
        console.error('❌ Erreur création wallet:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * GET /api/wallet/stats - Obtenir les statistiques du wallet
 */
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await walletService.getWalletStats(userId);
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: 'Statistiques non disponibles',
                error: result.error
            });
        }

        res.json({
            success: true,
            stats: result.stats
        });
    } catch (error) {
        console.error('❌ Erreur stats wallet:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * GET /api/wallet/balance - Obtenir le solde du wallet (endpoint demandé)
 */
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await walletService.getWallet(userId);

        if (!result.success || !result.wallet) {
            return res.status(404).json({
                success: false,
                message: 'Wallet non trouvé'
            });
        }

        res.json({
            success: true,
            balance: result.wallet.balance,
            currency: result.wallet.currency,
            wallet: result.wallet
        });
    } catch (error) {
        console.error('❌ Erreur solde wallet:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * 💸 TRANSACTIONS
 */

/**
 * POST /api/wallet/transfer - Effectuer un transfert
 */
router.post('/transfer', [
    authMiddleware,
    body('receiverId').isUUID().withMessage('ID destinataire invalide'),
    body('amount').isFloat({ min: 1000, max: 10000000 }).withMessage('Montant invalide (1000-10000000 GNF)'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description trop longue')
], handleValidationErrors, async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId, amount, description } = req.body;
        
        // Vérifier que l'utilisateur ne s'envoie pas de l'argent à lui-même
        if (senderId === receiverId) {
            return res.status(400).json({
                success: false,
                message: 'Impossible de s\'envoyer de l\'argent à soi-même'
            });
        }

        const result = await walletService.transferMoney(senderId, receiverId, amount, description);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Erreur lors du transfert',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Transfert effectué avec succès',
            transaction: {
                id: result.transactionId,
                amount: result.amount,
                commission: result.commission,
                totalAmount: result.totalAmount
            }
        });
    } catch (error) {
        console.error('❌ Erreur transfert:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * POST /api/wallet/withdraw - Effectuer un retrait
 */
router.post('/withdraw', [
    authMiddleware,
    body('amount').isFloat({ min: 5000, max: 5000000 }).withMessage('Montant invalide (5000-5000000 GNF)'),
    body('paymentMethod').isIn(['paypal', 'stripe', 'mobile_money', 'bank_card']).withMessage('Méthode de paiement invalide'),
    body('paymentDetails').isObject().withMessage('Détails de paiement requis')
], handleValidationErrors, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, paymentMethod, paymentDetails } = req.body;
        
        // Valider les détails de paiement selon la méthode
        const validationResult = validatePaymentDetails(paymentMethod, paymentDetails);
        if (!validationResult.valid) {
            return res.status(400).json({
                success: false,
                message: 'Détails de paiement invalides',
                error: validationResult.error
            });
        }

        const result = await walletService.withdrawMoney(userId, amount, paymentMethod, paymentDetails);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Erreur lors du retrait',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Retrait traité avec succès',
            transaction: {
                id: result.transactionId,
                amount: result.amount,
                fees: result.fees,
                netAmount: result.netAmount
            }
        });
    } catch (error) {
        console.error('❌ Erreur retrait:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * POST /api/wallet/deposit - Effectuer un dépôt
 */
router.post('/deposit', [
    authMiddleware,
    body('amount').isFloat({ min: 1000 }).withMessage('Montant minimum 1000 GNF'),
    body('paymentMethod').isIn(['paypal', 'stripe', 'mobile_money', 'bank_card']).withMessage('Méthode de paiement invalide'),
    body('reference').isString().withMessage('Référence de paiement requise')
], handleValidationErrors, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, paymentMethod, reference } = req.body;
        
        const result = await walletService.depositMoney(userId, amount, paymentMethod, reference);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: 'Erreur lors du dépôt',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Dépôt effectué avec succès',
            transaction: {
                id: result.transactionId,
                amount: result.amount
            }
        });
    } catch (error) {
        console.error('❌ Erreur dépôt:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * 📊 HISTORIQUE ET RAPPORTS
 */

/**
 * GET /api/wallet/transactions - Obtenir l'historique des transactions
 */
router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        
        const result = await walletService.getTransactionHistory(userId, parseInt(limit), parseInt(offset));
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: 'Historique non disponible',
                error: result.error
            });
        }

        res.json({
            success: true,
            transactions: result.transactions,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.transactions.length
            }
        });
    } catch (error) {
        console.error('❌ Erreur historique transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
});

/**
 * GET /api/wallet/transaction/:id - Obtenir les détails d'une transaction
 */
router.get('/transaction/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const result = await walletService.getTransactionById(id);
        
        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: 'Transaction non trouvée',
                error: result.error
            });
        }

        // Vérifier que l'utilisateur a accès à cette transaction
        const transaction = result.transaction;
        if (transaction.sender_id !== userId && transaction.receiver_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à cette transaction'
            });
        }

        res.json({
            success: true,
            transaction: result.transaction
        });
    } catch (error) {
        console.error('❌ Erreur détails transaction:', error);
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
 * Valide les détails de paiement selon la méthode
 */
function validatePaymentDetails(paymentMethod, paymentDetails) {
    switch (paymentMethod) {
        case 'paypal':
            if (!paymentDetails.email || !paymentDetails.email.includes('@')) {
                return { valid: false, error: 'Email PayPal invalide' };
            }
            break;
            
        case 'mobile_money':
            if (!paymentDetails.phone || paymentDetails.phone.length < 8) {
                return { valid: false, error: 'Numéro de téléphone invalide' };
            }
            if (!paymentDetails.provider) {
                return { valid: false, error: 'Fournisseur Mobile Money requis' };
            }
            break;
            
        case 'bank_card':
            if (!paymentDetails.cardNumber || paymentDetails.cardNumber.length < 16) {
                return { valid: false, error: 'Numéro de carte invalide' };
            }
            if (!paymentDetails.expiryDate || !paymentDetails.cvv) {
                return { valid: false, error: 'Date d\'expiration et CVV requis' };
            }
            break;
            
        case 'stripe':
            if (!paymentDetails.accountId) {
                return { valid: false, error: 'ID compte Stripe requis' };
            }
            break;
            
        default:
            return { valid: false, error: 'Méthode de paiement non supportée' };
    }
    
    return { valid: true };
}

module.exports = router;
