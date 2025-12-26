import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import VendorBusinessSettings from '@/components/vendor/settings/VendorBusinessSettings';
import VendorLocationSettings from '@/components/vendor/settings/VendorLocationSettings';
import VendorDeliveryPricing from '@/components/vendor/settings/VendorDeliveryPricing';
import VendorShopImagesSettings from '@/components/vendor/settings/VendorShopImagesSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, Bell, Truck, MapPin, ImageIcon } from 'lucide-react';

export default function VendorSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('business');

  useEffect(() => {
    checkVendorAuth();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== 'kyc') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const checkVendorAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'vendeur') {
        navigate('/');
        return;
      }

      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (vendor) {
        setVendorId(vendor.id);
      }
    } catch (error) {
      console.error('Erreur auth:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !vendorId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-2">
          Gérez les paramètres de votre compte et de votre entreprise
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Entreprise</span>
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Images</span>
          </TabsTrigger>
          <TabsTrigger value="location" className="gap-2">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Localisation</span>
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Livraison</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-6" forceMount hidden={activeTab !== 'business'}>
          <VendorBusinessSettings vendorId={vendorId} />
        </TabsContent>

        <TabsContent value="images" className="mt-6" forceMount hidden={activeTab !== 'images'}>
          <VendorShopImagesSettings vendorId={vendorId} />
        </TabsContent>

        <TabsContent value="location" className="mt-6" forceMount hidden={activeTab !== 'location'}>
          <VendorLocationSettings vendorId={vendorId} />
        </TabsContent>

        <TabsContent value="delivery" className="mt-6" forceMount hidden={activeTab !== 'delivery'}>
          <VendorDeliveryPricing vendorId={vendorId} />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profil personnel
              </CardTitle>
              <CardDescription>
                Gérez vos informations personnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground py-8">
              Cette fonctionnalité sera disponible prochainement.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configurez vos préférences de notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground py-8">
              Cette fonctionnalité sera disponible prochainement.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
