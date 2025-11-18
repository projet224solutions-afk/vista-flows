import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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
      produit, 
      description, 
      montant, 
      devise = 'GNF', 
      client_id,
      vendeur_id 
    } = req.body;

    // Validation de sécurité
    const { PaymentSecurity } = await import('../../../src/middleware/paymentSecurity');
    
    // Vérifier les permissions
    const permissionCheck = await PaymentSecurity.validatePaymentPermissions(vendeur_id);
    if (!permissionCheck.isValid) {
      return res.status(403).json({ 
        error: permissionCheck.error 
      });
    }

    // Vérifier les limites de création
    const limitCheck = await PaymentSecurity.checkCreationLimits(vendeur_id);
    if (!limitCheck.isValid) {
      return res.status(429).json({ 
        error: limitCheck.error 
      });
    }

    // Valider les données
    const dataValidation = PaymentSecurity.validatePaymentData({
      produit,
      montant: parseFloat(montant),
      devise,
      description
    });

    if (!dataValidation.isValid) {
      return res.status(400).json({ 
        error: dataValidation.error 
      });
    }

    // Sanitizer les données
    const sanitizedProduit = PaymentSecurity.sanitizeInput(produit);
    const sanitizedDescription = description ? PaymentSecurity.sanitizeInput(description) : null;

    // Générer un ID unique pour le paiement
    const paymentId = uuidv4();
    
    // Calculer les frais (1% du montant)
    const frais = Math.round(montant * 0.01 * 100) / 100;
    const total = montant + frais;

    // Créer le lien de paiement
    const { data: paymentLink, error: insertError } = await supabase
      .from('payment_links')
      .insert({
        payment_id: paymentId,
        vendeur_id,
        client_id: client_id || null,
        produit: sanitizedProduit,
        description: sanitizedDescription,
        montant: parseFloat(montant),
        devise,
        frais,
        total,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur création lien paiement:', insertError);
      return res.status(500).json({ 
        error: 'Erreur lors de la création du lien de paiement',
        details: insertError.message
      });
    }

    // Générer l'URL du lien de paiement
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/payment/${paymentId}`;

    // Créer des notifications automatiques
    const { NotificationService } = await import('../../../src/services/NotificationService');
    
    // Notification pour le vendeur
    await NotificationService.sendCompleteNotification({
      type: 'payment_created',
      title: 'Lien de paiement créé',
      message: `Votre lien de paiement pour "${sanitizedProduit}" a été créé avec succès. Montant: ${montant} ${devise} + frais: ${frais} ${devise} = ${total} ${devise}`,
      user_id: vendeur_id,
      payment_link_id: paymentLink.id
    });

    // Si un client est spécifié, notification pour lui
    if (client_id) {
      await NotificationService.sendCompleteNotification({
        type: 'payment_created',
        title: 'Nouveau lien de paiement',
        message: `Un lien de paiement vous a été envoyé pour "${sanitizedProduit}". Montant: ${total} ${devise}`,
        user_id: client_id,
        payment_link_id: paymentLink.id
      });
    }

    // Log de l'opération
    console.log(`✅ Lien de paiement créé: ${paymentId} par vendeur ${vendeur_id}`);

    return res.status(201).json({
      success: true,
      payment_link: {
        id: paymentLink.id,
        payment_id: paymentId,
        url: paymentUrl,
        produit: sanitizedProduit,
        montant,
        frais,
        total,
        devise,
        status: 'pending',
        expires_at: paymentLink.expires_at,
        created_at: paymentLink.created_at
      }
    });

  } catch (error) {
    console.error('Erreur API create payment:', error);
    return res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}
