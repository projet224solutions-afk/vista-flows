const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Service role client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// GET /api/payments/:paymentId → retourne les détails d'un lien de paiement
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) return res.status(400).json({ error: 'paymentId requis' });

    // Cherche sur id ou payment_id
    const { data, error } = await supabase
      .from('payment_links')
      .select('*')
      .or(`id.eq.${paymentId},payment_id.eq.${paymentId}`)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Lien de paiement non trouvé' });

    // Adaptation du payload attendu par le frontend
    const payment = {
      id: data.id,
      payment_id: data.payment_id || data.id,
      produit: data.product_name || data.title || 'Produit',
      description: data.description || null,
      montant: Number(data.amount || 0),
      frais: Number(data.fee || Math.round((Number(data.amount || 0) * 0.01) * 100) / 100), // 1% par défaut
      total: Number(data.amount || 0) + Number(data.fee || Math.round((Number(data.amount || 0) * 0.01) * 100) / 100),
      devise: data.currency || 'GNF',
      status: data.status || 'pending',
      expires_at: data.expires_at || null,
      created_at: data.created_at,
      vendeur: { name: data.vendor_name || 'Vendeur 224SOLUTIONS', avatar: data.vendor_avatar || null },
      client: data.client_name || data.client_email ? { name: data.client_name || '', email: data.client_email || '' } : null,
    };

    return res.json({ payment });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
});

// POST /api/payments/confirm → confirme un paiement
router.post('/confirm', async (req, res) => {
  try {
    const { payment_id, payment_method, client_id, client_info, transaction_id } = req.body || {};
    if (!payment_id || !payment_method) {
      return res.status(400).json({ error: 'payment_id et payment_method requis' });
    }

    // Met à jour le lien de paiement et marque comme success
    const updates = {
      status: 'success',
      paid_at: new Date().toISOString(),
      payment_method,
      client_id: client_id || null,
      client_name: client_info?.name || null,
      client_email: client_info?.email || null,
      client_phone: client_info?.phone || null,
      transaction_id: transaction_id || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('payment_links')
      .update(updates)
      .or(`id.eq.${payment_id},payment_id.eq.${payment_id}`)
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Lien de paiement non trouvé' });

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
});

module.exports = router;


