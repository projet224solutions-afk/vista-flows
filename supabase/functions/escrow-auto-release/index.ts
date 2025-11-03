import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting escrow auto-release job...');

    // Call the auto_release_escrows function
    const { data, error } = await supabase.rpc('auto_release_escrows');

    if (error) {
      console.error('❌ Error during auto-release:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = data || [];
    const successCount = results.filter((r: any) => r.success).length;
    const failureCount = results.filter((r: any) => !r.success).length;

    console.log(`✅ Auto-release completed: ${successCount} succeeded, ${failureCount} failed`);

    // Send notifications for released escrows
    for (const result of results) {
      if (result.success) {
        // Get escrow details
        const { data: escrow } = await supabase
          .from('escrow_transactions')
          .select('*, payer:profiles!payer_id(email, first_name), receiver:profiles!receiver_id(email, first_name)')
          .eq('id', result.escrow_id)
          .single();

        if (escrow) {
          // Notify receiver
          await supabase.from('notifications').insert({
            user_id: escrow.receiver_id,
            type: 'escrow_released',
            title: 'Fonds libérés automatiquement',
            message: `Les fonds de ${escrow.amount} ${escrow.currency} ont été libérés automatiquement dans votre wallet.`,
            metadata: { escrow_id: escrow.id, order_id: escrow.order_id }
          });

          // Notify payer
          await supabase.from('notifications').insert({
            user_id: escrow.payer_id,
            type: 'escrow_released',
            title: 'Transaction escrow complétée',
            message: `Les fonds de ${escrow.amount} ${escrow.currency} ont été transférés au vendeur.`,
            metadata: { escrow_id: escrow.id, order_id: escrow.order_id }
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        successCount,
        failureCount,
        results 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
