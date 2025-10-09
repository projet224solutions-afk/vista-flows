import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Récupérer les notifications d'un utilisateur
    try {
      const { user_id, limit = 20, offset = 0 } = req.query;

      if (!user_id) {
        return res.status(400).json({ 
          error: 'user_id requis' 
        });
      }

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) {
        console.error('Erreur récupération notifications:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération des notifications' 
        });
      }

      // Compter les notifications non lues
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .eq('is_read', false);

      return res.status(200).json({
        success: true,
        notifications: notifications || [],
        unreadCount: unreadCount || 0
      });

    } catch (error) {
      console.error('Erreur API notifications:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  if (req.method === 'POST') {
    // Créer une notification
    try {
      const { 
        user_id, 
        title, 
        message, 
        type = 'info',
        priority = 'medium',
        metadata = {} 
      } = req.body;

      if (!user_id || !title || !message) {
        return res.status(400).json({ 
          error: 'user_id, title et message requis' 
        });
      }

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id,
          title,
          message,
          type,
          priority,
          metadata,
          is_read: false
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur création notification:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la création de la notification' 
        });
      }

      console.log(`🔔 Notification créée: ${notification.id} pour utilisateur ${user_id}`);

      return res.status(201).json({
        success: true,
        notification
      });

    } catch (error) {
      console.error('Erreur API create notification:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  if (req.method === 'PUT') {
    // Marquer comme lu
    try {
      const { notification_id, user_id } = req.body;

      if (!notification_id || !user_id) {
        return res.status(400).json({ 
          error: 'notification_id et user_id requis' 
        });
      }

      const { data: notification, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notification_id)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) {
        console.error('Erreur mise à jour notification:', error);
        return res.status(500).json({ 
          error: 'Erreur lors de la mise à jour de la notification' 
        });
      }

      return res.status(200).json({
        success: true,
        notification
      });

    } catch (error) {
      console.error('Erreur API update notification:', error);
      return res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
