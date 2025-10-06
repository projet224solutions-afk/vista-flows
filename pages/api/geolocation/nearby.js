/**
 * 📍 API GÉOLOCALISATION - UTILISATEURS PROCHES
 * Endpoint pour trouver les utilisateurs proches
 */

import { supabase } from '@/integrations/supabase/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { center, radius = 5000, userType } = req.body;

    if (!center || !center.latitude || !center.longitude) {
      return res.status(400).json({ error: 'Centre de recherche requis' });
    }

    // Récupérer tous les utilisateurs actifs avec leurs positions
    let query = supabase
      .from('user_positions')
      .select(`
        *,
        users!inner(
          id,
          name,
          email,
          phone,
          photo,
          user_type,
          is_online,
          last_seen
        )
      `)
      .gte('timestamp', Date.now() - 5 * 60 * 1000) // Positions des 5 dernières minutes
      .order('timestamp', { ascending: false });

    // Filtrer par type d'utilisateur si spécifié
    if (userType) {
      query = query.eq('users.user_type', userType);
    }

    const { data: positions, error } = await query;

    if (error) {
      console.error('Erreur récupération positions:', error);
      return res.status(500).json({ error: 'Erreur récupération positions' });
    }

    // Calculer les distances et filtrer
    const nearbyUsers = positions
      .map(position => {
        const distance = calculateDistance(
          center,
          {
            latitude: position.latitude,
            longitude: position.longitude
          }
        );

        return {
          id: position.user_id,
          name: position.users.name,
          email: position.users.email,
          phone: position.users.phone,
          photo: position.users.photo,
          userType: position.users.user_type,
          isOnline: position.users.is_online,
          lastSeen: position.users.last_seen,
          position: {
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
            timestamp: position.timestamp
          },
          distance: Math.round(distance),
          isActive: position.timestamp > Date.now() - 2 * 60 * 1000 // Actif dans les 2 dernières minutes
        };
      })
      .filter(user => user.distance <= radius && user.isActive)
      .sort((a, b) => a.distance - b.distance);

    console.log(`📍 ${nearbyUsers.length} utilisateurs trouvés dans un rayon de ${radius}m`);

    return res.status(200).json({
      success: true,
      users: nearbyUsers,
      center,
      radius,
      total: nearbyUsers.length
    });

  } catch (error) {
    console.error('Erreur API utilisateurs proches:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}

/**
 * Calculer la distance entre deux points en mètres
 */
function calculateDistance(pos1, pos2) {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (pos1.latitude * Math.PI) / 180;
  const φ2 = (pos2.latitude * Math.PI) / 180;
  const Δφ = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
  const Δλ = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance en mètres
}
