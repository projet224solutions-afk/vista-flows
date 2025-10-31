import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface RenewalRequest {
  subscription_id: string;
  payment_method: 'wallet' | 'external';
  payment_reference?: string;
  amount_gnf: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription_id, payment_method, payment_reference, amount_gnf }: RenewalRequest = await req.json();
    const now = new Date().toISOString();

    console.log('Processing subscription renewal:', { subscription_id, payment_method, amount_gnf });

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      throw new Error('Subscription not found');
    }

    // Verify amount matches plan price
    if (amount_gnf !== subscription.plans.price_gnf) {
      throw new Error('Invalid payment amount');
    }

    // Process payment based on method
    if (payment_method === 'wallet') {
      // Deduct from wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.balance < amount_gnf) {
        throw new Error('Insufficient wallet balance');
      }

      // Create wallet transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          amount: -amount_gnf,
          transaction_type: 'subscription_renewal',
          description: `Renouvellement abonnement ${subscription.plans.name}`,
          status: 'completed',
          created_at: now
        });

      // Update wallet balance
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance - amount_gnf, updated_at: now })
        .eq('user_id', user.id);
    }

    // Calculate new period end (add plan duration to current date)
    const newPeriodEnd = new Date();
    newPeriodEnd.setDate(newPeriodEnd.getDate() + subscription.plans.duration_days);

    // Update subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: now,
        current_period_end: newPeriodEnd.toISOString(),
        updated_at: now
      })
      .eq('id', subscription_id);

    if (updateError) {
      throw updateError;
    }

    // Reactivate vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (vendor) {
      await supabase
        .from('vendors')
        .update({ 
          is_verified: true,
          is_active: true,
          updated_at: now 
        })
        .eq('id', vendor.id);

      // Reactivate virtual cards
      await supabase
        .from('virtual_cards')
        .update({ status: 'active', updated_at: now })
        .eq('user_id', user.id)
        .eq('status', 'suspended');

      // Reactivate products
      await supabase
        .from('products')
        .update({ is_active: true, updated_at: now })
        .eq('vendor_id', vendor.id);
    }

    // Record revenue
    await supabase.rpc('handle_pdg_revenue', {
      p_amount_gnf: amount_gnf,
      p_revenue_type: 'subscription_renewal',
      p_description: `Renouvellement abonnement ${subscription.plans.name}`,
      p_source_user_id: user.id
    });

    // Send success notification
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Abonnement renouvelé',
        message: `Votre abonnement ${subscription.plans.name} a été renouvelé avec succès jusqu'au ${new Date(newPeriodEnd).toLocaleDateString('fr-FR')}.`,
        type: 'success',
        created_at: now
      });

    console.log('Subscription renewed successfully:', subscription_id);

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id,
        new_period_end: newPeriodEnd.toISOString(),
        message: 'Abonnement renouvelé avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Renewal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
