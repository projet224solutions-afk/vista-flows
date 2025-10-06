/**
 * 🛡️ API ESCROW - INITIATION
 * Endpoint pour initier une transaction Escrow
 */

import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { transaction, paymentMethod, paymentData } = req.body;

        if (!transaction || !paymentMethod) {
            return res.status(400).json({ error: 'Données requises manquantes' });
        }

        const transactionId = transaction.id || uuidv4();

        // Créer la transaction Escrow
        const { data: escrowTransaction, error: escrowError } = await supabase
            .from('escrow_transactions')
            .insert({
                id: transactionId,
                invoice_id: transaction.invoiceId,
                client_id: transaction.clientId,
                driver_id: transaction.driverId,
                amount: transaction.amount,
                fee_percent: transaction.feePercent,
                fee_amount: transaction.feeAmount,
                total_amount: transaction.totalAmount,
                status: 'pending',
                start_location: transaction.startLocation,
                end_location: transaction.endLocation,
                start_latitude: transaction.startCoordinates?.latitude,
                start_longitude: transaction.startCoordinates?.longitude,
                end_latitude: transaction.endCoordinates?.latitude,
                end_longitude: transaction.endCoordinates?.longitude,
                payment_method: paymentMethod,
                payment_data: paymentData,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (escrowError) {
            console.error('Erreur création transaction Escrow:', escrowError);
            return res.status(500).json({ error: 'Erreur création transaction Escrow' });
        }

        // Mettre à jour la facture
        const { error: invoiceError } = await supabase
            .from('escrow_invoices')
            .update({
                status: 'paid',
                client_id: transaction.clientId,
                updated_at: new Date().toISOString()
            })
            .eq('id', transaction.invoiceId);

        if (invoiceError) {
            console.error('Erreur mise à jour facture:', invoiceError);
        }

        // Créer une entrée dans le wallet pour bloquer les fonds
        const { error: walletError } = await supabase
            .from('wallet_transactions')
            .insert({
                user_id: transaction.clientId,
                type: 'escrow_hold',
                amount: -transaction.totalAmount, // Débit du wallet client
                currency: 'GNF',
                description: `Paiement sécurisé Escrow - ${transactionId}`,
                reference_id: transactionId,
                status: 'completed',
                created_at: new Date().toISOString()
            });

        if (walletError) {
            console.error('Erreur blocage fonds wallet:', walletError);
        }

        // Créer une entrée pour le compte Escrow
        const { error: escrowWalletError } = await supabase
            .from('wallet_transactions')
            .insert({
                user_id: 'escrow_system',
                type: 'escrow_hold',
                amount: transaction.totalAmount, // Crédit du compte Escrow
                currency: 'GNF',
                description: `Fonds bloqués Escrow - ${transactionId}`,
                reference_id: transactionId,
                status: 'completed',
                created_at: new Date().toISOString()
            });

        if (escrowWalletError) {
            console.error('Erreur compte Escrow:', escrowWalletError);
        }

        // Créer les notifications
        const notifications = [
            {
                user_id: transaction.clientId,
                type: 'escrow_initiated',
                title: 'Paiement sécurisé par 224SECURE',
                message: `Votre paiement de ${transaction.totalAmount} GNF est sécurisé. Le livreur sera payé après confirmation de la livraison.`,
                data: { transactionId },
                created_at: new Date().toISOString()
            },
            {
                user_id: transaction.driverId,
                type: 'escrow_initiated',
                title: 'Paiement reçu - En attente de validation',
                message: `Paiement de ${transaction.amount} GNF bloqué par 224SECURE. En attente de validation client.`,
                data: { transactionId },
                created_at: new Date().toISOString()
            }
        ];

        for (const notification of notifications) {
            const { error: notifError } = await supabase
                .from('notifications')
                .insert(notification);

            if (notifError) {
                console.error('Erreur notification:', notifError);
            }
        }

        console.log(`🛡️ Transaction Escrow initiée: ${transactionId}`);

        return res.status(201).json({
            success: true,
            transaction: {
                id: transactionId,
                invoiceId: transaction.invoiceId,
                clientId: transaction.clientId,
                driverId: transaction.driverId,
                amount: transaction.amount,
                feeAmount: transaction.feeAmount,
                totalAmount: transaction.totalAmount,
                status: 'pending',
                createdAt: Date.now()
            }
        });

    } catch (error) {
        console.error('Erreur API initiation Escrow:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}
