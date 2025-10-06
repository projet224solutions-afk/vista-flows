import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface NotificationData {
  type: 'payment_created' | 'payment_success' | 'payment_failed' | 'payment_expired';
  title: string;
  message: string;
  user_id: string;
  payment_link_id?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Envoyer une notification par email
   */
  static async sendEmailNotification(data: NotificationData): Promise<boolean> {
    try {
      // Récupérer les informations de l'utilisateur
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('email, first_name, last_name')
        .eq('user_id', data.user_id)
        .single();

      if (userError || !user) {
        console.error('Utilisateur non trouvé pour notification email:', userError);
        return false;
      }

      // Préparer le contenu de l'email selon le type
      const emailContent = this.getEmailContent(data, user);

      // Envoyer l'email via Supabase Edge Functions ou service externe
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });

      if (emailError) {
        console.error('Erreur envoi email:', emailError);
        return false;
      }

      console.log(`📧 Email envoyé à ${user.email}: ${data.title}`);
      return true;
    } catch (error) {
      console.error('Erreur notification email:', error);
      return false;
    }
  }

  /**
   * Envoyer une notification push
   */
  static async sendPushNotification(data: NotificationData): Promise<boolean> {
    try {
      // Récupérer les tokens de notification push de l'utilisateur
      const { data: pushTokens, error: tokensError } = await supabase
        .from('user_push_tokens')
        .select('token, platform')
        .eq('user_id', data.user_id)
        .eq('active', true);

      if (tokensError || !pushTokens?.length) {
        console.log('Aucun token push trouvé pour l\'utilisateur:', data.user_id);
        return false;
      }

      // Envoyer la notification push via Supabase Edge Functions
      const { error: pushError } = await supabase.functions.invoke('send-push', {
        tokens: pushTokens,
        title: data.title,
        body: data.message,
        data: {
          type: data.type,
          payment_link_id: data.payment_link_id,
          ...data.metadata
        }
      });

      if (pushError) {
        console.error('Erreur notification push:', pushError);
        return false;
      }

      console.log(`📱 Push envoyé à ${pushTokens.length} appareil(s): ${data.title}`);
      return true;
    } catch (error) {
      console.error('Erreur notification push:', error);
      return false;
    }
  }

  /**
   * Créer une notification dans la base de données
   */
  static async createNotification(data: NotificationData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_notifications')
        .insert({
          payment_link_id: data.payment_link_id,
          user_id: data.user_id,
          type: data.type,
          title: data.title,
          message: data.message,
          sent_email: false,
          sent_push: false
        });

      if (error) {
        console.error('Erreur création notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur création notification:', error);
      return false;
    }
  }

  /**
   * Envoyer une notification complète (email + push + DB)
   */
  static async sendCompleteNotification(data: NotificationData): Promise<{
    email: boolean;
    push: boolean;
    database: boolean;
  }> {
    const results = {
      email: false,
      push: false,
      database: false
    };

    try {
      // Créer la notification en base
      results.database = await this.createNotification(data);

      // Envoyer email et push en parallèle
      const [emailResult, pushResult] = await Promise.all([
        this.sendEmailNotification(data),
        this.sendPushNotification(data)
      ]);

      results.email = emailResult;
      results.push = pushResult;

      // Mettre à jour le statut d'envoi
      if (results.database) {
        await supabase
          .from('payment_notifications')
          .update({
            sent_email: results.email,
            sent_push: results.push,
            sent_at: new Date().toISOString()
          })
          .eq('user_id', data.user_id)
          .eq('type', data.type)
          .eq('payment_link_id', data.payment_link_id);
      }

      console.log(`📬 Notification complète envoyée:`, results);
      return results;
    } catch (error) {
      console.error('Erreur notification complète:', error);
      return results;
    }
  }

  /**
   * Obtenir le contenu de l'email selon le type
   */
  private static getEmailContent(data: NotificationData, user: any) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    switch (data.type) {
      case 'payment_created':
        return {
          subject: '🎉 Lien de paiement créé - 224SOLUTIONS',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">224SOLUTIONS</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Lien de paiement créé</p>
              </div>
              <div style="padding: 30px; background: #f8fafc;">
                <h2 style="color: #1e293b; margin-bottom: 20px;">Bonjour ${user.first_name} !</h2>
                <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                  ${data.message}
                </p>
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="margin: 0; color: #065f46; font-weight: 600;">
                    ✅ Votre lien de paiement est maintenant actif et prêt à recevoir des paiements.
                  </p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${baseUrl}/dashboard" 
                     style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Accéder au tableau de bord
                  </a>
                </div>
              </div>
              <div style="background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px;">
                <p style="margin: 0;">224SOLUTIONS - Plateforme de paiement sécurisée</p>
              </div>
            </div>
          `,
          text: `Bonjour ${user.first_name} !\n\n${data.message}\n\nAccédez à votre tableau de bord: ${baseUrl}/dashboard`
        };

      case 'payment_success':
        return {
          subject: '💰 Paiement reçu ! - 224SOLUTIONS',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">224SOLUTIONS</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Paiement confirmé</p>
              </div>
              <div style="padding: 30px; background: #f8fafc;">
                <h2 style="color: #1e293b; margin-bottom: 20px;">Excellent ${user.first_name} !</h2>
                <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                  ${data.message}
                </p>
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="margin: 0; color: #065f46; font-weight: 600;">
                    🎉 Félicitations ! Vous avez reçu un nouveau paiement.
                  </p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${baseUrl}/dashboard" 
                     style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Voir mes revenus
                  </a>
                </div>
              </div>
              <div style="background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px;">
                <p style="margin: 0;">224SOLUTIONS - Plateforme de paiement sécurisée</p>
              </div>
            </div>
          `,
          text: `Excellent ${user.first_name} !\n\n${data.message}\n\nVoir mes revenus: ${baseUrl}/dashboard`
        };

      case 'payment_failed':
        return {
          subject: '⚠️ Échec de paiement - 224SOLUTIONS',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">224SOLUTIONS</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Échec de paiement</p>
              </div>
              <div style="padding: 30px; background: #f8fafc;">
                <h2 style="color: #1e293b; margin-bottom: 20px;">Bonjour ${user.first_name}</h2>
                <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                  ${data.message}
                </p>
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
                  <p style="margin: 0; color: #991b1b; font-weight: 600;">
                    ⚠️ Un paiement a échoué. Vérifiez les détails de votre lien.
                  </p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${baseUrl}/dashboard" 
                     style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Gérer mes liens
                  </a>
                </div>
              </div>
              <div style="background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px;">
                <p style="margin: 0;">224SOLUTIONS - Plateforme de paiement sécurisée</p>
              </div>
            </div>
          `,
          text: `Bonjour ${user.first_name}\n\n${data.message}\n\nGérer mes liens: ${baseUrl}/dashboard`
        };

      case 'payment_expired':
        return {
          subject: '⏰ Lien de paiement expiré - 224SOLUTIONS',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">224SOLUTIONS</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Lien expiré</p>
              </div>
              <div style="padding: 30px; background: #f8fafc;">
                <h2 style="color: #1e293b; margin-bottom: 20px;">Bonjour ${user.first_name}</h2>
                <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                  ${data.message}
                </p>
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0; color: #92400e; font-weight: 600;">
                    ⏰ Un de vos liens de paiement a expiré. Créez-en un nouveau si nécessaire.
                  </p>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${baseUrl}/dashboard" 
                     style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Créer un nouveau lien
                  </a>
                </div>
              </div>
              <div style="background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px;">
                <p style="margin: 0;">224SOLUTIONS - Plateforme de paiement sécurisée</p>
              </div>
            </div>
          `,
          text: `Bonjour ${user.first_name}\n\n${data.message}\n\nCréer un nouveau lien: ${baseUrl}/dashboard`
        };

      default:
        return {
          subject: 'Notification 224SOLUTIONS',
          html: `<p>${data.message}</p>`,
          text: data.message
        };
    }
  }
}
