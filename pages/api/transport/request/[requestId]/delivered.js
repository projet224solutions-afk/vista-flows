/**
 * 🚚 API TRANSPORT - MARQUER COMME LIVRÉ
 * Endpoint pour marquer une livraison comme terminée avec preuve
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/transport/request/[requestId]/delivered
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Méthode non autorisée'
    });
  }

  try {
    const { requestId } = req.query;
    const { proofOfDelivery, transportUserId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'ID de demande requis'
      });
    }

    // Vérifier que la demande existe et est récupérée
    const { data: request, error: requestError } = await supabase
      .from('transport_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'picked_up')
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Demande non trouvée ou statut incorrect'
      });
    }

    // Vérifier que le transporteur est autorisé
    if (transportUserId && request.transport_user_id !== transportUserId) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé à modifier cette demande'
      });
    }

    // Mettre à jour la demande avec la preuve de livraison
    const { data: updatedRequest, error: updateError } = await supabase
      .from('transport_requests')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        proof_of_delivery: proofOfDelivery,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour demande:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour de la demande'
      });
    }

    // Enregistrer la position de livraison
    if (proofOfDelivery?.coordinates) {
      await supabase
        .from('transport_positions')
        .insert({
          request_id: requestId,
          position_type: 'delivered',
          coordinates: proofOfDelivery.coordinates,
          timestamp: new Date().toISOString()
        });
    }

    // Libérer le paiement Escrow
    const { data: escrowTransaction, error: escrowError } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('invoice_id', requestId)
      .eq('status', 'pending')
      .single();

    if (escrowTransaction && !escrowError) {
      // Mettre à jour la transaction Escrow
      await supabase
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          delivery_proof_photo: proofOfDelivery?.photo,
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowTransaction.id);

      // Créer la transaction de paiement
      await supabase
        .from('transactions')
        .insert({
          id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          from_user_id: request.client_id,
          to_user_id: request.transport_user_id,
          amount: request.price,
          currency: 'GNF',
          type: 'transport_payment',
          status: 'completed',
          description: `Paiement transport: ${request.pickup_address} → ${request.delivery_address}`,
          metadata: {
            request_id: requestId,
            escrow_transaction_id: escrowTransaction.id,
            proof_of_delivery: proofOfDelivery
          },
          created_at: new Date().toISOString()
        });

      // Mettre à jour les wallets (simulation)
      if (request.transport_user_id) {
        // Créditer le transporteur
        await supabase
          .from('user_wallets')
          .upsert({
            user_id: request.transport_user_id,
            balance: request.price,
            currency: 'GNF',
            updated_at: new Date().toISOString()
          });

        // Débiter le client
        await supabase
          .from('user_wallets')
          .upsert({
            user_id: request.client_id,
            balance: -request.total_price,
            currency: 'GNF',
            updated_at: new Date().toISOString()
          });
      }
    }

    // Mettre à jour le statut du transporteur
    if (request.transport_user_id) {
      await supabase
        .from('transport_users')
        .update({
          status: 'online',
          is_available: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.transport_user_id);

      // Mettre à jour les statistiques du transporteur
      await supabase
        .from('transport_users')
        .update({
          total_trips: supabase.raw('total_trips + 1'),
          earnings: supabase.raw(`earnings + ${request.price}`),
          updated_at: new Date().toISOString()
        })
        .eq('id', request.transport_user_id);
    }

    // Notifier le client
    await supabase
      .from('notifications')
      .insert({
        user_id: request.client_id,
        type: 'transport_delivered',
        title: 'Livraison confirmée',
        message: 'Votre transport a été livré avec succès',
        data: {
          request_id: requestId,
          status: 'delivered',
          amount: request.price
        }
      });

    // Notifier le transporteur
    if (request.transport_user_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: request.transport_user_id,
          type: 'transport_payment_released',
          title: 'Paiement libéré',
          message: `Vous avez reçu ${request.price} GNF pour cette course`,
          data: {
            request_id: requestId,
            amount: request.price,
            status: 'delivered'
          }
        });
    }

    console.log(`🚚 Livraison confirmée pour la demande ${requestId}`);

    return res.status(200).json({
      success: true,
      data: {
        request: updatedRequest,
        payment: {
          amount: request.price,
          status: 'released',
          transaction_id: escrowTransaction?.id
        }
      },
      message: 'Livraison confirmée et paiement libéré'
    });

  } catch (error) {
    console.error('Erreur API transport delivered:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la confirmation de livraison'
    });
  }
}
