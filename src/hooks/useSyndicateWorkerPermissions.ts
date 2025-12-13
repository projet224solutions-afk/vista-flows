import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Permissions disponibles pour les membres du bureau syndicat
export const SYNDICATE_WORKER_PERMISSIONS = {
  // Dashboard & Vue d'ensemble
  view_dashboard: 'Voir le tableau de bord',
  view_statistics: 'Voir les statistiques',
  
  // Gestion des membres
  view_members: 'Voir les membres',
  add_members: 'Ajouter des membres',
  edit_members: 'Modifier les membres',
  delete_members: 'Supprimer les membres',
  
  // Gestion des taxi-motards
  view_drivers: 'Voir les taxi-motards',
  add_drivers: 'Ajouter des taxi-motards',
  edit_drivers: 'Modifier les taxi-motards',
  delete_drivers: 'Supprimer les taxi-motards',
  
  // Véhicules
  view_vehicles: 'Voir les véhicules',
  add_vehicles: 'Ajouter des véhicules',
  edit_vehicles: 'Modifier les véhicules',
  delete_vehicles: 'Supprimer les véhicules',
  manage_stolen_vehicles: 'Gérer les véhicules volés',
  
  // SOS & Alertes
  view_sos_alerts: 'Voir les alertes SOS',
  manage_sos_alerts: 'Gérer les alertes SOS',
  respond_sos: 'Répondre aux SOS',
  
  // Tickets de transport
  view_tickets: 'Voir les tickets',
  generate_tickets: 'Générer des tickets',
  manage_tickets: 'Gérer les tickets',
  
  // Trésorerie & Wallet
  view_wallet: 'Voir le portefeuille',
  make_transfers: 'Effectuer des transferts',
  view_transactions: 'Voir les transactions',
  manage_cotisations: 'Gérer les cotisations',
  
  // Badges
  view_badges: 'Voir les badges',
  generate_badges: 'Générer des badges',
  
  // Gestion & Paramètres
  view_settings: 'Voir les paramètres',
  edit_settings: 'Modifier les paramètres',
  manage_bureau_info: 'Gérer les infos du bureau',
  
  // Analytics & Rapports
  view_analytics: 'Voir les analytics',
  export_reports: 'Exporter les rapports',
  
  // Communication
  send_notifications: 'Envoyer des notifications',
  manage_communications: 'Gérer les communications',
} as const;

export type SyndicateWorkerPermissionKey = keyof typeof SYNDICATE_WORKER_PERMISSIONS;

export interface SyndicateWorkerPermissions {
  [key: string]: boolean;
}

export const useSyndicateWorkerPermissions = (workerId?: string) => {
  const [permissions, setPermissions] = useState<SyndicateWorkerPermissions>({});
  const [loading, setLoading] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (!workerId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_syndicate_worker_permissions', {
        p_worker_id: workerId
      });

      if (error) {
        console.error('Error loading worker permissions:', error);
        return;
      }

      // Cast data to SyndicateWorkerPermissions
      const permissionsData = (data && typeof data === 'object' && !Array.isArray(data)) 
        ? data as SyndicateWorkerPermissions 
        : {};
      setPermissions(permissionsData);
    } catch (err) {
      console.error('Error in loadPermissions:', err);
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  const setWorkerPermissions = useCallback(async (newPermissions: SyndicateWorkerPermissions) => {
    if (!workerId) {
      toast.error('ID du membre non trouvé');
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('set_syndicate_worker_permissions', {
        p_worker_id: workerId,
        p_permissions: newPermissions
      });

      if (error) {
        console.error('Error setting worker permissions:', error);
        toast.error('Erreur lors de la sauvegarde des permissions');
        return false;
      }

      setPermissions(newPermissions);
      toast.success('Permissions mises à jour');
      return true;
    } catch (err) {
      console.error('Error in setWorkerPermissions:', err);
      toast.error('Erreur lors de la sauvegarde des permissions');
      return false;
    }
  }, [workerId]);

  const hasPermission = useCallback((key: SyndicateWorkerPermissionKey): boolean => {
    return permissions[key] === true;
  }, [permissions]);

  useEffect(() => {
    if (workerId) {
      loadPermissions();
    }
  }, [workerId, loadPermissions]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!workerId) return;

    const channel = supabase
      .channel(`worker_permissions_${workerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'syndicate_worker_permissions',
          filter: `worker_id=eq.${workerId}`
        },
        () => {
          loadPermissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workerId, loadPermissions]);

  return {
    permissions,
    loading,
    setWorkerPermissions,
    hasPermission,
    reload: loadPermissions,
  };
};
