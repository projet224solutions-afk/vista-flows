import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { vendorId } = req.query;

  if (!vendorId) {
    return res.status(400).json({ error: 'Vendor ID requis' });
  }

  try {
    if (req.method === 'GET') {
      // Récupérer tous les liens de paiement d'un vendeur
      const { 
        page = 1, 
        limit = 20, 
        status, 
        search,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Construire la requête
      let query = supabase
        .from('payment_links')
        .select(`
          *,
          client:user_profiles!payment_links_client_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('vendeur_id', vendorId);

      // Filtres
      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`produit.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Tri
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // Pagination
      query = query.range(offset, offset + parseInt(limit) - 1);

      const { data: paymentLinks, error, count } = await query;

      if (error) {
        console.error('Erreur récupération liens paiement:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des liens de paiement' 
        });
      }

      // Récupérer les statistiques
      const { data: stats } = await supabase
        .from('payment_stats')
        .select('*')
        .eq('vendeur_id', vendorId)
        .single();

      return res.status(200).json({
        success: true,
        payment_links: paymentLinks || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / parseInt(limit))
        },
        stats: stats || {
          total_links: 0,
          successful_payments: 0,
          pending_payments: 0,
          failed_payments: 0,
          expired_payments: 0,
          total_revenue: 0,
          total_fees: 0,
          avg_payment_amount: 0
        }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Erreur API vendor payments:', error);
    return res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}
