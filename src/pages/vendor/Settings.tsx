import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import VendorBusinessSettings from '@/components/vendor/settings/VendorBusinessSettings';
import { VendorKYCForm } from '@/components/vendor/VendorKYCForm';
import { useVendorSecurity } from '@/hooks/useVendorSecurity';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Bell, Shield, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

export default function VendorSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('business');
  const { kyc, reload: reloadKyc } = useVendorSecurity();

  useEffect(() => {
    checkVendorAuth();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="w-4 h-4" />
            Entreprise
          </TabsTrigger>
          <TabsTrigger value="kyc" className="gap-2">
            <Shield className="w-4 h-4" />
            KYC
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-6">
          <VendorBusinessSettings vendorId={vendorId} />
        </TabsContent>

        <TabsContent value="kyc" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Vérification KYC (Know Your Customer)
              </CardTitle>
              <CardDescription>
                Complétez votre vérification d'identité pour débloquer toutes les fonctionnalités
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Statut KYC actuel */}
              {kyc && (
                <div className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Statut actuel:</span>
                    {kyc.status === 'verified' && (
                      <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Vérifié
                      </Badge>
                    )}
                    {kyc.status === 'pending' && (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white gap-1">
                        <Clock className="w-3 h-3" />
                        En attente
                      </Badge>
                    )}
                    {kyc.status === 'under_review' && (
                      <Badge className="bg-blue-500 hover:bg-blue-600 text-white gap-1">
                        <Clock className="w-3 h-3" />
                        En cours de vérification
                      </Badge>
                    )}
                    {kyc.status === 'rejected' && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="w-3 h-3" />
                        Refusé
                      </Badge>
                    )}
                  </div>
                  
                  {kyc.rejection_reason && (
                    <div className="mt-3 p-3 rounded bg-destructive/10 border border-destructive/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-destructive">Raison du refus:</p>
                          <p className="text-sm text-muted-foreground mt-1">{kyc.rejection_reason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {kyc.verified_at && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Vérifié le {new Date(kyc.verified_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}

                  {kyc.phone_number && (
                    <p className="text-sm text-muted-foreground">
                      Téléphone: {kyc.phone_number}
                      {kyc.phone_verified && <CheckCircle className="inline w-3 h-3 ml-1 text-green-500" />}
                    </p>
                  )}
                </div>
              )}

              {/* Formulaire KYC */}
              {(!kyc || kyc.status === 'rejected') && (
                <VendorKYCForm 
                  onSuccess={() => {
                    reloadKyc();
                  }}
                />
              )}

              {kyc && (kyc.status === 'pending' || kyc.status === 'under_review') && (
                <div className="text-center py-8 space-y-2">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground animate-pulse" />
                  <p className="font-medium">Vérification en cours</p>
                  <p className="text-sm text-muted-foreground">
                    Vos documents sont en cours de vérification. Vous serez notifié une fois le processus terminé.
                  </p>
                </div>
              )}

              {kyc && kyc.status === 'verified' && (
                <div className="text-center py-8 space-y-2">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                  <p className="font-medium text-green-600">Compte vérifié</p>
                  <p className="text-sm text-muted-foreground">
                    Votre compte a été vérifié avec succès. Toutes les fonctionnalités sont débloquées.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <div className="text-center text-muted-foreground py-8">
            Paramètres de profil à venir...
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="text-center text-muted-foreground py-8">
            Paramètres de notifications à venir...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
