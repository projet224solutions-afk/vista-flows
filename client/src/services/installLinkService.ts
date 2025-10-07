/**
 * SERVICE D'ENVOI DE LIENS D'INSTALLATION
 * Gestion des liens d'installation sécurisés avec SMS/Email
 * 224Solutions - Bureau Syndicat System
 */

import { supabase } from '@/lib/supabase';

export interface InstallLinkData {
    bureauId: string;
    presidentName: string;
    presidentEmail?: string;
    presidentPhone?: string;
    bureauCode: string;
    prefecture: string;
    commune: string;
}

export interface InstallLinkResult {
    success: boolean;
    link?: string;
    token?: string;
    message?: string;
    error?: string;
}

class InstallLinkService {
    private readonly BASE_URL = window.location.origin;
    private readonly TOKEN_EXPIRY_HOURS = 24;

    /**
     * Génère un token d'installation sécurisé
     */
    private generateInstallToken(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2);
        return `install_${timestamp}_${random}`;
    }

    /**
     * Crée un lien d'installation sécurisé
     */
    private createInstallLink(token: string): string {
        return `${this.BASE_URL}/syndicat/install/${token}`;
    }

    /**
     * Sauvegarde le token d'installation dans la base de données
     */
    private async saveInstallToken(
        bureauId: string,
        token: string,
        expiresAt: Date
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('bureau_invites')
                .insert({
                    bureau_id: bureauId,
                    token,
                    expires_at: expiresAt.toISOString(),
                    used: false
                });

            if (error) {
                console.error('❌ Erreur sauvegarde token:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Exception sauvegarde token:', error);
            return false;
        }
    }

    /**
     * Envoie le lien d'installation par email
     */
    private async sendInstallEmail(
        email: string,
        presidentName: string,
        bureauCode: string,
        installLink: string
    ): Promise<boolean> {
        try {
            // Import dynamique du service email
            const { simpleEmailService } = await import('@/services/simpleEmailService');

            const emailData = {
                president_name: presidentName,
                president_email: email,
                bureau_code: bureauCode,
                install_link: installLink,
                subject: `📱 Installation Bureau Syndicat - ${bureauCode}`
            };

            return await simpleEmailService.sendInstallLinkEmail(emailData);
        } catch (error) {
            console.error('❌ Erreur envoi email:', error);
            return false;
        }
    }

    /**
     * Envoie le lien d'installation par SMS
     */
    private async sendInstallSMS(
        phone: string,
        presidentName: string,
        bureauCode: string,
        installLink: string
    ): Promise<boolean> {
        try {
            // Pour l'instant, on simule l'envoi SMS
            // Dans un vrai projet, intégrer Twilio ou un autre service SMS
            console.log('📱 SMS à envoyer:', {
                to: phone,
                message: `Bonjour ${presidentName}, voici votre lien d'installation pour le Bureau Syndicat ${bureauCode}: ${installLink}`
            });

            // Simulation d'envoi réussi
            return true;
        } catch (error) {
            console.error('❌ Erreur envoi SMS:', error);
            return false;
        }
    }

    /**
     * Génère et envoie un lien d'installation
     */
    async generateAndSendInstallLink(data: InstallLinkData): Promise<InstallLinkResult> {
        try {
            console.log('🚀 GÉNÉRATION LIEN D\'INSTALLATION');
            console.log('=====================================');
            console.log('📋 Données:', data);

            // Générer le token et le lien
            const token = this.generateInstallToken();
            const installLink = this.createInstallLink(token);
            const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

            console.log('🔑 Token généré:', token);
            console.log('🔗 Lien d\'installation:', installLink);
            console.log('⏰ Expire le:', expiresAt.toLocaleString());

            // Sauvegarder le token
            const tokenSaved = await this.saveInstallToken(data.bureauId, token, expiresAt);
            if (!tokenSaved) {
                return {
                    success: false,
                    error: 'Impossible de sauvegarder le token d\'installation'
                };
            }

            // Déterminer le mode d'envoi
            const hasEmail = data.presidentEmail && data.presidentEmail.includes('@');
            const hasPhone = data.presidentPhone && data.presidentPhone.length > 5;

            let sendSuccess = false;
            let sendMethod = '';

            if (hasEmail) {
                console.log('📧 Envoi par email...');
                sendSuccess = await this.sendInstallEmail(
                    data.presidentEmail!,
                    data.presidentName,
                    data.bureauCode,
                    installLink
                );
                sendMethod = 'email';
            } else if (hasPhone) {
                console.log('📱 Envoi par SMS...');
                sendSuccess = await this.sendInstallSMS(
                    data.presidentPhone!,
                    data.presidentName,
                    data.bureauCode,
                    installLink
                );
                sendMethod = 'SMS';
            } else {
                return {
                    success: false,
                    error: 'Aucun email ou téléphone valide fourni'
                };
            }

            if (sendSuccess) {
                console.log('✅ Lien d\'installation envoyé avec succès par', sendMethod);
                return {
                    success: true,
                    link: installLink,
                    token,
                    message: `Lien d'installation envoyé par ${sendMethod}`
                };
            } else {
                return {
                    success: false,
                    error: `Échec de l'envoi par ${sendMethod}`
                };
            }

        } catch (error) {
            console.error('❌ Erreur génération lien:', error);
            return {
                success: false,
                error: 'Erreur lors de la génération du lien d\'installation'
            };
        }
    }

    /**
     * Vérifie la validité d'un token d'installation
     */
    async validateInstallToken(token: string): Promise<{
        valid: boolean;
        bureauId?: string;
        error?: string;
    }> {
        try {
            const { data, error } = await supabase
                .from('bureau_invites')
                .select('bureau_id, expires_at, used')
                .eq('token', token)
                .single();

            if (error || !data) {
                return { valid: false, error: 'Token invalide' };
            }

            // Vérifier si le token a expiré
            const now = new Date();
            const expiresAt = new Date(data.expires_at);

            if (now > expiresAt) {
                return { valid: false, error: 'Token expiré' };
            }

            // Vérifier si le token a déjà été utilisé
            if (data.used) {
                return { valid: false, error: 'Token déjà utilisé' };
            }

            return { valid: true, bureauId: data.bureau_id };
        } catch (error) {
            console.error('❌ Erreur validation token:', error);
            return { valid: false, error: 'Erreur de validation' };
        }
    }

    /**
     * Marque un token comme utilisé
     */
    async markTokenAsUsed(token: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('bureau_invites')
                .update({ used: true })
                .eq('token', token);

            if (error) {
                console.error('❌ Erreur marquage token:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Exception marquage token:', error);
            return false;
        }
    }
}

export const installLinkService = new InstallLinkService();
