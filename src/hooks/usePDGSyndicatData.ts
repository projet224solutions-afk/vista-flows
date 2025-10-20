import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Bureau {
  id: string;
  bureau_code: string;
  prefecture: string;
  commune: string;
  president_name?: string;
  president_email?: string;
  president_phone?: string;
  full_location?: string;
  total_members: number;
  total_vehicles: number;
  total_cotisations: number;
  status: string;
  created_at: string;
  access_token?: string;
  interface_url?: string;
}

export interface SyndicateWorker {
  id: string;
  bureau_id: string;
  nom: string;
  email: string;
  telephone?: string;
  access_level: string;
  permissions: any;
  is_active: boolean;
  created_at: string;
}

export interface SyndicateAlert {
  id: string;
  bureau_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  is_critical: boolean;
  is_read: boolean;
  created_at: string;
}

export interface BureauFeature {
  id: string;
  feature_name: string;
  feature_code: string;
  description: string;
  version: string;
  is_active: boolean;
}

export interface SyndicatStats {
  totalBureaus: number;
  activeBureaus: number;
  totalMembers: number;
  totalVehicles: number;
  totalWorkers: number;
  criticalAlerts: number;
  totalCotisations: number;
}

export const usePDGSyndicatData = () => {
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [workers, setWorkers] = useState<SyndicateWorker[]>([]);
  const [alerts, setAlerts] = useState<SyndicateAlert[]>([]);
  const [features, setFeatures] = useState<BureauFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SyndicatStats>({
    totalBureaus: 0,
    activeBureaus: 0,
    totalMembers: 0,
    totalVehicles: 0,
    totalWorkers: 0,
    criticalAlerts: 0,
    totalCotisations: 0,
  });

  // Charger toutes les données
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [bureausRes, workersRes, alertsRes, featuresRes] = await Promise.all([
        supabase.from('bureaus').select('*').order('created_at', { ascending: false }),
        supabase.from('syndicate_workers').select('*').order('created_at', { ascending: false }),
        supabase.from('syndicate_alerts').select('*').eq('is_critical', true).order('created_at', { ascending: false }).limit(10),
        supabase.from('bureau_features').select('*').eq('is_active', true)
      ]);

      if (bureausRes.error) throw bureausRes.error;
      if (workersRes.error) throw workersRes.error;
      if (alertsRes.error) throw alertsRes.error;
      if (featuresRes.error) throw featuresRes.error;

      const bureausData = bureausRes.data || [];
      const workersData = workersRes.data || [];
      const alertsData = alertsRes.data || [];
      const featuresData = featuresRes.data || [];

      setBureaus(bureausData);
      setWorkers(workersData as any);
      setAlerts(alertsData as any);
      setFeatures(featuresData as any);

      // Calculer les statistiques
      const activeBureaus = bureausData.filter(b => b.status === 'active').length;
      const totalMembers = bureausData.reduce((sum, b) => sum + (b.total_members || 0), 0);
      const totalVehicles = bureausData.reduce((sum, b) => sum + (b.total_vehicles || 0), 0);
      const totalCotisations = bureausData.reduce((sum, b) => sum + (b.total_cotisations || 0), 0);
      const criticalAlerts = alertsData.filter((a: any) => a.is_critical).length;

      setStats({
        totalBureaus: bureausData.length,
        activeBureaus,
        totalMembers,
        totalVehicles,
        totalWorkers: workersData.length,
        criticalAlerts,
        totalCotisations,
      });
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  // Valider un bureau
  const validateBureau = useCallback(async (bureauId: string) => {
    try {
      const { error } = await supabase
        .from('bureaus')
        .update({ 
          status: 'active',
          validated_at: new Date().toISOString()
        })
        .eq('id', bureauId);

      if (error) throw error;

      toast.success('Bureau validé avec succès');
      await loadAllData();
      return true;
    } catch (error) {
      console.error('Erreur validation bureau:', error);
      toast.error('Erreur lors de la validation du bureau');
      return false;
    }
  }, [loadAllData]);

  // Créer un bureau
  const createBureau = useCallback(async (formData: {
    bureau_code: string;
    prefecture: string;
    commune: string;
    president_name?: string;
    president_email?: string;
    president_phone?: string;
    full_location?: string;
  }) => {
    try {
      const access_token = crypto.randomUUID();
      
      const { data: bureau, error } = await supabase
        .from('bureaus')
        .insert([{
          bureau_code: formData.bureau_code,
          prefecture: formData.prefecture,
          commune: formData.commune,
          president_name: formData.president_name,
          president_email: formData.president_email,
          president_phone: formData.president_phone,
          full_location: formData.full_location,
          status: 'active',
          total_members: 0,
          total_vehicles: 0,
          total_cotisations: 0,
          access_token: access_token
        }])
        .select()
        .single();

      if (error) throw error;

      // Envoyer l'email avec le lien permanent
      if (formData.president_email) {
        await supabase.functions.invoke('send-bureau-access-email', {
          body: {
            type: 'bureau',
            email: formData.president_email,
            name: formData.president_name || formData.bureau_code,
            bureau_code: formData.bureau_code,
            access_token: access_token
          }
        });
        toast.success('Bureau créé et email envoyé avec le lien d\'accès');
      } else {
        toast.success('Bureau créé avec succès');
      }

      await loadAllData();
      return bureau;
    } catch (error) {
      console.error('Erreur création bureau:', error);
      toast.error('Erreur lors de la création du bureau');
      return null;
    }
  }, [loadAllData]);

  // Mettre à jour un bureau
  const updateBureau = useCallback(async (bureauId: string, updates: Partial<Bureau>) => {
    try {
      const { error } = await supabase
        .from('bureaus')
        .update(updates)
        .eq('id', bureauId);

      if (error) throw error;

      toast.success('Bureau mis à jour avec succès');
      await loadAllData();
      return true;
    } catch (error: any) {
      console.error('Erreur mise à jour bureau:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du bureau');
      return false;
    }
  }, [loadAllData]);

  // Supprimer un bureau
  const deleteBureau = useCallback(async (bureauId: string) => {
    try {
      // Supprimer d'abord les enregistrements liés
      await Promise.all([
        supabase.from('syndicate_workers').delete().eq('bureau_id', bureauId),
        supabase.from('members').delete().eq('bureau_id', bureauId),
        supabase.from('registered_motos').delete().eq('bureau_id', bureauId),
        supabase.from('syndicate_alerts').delete().eq('bureau_id', bureauId),
        supabase.from('bureau_transactions').delete().eq('bureau_id', bureauId),
        supabase.from('bureau_feature_assignments').delete().eq('bureau_id', bureauId)
      ]);

      // Ensuite supprimer le bureau
      const { error } = await supabase
        .from('bureaus')
        .delete()
        .eq('id', bureauId);

      if (error) throw error;

      toast.success('Bureau supprimé avec succès');
      await loadAllData();
      return true;
    } catch (error: any) {
      console.error('Erreur suppression bureau:', error);
      toast.error(error.message || 'Erreur lors de la suppression du bureau');
      return false;
    }
  }, [loadAllData]);

  // Copier le lien d'accès
  const copyBureauLink = useCallback(async (bureau: Bureau) => {
    try {
      let urlToCopy = bureau.interface_url;

      // Si l'URL n'existe pas, la générer et la sauvegarder
      if (!urlToCopy && bureau.access_token) {
        urlToCopy = `${window.location.origin}/bureau/${bureau.access_token}`;
        
        // Mettre à jour le bureau avec l'URL générée
        const { error } = await supabase
          .from('bureaus')
          .update({ interface_url: urlToCopy })
          .eq('id', bureau.id);

        if (error) {
          console.error('Erreur mise à jour URL:', error);
        }
      }

      if (!urlToCopy) {
        toast.error('Impossible de générer le lien d\'accès');
        return;
      }

      // Copier le lien dans le presse-papier
      await navigator.clipboard.writeText(urlToCopy);
      toast.success("Lien d'accès copié dans le presse-papier");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la copie du lien");
    }
  }, []);

  // Renvoyer le lien par email
  const resendBureauLink = useCallback(async (bureau: Bureau) => {
    if (!bureau.president_email) {
      toast.error('Aucun email de président renseigné');
      return false;
    }

    if (!bureau.access_token) {
      toast.error('Aucun token d\'accès disponible pour ce bureau');
      return false;
    }

    try {
      toast.info('Envoi de l\'email en cours...');

      const { data, error } = await supabase.functions.invoke('send-bureau-access-email', {
        body: {
          type: 'bureau',
          email: bureau.president_email,
          name: bureau.president_name || bureau.bureau_code,
          bureau_code: bureau.bureau_code,
          access_token: bureau.access_token
        }
      });

      if (error) {
        console.error('Erreur fonction edge:', error);
        throw new Error(error.message || 'Erreur lors de l\'appel de la fonction');
      }

      if (data?.error) {
        console.error('Erreur envoi email:', data.error);
        throw new Error(data.error);
      }
      
      toast.success(`✓ Email envoyé avec succès à ${bureau.president_email}`);
      return true;
    } catch (error: any) {
      console.error('Erreur renvoi lien:', error);
      toast.error(`Erreur: ${error.message || 'Erreur lors du renvoi du lien'}`);
      return false;
    }
  }, []);

  // Charger les données au montage
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    bureaus,
    workers,
    alerts,
    features,
    loading,
    stats,
    validateBureau,
    createBureau,
    updateBureau,
    deleteBureau,
    copyBureauLink,
    resendBureauLink,
    refetch: loadAllData,
  };
};
