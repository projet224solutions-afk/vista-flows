import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentPermission {
  id: string;
  agent_id: string;
  permission_key: string;
  permission_value: boolean;
  created_at: string;
  updated_at: string;
}

export const AVAILABLE_PERMISSIONS = {
  // ==================== FINANCE ====================
  view_finance: 'Voir Finance & Revenus',
  manage_finance: 'Gérer Finance & Revenus',
  view_banking: 'Voir Système Bancaire',
  manage_banking: 'Gérer Système Bancaire',
  manage_wallet_transactions: 'Gérer les transactions wallet',
  access_pdg_wallet: 'Accès à la caisse PDG',
  view_financial_module: 'Accès au module financier',
  manage_commissions: 'Accès au module de commissions',
  view_payments: 'Voir les paiements internes',
  manage_payments: 'Gérer les paiements internes',

  // ==================== GESTION ====================
  view_users: 'Voir les utilisateurs',
  manage_users: 'Gérer les utilisateurs',
  create_users: 'Créer des utilisateurs',
  view_products: 'Voir les produits',
  manage_products: 'Gérer les produits',
  view_transfer_fees: 'Voir les frais de transfert',
  manage_transfer_fees: 'Gérer les frais de transfert',
  view_kyc: 'Voir la gestion KYC',
  manage_kyc: 'Gérer le KYC (valider/rejeter)',
  view_service_subscriptions: 'Voir les abonnements services',
  manage_service_subscriptions: 'Gérer les abonnements services',

  // ==================== OPÉRATIONS ====================
  view_agents: 'Voir les agents',
  manage_agents: 'Gérer les agents',
  create_sub_agents: 'Créer des sous-agents',
  view_syndicat: 'Voir les bureaux syndicaux',
  manage_syndicat: 'Gérer les bureaux syndicaux',
  view_bureau_monitoring: 'Voir le monitoring bureaux',
  manage_bureau_monitoring: 'Gérer le monitoring bureaux',
  view_driver_subscriptions: 'Voir les abonnements chauffeurs',
  manage_driver_subscriptions: 'Gérer les abonnements chauffeurs',
  view_stolen_vehicles: 'Voir les motos volées',
  manage_stolen_vehicles: 'Gérer les motos volées',
  view_orders: 'Voir les commandes',
  manage_orders: 'Gérer les commandes',
  view_vendors: 'Voir les vendeurs',
  manage_vendors: 'Gérer les vendeurs',
  view_vendor_kyc: 'Voir la vérification KYC vendeurs',
  manage_vendor_kyc: 'Gérer la vérification KYC vendeurs',
  view_vendor_certification: 'Voir la certification vendeurs',
  manage_vendor_certification: 'Gérer la certification vendeurs',
  view_drivers: 'Voir les livreurs',
  manage_drivers: 'Gérer les livreurs',
  view_quotes_invoices: 'Voir devis & factures',
  manage_quotes_invoices: 'Gérer devis & factures',
  access_communication: 'Accès communication',
  manage_communication: 'Gérer la communication',
  view_agent_wallet_audit: 'Voir audit wallet agents',
  manage_agent_wallet_audit: 'Gérer audit wallet agents',

  // ==================== SYSTÈME ====================
  view_security: 'Voir la sécurité',
  manage_security: 'Gérer la sécurité',
  view_id_normalization: 'Voir l\'audit ID',
  manage_id_normalization: 'Gérer l\'audit ID',
  view_bug_bounty: 'Voir Bug Bounty',
  manage_bug_bounty: 'Gérer Bug Bounty',
  view_config: 'Voir la configuration',
  manage_config: 'Gérer la configuration',
  view_maintenance: 'Voir la maintenance',
  manage_maintenance: 'Gérer la maintenance',
  view_api: 'Voir les API',
  manage_api: 'Gérer les API',
  view_debug: 'Voir Debug & Surveillance',
  manage_debug: 'Gérer Debug & Surveillance',

  // ==================== INTELLIGENCE ====================
  access_ai_assistant: 'Accès Assistant IA',
  access_copilot: 'Accès Copilote IA',
  access_copilot_dashboard: 'Accès Copilote Executive',
  view_copilot_audit: 'Voir Audit Copilote',
  view_reports: 'Voir les rapports',
  manage_reports: 'Gérer les rapports',
  view_statistics: 'Voir les statistiques globales',

  // ==================== SPÉCIAL ====================
  manage_sanctions: 'Gérer les sanctions utilisateurs',
  access_suppliers: 'Accès module fournisseurs',
  manage_deliveries: 'Gestion des livraisons',
} as const;

export type PermissionKey = keyof typeof AVAILABLE_PERMISSIONS;

export const useAgentPermissions = (agentId: string | undefined) => {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Charger les permissions de l'agent
  const loadPermissions = useCallback(async () => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_agent_permissions' as any, {
          p_agent_id: agentId
        });

      if (error) throw error;

      setPermissions((data as Record<string, boolean>) || {});
    } catch (error: any) {
      console.error('Erreur chargement permissions:', error);
      toast.error('Erreur lors du chargement des permissions');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Mettre à jour les permissions
  const setAgentPermissions = useCallback(async (newPermissions: Record<string, boolean>) => {
    if (!agentId) return false;

    try {
      const { data, error } = await supabase
        .rpc('set_agent_permissions' as any, {
          p_agent_id: agentId,
          p_permissions: newPermissions
        });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour');
      }

      toast.success(result.message || 'Permissions mises à jour');
      await loadPermissions();
      return true;
    } catch (error: any) {
      console.error('Erreur mise à jour permissions:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour des permissions');
      return false;
    }
  }, [agentId, loadPermissions]);

  // Vérifier une permission spécifique
  const hasPermission = useCallback((permissionKey: string): boolean => {
    return permissions[permissionKey] === true;
  }, [permissions]);

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!agentId) return;

    loadPermissions();

    // S'abonner aux changements en temps réel
    const channel = supabase
      .channel('agent-permissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_permissions',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('Permission updated:', payload);
          loadPermissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, loadPermissions]);

  return {
    permissions,
    loading,
    setAgentPermissions,
    hasPermission,
    reload: loadPermissions
  };
};
