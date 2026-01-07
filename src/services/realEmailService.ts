/**
 * 📧 SERVICE D'EMAIL RÉEL - 224SOLUTIONS
 * Service pour envoyer de vrais emails via Resend (recommandé) ou EmailJS
 * 
 * ⚠️ IMPORTANT: Ce service est DÉPRÉCIÉ
 * Utilisez plutôt resendEmailService.ts qui est plus fiable
 */

import emailjs from '@emailjs/browser';
import { toast } from 'sonner';

export interface SyndicateEmailData {
  president_name: string;
  president_email: string;
  bureau_code: string;
  prefecture: string;
  commune: string;
  permanent_link: string;
  access_token: string;
}

class RealEmailService {
  private static instance: RealEmailService;
  private isInitialized = false;

  // Configuration EmailJS (service gratuit) - OPTIONNEL
  // Si non configuré, utilisera le backend ou Resend
  private readonly SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
  private readonly TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
  private readonly PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

  static getInstance(): RealEmailService {
    if (!RealEmailService.instance) {
      RealEmailService.instance = new RealEmailService();
    }
    return RealEmailService.instance;
  }

  /**
   * Vérifie si EmailJS est configuré
   */
  private isEmailJSConfigured(): boolean {
    return !!(this.SERVICE_ID && this.TEMPLATE_ID && this.PUBLIC_KEY);
  }

  /**
   * Initialise EmailJS
   */
  private async initializeEmailJS() {
    try {
      if (!this.isEmailJSConfigured()) {
        console.warn('⚠️ EmailJS non configuré - utilisation du backend');
        return;
      }
      
      // Initialiser EmailJS avec votre clé publique
      emailjs.init(this.PUBLIC_KEY);
      this.isInitialized = true;
      console.log('✅ EmailJS initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation EmailJS:', error);
    }
  }

  /**
   * Envoie un email réel au président du bureau syndical
   */
  async sendSyndicatePresidentEmail(data: SyndicateEmailData): Promise<boolean> {
    try {
      console.log('📧 Tentative envoi email président:', data.president_email);
      
      // Méthode 1: Essayer EmailJS si configuré
      if (this.isEmailJSConfigured()) {
        const emailJSResult = await this.sendViaEmailJS(data);
        if (emailJSResult) {
          return true;
        }
      } else {
        console.log('⚠️ EmailJS non configuré, passage au backend...');
      }

      // Méthode 2: Essayer d'envoyer via le backend (Resend)
      const backendResult = await this.sendViaBackend(data);
      if (backendResult) {
        return true;
      }

      // Méthode 3: Utiliser l'API Web Share ou mailto en dernier recours
      const webResult = await this.sendViaWebAPI(data);
      return webResult;

    } catch (error) {
      console.error('❌ Erreur envoi email président:', error);
      toast.error('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
      return false;
    }
  }

  /**
   * Méthode 1: Envoi via EmailJS (optionnel)
   */
  private async sendViaEmailJS(data: SyndicateEmailData): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeEmailJS();
      }

      if (!this.isEmailJSConfigured()) {
        return false;
      }

      const templateParams = {
        to_email: data.president_email,
        to_name: data.president_name,
        bureau_code: data.bureau_code,
        prefecture: data.prefecture,
        commune: data.commune,
        permanent_link: data.permanent_link,
        access_token: data.access_token,
        from_name: '224Solutions',
        subject: `🏛️ Création de votre Bureau Syndical - ${data.bureau_code}`
      };

