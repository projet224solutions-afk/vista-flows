/**
 * 🚚 API LIVRAISON - DEMANDE
 * Endpoint pour créer et gérer les demandes de livraison
 */

import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Créer une nouvelle demande de livraison
    try {
      const {
        clientId,
        clientName,
        clientPhone,
        clientPhoto,
        pickupAddress,
        deliveryAddress,
        pickupPosition,
        deliveryPosition,
        distance,
        estimatedTime,
        price,
        fees,
        totalPrice,
        notes
      } = req.body;

      // Validation des données
      if (!clientId || !pickupAddress || !deliveryAddress || !pickupPosition || !deliveryPosition) {
        return res.status(400).json({ error: 'Données requises manquantes' });
      }

      const deliveryId = uuidv4();

      // Créer la demande de livraison
      const { data: delivery, error: deliveryError } = await supabase
        .from('delivery_requests')
        .insert({
          id: deliveryId,
          client_id: clientId,
          client_name: clientName || 'Client',
          client_phone: clientPhone || '+224 XXX XX XX XX',
          client_photo: clientPhoto,
          pickup_address: pickupAddress,
          delivery_address: deliveryAddress,
          pickup_latitude: pickupPosition.latitude,
          pickup_longitude: pickupPosition.longitude,
          delivery_latitude: deliveryPosition.latitude,
          delivery_longitude: deliveryPosition.longitude,
          distance: distance || 0,
          estimated_time: estimatedTime || 0,
          price: price || 0,
          fees: fees || 0,
          total_price: totalPrice || 0,
          status: 'pending',
          notes: notes,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (deliveryError) {
        console.error('Erreur création demande livraison:', deliveryError);
        return res.status(500).json({ error: 'Erreur création demande livraison' });
      }

      // Créer une notification pour les livreurs
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          type: 'delivery_request',
          title: 'Nouvelle demande de livraison',
          message: `Livraison de ${pickupAddress} vers ${deliveryAddress}`,
          data: {
            delivery_id: deliveryId,
            pickup_address: pickupAddress,
            delivery_address: deliveryAddress,
            total_price: totalPrice
          },
          target_users: 'delivery_users',
          created_at: new Date().toISOString()
        });

      if (notificationError) {
        console.error('Erreur création notification:', notificationError);
      }

      console.log(`🚚 Demande de livraison créée: ${deliveryId}`);

      return res.status(201).json({
        success: true,
        delivery: {
          id: deliveryId,
          clientId,
          pickupAddress,
          deliveryAddress,
          distance,
          estimatedTime,
          price,
          fees,
          totalPrice,
          status: 'pending',
          createdAt: Date.now()
        }
      });

    } catch (error) {
      console.error('Erreur API demande livraison:', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  if (req.method === 'GET') {
    // Récupérer les demandes de livraison
    try {
      const { userId, status, limit = 50, offset = 0 } = req.query;

      let query = supabase
        .from('delivery_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Filtrer par utilisateur
      if (userId) {
        query = query.or(`client_id.eq.${userId},delivery_user_id.eq.${userId}`);
      }

      // Filtrer par statut
      if (status) {
        query = query.eq('status', status);
      }

      const { data: deliveries, error } = await query;

      if (error) {
        console.error('Erreur récupération demandes:', error);
        return res.status(500).json({ error: 'Erreur récupération demandes' });
      }

      return res.status(200).json({
        success: true,
        deliveries: deliveries || []
      });

    } catch (error) {
      console.error('Erreur API récupération demandes:', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
