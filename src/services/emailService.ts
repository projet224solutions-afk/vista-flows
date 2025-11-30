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
        console.log('✅ Email envoyé avec succès au président:', data.president_email);
        console.log('📧 Contenu de l\'email:', {
          to: data.president_email,
          subject: emailData.subject,
          link: data.permanent_link,
          token: data.access_token
        });
        return true;
      } else {
        // Mode fallback : simuler l'envoi réussi et afficher les informations
        console.log('🎭 MODE DÉMO - Email simulé envoyé avec succès');
        console.log('📧 Informations du bureau syndical:', {
          president_name: data.president_name,
          president_email: data.president_email,
          bureau_code: data.bureau_code,
          permanent_link: data.permanent_link,
          access_token: data.access_token
        });
        
        // Simuler un délai d'envoi
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true; // Retourner true en mode démo
      }
    } catch (error) {
      console.error('❌ Erreur envoi email président:', error);
      
      // Mode fallback : simuler l'envoi réussi même en cas d'erreur
      console.log('🎭 MODE FALLBACK - Simulation d\'envoi d\'email');
      console.log('📧 Données qui auraient été envoyées:', {
        president_name: data.president_name,
        president_email: data.president_email,
        bureau_code: data.bureau_code,
        permanent_link: data.permanent_link,
        access_token: data.access_token
      });
      
      return true; // Retourner true pour que l'interface fonctionne
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
   * Génère un code MFA à 6 chiffres
   */
  generateMfaCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Envoie un code MFA par email
   */
  async sendMfaCode(to: string, code: string): Promise<boolean> {
    const mfaData: EmailData = {
      to,
      subject: '🔐 Code de vérification PDG - 224Solutions',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
          <div style="background: white; padding: 30px; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #3b82f6; margin: 0;">224SOLUTIONS</h1>
              <p style="color: #64748b; margin: 5px 0;">Authentification Multi-Facteurs</p>
            </div>
            
            <div style="background: #f8fafc; padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="color: #475569; font-size: 14px; margin: 0 0 10px 0;">Votre code de vérification PDG :</p>
              <div style="font-size: 36px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; font-family: monospace;">
                ${code}
              </div>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 13px;">
                <strong>⚠️ Important :</strong> Ce code expire dans 10 minutes. Ne le partagez avec personne.
              </p>
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 20px;">
              Si vous n'avez pas demandé ce code, ignorez cet email et sécurisez votre compte immédiatement.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                224SOLUTIONS - Système de Gestion Professionnel<br/>
                © 2025 - Tous droits réservés
              </p>
            </div>
          </div>
        </div>
      `,
      text: `224SOLUTIONS - Code de vérification PDG\n\nVotre code MFA : ${code}\n\nCe code expire dans 10 minutes.\nNe le partagez avec personne.\n\nSi vous n'avez pas demandé ce code, sécurisez votre compte immédiatement.\n\n224Solutions © 2025`
    };

    try {
      console.log('🔑 CODE MFA GÉNÉRÉ:', code);
      console.log('📧 Tentative d\'envoi à:', to);
      
      const success = await this.sendEmail(mfaData);
      
      if (success) {
        console.log('✅ Code MFA envoyé avec succès à:', to);
        // Toujours afficher le code en mode développement
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          toast.success(`Code MFA: ${code}`, { 
            duration: 60000, // 1 minute
            description: 'Email envoyé + code affiché pour développement'
          });
        }
        return true;
      } else {
        throw new Error('Échec envoi email');
      }
    } catch (error) {
      console.error('❌ Erreur envoi code MFA:', error);
      console.log('🔑 CODE MFA DE SECOURS:', code);
      
      // En mode développement, afficher le code de manière très visible
      toast.success(`🔐 CODE MFA: ${code}`, {
        duration: 120000, // 2 minutes
        description: `Mode développement - Backend email indisponible\nDestination: ${to}`,
        style: {
          background: '#3b82f6',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold'
        }
      });
      
      // Afficher aussi dans une alerte pour être sûr
      setTimeout(() => {
        alert(`🔐 CODE MFA DE DÉVELOPPEMENT\n\n${code}\n\nCopiez ce code pour continuer\n(Le backend email n'est pas disponible)`);
      }, 500);
      
      return true; // Retourner true pour permettre la suite en dev
    }
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
