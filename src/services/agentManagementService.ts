/**
 * 🤝 Service de Gestion des Agents pour 224Solutions
 * 
 * Gère la création d'agents, sous-agents, utilisateurs et le calcul automatique des commissions
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// =====================================================
// TYPES ET INTERFACES
// =====================================================

export interface PDG {
    id: string;
    name: string;
    email: string;
    phone?: string;
    permissions: string[];
    created_at: string;
    updated_at: string;
}

export interface Agent {
    id: string;
    name: string;
    email: string;
    phone: string;
    pdg_id: string;
    can_create_sub_agent: boolean;
    is_active: boolean;
    permissions: string[];
    created_at: string;
    updated_at: string;
}

export interface SubAgent {
    id: string;
    name: string;
    email: string;
    phone: string;
    parent_agent_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AgentUser {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    creator_id: string;
    creator_type: 'agent' | 'sub_agent';
    status: 'invited' | 'active' | 'suspended';
    invite_token?: string;
    activation_link?: string;
    device_type?: 'mobile' | 'pc' | 'tablet';
    activated_at?: string;
    last_login?: string;
    created_at: string;
    updated_at: string;
}

export interface Commission {
    id: string;
    recipient_id: string;
    recipient_type: 'agent' | 'sub_agent';
    amount: number;
    source_type: 'user' | 'sub_agent_user';
    source_user_id: string;
    transaction_id?: string;
    commission_rate: number;
    calculated_at: string;
    paid_at?: string;
    status: 'pending' | 'paid' | 'cancelled';
    created_at: string;
}

export interface AgentTransaction {
    id: string;
    user_id: string;
    gross_amount: number;
    fees: number;
    taxes: number;
    net_amount: number;
    transaction_type: string;
    description?: string;
    metadata: any;
    processed_at: string;
    created_at: string;
}

export interface CommissionSettings {
    base_user_commission: number;
    parent_share_ratio: number;
}

export interface NotificationService {
    sendEmail: (to: string, subject: string, content: string) => Promise<boolean>;
    sendSMS: (to: string, message: string) => Promise<boolean>;
}

// =====================================================
// SERVICE PRINCIPAL
// =====================================================

export class AgentManagementService {
    private baseUrl = window.location.origin;

    // =====================================================
    // GESTION DES AGENTS
    // =====================================================

    /**
     * Créer un nouvel agent (par PDG)
     */
    async createAgent(pdgId: string, agentData: {
        name: string;
        email: string;
        phone: string;
        canCreateSubAgent: boolean;
        permissions?: string[];
    }): Promise<{ success: boolean; agentId?: string; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('agents')
                .insert({
                    name: agentData.name,
                    email: agentData.email,
                    phone: agentData.phone,
                    pdg_id: pdgId,
                    can_create_sub_agent: agentData.canCreateSubAgent,
                    permissions: agentData.permissions || [],
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error('Erreur création agent:', error);
                return { success: false, error: error.message };
            }

            // Log d'audit
            await this.createAuditLog({
                actor_id: pdgId,
                actor_type: 'pdg',
                action: 'create_agent',
                target_id: data.id,
                target_type: 'agent',
                details: { agent_name: agentData.name, permissions: agentData.permissions }
            });

            toast.success(`Agent ${agentData.name} créé avec succès`);
            return { success: true, agentId: data.id };

        } catch (error) {
            console.error('Erreur création agent:', error);
            return { success: false, error: 'Erreur interne lors de la création de l\'agent' };
        }
    }

    /**
     * Créer un nouveau sous-agent (par agent autorisé)
     */
    async createSubAgent(parentAgentId: string, subAgentData: {
        name: string;
        email: string;
        phone: string;
    }): Promise<{ success: boolean; subAgentId?: string; error?: string }> {
        try {
            // Vérifier que l'agent parent peut créer des sous-agents
            const { data: parentAgent, error: parentError } = await supabase
                .from('agents')
                .select('can_create_sub_agent, is_active')
                .eq('id', parentAgentId)
                .single();

            if (parentError || !parentAgent) {
                return { success: false, error: 'Agent parent non trouvé' };
            }

            if (!parentAgent.can_create_sub_agent || !parentAgent.is_active) {
                return { success: false, error: 'Permission refusée : impossible de créer des sous-agents' };
            }

            const { data, error } = await supabase
                .from('sub_agents')
                .insert({
                    name: subAgentData.name,
                    email: subAgentData.email,
                    phone: subAgentData.phone,
                    parent_agent_id: parentAgentId,
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error('Erreur création sous-agent:', error);
                return { success: false, error: error.message };
            }

            // Log d'audit
            await this.createAuditLog({
                actor_id: parentAgentId,
                actor_type: 'agent',
                action: 'create_sub_agent',
                target_id: data.id,
                target_type: 'sub_agent',
                details: { sub_agent_name: subAgentData.name, parent_agent_id: parentAgentId }
            });

            toast.success(`Sous-agent ${subAgentData.name} créé avec succès`);
            return { success: true, subAgentId: data.id };

        } catch (error) {
            console.error('Erreur création sous-agent:', error);
            return { success: false, error: 'Erreur interne lors de la création du sous-agent' };
        }
    }

    // =====================================================
    // GESTION DES UTILISATEURS
    // =====================================================

    /**
     * Créer un nouvel utilisateur avec lien d'invitation
     */
    async createUser(creatorId: string, creatorType: 'agent' | 'sub_agent', userData: {
        name: string;
        email?: string;
        phone?: string;
        notificationMethod: 'email' | 'sms' | 'both';
    }): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
        try {
            // Validation des données
            if (!userData.email && !userData.phone) {
                return { success: false, error: 'Email ou téléphone requis' };
            }

            if (userData.notificationMethod === 'email' && !userData.email) {
                return { success: false, error: 'Email requis pour notification par email' };
            }

            if ((userData.notificationMethod === 'sms' || userData.notificationMethod === 'both') && !userData.phone) {
                return { success: false, error: 'Téléphone requis pour notification par SMS' };
            }

            // Générer le token d'invitation
            const inviteToken = await this.generateInviteToken();
            const activationLink = `${this.baseUrl}/activate/${inviteToken}`;

            // Créer l'utilisateur
            const { data: user, error: userError } = await supabase
                .from('agent_users')
                .insert({
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    creator_id: creatorId,
                    creator_type: creatorType,
                    status: 'invited',
                    invite_token: inviteToken,
                    activation_link: activationLink
                })
                .select()
                .single();

            if (userError) {
                console.error('Erreur création utilisateur:', userError);
                return { success: false, error: userError.message };
            }

            // Créer l'invitation de suivi
            await supabase
                .from('user_invitations')
                .insert({
                    user_id: user.id,
                    invite_token: inviteToken,
                    invite_link: activationLink,
                    sent_via: userData.notificationMethod,
                    sent_to: userData.notificationMethod === 'email' ? userData.email! : userData.phone!
                });

            // Envoyer la notification
            const notificationSent = await this.sendInvitation(userData, activationLink, userData.notificationMethod);

            if (!notificationSent) {
                // Marquer l'invitation comme échouée mais garder l'utilisateur
                console.warn('Échec envoi notification, mais utilisateur créé');
            }

            // Log d'audit
            await this.createAuditLog({
                actor_id: creatorId,
                actor_type: creatorType,
                action: 'create_user',
                target_id: user.id,
                target_type: 'user',
                details: {
                    user_name: userData.name,
                    notification_method: userData.notificationMethod,
                    notification_sent: notificationSent
                }
            });

            toast.success(`Utilisateur ${userData.name} créé et invité avec succès`);
            return { success: true, inviteLink: activationLink };

        } catch (error) {
            console.error('Erreur création utilisateur:', error);
            return { success: false, error: 'Erreur interne lors de la création de l\'utilisateur' };
        }
    }

    /**
     * Activer un utilisateur via son token d'invitation
     */
    async activateUser(inviteToken: string, deviceInfo: {
        deviceType: 'mobile' | 'pc' | 'tablet';
        userAgent?: string;
        ipAddress?: string;
    }): Promise<{ success: boolean; downloadUrl?: string; userData?: AgentUser; error?: string }> {
        try {
            // Trouver l'utilisateur par token
            const { data: user, error: userError } = await supabase
                .from('agent_users')
                .select('*')
                .eq('invite_token', inviteToken)
                .eq('status', 'invited')
                .single();

            if (userError || !user) {
                return { success: false, error: 'Token d\'invitation invalide ou expiré' };
            }

            // Vérifier l'expiration (7 jours par défaut)
            const createdAt = new Date(user.created_at);
            const expirationDate = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

            if (new Date() > expirationDate) {
                return { success: false, error: 'Token d\'invitation expiré' };
            }

            // Activer l'utilisateur
            const { data: activatedUser, error: activationError } = await supabase
                .from('agent_users')
                .update({
                    status: 'active',
                    device_type: deviceInfo.deviceType,
                    activated_at: new Date().toISOString(),
                    last_login: new Date().toISOString()
                })
                .eq('id', user.id)
                .select()
                .single();

            if (activationError) {
                console.error('Erreur activation utilisateur:', activationError);
                return { success: false, error: 'Erreur lors de l\'activation' };
            }

            // Mettre à jour l'invitation
            await supabase
                .from('user_invitations')
                .update({
                    activated_at: new Date().toISOString()
                })
                .eq('invite_token', inviteToken);

            // Déterminer l'URL de téléchargement selon le device
            const downloadUrl = this.getDownloadUrl(deviceInfo.deviceType);

            // Log d'audit
            await this.createAuditLog({
                actor_id: user.id,
                actor_type: 'user',
                action: 'activate_account',
                target_id: user.id,
                target_type: 'user',
                details: {
                    device_type: deviceInfo.deviceType,
                    user_agent: deviceInfo.userAgent,
                    ip_address: deviceInfo.ipAddress
                }
            });

            toast.success(`Compte activé avec succès ! Bienvenue ${user.name}`);
            return {
                success: true,
                downloadUrl,
                userData: activatedUser
            };

        } catch (error) {
            console.error('Erreur activation utilisateur:', error);
            return { success: false, error: 'Erreur interne lors de l\'activation' };
        }
    }

    // =====================================================
    // SYSTÈME DE COMMISSIONS
    // =====================================================

    /**
     * Enregistrer une transaction et calculer les commissions automatiquement
     */
    async processTransaction(transactionData: {
        userId: string;
        grossAmount: number;
        fees?: number;
        taxes?: number;
        transactionType?: string;
        description?: string;
        metadata?: any;
    }): Promise<{ success: boolean; commissions?: Commission[]; error?: string }> {
        try {
            const fees = transactionData.fees || 0;
            const taxes = transactionData.taxes || 0;
            const netAmount = transactionData.grossAmount - fees - taxes;

            // Créer la transaction
            const { data: transaction, error: transactionError } = await supabase
                .from('agent_transactions')
                .insert({
                    user_id: transactionData.userId,
                    gross_amount: transactionData.grossAmount,
                    fees,
                    taxes,
                    net_amount: netAmount,
                    transaction_type: transactionData.transactionType || 'user_activity',
                    description: transactionData.description,
                    metadata: transactionData.metadata || {}
                })
                .select()
                .single();

            if (transactionError) {
                console.error('Erreur création transaction:', transactionError);
                return { success: false, error: transactionError.message };
            }

            // Calculer les commissions via la fonction PostgreSQL
            const { data: commissionCalculations, error: commissionError } = await supabase
                .rpc('calculate_user_commission', {
                    p_user_id: transactionData.userId,
                    p_net_amount: netAmount
                });

            if (commissionError) {
                console.error('Erreur calcul commission:', commissionError);
                return { success: false, error: 'Erreur lors du calcul des commissions' };
            }

            // Créer les enregistrements de commission
            const commissions: Commission[] = [];
            for (const calc of commissionCalculations) {
                const { data: commission, error: commInsertError } = await supabase
                    .from('commissions')
                    .insert({
                        recipient_id: calc.recipient_id,
                        recipient_type: calc.recipient_type,
                        amount: calc.amount,
                        source_type: 'user',
                        source_user_id: transactionData.userId,
                        transaction_id: transaction.id,
                        commission_rate: calc.commission_rate,
                        status: 'pending'
                    })
                    .select()
                    .single();

                if (!commInsertError && commission) {
                    commissions.push(commission);
                }
            }

            // Log d'audit
            await this.createAuditLog({
                actor_id: transactionData.userId,
                actor_type: 'user',
                action: 'process_transaction',
                target_id: transaction.id,
                target_type: 'transaction',
                details: {
                    gross_amount: transactionData.grossAmount,
                    net_amount: netAmount,
                    commissions_count: commissions.length
                }
            });

            return { success: true, commissions };

        } catch (error) {
            console.error('Erreur traitement transaction:', error);
            return { success: false, error: 'Erreur interne lors du traitement de la transaction' };
        }
    }

    /**
     * Mettre à jour les paramètres de commission (PDG uniquement)
     */
    async updateCommissionSettings(pdgId: string, settings: Partial<CommissionSettings>): Promise<{ success: boolean; error?: string }> {
        try {
            const updates = [];

            if (typeof settings.base_user_commission === 'number') {
                updates.push(
                    supabase
                        .from('commission_settings')
                        .update({
                            setting_value: settings.base_user_commission,
                            updated_by: pdgId,
                            updated_at: new Date().toISOString()
                        })
                        .eq('setting_key', 'base_user_commission')
                );
            }

            if (typeof settings.parent_share_ratio === 'number') {
                updates.push(
                    supabase
                        .from('commission_settings')
                        .update({
                            setting_value: settings.parent_share_ratio,
                            updated_by: pdgId,
                            updated_at: new Date().toISOString()
                        })
                        .eq('setting_key', 'parent_share_ratio')
                );
            }

            if (updates.length === 0) {
                return { success: false, error: 'Aucun paramètre à mettre à jour' };
            }

            const results = await Promise.all(updates);
            const hasError = results.some(result => result.error);

            if (hasError) {
                console.error('Erreur mise à jour paramètres commission');
                return { success: false, error: 'Erreur lors de la mise à jour des paramètres' };
            }

            // Log d'audit
            await this.createAuditLog({
                actor_id: pdgId,
                actor_type: 'pdg',
                action: 'update_commission_settings',
                target_id: pdgId,
                target_type: 'settings',
                details: settings
            });

            toast.success('Paramètres de commission mis à jour avec succès');
            return { success: true };

        } catch (error) {
            console.error('Erreur mise à jour paramètres commission:', error);
            return { success: false, error: 'Erreur interne' };
        }
    }

    // =====================================================
    // MÉTHODES DE RÉCUPÉRATION DE DONNÉES
    // =====================================================

    /**
     * Récupérer tous les agents (PDG)
     */
    async getAgents(pdgId?: string): Promise<Agent[]> {
        try {
            let query = supabase.from('agents').select('*').eq('is_active', true);

            if (pdgId) {
                query = query.eq('pdg_id', pdgId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error('Erreur récupération agents:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Erreur récupération agents:', error);
            return [];
        }
    }

    /**
     * Récupérer les sous-agents d'un agent
     */
    async getSubAgents(parentAgentId: string): Promise<SubAgent[]> {
        try {
            const { data, error } = await supabase
                .from('sub_agents')
                .select('*')
                .eq('parent_agent_id', parentAgentId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erreur récupération sous-agents:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Erreur récupération sous-agents:', error);
            return [];
        }
    }

    /**
     * Récupérer les utilisateurs d'un créateur
     */
    async getUsers(creatorId?: string, creatorType?: 'agent' | 'sub_agent'): Promise<AgentUser[]> {
        try {
            let query = supabase.from('agent_users').select('*');

            if (creatorId) {
                query = query.eq('creator_id', creatorId);
            }

            if (creatorType) {
                query = query.eq('creator_type', creatorType);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error('Erreur récupération utilisateurs:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Erreur récupération utilisateurs:', error);
            return [];
        }
    }

    /**
     * Récupérer les commissions d'un bénéficiaire
     */
    async getCommissions(recipientId: string, recipientType?: 'agent' | 'sub_agent'): Promise<Commission[]> {
        try {
            let query = supabase.from('commissions').select('*').eq('recipient_id', recipientId);

            if (recipientType) {
                query = query.eq('recipient_type', recipientType);
            }

            const { data, error } = await query.order('calculated_at', { ascending: false });

            if (error) {
                console.error('Erreur récupération commissions:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Erreur récupération commissions:', error);
            return [];
        }
    }

    /**
     * Récupérer les paramètres de commission actuels
     */
    async getCommissionSettings(): Promise<CommissionSettings> {
        try {
            const { data, error } = await supabase
                .from('commission_settings')
                .select('setting_key, setting_value')
                .in('setting_key', ['base_user_commission', 'parent_share_ratio']);

            if (error) {
                console.error('Erreur récupération paramètres commission:', error);
                return { base_user_commission: 0.2, parent_share_ratio: 0.5 };
            }

            const settings: any = {};
            data?.forEach(setting => {
                settings[setting.setting_key] = setting.setting_value;
            });

            return {
                base_user_commission: settings.base_user_commission || 0.2,
                parent_share_ratio: settings.parent_share_ratio || 0.5
            };
        } catch (error) {
            console.error('Erreur récupération paramètres commission:', error);
            return { base_user_commission: 0.2, parent_share_ratio: 0.5 };
        }
    }

    // =====================================================
    // MÉTHODES UTILITAIRES PRIVÉES
    // =====================================================

    /**
     * Générer un token d'invitation unique
     */
    private async generateInviteToken(): Promise<string> {
        const { data, error } = await supabase.rpc('generate_invite_token');

        if (error || !data) {
            // Fallback : générer un token côté client
            return btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
        }

        return data;
    }

    /**
     * Envoyer une invitation par email ou SMS
     */
    private async sendInvitation(
        userData: { name: string; email?: string; phone?: string },
        activationLink: string,
        method: 'email' | 'sms' | 'both'
    ): Promise<boolean> {
        try {
            let emailSent = true;
            let smsSent = true;

            if ((method === 'email' || method === 'both') && userData.email) {
                // TODO: Intégrer service email réel (SendGrid, Resend, etc.)
                emailSent = await this.sendEmailNotification(
                    userData.email,
                    'Invitation 224Solutions - Activez votre compte',
                    this.generateEmailContent(userData.name, activationLink)
                );
            }

            if ((method === 'sms' || method === 'both') && userData.phone) {
                // TODO: Intégrer service SMS réel (Twilio, etc.)
                smsSent = await this.sendSMSNotification(
                    userData.phone,
                    `Bonjour ${userData.name}, activez votre compte 224Solutions: ${activationLink}`
                );
            }

            return emailSent && smsSent;
        } catch (error) {
            console.error('Erreur envoi invitation:', error);
            return false;
        }
    }

    /**
     * Envoyer un email (placeholder - à implémenter avec service réel)
     */
    private async sendEmailNotification(to: string, subject: string, content: string): Promise<boolean> {
        // TODO: Implémenter avec service email réel
        console.log(`EMAIL TO: ${to}, SUBJECT: ${subject}, CONTENT: ${content}`);
        return true; // Simuler succès
    }

    /**
     * Envoyer un SMS (placeholder - à implémenter avec service réel)
     */
    private async sendSMSNotification(to: string, message: string): Promise<boolean> {
        // TODO: Implémenter avec service SMS réel
        console.log(`SMS TO: ${to}, MESSAGE: ${message}`);
        return true; // Simuler succès
    }

    /**
     * Générer le contenu HTML de l'email d'invitation
     */
    private generateEmailContent(userName: string, activationLink: string): string {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Bienvenue sur 224Solutions !</h2>
        <p>Bonjour <strong>${userName}</strong>,</p>
        <p>Vous avez été invité(e) à rejoindre la plateforme 224Solutions.</p>
        <p>Cliquez sur le bouton ci-dessous pour activer votre compte :</p>
        <a href="${activationLink}" 
           style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Activer mon compte
        </a>
        <p>Ou copiez ce lien dans votre navigateur : <br><a href="${activationLink}">${activationLink}</a></p>
        <p>Ce lien expire dans 7 jours.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">L'équipe 224Solutions</p>
      </div>
    `;
    }

    /**
     * Obtenir l'URL de téléchargement selon le type de device
     */
    private getDownloadUrl(deviceType: 'mobile' | 'pc' | 'tablet'): string {
        switch (deviceType) {
            case 'mobile':
                return 'https://play.google.com/store/apps/details?id=com.solutions224';
            case 'tablet':
                return 'https://play.google.com/store/apps/details?id=com.solutions224';
            case 'pc':
                return `${this.baseUrl}/download/224solutions-desktop.exe`;
            default:
                return `${this.baseUrl}/download`;
        }
    }

    /**
     * Créer un log d'audit
     */
    private async createAuditLog(logData: {
        actor_id: string;
        actor_type: string;
        action: string;
        target_id: string;
        target_type: string;
        details: any;
    }): Promise<void> {
        try {
            await supabase
                .from('agent_audit_logs')
                .insert({
                    ...logData,
                    ip_address: '127.0.0.1', // TODO: Récupérer vraie IP
                    user_agent: navigator.userAgent
                });
        } catch (error) {
            console.error('Erreur création log audit:', error);
            // Ne pas faire échouer l'opération principale pour un problème de log
        }
    }
}

// Instance singleton
export const agentService = new AgentManagementService();
