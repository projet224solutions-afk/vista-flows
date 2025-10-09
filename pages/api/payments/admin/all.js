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
    // Récupérer tous les liens de paiement avec les détails des utilisateurs
    const { data: paymentLinks, error } = await supabase
      .from('payment_links')
      .select(`
        *,
        vendeur:user_profiles!payment_links_vendeur_id_fkey(
          first_name,
          last_name,
          business_name,
          avatar_url
        ),
        client:user_profiles!payment_links_client_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération liens paiement:', error);
      return res.status(500).json({ 
        error: 'Erreur lors de la récupération des liens de paiement' 
      });
    }

    // Récupérer les statistiques globales
    const { data: stats } = await supabase
      .from('payment_stats')
      .select('*');

    // Calculer les statistiques globales
    const globalStats = {
      total_links: paymentLinks?.length || 0,
      successful_payments: paymentLinks?.filter(p => p.status === 'success').length || 0,
      pending_payments: paymentLinks?.filter(p => p.status === 'pending').length || 0,
      failed_payments: paymentLinks?.filter(p => p.status === 'failed').length || 0,
      expired_payments: paymentLinks?.filter(p => p.status === 'expired').length || 0,
      total_revenue: paymentLinks?.filter(p => p.status === 'success').reduce((sum, p) => sum + p.total, 0) || 0,
      total_fees: paymentLinks?.filter(p => p.status === 'success').reduce((sum, p) => sum + p.frais, 0) || 0,
      avg_payment_amount: 0
    };

    // Calculer la moyenne
    if (globalStats.successful_payments > 0) {
      globalStats.avg_payment_amount = globalStats.total_revenue / globalStats.successful_payments;
    }

    // Formater les données pour l'affichage
    const formattedLinks = paymentLinks?.map(link => ({
      id: link.id,
      payment_id: link.payment_id,
      vendeur_id: link.vendeur_id,
      client_id: link.client_id,
      produit: link.produit,
      description: link.description,
      montant: link.montant,
      frais: link.frais,
      total: link.total,
      devise: link.devise,
      status: link.status,
      expires_at: link.expires_at,
      created_at: link.created_at,
      paid_at: link.paid_at,
      vendeur: {
        name: link.vendeur?.business_name || 
              `${link.vendeur?.first_name} ${link.vendeur?.last_name}`,
        business_name: link.vendeur?.business_name,
        avatar: link.vendeur?.avatar_url
      },
      client: link.client ? {
        name: `${link.client.first_name} ${link.client.last_name}`,
        email: link.client.email
      } : null
    })) || [];

    console.log(`📊 PDG Dashboard: ${globalStats.total_links} liens, ${globalStats.successful_payments} réussis`);

    return res.status(200).json({
      success: true,
      payment_links: formattedLinks,
      stats: globalStats,
      pagination: {
        total: globalStats.total_links,
        page: 1,
        limit: 1000
      }
    });

  } catch (error) {
    console.error('Erreur API admin payments:', error);
    return res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}
