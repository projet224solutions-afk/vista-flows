/**
 * 🚚 API TRANSPORT - MARQUER COMME RÉCUPÉRÉ
 * Endpoint pour marquer un client comme récupéré
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/transport/request/[requestId]/picked-up
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Méthode non autorisée'
    });
  }

  try {
    const { requestId } = req.query;
    const { transportUserId, pickedUpAt, coordinates } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'ID de demande requis'
      });
    }

    // Vérifier que la demande existe et est acceptée
    const { data: request, error: requestError } = await supabase
      .from('transport_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'accepted')
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

    // Mettre à jour la demande
    const { data: updatedRequest, error: updateError } = await supabase
      .from('transport_requests')
      .update({
        status: 'picked_up',
        picked_up_at: pickedUpAt || new Date().toISOString(),
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

    // Enregistrer la position de récupération
    if (coordinates) {
      await supabase
        .from('transport_positions')
        .insert({
          request_id: requestId,
          position_type: 'picked_up',
          coordinates: coordinates,
          timestamp: new Date().toISOString()
        });
    }

    // Notifier le client
    await supabase
      .from('notifications')
      .insert({
        user_id: request.client_id,
        type: 'transport_picked_up',
        title: 'Client récupéré',
        message: 'Vous avez été récupéré par le transporteur',
        data: {
          request_id: requestId,
          status: 'picked_up'
        }
      });

    // Notifier le transporteur
    if (request.transport_user_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: request.transport_user_id,
          type: 'transport_picked_up_confirmed',
          title: 'Client récupéré',
          message: 'Le client a été marqué comme récupéré',
          data: {
            request_id: requestId,
            status: 'picked_up'
          }
        });
    }

    console.log(`🚚 Client récupéré pour la demande ${requestId}`);

    return res.status(200).json({
      success: true,
      data: updatedRequest,
      message: 'Client marqué comme récupéré'
    });

  } catch (error) {
    console.error('Erreur API transport picked-up:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la mise à jour'
    });
  }
}
