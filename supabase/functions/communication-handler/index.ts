/**
 * 💬 COMMUNICATION HANDLER - 224SOLUTIONS
 * Edge Function pour gérer la création et l'envoi des communications
 * (conversations + messages + notifications)
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommunicationRequest {
  userId: string;
  targetId: string;
  initialMessage?: {
    text: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📨 Communication Handler - Nouvelle requête');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { userId, targetId, initialMessage }: CommunicationRequest = await req.json();

    // Validation
    if (!userId || !targetId) {
      console.error('❌ userId et targetId requis');
      return new Response(
        JSON.stringify({ error: 'userId et targetId requis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📱 Création conversation entre ${userId} et ${targetId}`);

    // Check if conversation already exists between these users
    const { data: existingConversations, error: checkError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations!inner(
          id,
          type,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (checkError) {
      console.error('❌ Erreur vérification conversations:', checkError);
    }

    // Find existing conversation with target
    let conversationId = null;
    if (existingConversations && existingConversations.length > 0) {
      for (const conv of existingConversations) {
        const { data: targetInConv } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', (conv as any).conversations.id)
          .eq('user_id', targetId)
          .single();

        if (targetInConv) {
          conversationId = (conv as any).conversations.id;
          console.log(`✅ Conversation existante trouvée: ${conversationId}`);
          break;
        }
      }
    }

    // Create new conversation if doesn't exist
    let conversation = null;
    if (!conversationId) {
      console.log('🆕 Création nouvelle conversation');

      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          type: 'private',
          creator_id: userId,
          last_message: initialMessage?.text || null,
          status: 'open',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (conversationError) {
        console.error('❌ Erreur création conversation:', conversationError);
        return new Response(
          JSON.stringify({ error: 'Échec de création de conversation', details: conversationError }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      conversation = newConversation;
      conversationId = newConversation.id;

      // Add participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: conversationId,
            user_id: userId,
            role: 'admin'
          },
          {
            conversation_id: conversationId,
            user_id: targetId,
            role: 'member'
          }
        ]);

      if (participantsError) {
        console.error('❌ Erreur ajout participants:', participantsError);
        return new Response(
          JSON.stringify({ error: 'Échec ajout participants', details: participantsError }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('✅ Participants ajoutés');
    } else {
      // Fetch existing conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      conversation = existingConv;
    }

    // Create initial message if provided
    let message = null;
    if (initialMessage && initialMessage.text) {
      console.log('📝 Création message initial');

      const { data: newMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          recipient_id: targetId,
          content: initialMessage.text,
          type: 'text',
          status: 'sent',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (messageError) {
        console.error('❌ Erreur création message:', messageError);
      } else {
        message = newMessage;
        console.log('✅ Message créé');

        // Update conversation last_message
        await supabase
          .from('conversations')
          .update({ 
            last_message: initialMessage.text,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      }

      // Send notification to target user
      try {
        await supabase.functions.invoke('send-communication-notification', {
          body: {
            user_id: targetId,
            title: 'Nouveau message',
            body: initialMessage.text,
            type: 'new_message',
            conversation_id: conversationId,
            message_id: message?.id
          }
        });
        console.log('✅ Notification envoyée');
      } catch (notifError) {
        console.warn('⚠️ Échec envoi notification:', notifError);
      }
    }

    // Success response
    console.log('✅ Communication créée avec succès');
    return new Response(
      JSON.stringify({
        success: true,
        conversation,
        message,
        conversationId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur Communication Handler:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Erreur interne du serveur',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