      const result = await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_ID,
        templateParams
      );

      if (result.status === 200) {
        console.log('✅ Email envoyé via EmailJS:', result);
        toast.success('✅ Email envoyé avec succès via EmailJS');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Erreur EmailJS:', error);
      // Ne pas afficher d'erreur, passer à la méthode suivante
      return false;
    }
  }

  /**
   * Méthode 2: Envoi via le backend Express
   */
  private async sendViaBackend(data: SyndicateEmailData): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3001/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        },
        body: JSON.stringify({
          to: data.president_email,
          subject: `🏛️ Création de votre Bureau Syndical - ${data.bureau_code}`,
          html: this.generateEmailHTML(data),
          text: this.generateEmailText(data)
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Email envoyé via backend:', result);
        toast.success('✅ Email envoyé avec succès via le serveur');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Erreur backend email:', error);
      return false;
    }
  }

  /**
   * Méthode 3: Utiliser l'API Web ou mailto
   */
  private async sendViaWebAPI(data: SyndicateEmailData): Promise<boolean> {
    try {
      // Créer le contenu de l'email
      const subject = `🏛️ Création de votre Bureau Syndical - ${data.bureau_code}`;
      const body = this.generateEmailText(data);

      // Essayer l'API Web Share si disponible
      if (navigator.share) {
        await navigator.share({
          title: subject,
          text: body,
          url: data.permanent_link
        });
        toast.success('✅ Partage initié via l\'API Web');
        return true;
      }

      // Fallback: ouvrir le client email par défaut
      const mailtoLink = `mailto:${data.president_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      // Afficher une notification avec le lien mailto
      toast.info('📧 Ouverture du client email', {
        description: 'Cliquez pour ouvrir votre client email',
        action: {
          label: 'Ouvrir Email',
          onClick: () => window.open(mailtoLink)
        },
        duration: 10000
      });

      // Copier les informations dans le presse-papier
      await navigator.clipboard.writeText(`
Email: ${data.president_email}
Sujet: ${subject}
Lien: ${data.permanent_link}
Token: ${data.access_token}
      `);

      toast.success('📋 Informations copiées dans le presse-papier');
      return true;

    } catch (error) {
      console.error('❌ Erreur Web API:', error);
      
      // Dernière solution: afficher les informations à copier
      toast.error('📧 Envoi automatique impossible', {
        description: `Envoyez manuellement à ${data.president_email}`,
        duration: 15000
      });

      return false;
    }
  }

  /**
   * Génère le HTML de l'email
   */
  private generateEmailHTML(data: SyndicateEmailData): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bureau Syndical - 224Solutions</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 20px; }
        .content { background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .link-box { background: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .link-button { display: inline-block; background: white; color: #10b981; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 10px 0; }
        .info-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .token { font-family: monospace; background: #374151; color: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏛️ 224SOLUTIONS</h1>
        <h2>Bureau Syndical Créé</h2>
        <p>Félicitations ${data.president_name} !</p>
    </div>
    
    <div class="content">
        <p>Bonjour <strong>${data.president_name}</strong>,</p>
        
        <p>Nous avons le plaisir de vous informer que votre bureau syndical a été créé avec succès dans le système 224Solutions.</p>
        
        <h3>📋 Informations du Bureau</h3>
        <ul>
            <li><strong>Code Bureau:</strong> ${data.bureau_code}</li>
            <li><strong>Préfecture:</strong> ${data.prefecture}</li>
            <li><strong>Commune:</strong> ${data.commune}</li>
            <li><strong>Président:</strong> ${data.president_name}</li>
        </ul>
        
        <div class="link-box">
            <h3>🔐 Accès à votre Interface</h3>
            <p>Cliquez sur le lien ci-dessous pour accéder à votre interface de gestion :</p>
            <a href="${data.permanent_link}" class="link-button">
                🚀 Accéder à mon Bureau Syndical
            </a>
            <p><small>Ce lien est permanent et sécurisé</small></p>
        </div>
        
        <div class="info-box">
            <p><strong>🔑 Token d'accès :</strong></p>
            <div class="token">${data.access_token}</div>
            <p><small>Conservez ce token en lieu sûr. Il vous sera demandé lors de votre première connexion.</small></p>
        </div>
        
        <h3>Prochaines étapes :</h3>
        <ol>
            <li>✅ Cliquez sur le lien d'accès ci-dessus</li>
            <li>✅ Configurez votre profil de président</li>
            <li>✅ Ajoutez vos premiers membres</li>
            <li>✅ Commencez la gestion de votre bureau</li>
        </ol>
        
        <p>Si vous avez des questions, n'hésitez pas à nous contacter à <a href="mailto:support@224solution.net">support@224solution.net</a></p>
    </div>
    
    <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
        <p><strong>224SOLUTIONS</strong> - Système de Gestion Syndicale Professionnel</p>
        <p>© 2025 - Tous droits réservés</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Génère le texte de l'email
   */
  private generateEmailText(data: SyndicateEmailData): string {
    return `
BUREAU SYNDICAL CRÉÉ - 224SOLUTIONS

Bonjour ${data.president_name},

Nous avons le plaisir de vous informer que votre bureau syndical a été créé avec succès.

INFORMATIONS DU BUREAU:
- Code Bureau: ${data.bureau_code}
- Préfecture: ${data.prefecture}
- Commune: ${data.commune}
- Président: ${data.president_name}

ACCÈS À VOTRE INTERFACE:
Lien permanent: ${data.permanent_link}
Token d'accès: ${data.access_token}

PROCHAINES ÉTAPES:
1. Cliquez sur le lien d'accès
2. Configurez votre profil de président
3. Ajoutez vos premiers membres
4. Commencez la gestion de votre bureau

Pour toute question: support@224solution.net

224SOLUTIONS - Système de Gestion Syndicale Professionnel
© 2025 - Tous droits réservés
    `;
  }
}

export const realEmailService = RealEmailService.getInstance();
export default realEmailService;
