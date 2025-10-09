import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      payment_id, 
      payment_method, 
      transaction_id,
      client_id 
    } = req.body;

    // Validation des données
    if (!payment_id || !payment_method) {
      return res.status(400).json({ 
        error: 'Champs requis manquants: payment_id, payment_method' 
      });
    }

    // Récupérer le lien de paiement
    const { data: paymentLink, error: fetchError } = await supabase
      .from('payment_links')
      .select('*')
      .eq('payment_id', payment_id)
      .single();

    if (fetchError || !paymentLink) {
      return res.status(404).json({ 
        error: 'Lien de paiement non trouvé' 
      });
    }

    // Vérifier le statut
    if (paymentLink.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Ce lien de paiement a déjà été traité' 
      });
    }

    // Vérifier l'expiration
    const now = new Date();
    const expiresAt = new Date(paymentLink.expires_at);
    
    if (now > expiresAt) {
      await supabase
        .from('payment_links')
        .update({ status: 'expired' })
        .eq('id', paymentLink.id);
      
      return res.status(400).json({ 
        error: 'Ce lien de paiement a expiré' 
      });
    }

    // Simuler la vérification du paiement (à remplacer par votre API de paiement)
    const paymentVerified = await verifyPayment({
      payment_method,
      amount: paymentLink.total,
      currency: paymentLink.devise,
      transaction_id
    });

    if (!paymentVerified.success) {
      // Marquer comme échec
      await supabase
        .from('payment_links')
        .update({ 
          status: 'failed',
          payment_method,
          transaction_id
        })
        .eq('id', paymentLink.id);

      return res.status(400).json({ 
        error: 'Paiement échoué',
        details: paymentVerified.error
      });
    }

    // Paiement réussi - mettre à jour le statut
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payment_links')
      .update({
        status: 'success',
        payment_method,
        transaction_id,
        paid_at: new Date().toISOString()
      })
      .eq('id', paymentLink.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour paiement:', updateError);
      return res.status(500).json({ 
        error: 'Erreur lors de la confirmation du paiement' 
      });
    }

    // Créer la transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        payment_link_id: paymentLink.id,
        vendeur_id: paymentLink.vendeur_id,
        client_id: client_id || paymentLink.client_id,
        montant: paymentLink.montant,
        frais: paymentLink.frais,
        total: paymentLink.total,
        devise: paymentLink.devise,
        payment_method,
        transaction_id,
        status: 'success',
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Erreur création transaction:', transactionError);
    }

    // Mettre à jour les wallets (simulation)
    await updateWallets({
      vendeur_id: paymentLink.vendeur_id,
      client_id: client_id || paymentLink.client_id,
      amount: paymentLink.montant,
      fees: paymentLink.frais,
      currency: paymentLink.devise
    });

    // Créer les notifications automatiques
    const { NotificationService } = await import('../../../src/services/NotificationService');
    
    // Notification pour le vendeur
    await NotificationService.sendCompleteNotification({
      type: 'payment_success',
      title: 'Paiement reçu !',
      message: `Vous avez reçu un paiement de ${paymentLink.total} ${paymentLink.devise} pour "${paymentLink.produit}"`,
      user_id: paymentLink.vendeur_id,
      payment_link_id: paymentLink.id
    });

    // Notification pour le client (si spécifié)
    if (paymentLink.client_id) {
      await NotificationService.sendCompleteNotification({
        type: 'payment_success',
        title: 'Paiement confirmé',
        message: `Votre paiement de ${paymentLink.total} ${paymentLink.devise} pour "${paymentLink.produit}" a été confirmé`,
        user_id: paymentLink.client_id,
        payment_link_id: paymentLink.id
      });
    }

    console.log(`✅ Paiement confirmé: ${payment_id} - ${paymentLink.total} ${paymentLink.devise}`);

    return res.status(200).json({
      success: true,
      message: 'Paiement confirmé avec succès',
      payment: {
        id: updatedPayment.id,
        payment_id: updatedPayment.payment_id,
        status: 'success',
        amount: updatedPayment.total,
        currency: updatedPayment.devise,
        transaction_id
      }
    });

  } catch (error) {
    console.error('Erreur API confirm payment:', error);
    return res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}

// Fonction pour vérifier le paiement (à adapter selon votre API)
async function verifyPayment({ payment_method, amount, currency, transaction_id }) {
  try {
    // Simulation - à remplacer par votre logique de vérification
    if (payment_method === 'wallet') {
      // Vérifier le solde du wallet client
      return { success: true };
    } else if (payment_method === 'card') {
      // Vérifier avec votre processeur de paiement
      return { success: true };
    } else if (payment_method === 'mobile_money') {
      // Vérifier avec l'API Mobile Money
      return { success: true };
    }
    
    return { success: false, error: 'Méthode de paiement non supportée' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Fonction pour mettre à jour les wallets
async function updateWallets({ vendeur_id, client_id, amount, fees, currency }) {
  try {
    // Débiter le client
    if (client_id) {
      await supabase
        .from('wallets')
        .update({ 
          balance: supabase.raw(`balance - ${amount + fees}`)
        })
        .eq('user_id', client_id)
        .eq('currency', currency);
    }

    // Créditer le vendeur (montant net = 99% du total)
    const netAmount = amount; // Le vendeur reçoit le montant sans les frais
    await supabase
      .from('wallets')
      .update({ 
        balance: supabase.raw(`balance + ${netAmount}`)
      })
      .eq('user_id', vendeur_id)
      .eq('currency', currency);

    console.log(`💰 Wallets mis à jour: vendeur +${netAmount}, client -${amount + fees}`);
  } catch (error) {
    console.error('Erreur mise à jour wallets:', error);
  }
}

// Fonction pour créer les notifications
async function createPaymentNotifications(paymentLink, transaction) {
  try {
    const notifications = [
      {
        payment_link_id: paymentLink.id,
        user_id: paymentLink.vendeur_id,
        type: 'payment_success',
        title: 'Paiement reçu !',
        message: `Vous avez reçu un paiement de ${paymentLink.total} ${paymentLink.devise} pour "${paymentLink.produit}"`
      }
    ];

    if (paymentLink.client_id) {
      notifications.push({
        payment_link_id: paymentLink.id,
        user_id: paymentLink.client_id,
        type: 'payment_success',
        title: 'Paiement confirmé',
        message: `Votre paiement de ${paymentLink.total} ${paymentLink.devise} pour "${paymentLink.produit}" a été confirmé`
      });
    }

    await supabase
      .from('payment_notifications')
      .insert(notifications);

    console.log('📧 Notifications de paiement créées');
  } catch (error) {
    console.error('Erreur création notifications:', error);
  }
}
