import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';
import { MultiCurrencyTransferService } from '@/services/MultiCurrencyTransferService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Vérifier la méthode HTTP
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Méthode non autorisée',
            errorCode: 'METHOD_NOT_ALLOWED'
        });
    }

    try {
        // Vérifier l'authentification
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Token d\'authentification requis',
                errorCode: 'AUTH_REQUIRED'
            });
        }

        const token = authHeader.substring(7);

        // Vérifier le token avec Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Token d\'authentification invalide',
                errorCode: 'INVALID_TOKEN'
            });
        }

        // Récupérer les données de la requête
        const {
            receiverEmail,
            amount,
            currencySent,
            currencyReceived,
            description,
            reference
        } = req.body;

        // Validation des données
        if (!receiverEmail || !amount || !currencySent) {
            return res.status(400).json({
                success: false,
                error: 'Données manquantes: receiverEmail, amount, currencySent sont requis',
                errorCode: 'MISSING_DATA'
            });
        }

        // Validation de l'email
        if (!MultiCurrencyTransferService.isValidEmail(receiverEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Format d\'email invalide',
                errorCode: 'INVALID_EMAIL'
            });
        }

        // Validation du montant
        if (!MultiCurrencyTransferService.isValidAmount(amount)) {
            return res.status(400).json({
                success: false,
                error: 'Montant invalide (doit être entre 0.01 et 999,999,999.99)',
                errorCode: 'INVALID_AMOUNT'
            });
        }

        // Vérifier que l'utilisateur ne s'envoie pas à lui-même
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', user.id)
            .single();

        if (userProfile?.email === receiverEmail) {
            return res.status(400).json({
                success: false,
                error: 'Impossible de s\'envoyer de l\'argent à soi-même',
                errorCode: 'SELF_TRANSFER'
            });
        }

        // Vérifier que le destinataire existe
        const canReceive = await MultiCurrencyTransferService.canReceiveTransfer(receiverEmail);
        if (!canReceive) {
            return res.status(400).json({
                success: false,
                error: 'Destinataire non trouvé ou inactif',
                errorCode: 'RECEIVER_NOT_FOUND'
            });
        }

        // Récupérer le rôle de l'utilisateur pour calculer les frais
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return res.status(400).json({
                success: false,
                error: 'Profil utilisateur non trouvé',
                errorCode: 'PROFILE_NOT_FOUND'
            });
        }

        // Vérifier les limites de transfert
        const limits = await MultiCurrencyTransferService.checkLimits(
            user.id,
            amount,
            currencySent
        );

        if (!limits.canTransfer) {
            return res.status(400).json({
                success: false,
                error: 'Limite de transfert dépassée',
                errorCode: 'LIMIT_EXCEEDED',
                details: {
                    dailyRemaining: limits.dailyRemaining,
                    monthlyRemaining: limits.monthlyRemaining,
                    requestedAmount: limits.requestedAmount
                }
            });
        }

        // Calculer les frais
        const fees = await MultiCurrencyTransferService.calculateFees(
            profile.role,
            amount,
            currencySent
        );

        // Vérifier que l'utilisateur a assez de fonds (montant + frais)
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .eq('currency', currencySent)
            .single();

        if (!wallet) {
            return res.status(400).json({
                success: false,
                error: 'Wallet non trouvé',
                errorCode: 'WALLET_NOT_FOUND'
            });
        }

        if (wallet.balance < fees.totalAmount) {
            return res.status(400).json({
                success: false,
                error: 'Solde insuffisant',
                errorCode: 'INSUFFICIENT_BALANCE',
                details: {
                    currentBalance: wallet.balance,
                    requiredAmount: fees.totalAmount,
                    amount: amount,
                    fees: fees.feeAmount
                }
            });
        }

        // Effectuer le transfert
        const transferResult = await MultiCurrencyTransferService.performTransfer({
            receiverEmail,
            amount,
            currencySent,
            currencyReceived: currencyReceived || currencySent,
            description,
            reference
        });

        if (!transferResult.success) {
            return res.status(400).json({
                success: false,
                error: transferResult.error,
                errorCode: transferResult.errorCode
            });
        }

        // Log de sécurité
        console.log(`Transfer initiated: ${user.id} -> ${receiverEmail}, Amount: ${amount} ${currencySent}`);

        // Retourner le résultat
        return res.status(200).json({
            success: true,
            transactionId: transferResult.transactionId,
            amountSent: transferResult.amountSent,
            currencySent: transferResult.currencySent,
            amountReceived: transferResult.amountReceived,
            currencyReceived: transferResult.currencyReceived,
            exchangeRate: transferResult.exchangeRate,
            feeAmount: transferResult.feeAmount,
            feePercentage: transferResult.feePercentage,
            feeFixed: transferResult.feeFixed,
            newBalance: transferResult.newBalance,
            message: 'Transfert effectué avec succès'
        });

    } catch (error) {
        console.error('Error in transfer API:', error);

        return res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur',
            errorCode: 'INTERNAL_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// Configuration pour désactiver le body parsing par défaut
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};
