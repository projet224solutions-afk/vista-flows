import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface POSSettings {
  id: string;
  vendor_id: string;
  tax_rate: number;
  currency: string;
  company_name: string;
  receipt_footer?: string;
  auto_print_receipt: boolean;
  created_at: string;
  updated_at: string;
}

export function usePOSSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<POSSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    if (!user) {
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
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching POS settings:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (!data) {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('pos_settings')
          .insert({
            vendor_id: user.id,
            tax_rate: 0.18,
            currency: 'FCFA',
            company_name: 'Mon Commerce',
            auto_print_receipt: false
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating POS settings:', createError);
          setError(createError.message);
          return;
        }

        setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error in fetchSettings:', err);
      setError('Une erreur est survenue lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<POSSettings>) => {
    if (!user || !settings) {
      toast.error('Impossible de mettre à jour les paramètres');
      return false;
    }

    try {
      const { data, error: updateError } = await supabase
        .from('pos_settings')
        .update(updates)
        .eq('vendor_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating POS settings:', updateError);
        toast.error('Erreur lors de la mise à jour des paramètres');
        return false;
      }

      setSettings(data);
      toast.success('Paramètres mis à jour avec succès');
      return true;
    } catch (err) {
      console.error('Error in updateSettings:', err);
      toast.error('Une erreur est survenue lors de la mise à jour');
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings
  };
}