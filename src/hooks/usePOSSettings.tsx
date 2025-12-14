/**
 * Hook pour la gestion des paramètres POS
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface POSSettings {
  id?: string;
  vendor_id: string;
  company_name: string;
  logo_url?: string;
  tax_enabled: boolean;
  tax_rate: number;
  currency: string;
  receipt_footer: string;
  auto_print_receipt?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const usePOSSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<POSSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les paramètres
  const loadSettings = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('pos_settings')
        .select('*')
        .eq('vendor_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setSettings(data);
      } else {
        // Créer des paramètres par défaut
        const defaultSettings: Omit<POSSettings, 'id' | 'created_at' | 'updated_at'> = {
          vendor_id: user.id,
          company_name: 'Mon Commerce',
          tax_enabled: true,
          tax_rate: 0.18,
          currency: 'GNF',
          receipt_footer: 'Merci de votre visite !',
          auto_print_receipt: false
        };

        const { data: newSettings, error: createError } = await supabase
          .from('pos_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        setSettings(newSettings);
      }
    } catch (err) {
      console.error('Erreur chargement paramètres POS:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');

      // Utiliser des paramètres par défaut en cas d'erreur
      setSettings({
        vendor_id: user.id,
        company_name: 'Mon Commerce',
        tax_enabled: true,
        tax_rate: 0.18,
        currency: 'GNF',
        receipt_footer: 'Merci de votre visite !',
        auto_print_receipt: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour les paramètres
  const updateSettings = async (updates: Partial<POSSettings>) => {
    if (!user?.id || !settings) {
      toast.error('Impossible de mettre à jour les paramètres');
      return;
    }

    try {
      const updatedSettings = { ...settings, ...updates };

      if (settings.id) {
        // Mettre à jour les paramètres existants
        const { data, error: updateError } = await supabase
          .from('pos_settings')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setSettings(data);
      } else {
        // Créer de nouveaux paramètres
        const { data, error: createError } = await supabase
          .from('pos_settings')
          .insert(updatedSettings)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        setSettings(data);
      }

      toast.success('Paramètres mis à jour');
    } catch (err) {
      console.error('Erreur mise à jour paramètres POS:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Réinitialiser les paramètres
  const resetSettings = async () => {
    if (!user?.id) return;

    try {
      const defaultSettings: Omit<POSSettings, 'id' | 'created_at' | 'updated_at'> = {
        vendor_id: user.id,
        company_name: 'Mon Commerce',
        tax_enabled: true,
        tax_rate: 0.18,
        currency: 'GNF',
        receipt_footer: 'Merci de votre visite !',
        auto_print_receipt: false
      };

      if (settings?.id) {
        const { data, error: updateError } = await supabase
          .from('pos_settings')
          .update(defaultSettings)
          .eq('id', settings.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setSettings(data);
      }

      toast.success('Paramètres réinitialisés');
    } catch (err) {
      console.error('Erreur réinitialisation paramètres POS:', err);
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user?.id]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSettings,
    reload: loadSettings
  };
};