import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Récupérer les conversations d'un utilisateur
    try {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({ 
          error: 'user_id requis' 
        });
      }

      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants!conversations_id_fkey(
            user_id,
            user:user_profiles!conversation_participants_user_id_fkey(
              first_name,
              last_name,
              avatar_url,
              status
            )
          ),
          last_message:messages!conversations_last_message_id_fkey(
            content,
            created_at,
            sender_id
          )
        `)
        .contains('participants', [{ user_id }])
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération conversations:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des conversations' 
        });
      }

      return res.status(200).json({
        success: true,
        conversations: conversations || []
      });

    } catch (error) {
      console.error('Erreur API conversations:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  if (req.method === 'POST') {
    // Créer une nouvelle conversation
    try {
      const { 
        participants, 
        type = 'private',
        name,
        description 
      } = req.body;

      if (!participants || participants.length < 2) {
        return res.status(400).json({ 
          error: 'Au moins 2 participants requis' 
        });
      }

      // Créer la conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type,
          name: name || null,
          description: description || null,
          created_by: participants[0]
        })
        .select()
        .single();

      if (convError) {
        console.error('Erreur création conversation:', convError);
        return res.status(500).json({ 
          error: 'Erreur lors de la création de la conversation' 
        });
      }

      // Ajouter les participants
      const participantData = participants.map(user_id => ({
        conversation_id: conversation.id,
        user_id,
        joined_at: new Date().toISOString()
      }));

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participantData);

      if (participantsError) {
        console.error('Erreur ajout participants:', participantsError);
        // Nettoyer la conversation créée
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversation.id);
        
        return res.status(500).json({ 
          error: 'Erreur lors de l\'ajout des participants' 
        });
      }

      console.log(`💬 Conversation créée: ${conversation.id} avec ${participants.length} participants`);

      return res.status(201).json({
        success: true,
        conversation
      });

    } catch (error) {
      console.error('Erreur API create conversation:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
