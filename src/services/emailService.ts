/**
 * 📧 SERVICE D'ENVOI D'EMAIL - 224SOLUTIONS
 * Service professionnel pour l'envoi d'emails via API backend
 */

import { toast } from 'sonner';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SyndicateEmailData {
  president_name: string;
  president_email: string;
  bureau_code: string;
  prefecture: string;
  commune: string;
  permanent_link: string;
  access_token: string;
}

class EmailService {
  private static instance: EmailService;
  private baseURL = 'http://localhost:3001/api'; // Backend Express

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Envoie un email générique
   */
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // JWT token
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      return false;
    }
  }

  /**
   * Envoie l'email de création de bureau syndical au président
   */
  async sendSyndicatePresidentEmail(data: SyndicateEmailData): Promise<boolean> {
    try {
      const emailHTML = this.generateSyndicateEmailTemplate(data);
      const emailText = this.generateSyndicateEmailText(data);

      const emailData: EmailData = {
        to: data.president_email,
        subject: `🏛️ Création de votre Bureau Syndical - ${data.bureau_code}`,
        html: emailHTML,
        text: emailText
      };

      const success = await this.sendEmail(emailData);
      
      if (success) {
        toast.success('✅ Email envoyé avec succès au président');
        return true;
      } else {
        toast.error('❌ Erreur lors de l\'envoi de l\'email');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur envoi email président:', error);
      toast.error('❌ Erreur lors de l\'envoi de l\'email');
      return false;
    }
  }

  /**
   * Génère le template HTML pour l'email du président
   */
  private generateSyndicateEmailTemplate(data: SyndicateEmailData): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Création Bureau Syndical - 224Solutions</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 40px 30px; }
        .bureau-info { background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .bureau-info h3 { margin: 0 0 15px 0; color: #1e293b; }
        .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
        .info-label { font-weight: 600; color: #64748b; }
        .info-value { color: #1e293b; }
        .access-section { background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center; }
        .access-link { display: inline-block; background-color: white; color: #059669; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 15px 0; }
        .access-link:hover { background-color: #f0fdf4; }
        .token-info { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .token-code { font-family: 'Courier New', monospace; background-color: #374151; color: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px; letter-spacing: 1px; }
        .footer { background-color: #1e293b; color: white; padding: 25px; text-align: center; }
        .footer p { margin: 5px 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏛️ 224SOLUTIONS</div>
            <h1>Bureau Syndical Créé</h1>
            <p>Félicitations ${data.president_name} !</p>
        </div>
        
        <div class="content">
            <p>Bonjour <strong>${data.president_name}</strong>,</p>
            
            <p>Nous avons le plaisir de vous informer que votre bureau syndical a été créé avec succès dans le système 224Solutions.</p>
            
            <div class="bureau-info">
                <h3>📋 Informations du Bureau</h3>
                <div class="info-row">
                    <span class="info-label">Code Bureau:</span>
                    <span class="info-value"><strong>${data.bureau_code}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Préfecture:</span>
                    <span class="info-value">${data.prefecture}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Commune:</span>
                    <span class="info-value">${data.commune}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Président:</span>
                    <span class="info-value">${data.president_name}</span>
                </div>
            </div>
            
            <div class="access-section">
                <h3>🔐 Accès à votre Interface</h3>
                <p>Cliquez sur le lien ci-dessous pour accéder à votre interface de gestion :</p>
                <a href="${data.permanent_link}" class="access-link">
                    🚀 Accéder à mon Bureau Syndical
                </a>
                <p><small>Ce lien est permanent et sécurisé</small></p>
            </div>
            
            <div class="token-info">
                <p><strong>🔑 Token d'accès :</strong></p>
                <div class="token-code">${data.access_token}</div>
                <p><small>Conservez ce token en lieu sûr. Il vous sera demandé lors de votre première connexion.</small></p>
            </div>
            
            <p><strong>Prochaines étapes :</strong></p>
            <ul>
                <li>✅ Cliquez sur le lien d'accès ci-dessus</li>
                <li>✅ Configurez votre profil de président</li>
                <li>✅ Ajoutez vos premiers membres</li>
                <li>✅ Commencez la gestion de votre bureau</li>
            </ul>
            
            <p>Si vous avez des questions, n'hésitez pas à nous contacter à <a href="mailto:support@224solutions.com">support@224solutions.com</a></p>
        </div>
        
        <div class="footer">
            <p><strong>224SOLUTIONS</strong></p>
            <p>Système de Gestion Syndicale Professionnel</p>
            <p>© 2025 - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Génère la version texte de l'email
   */
  private generateSyndicateEmailText(data: SyndicateEmailData): string {
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

Pour toute question: support@224solutions.com

224SOLUTIONS - Système de Gestion Syndicale Professionnel
© 2025 - Tous droits réservés
    `;
  }

  /**
   * Envoie un email de test
   */
  async sendTestEmail(to: string): Promise<boolean> {
    const testData: EmailData = {
      to,
      subject: '🧪 Test Email - 224Solutions',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3b82f6;">Test Email - 224Solutions</h2>
          <p>Ceci est un email de test pour vérifier le bon fonctionnement du système d'envoi d'emails.</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <p>Si vous recevez cet email, le système fonctionne correctement ! ✅</p>
        </div>
      `,
      text: `Test Email - 224Solutions\n\nCeci est un email de test.\nDate: ${new Date().toLocaleString('fr-FR')}\n\nSi vous recevez cet email, le système fonctionne correctement !`
    };

    return await this.sendEmail(testData);
  }
}

export const emailService = EmailService.getInstance();
export default emailService;
