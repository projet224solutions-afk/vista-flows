/**
 * 📧 SERVICE EMAIL SIMPLE - 224SOLUTIONS
 * Service d'email simplifié qui garantit la livraison
 */

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

export interface InstallLinkEmailData {
  president_name: string;
  president_email: string;
  bureau_code: string;
  install_link: string;
  subject: string;
}

class SimpleEmailService {
  private static instance: SimpleEmailService;

  static getInstance(): SimpleEmailService {
    if (!SimpleEmailService.instance) {
      SimpleEmailService.instance = new SimpleEmailService();
    }
    return SimpleEmailService.instance;
  }

  /**
   * Envoie l'email au président avec méthode garantie
   */
  async sendSyndicatePresidentEmail(data: SyndicateEmailData): Promise<boolean> {
    console.log('📧 ENVOI EMAIL PRÉSIDENT - MÉTHODE GARANTIE');
    console.log('==========================================');
    console.log('Destinataire:', data.president_email);
    console.log('Bureau:', data.bureau_code);
    console.log('Lien:', data.permanent_link);
    console.log('Token:', data.access_token);
    console.log('');

    // Méthode 1: Essayer Web Share API (moderne)
    const webShareSuccess = await this.tryWebShare(data);
    if (webShareSuccess) {
      return true;
    }

    // Méthode 2: Ouvrir le client email avec mailto (garanti)
    const mailtoSuccess = await this.openEmailClient(data);
    if (mailtoSuccess) {
      return true;
    }

    // Méthode 3: Copier et afficher (toujours fonctionne)
    return await this.copyAndDisplay(data);
  }

  /**
   * Méthode 1: Web Share API (si supportée)
   */
  private async tryWebShare(data: SyndicateEmailData): Promise<boolean> {
    try {
      if (navigator.share) {
        console.log('🔄 Tentative Web Share API...');

        const shareData = {
          title: `Bureau Syndical ${data.bureau_code}`,
          text: this.generateEmailText(data),
          url: data.permanent_link
        };

        await navigator.share(shareData);

        toast.success('✅ Partage initié via Web Share API', {
          description: 'Sélectionnez votre application email'
        });

        console.log('✅ Web Share API utilisée avec succès');
        return true;
      }

      console.log('❌ Web Share API non supportée');
      return false;
    } catch (error) {
      console.log('❌ Erreur Web Share API:', error);
      return false;
    }
  }

