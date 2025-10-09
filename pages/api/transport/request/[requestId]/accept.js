/**
 * 🚚 API TRANSPORT - ACCEPTER UNE DEMANDE
 * Endpoint pour accepter une demande de transport
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/transport/request/[requestId]/accept
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Méthode non autorisée'
    });
  }

  try {
    const { requestId } = req.query;
    const { transportUserId, acceptedAt } = req.body;

    if (!requestId || !transportUserId) {
      return res.status(400).json({
        success: false,
        error: 'ID de demande et transporteur requis'
      });
    }

    // Vérifier que la demande existe et est en attente
    const { data: request, error: requestError } = await supabase
      .from('transport_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        error: 'Demande non trouvée ou déjà traitée'
      });
    }

    // Vérifier que le transporteur est disponible
    const { data: transportUser, error: userError } = await supabase
      .from('transport_users')
      .select('*')
      .eq('id', transportUserId)
      .eq('is_online', true)
      .eq('is_available', true)
      .single();

    if (userError || !transportUser) {
      return res.status(400).json({
        success: false,
        error: 'Transporteur non disponible'
      });
    }

    // Mettre à jour la demande
    const { data: updatedRequest, error: updateError } = await supabase
      .from('transport_requests')
      .update({
        status: 'accepted',
        transport_user_id: transportUserId,
        accepted_at: acceptedAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour demande:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'acceptation de la demande'
      });
    }

    // Mettre à jour le statut du transporteur
    await supabase
      .from('transport_users')
      .update({
        status: 'on_trip',
        is_available: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', transportUserId);

    // Créer la transaction Escrow
    const escrowTransaction = {
      id: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoice_id: requestId,
      client_id: request.client_id,
      driver_id: transportUserId,
      amount: request.price,
      fee_percent: 1.00,
      fee_amount: request.fees,
      total_amount: request.total_price,
      status: 'pending',
      start_location: request.pickup_address,
      end_location: request.delivery_address,
      created_at: new Date().toISOString()
    };

    const { data: escrowData, error: escrowError } = await supabase
      .from('escrow_transactions')
      .insert(escrowTransaction)
      .select()
      .single();

    if (escrowError) {
      console.error('Erreur création Escrow:', escrowError);
      // Ne pas faire échouer la demande, juste logger l'erreur
    }

    // Notifier le client
    await supabase
      .from('notifications')
      .insert({
        user_id: request.client_id,
        type: 'transport_accepted',
        title: 'Demande acceptée',
        message: `${transportUser.name} a accepté votre demande de transport`,
        data: {
          request_id: requestId,
          transport_user_id: transportUserId,
          status: 'accepted'
        }
      });

    // Notifier le transporteur
    await supabase
      .from('notifications')
      .insert({
        user_id: transportUserId,
        type: 'transport_request_accepted',
        title: 'Demande acceptée',
        message: `Vous avez accepté la demande de ${request.client_name}`,
        data: {
          request_id: requestId,
          client_id: request.client_id,
          status: 'accepted'
        }
      });

    console.log(`🚚 Demande ${requestId} acceptée par ${transportUserId}`);

    return res.status(200).json({
      success: true,
      data: {
        request: updatedRequest,
        transportUser: {
          id: transportUser.id,
          name: transportUser.name,
          phone: transportUser.phone,
          vehicleType: transportUser.vehicle_type,
          vehicleInfo: transportUser.vehicle_info
        },
        escrowTransaction: escrowData
      },
      message: 'Demande acceptée avec succès'
    });

  } catch (error) {
    console.error('Erreur API transport accept:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'acceptation de la demande'
    });
  }
}
