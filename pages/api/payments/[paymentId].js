import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { paymentId } = req.query;

  if (!paymentId) {
    return res.status(400).json({ error: 'Payment ID requis' });
  }

  try {
    if (req.method === 'GET') {
      // Récupérer les détails du lien de paiement
      const { data: paymentLink, error } = await supabase
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
        .eq('payment_id', paymentId)
        .single();

      if (error || !paymentLink) {
        return res.status(404).json({ 
          error: 'Lien de paiement non trouvé' 
        });
      }

      // Vérifier si le lien a expiré
      const now = new Date();
      const expiresAt = new Date(paymentLink.expires_at);
      
      if (now > expiresAt && paymentLink.status === 'pending') {
        // Marquer comme expiré
        await supabase
          .from('payment_links')
          .update({ status: 'expired' })
          .eq('id', paymentLink.id);
        
        paymentLink.status = 'expired';
      }

      // Retourner les informations (sans données sensibles)
      return res.status(200).json({
        success: true,
        payment: {
          id: paymentLink.id,
          payment_id: paymentLink.payment_id,
          produit: paymentLink.produit,
          description: paymentLink.description,
          montant: paymentLink.montant,
          frais: paymentLink.frais,
          total: paymentLink.total,
          devise: paymentLink.devise,
          status: paymentLink.status,
          expires_at: paymentLink.expires_at,
          created_at: paymentLink.created_at,
          vendeur: {
            name: paymentLink.vendeur?.business_name || 
                  `${paymentLink.vendeur?.first_name} ${paymentLink.vendeur?.last_name}`,
            avatar: paymentLink.vendeur?.avatar_url
          },
          client: paymentLink.client ? {
            name: `${paymentLink.client.first_name} ${paymentLink.client.last_name}`,
            email: paymentLink.client.email
          } : null
        }
      });

    } else if (req.method === 'PUT') {
      // Mettre à jour le statut du paiement
      const { status, payment_method, transaction_id } = req.body;

      if (!status || !['success', 'failed', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
          error: 'Statut invalide' 
        });
      }

      const { data: paymentLink, error: fetchError } = await supabase
        .from('payment_links')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (fetchError || !paymentLink) {
        return res.status(404).json({ 
          error: 'Lien de paiement non trouvé' 
        });
      }

      if (paymentLink.status !== 'pending') {
        return res.status(400).json({ 
          error: 'Ce lien de paiement a déjà été traité' 
        });
      }

      // Mettre à jour le statut
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payment_links')
        .update({
          status,
          payment_method: payment_method || null,
          transaction_id: transaction_id || null,
          paid_at: status === 'success' ? new Date().toISOString() : null
        })
        .eq('payment_id', paymentId)
        .select()
        .single();

      if (updateError) {
        console.error('Erreur mise à jour paiement:', updateError);
        return res.status(500).json({ 
          error: 'Erreur lors de la mise à jour du paiement' 
        });
      }

      // Si le paiement est réussi, créer une transaction
      if (status === 'success') {
        await supabase
          .from('payment_transactions')
          .insert({
            payment_link_id: paymentLink.id,
            vendeur_id: paymentLink.vendeur_id,
            client_id: paymentLink.client_id,
            montant: paymentLink.montant,
            frais: paymentLink.frais,
            total: paymentLink.total,
            devise: paymentLink.devise,
            payment_method: payment_method || 'unknown',
            transaction_id: transaction_id,
            status: 'success',
            processed_at: new Date().toISOString()
          });

        // Créer des notifications
        await supabase
          .from('payment_notifications')
          .insert([
            {
              payment_link_id: paymentLink.id,
              user_id: paymentLink.vendeur_id,
              type: 'payment_success',
              title: 'Paiement reçu !',
              message: `Vous avez reçu un paiement de ${paymentLink.total} ${paymentLink.devise} pour "${paymentLink.produit}"`
            },
            {
              payment_link_id: paymentLink.id,
              user_id: paymentLink.client_id,
              type: 'payment_success',
              title: 'Paiement confirmé',
              message: `Votre paiement de ${paymentLink.total} ${paymentLink.devise} pour "${paymentLink.produit}" a été confirmé`
            }
          ]);
      }

      return res.status(200).json({
        success: true,
        payment: updatedPayment
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Erreur API payment details:', error);
    return res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}
