/**
 * 🔐 API ADMIN - TOUS LES LIENS DE PAIEMENT
 * Endpoint pour récupérer tous les liens de paiement (PDG/Admin uniquement)
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
    // Vérifier l'authentification (à implémenter selon votre système)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Récupérer tous les liens de paiement avec les détails
    const { data: paymentLinks, error: linksError } = await supabase
      .from('payment_links')
      .select(`
        *,
        vendeur:profiles!payment_links_vendeur_id_fkey(id, first_name, last_name, business_name, email),
        client:profiles!payment_links_client_id_fkey(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('Erreur récupération liens:', linksError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    // Calculer les statistiques
    const totalLinks = paymentLinks?.length || 0;
    const successfulPayments = paymentLinks?.filter(p => p.status === 'success').length || 0;
    const pendingPayments = paymentLinks?.filter(p => p.status === 'pending').length || 0;
    const failedPayments = paymentLinks?.filter(p => p.status === 'failed').length || 0;
    const expiredPayments = paymentLinks?.filter(p => p.status === 'expired').length || 0;
    
    const totalRevenue = paymentLinks?.filter(p => p.status === 'success')
      .reduce((sum, p) => sum + (p.montant || 0), 0) || 0;
    const totalFees = paymentLinks?.filter(p => p.status === 'success')
      .reduce((sum, p) => sum + (p.frais || 0), 0) || 0;
    const avgPaymentAmount = successfulPayments > 0 ? totalRevenue / successfulPayments : 0;

    const stats = {
      total_links: totalLinks,
      successful_payments: successfulPayments,
      pending_payments: pendingPayments,
      failed_payments: failedPayments,
      expired_payments: expiredPayments,
      total_revenue: totalRevenue,
      total_fees: totalFees,
      avg_payment_amount: avgPaymentAmount
    };

    res.status(200).json({
      success: true,
      payment_links: paymentLinks || [],
      stats
    });

  } catch (error) {
    console.error('Erreur API admin payments:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur interne' 
    });
  }
}