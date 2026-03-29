/**
 * DASHBOARD VENDEUR DIGITAL - Interface dédiée produits numériques
 * Complètement séparé du dashboard vendeur e-commerce classique
 * Note: CommunicationWidget retiré car déjà rendu null et évite doublons potentiels
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DigitalVendorSidebar } from '@/components/digital-vendor/DigitalVendorSidebar';
import { DigitalVendorHeader } from '@/components/digital-vendor/DigitalVendorHeader';
import { DigitalVendorRoutes } from '@/components/digital-vendor/DigitalVendorRoutes';
import { PageLoader } from '@/components/ui/GlobalLoader';
import { DataLoadTimeoutState } from '@/components/ui/DataLoadTimeoutState';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import { supabase } from '@/integrations/supabase/client';

export default function DigitalVendorDashboard() {
  const { user, profile, signOut, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  useRoleRedirect();

  const [vendorId, setVendorId] = useState<string>('');
  const [vendorLoading, setVendorLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id) {
      setVendorLoading(false);
      setVendorId('');
      return;
    }

    const loadVendorId = async () => {
      setVendorLoading(true);
      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('FIRST SUPABASE ERROR', {
            scope: 'DigitalVendorDashboard.loadVendorId',
            message: error.message,
          });
          return;
        }

        if (data?.id) setVendorId(data.id);
      } catch (error) {
        console.error('FIRST SUPABASE ERROR', {
          scope: 'DigitalVendorDashboard.loadVendorId.catch',
          error,
        });
      } finally {
        setVendorLoading(false);
      }
    };

    void loadVendorId();
  }, [user?.id]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast({ title: 'Déconnexion réussie' });
      navigate('/');
    } catch (err) {
      console.error('Erreur déconnexion:', err);
      toast({ title: 'Erreur', description: 'Erreur lors de la déconnexion', variant: 'destructive' });
    }
  }, [signOut, toast, navigate]);

  const isLoading = authLoading || profileLoading || (!!user && vendorLoading);
  const { timedOut: loadingTimedOut, resetTimeout } = useLoadingTimeout(isLoading, 8000);

  if (loadingTimedOut) {
    return (
      <DataLoadTimeoutState
        title="Impossible de charger le dashboard vendeur digital"
        description="Le chargement est trop long. Réessayez ou rechargez l’application."
        onRetry={resetTimeout}
        onReload={() => window.location.reload()}
      />
    );
  }

  if (isLoading) {
    return <PageLoader text="Chargement des données..." />;
  }

  if (!user) {
    return (
      <DataLoadTimeoutState
        title="Session non disponible"
        description="Impossible de restaurer la session utilisateur."
        onRetry={resetTimeout}
        onReload={() => window.location.reload()}
      />
    );
  }

  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'Vendeur Digital';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-gradient-to-br from-purple-50/30 via-white to-indigo-50/30 dark:from-background dark:via-background dark:to-background overflow-x-hidden">
        <DigitalVendorSidebar />

        <div className="flex-1 flex flex-col w-full min-w-0 max-w-full overflow-x-hidden">
          <DigitalVendorHeader displayName={displayName} onSignOut={handleSignOut} />

          <main
            className="flex-1 p-2 sm:p-3 md:p-6 overflow-x-auto overflow-y-auto pt-4 pb-24 md:pb-8 w-full max-w-full"
            role="main"
            aria-label="Dashboard vendeur digital"
          >
            <DigitalVendorRoutes vendorId={vendorId} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
