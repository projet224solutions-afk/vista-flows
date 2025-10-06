/**
 * 🚚 API TRANSPORT - GESTION DES DEMANDES
 * Endpoints pour la gestion des demandes de transport
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/transport/request - Créer une demande de transport
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const {
        id,
        clientId,
        clientName,
        clientPhone,
        pickupAddress,
        deliveryAddress,
        pickupPosition,
        deliveryPosition,
        distance,
        estimatedTime,
        price,
        fees,
        totalPrice,
        notes,
        status = 'pending'
      } = req.body;

      // Validation des données
      if (!id || !clientId || !pickupAddress || !deliveryAddress) {
        return res.status(400).json({
          success: false,
          error: 'Données manquantes pour la création de la demande'
        });
      }

      // Insérer la demande en base
      const { data, error } = await supabase
        .from('transport_requests')
        .insert({
          id,
          client_id: clientId,
          client_name: clientName,
          client_phone: clientPhone,
          pickup_address: pickupAddress,
          delivery_address: deliveryAddress,
          pickup_position: pickupPosition,
          delivery_position: deliveryPosition,
          distance,
          estimated_time: estimatedTime,
          price,
          fees,
          total_price: totalPrice,
          notes,
          status,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur création demande transport:', error);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la création de la demande'
        });
      }

      // Envoyer notification au client
      await supabase
        .from('notifications')
        .insert({
          user_id: clientId,
          type: 'transport_request_created',
          title: 'Demande de transport créée',
          message: `Votre demande de transport de ${pickupAddress} vers ${deliveryAddress} a été créée`,
          data: {
            request_id: id,
            status: 'pending'
          }
        });

      console.log(`🚚 Demande de transport créée: ${id}`);
      
      return res.status(201).json({
        success: true,
        data: data,
        message: 'Demande de transport créée avec succès'
      });

    } catch (error) {
      console.error('Erreur API transport request:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création de la demande'
      });
    }
  }

  // GET /api/transport/request - Récupérer les demandes
  if (req.method === 'GET') {
    try {
      const { userId, status, limit = 50 } = req.query;

      let query = supabase
        .from('transport_requests')
        .select(`
          *,
          transport_user:transport_users(*)
        `)
        .order('created_at', { ascending: false });

      // Filtrer par utilisateur si spécifié
      if (userId) {
        query = query.or(`client_id.eq.${userId},transport_user_id.eq.${userId}`);
      }

      // Filtrer par statut si spécifié
      if (status) {
        query = query.eq('status', status);
      }

      // Limiter les résultats
      query = query.limit(parseInt(limit));

      const { data, error } = await query;

      if (error) {
        console.error('Erreur récupération demandes:', error);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération des demandes'
        });
      }

      return res.status(200).json({
        success: true,
        data: data || [],
        count: data?.length || 0
      });

    } catch (error) {
      console.error('Erreur API transport request GET:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des demandes'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Méthode non autorisée'
  });
}
