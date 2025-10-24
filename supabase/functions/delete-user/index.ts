import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Unauthorized')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Vérifier que l'utilisateur est admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      throw new Error('Forbidden: Admin access required')
    }

    // Récupérer l'ID de l'utilisateur à supprimer
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('userId is required')
    }

    // Empêcher la suppression de son propre compte
    if (userId === user.id) {
      throw new Error('Cannot delete your own account')
    }

    // Log de l'action avant suppression
    await supabaseClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'USER_DELETION_INITIATED',
      target_type: 'user',
      target_id: userId,
      data_json: { timestamp: new Date().toISOString() }
    })

    // Supprimer l'utilisateur auth (cela supprimera automatiquement le profil via CASCADE)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      throw deleteError
    }

    // Log de succès
    await supabaseClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'USER_DELETED_SUCCESS',
      target_type: 'user',
      target_id: userId,
      data_json: { timestamp: new Date().toISOString() }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully',
        userId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Delete user error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 
               error.message.includes('Forbidden') ? 403 : 500,
      }
    )
  }
})
