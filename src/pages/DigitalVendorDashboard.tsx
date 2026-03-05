/**
 * DASHBOARD VENDEUR DIGITAL - Interface dédiée produits numériques
 * Complètement séparé du dashboard vendeur e-commerce classique
 */

import { useState, useCallback, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DigitalVendorSidebar } from '@/components/digital-vendor/DigitalVendorSidebar';
import { DigitalVendorHeader } from '@/components/digital-vendor/DigitalVendorHeader';
import { DigitalVendorRoutes } from '@/components/digital-vendor/DigitalVendorRoutes';
import { PageLoader } from '@/components/ui/GlobalLoader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const CommunicationWidget = lazy(() => import('@/components/communication/CommunicationWidget'));

export default function DigitalVendorDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  useRoleRedirect();

  const [vendorId, setVendorId] = useState<string>('');

  // Charger le vendor ID
  useEffect(() => {
    if (!user?.id) return;
    const loadVendorId = async () => {
      const { data } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.id) setVendorId(data.id);
    };
    loadVendorId();
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

  if (!user) {
    return <PageLoader text="Chargement..." />;
  }

  const displayName = profile?.first_name || user?.email?.split('@')[0] || 'Vendeur Digital';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-gradient-to-br from-purple-50/30 via-white to-indigo-50/30 dark:from-background dark:via-background dark:to-background overflow-x-hidden">
        {/* Sidebar digitale */}
        <DigitalVendorSidebar />

        <div className="flex-1 flex flex-col w-full min-w-0 max-w-full overflow-x-hidden">
          {/* Header digital */}
          <DigitalVendorHeader displayName={displayName} onSignOut={handleSignOut} />

          {/* Contenu principal */}
          <main
            className="flex-1 p-2 sm:p-3 md:p-6 overflow-x-auto overflow-y-auto pt-4 pb-24 md:pb-8 w-full max-w-full"
            role="main"
            aria-label="Dashboard vendeur digital"
          >
            <DigitalVendorRoutes vendorId={vendorId} />
          </main>
        </div>
      </div>

      {/* Widget de communication */}
      <Suspense fallback={null}>
        <CommunicationWidget position="bottom-right" showNotifications={true} />
      </Suspense>
    </SidebarProvider>
  );
}
