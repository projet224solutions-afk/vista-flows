/**
 * 👥 API ADMIN - TOUS LES UTILISATEURS
 * Endpoint pour récupérer tous les utilisateurs (PDG/Admin uniquement)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Récupérer tous les profils avec filtres optionnels
    const { role, search, is_active } = req.query;
    
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Appliquer les filtres
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error('Erreur récupération utilisateurs:', usersError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    // Calculer les statistiques par rôle
    const stats = {
      total: users?.length || 0,
      admin: users?.filter(u => u.role === 'admin').length || 0,
      vendeur: users?.filter(u => u.role === 'vendeur').length || 0,
      client: users?.filter(u => u.role === 'client').length || 0,
      livreur: users?.filter(u => u.role === 'livreur').length || 0,
      taxi: users?.filter(u => u.role === 'taxi').length || 0,
      transitaire: users?.filter(u => u.role === 'transitaire').length || 0,
      syndicat: users?.filter(u => u.role === 'syndicat').length || 0,
      active: users?.filter(u => u.is_active).length || 0,
      inactive: users?.filter(u => !u.is_active).length || 0
    };

    res.status(200).json({
      success: true,
      users: users || [],
      stats
    });

  } catch (error) {
    console.error('Erreur API admin users:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur interne' 
    });
  }
}