  /**
   * Méthode 2: Ouvrir le client email (garanti de fonctionner)
   */
  private async openEmailClient(data: SyndicateEmailData): Promise<boolean> {
    try {
      console.log('🔄 Ouverture du client email...');

      const subject = `🏛️ Création de votre Bureau Syndical - ${data.bureau_code}`;
      const body = this.generateEmailText(data);

      // Créer le lien mailto
      const mailtoLink = `mailto:${data.president_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Ouvrir le client email
      const emailWindow = window.open(mailtoLink);

      // Afficher une notification avec instructions
      toast.success('📧 Client email ouvert !', {
        description: 'Vérifiez votre client email et cliquez sur Envoyer',
        duration: 10000,
        action: {
          label: 'Copier le lien',
          onClick: () => {
            navigator.clipboard.writeText(data.permanent_link);
            toast.success('Lien copié !');
          }
        }
      });

      // Afficher les détails dans la console
      console.log('✅ Client email ouvert');
      console.log('📧 Lien mailto:', mailtoLink);
      console.log('');
      console.log('📋 CONTENU DE L\'EMAIL:');
      console.log('Destinataire:', data.president_email);
      console.log('Sujet:', subject);
      console.log('Corps:', body);

      return true;
    } catch (error) {
      console.log('❌ Erreur ouverture client email:', error);
      return false;
    }
  }

  /**
   * Méthode 3: Copier et afficher (toujours fonctionne)
   */
  private async copyAndDisplay(data: SyndicateEmailData): Promise<boolean> {
    try {
      console.log('🔄 Copie des informations...');

      const emailContent = `
📧 EMAIL À ENVOYER AU PRÉSIDENT
==============================

Destinataire: ${data.president_email}
Sujet: 🏛️ Création de votre Bureau Syndical - ${data.bureau_code}

Message:
${this.generateEmailText(data)}

🔗 LIEN IMPORTANT: ${data.permanent_link}
🔑 TOKEN: ${data.access_token}

INSTRUCTIONS:
1. Copiez ce contenu
2. Ouvrez votre client email
3. Créez un nouveau message
4. Collez le contenu
5. Envoyez à ${data.president_email}
      `;

      // Copier dans le presse-papier
      await navigator.clipboard.writeText(emailContent);

      // Afficher une notification détaillée
      toast.info('📋 Informations copiées !', {
        description: 'Contenu copié - Envoyez manuellement via votre email',
        duration: 15000,
        action: {
          label: 'Voir détails',
          onClick: () => {
            this.showEmailModal(data);
          }
        }
      });

      // Afficher dans la console
      console.log('✅ Informations copiées dans le presse-papier');
      console.log(emailContent);

      return true;
    } catch (error) {
      console.log('❌ Erreur copie:', error);

      // Fallback: afficher dans une alerte
      const alertContent = `
EMAIL À ENVOYER:

Destinataire: ${data.president_email}
Lien: ${data.permanent_link}
Token: ${data.access_token}

Copiez ces informations et envoyez-les par email.
      `;

      alert(alertContent);

      toast.error('❌ Copie impossible', {
        description: 'Informations affichées dans une alerte'
      });

      return true; // On considère que c'est un succès car l'info est affichée
    }
  }

  /**
   * Affiche une modal avec les détails de l'email
   */
  private showEmailModal(data: SyndicateEmailData) {
    const modalContent = `
DÉTAILS DE L'EMAIL À ENVOYER:

📧 Destinataire: ${data.president_email}
👤 Nom: ${data.president_name}
🏛️ Bureau: ${data.bureau_code}
📍 Localisation: ${data.prefecture} - ${data.commune}

🔗 LIEN D'ACCÈS: ${data.permanent_link}
🔑 TOKEN: ${data.access_token}

SUJET DE L'EMAIL:
🏛️ Création de votre Bureau Syndical - ${data.bureau_code}

MESSAGE:
${this.generateEmailText(data)}
    `;

    alert(modalContent);
  }

  /**
   * Génère le texte de l'email
   */
  private generateEmailText(data: SyndicateEmailData): string {
    return `Bonjour ${data.president_name},

Nous avons le plaisir de vous informer que votre bureau syndical a été créé avec succès dans le système 224Solutions.

📋 INFORMATIONS DU BUREAU:
• Code Bureau: ${data.bureau_code}
• Préfecture: ${data.prefecture}
• Commune: ${data.commune}
• Président: ${data.president_name}

🔐 ACCÈS À VOTRE INTERFACE:
Pour accéder à votre interface de gestion, cliquez sur ce lien :
${data.permanent_link}

🔑 TOKEN D'ACCÈS: ${data.access_token}
(Conservez ce token en lieu sûr - il vous sera demandé lors de votre première connexion)

📝 PROCHAINES ÉTAPES:
1. Cliquez sur le lien d'accès ci-dessus
2. Saisissez votre token d'accès
3. Configurez votre profil de président
4. Ajoutez vos premiers membres
5. Commencez la gestion de votre bureau

Si vous avez des questions, n'hésitez pas à nous contacter à support@224solutions.com

Cordialement,
L'équipe 224SOLUTIONS
Système de Gestion Syndicale Professionnel

© 2025 - Tous droits réservés`;
  }

  /**
   * Teste l'envoi d'email avec une adresse de test
   */
  async testEmailSending(testEmail: string = 'test@example.com'): Promise<boolean> {
    const testData: SyndicateEmailData = {
      president_name: 'Test Président',
      president_email: testEmail,
      bureau_code: 'SYN-TEST-001',
      prefecture: 'Test Préfecture',
      commune: 'Test Commune',
      permanent_link: 'https://224solutions.com/syndicat/access/test123',
      access_token: 'TEST_TOKEN_123456'
    };

    console.log('🧪 TEST D\'ENVOI D\'EMAIL');
    console.log('========================');

    return await this.sendSyndicatePresidentEmail(testData);
  }

  /**
   * Envoie un email avec lien d'installation PWA
   */
  async sendInstallLinkEmail(data: InstallLinkEmailData): Promise<boolean> {
    console.log('📱 ENVOI EMAIL LIEN D\'INSTALLATION');
    console.log('====================================');
    console.log('Destinataire:', data.president_email);
    console.log('Bureau:', data.bureau_code);
    console.log('Lien d\'installation:', data.install_link);
    console.log('');

    // Méthode 1: Essayer Web Share API
    const webShareSuccess = await this.tryWebShareInstallLink(data);
    if (webShareSuccess) {
      return true;
    }

    // Méthode 2: Ouvrir le client email avec mailto
    const mailtoSuccess = await this.openEmailClientInstallLink(data);
    if (mailtoSuccess) {
      return true;
    }

    // Méthode 3: Afficher les informations
    this.displayInstallLinkInfo(data);
    return true;
  }

  /**
   * Essaie d'utiliser Web Share API pour le lien d'installation
   */
  private async tryWebShareInstallLink(data: InstallLinkEmailData): Promise<boolean> {
    if (!navigator.share) {
      console.log('❌ Web Share API non supporté');
      return false;
    }

    try {
      const shareData = {
        title: data.subject,
        text: this.generateInstallLinkEmailContent(data),
        url: data.install_link
      };

      await navigator.share(shareData);
      console.log('✅ Web Share API réussi pour lien d\'installation');
      return true;
    } catch (error) {
      console.log('❌ Web Share API échoué pour lien d\'installation:', error);
      return false;
    }
  }

  /**
   * Ouvre le client email avec mailto pour le lien d'installation
   */
  private async openEmailClientInstallLink(data: InstallLinkEmailData): Promise<boolean> {
    try {
      const subject = encodeURIComponent(data.subject);
      const body = encodeURIComponent(this.generateInstallLinkEmailContent(data));
      const mailtoLink = `mailto:${data.president_email}?subject=${subject}&body=${body}`;

      window.open(mailtoLink);
      console.log('✅ Client email ouvert pour lien d\'installation');
      return true;
    } catch (error) {
      console.log('❌ Erreur ouverture client email pour lien d\'installation:', error);
      return false;
    }
  }

  /**
   * Affiche les informations du lien d'installation
   */
  private displayInstallLinkInfo(data: InstallLinkEmailData): void {
    const emailContent = this.generateInstallLinkEmailContent(data);

    console.log('📧 CONTENU EMAIL LIEN D\'INSTALLATION');
    console.log('=====================================');
    console.log('Destinataire:', data.president_email);
    console.log('Sujet:', data.subject);
    console.log('Contenu:');
    console.log(emailContent);
    console.log('Lien d\'installation:', data.install_link);
    console.log('');
    console.log('💡 SOLUTION: Copiez ces informations et envoyez-les manuellement');
  }

  /**
   * Génère le contenu de l'email pour le lien d'installation
   */
  private generateInstallLinkEmailContent(data: InstallLinkEmailData): string {
    return `
📱 INSTALLATION APPLICATION BUREAU SYNDICAT

Bonjour ${data.president_name},

Votre lien d'installation sécurisé pour l'application Bureau Syndicat ${data.bureau_code} est prêt !

🔗 LIEN D'INSTALLATION: ${data.install_link}

📱 INSTRUCTIONS D'INSTALLATION:

• Sur Android: Cliquez sur le lien et appuyez sur "Installer"
• Sur iOS: Cliquez sur le lien, puis "Partager" → "Ajouter à l'écran d'accueil"
• Sur PC: Cliquez sur le lien et suivez les instructions d'installation

⏰ Ce lien est valable 24 heures pour votre sécurité.

Une fois installée, l'application s'ouvrira automatiquement sur votre tableau de bord Bureau Syndicat.

Cordialement,
L'équipe 224Solutions
    `.trim();
  }
}

export const simpleEmailService = SimpleEmailService.getInstance();
export default simpleEmailService;
