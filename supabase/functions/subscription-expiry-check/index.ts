import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  try {
    const now = new Date().toISOString();
    console.log('Running subscription expiry check at:', now);

    // Mark subscriptions as expired (auto_renew = false)
    const { data: expiredSubs, error: expiredError } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'expired', 
        updated_at: now 
      })
      .lt('current_period_end', now)
      .eq('auto_renew', false)
      .neq('status', 'expired')
      .select('id');

    if (expiredError) {
      console.error('Error marking expired subscriptions:', expiredError);
      throw expiredError;
    }

    console.log(`Marked ${expiredSubs?.length || 0} subscriptions as expired`);

    // Mark subscriptions as past_due (auto_renew = true, awaiting payment)
    const { data: pastDueSubs, error: pastDueError } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'past_due', 
        updated_at: now 
      })
      .lt('current_period_end', now)
      .eq('auto_renew', true)
      .neq('status', 'past_due')
      .neq('status', 'cancelled')
      .select('id');

    if (pastDueError) {
      console.error('Error marking past_due subscriptions:', pastDueError);
      throw pastDueError;
    }

    console.log(`Marked ${pastDueSubs?.length || 0} subscriptions as past_due`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expired_count: expiredSubs?.length || 0,
        past_due_count: pastDueSubs?.length || 0,
        timestamp: now
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Subscription expiry check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
