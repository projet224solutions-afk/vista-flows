import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Récupérer les messages
    try {
      const { conversation_id, user_id } = req.query;

      if (!conversation_id || !user_id) {
        return res.status(400).json({ 
          error: 'conversation_id et user_id requis' 
        });
      }

      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erreur récupération messages:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des messages' 
        });
      }

      return res.status(200).json({
        success: true,
        messages: messages || []
      });

    } catch (error) {
      console.error('Erreur API messages:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  if (req.method === 'POST') {
    // Envoyer un message
    try {
      const { 
        conversation_id, 
        sender_id, 
        content, 
        type = 'text',
        metadata = {} 
      } = req.body;

      if (!conversation_id || !sender_id || !content) {
        return res.status(400).json({ 
          error: 'conversation_id, sender_id et content requis' 
        });
      }

      // Créer le message
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id,
          sender_id,
          content,
          type,
          metadata,
          status: 'sent'
        })
        .select(`
          *,
          sender:user_profiles!messages_sender_id_fkey(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Erreur création message:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de l\'envoi du message' 
        });
      }

      // Mettre à jour la conversation
      await supabase
        .from('conversations')
        .update({
          last_message_id: message.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation_id);

      console.log(`📨 Message envoyé: ${message.id} dans conversation ${conversation_id}`);

      return res.status(201).json({
        success: true,
        message
      });

    } catch (error) {
      console.error('Erreur API send message:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
