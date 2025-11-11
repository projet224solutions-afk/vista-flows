import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting payment status update check...');

    // Calculer la date limite (24h en arrière)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Mettre à jour tous les liens de paiement "pending" créés il y a plus de 24h
    const { data: updatedLinks, error: updateError } = await supabase
      .from('payment_links')
      .update({ 
        status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'pending')
      .lt('created_at', twentyFourHoursAgo.toISOString())
      .select('id, payment_id, produit');

    if (updateError) {
      console.error('Error updating payment statuses:', updateError);
      throw updateError;
    }

    const count = updatedLinks?.length || 0;
    console.log(`Updated ${count} payment links to overdue status`);

    // Envoyer des notifications aux clients pour les paiements en retard
    if (updatedLinks && updatedLinks.length > 0) {
      for (const link of updatedLinks) {
        // Récupérer le lien complet pour obtenir le client_id
        const { data: fullLink } = await supabase
          .from('payment_links')
          .select('client_id, vendeur_id')
          .eq('id', link.id)
          .single();

        if (fullLink?.client_id) {
          // Créer une notification pour le client
          await supabase
            .from('notifications')
            .insert({
              user_id: fullLink.client_id,
              type: 'payment_overdue',
              title: 'Paiement en retard',
              message: `Votre paiement pour "${link.produit}" est maintenant en retard. Veuillez effectuer le paiement dès que possible.`,
              data: {
                payment_id: link.payment_id,
                link_id: link.id
              },
              is_read: false
            });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated_count: count,
        message: `${count} payment(s) marked as overdue`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in update-payment-statuses function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
