/**
 * INTERFACE BUREAU SYNDICAT - 224SOLUTIONS
 * Accessible via token d'accès unique (sans authentification)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, TrendingUp, DollarSign, Mail, Phone, Shield, AlertCircle, BarChart3, Package, UserCog, Bike } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserIdDisplay } from '@/components/UserIdDisplay';

interface Bureau {
  id: string;
  bureau_code: string;
  prefecture: string;
  commune: string;
  full_location?: string;
  president_name?: string;
  president_email?: string;
  president_phone?: string;
  status: string;
  access_token?: string;
  interface_url?: string;
  total_members: number;
  total_vehicles: number;
  total_cotisations: number;
  last_activity?: string;
  validated_at?: string;
  created_at: string;
}

export default function BureauSyndicatDashboard() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [bureau, setBureau] = useState<Bureau | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      loadBureauData();
    } else {
      toast.error('Token d\'accès manquant');
      navigate('/');
    }
  }, [token]);

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    if (!token) return;

    const channel = supabase
      .channel('bureau-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bureaus',
          filter: `access_token=eq.${token}`
        },
        (payload) => {
          console.log('Bureau mis à jour:', payload);
          setBureau(payload.new as Bureau);
          toast.success('Les informations ont été mises à jour');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);

  const loadBureauData = async () => {
    try {
      setLoading(true);

      // Charger les données du bureau via le token
      const { data: bureauData, error: bureauError } = await supabase
        .from('bureaus')
        .select('*')
        .eq('access_token', token)
        .single();

      if (bureauError) throw bureauError;
      if (!bureauData) {
        toast.error('Bureau non trouvé');
        navigate('/');
        return;
      }

      // Charger les membres et workers
      const [membersRes, workersRes] = await Promise.all([
        supabase.from('members').select('*').eq('bureau_id', bureauData.id),
        supabase.from('syndicate_workers').select('*').eq('bureau_id', bureauData.id)
      ]);

      setMembers(membersRes.data || []);
      setWorkers(workersRes.data || []);
      setBureau(bureauData as Bureau);
      toast.success(`Bienvenue Bureau ${bureauData.commune}!`);
    } catch (error) {
      console.error('Erreur chargement bureau:', error);
      toast.error('Erreur lors du chargement des données');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre interface...</p>
        </div>
      </div>
    );
  }

  if (!bureau) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Accès non autorisé</h2>
            <p className="text-muted-foreground">Token d'accès invalide ou expiré</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Interface Bureau Syndicat</h1>
                  <p className="text-sm text-gray-600">224Solutions - Dashboard Bureau Syndicat</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={bureau.status === 'active' ? "default" : "secondary"} className="text-sm">
                {bureau.status === 'active' ? '✅ Actif' : '⏸️ Inactif'}
              </Badge>
              <UserIdDisplay layout="horizontal" showBadge={true} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Informations du Bureau */}
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardTitle className="text-xl flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                Informations du Bureau Syndicat
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Code Bureau</p>
                  <p className="text-lg font-mono font-semibold text-blue-600">{bureau.bureau_code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Localisation</p>
                  <p className="text-lg font-semibold">{bureau.prefecture} - {bureau.commune}</p>
                </div>
                {bureau.president_name && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Président</p>
                    <p className="text-base">{bureau.president_name}</p>
                  </div>
                )}
                {bureau.president_email && (
                  <div className="space-y-1 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-base">{bureau.president_email}</p>
                    </div>
                  </div>
                )}
                {bureau.president_phone && (
                  <div className="space-y-1 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="text-base">{bureau.president_phone}</p>
                    </div>
                  </div>
                )}
                {bureau.full_location && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Adresse complète</p>
                    <p className="text-base">{bureau.full_location}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Membres du Bureau</CardTitle>
                <UserCog className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{workers.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Membres actifs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Adhérents</CardTitle>
                <Users className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{bureau.total_members}</div>
                <p className="text-xs text-muted-foreground mt-1">Total membres</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Véhicules</CardTitle>
                <Bike className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{bureau.total_vehicles}</div>
                <p className="text-xs text-muted-foreground mt-1">Enregistrés</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cotisations</CardTitle>
                <DollarSign className="w-4 h-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {(bureau.total_cotisations || 0).toLocaleString()} GNF
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total collecté</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs pour les différentes sections */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
              <TabsTrigger value="members">
                <Users className="w-4 h-4 mr-2" />
                Adhérents
              </TabsTrigger>
              <TabsTrigger value="workers">
                <UserCog className="w-4 h-4 mr-2" />
                Membres Bureau
              </TabsTrigger>
              <TabsTrigger value="reports">
                <BarChart3 className="w-4 h-4 mr-2" />
                Rapports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Actions Rapides */}
              <Card className="border-2 border-green-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
                  <CardTitle className="text-xl">Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button className="h-20 flex flex-col items-center justify-center gap-2">
                      <Users className="w-6 h-6" />
                      <span>Ajouter un Adhérent</span>
                    </Button>
                    <Button className="h-20 flex flex-col items-center justify-center gap-2" variant="outline">
                      <Bike className="w-6 h-6" />
                      <span>Enregistrer un Véhicule</span>
                    </Button>
                    <Button className="h-20 flex flex-col items-center justify-center gap-2" variant="outline">
                      <UserCog className="w-6 h-6" />
                      <span>Ajouter un Membre Bureau</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Fonctionnalités */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Fonctionnalités du Bureau Syndicat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-blue-900">
                          ✅ Gestion des Adhérents
                        </span>
                      </div>
                      <span className="text-xs text-blue-600 ml-4">
                        Administrez tous les membres du syndicat
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-purple-900">
                          🏍️ Gestion des Véhicules
                        </span>
                      </div>
                      <span className="text-xs text-purple-600 ml-4">
                        Enregistrez et suivez les véhicules
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 hover:border-green-400 transition-all shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-green-900">
                          💰 Gestion des Cotisations
                        </span>
                      </div>
                      <span className="text-xs text-green-600 ml-4">
                        Collectez et suivez les paiements
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border-2 border-orange-200 hover:border-orange-400 transition-all shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-orange-900">
                          📊 Rapports et Statistiques
                        </span>
                      </div>
                      <span className="text-xs text-orange-600 ml-4">
                        Visualisez les données du bureau
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border-2 border-teal-200 hover:border-teal-400 transition-all shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-teal-900">
                          👥 Gestion du Bureau
                        </span>
                      </div>
                      <span className="text-xs text-teal-600 ml-4">
                        Administrez les membres du bureau
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 p-3 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200 hover:border-indigo-400 transition-all shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-indigo-900">
                          🔔 Alertes et Notifications
                        </span>
                      </div>
                      <span className="text-xs text-indigo-600 ml-4">
                        Recevez des alertes importantes
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle>Liste des Adhérents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    {members.length === 0 ? (
                      <p>Aucun adhérent enregistré</p>
                    ) : (
                      <p>{members.length} adhérents enregistrés</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workers">
              <Card>
                <CardHeader>
                  <CardTitle>Membres du Bureau</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    {workers.length === 0 ? (
                      <p>Aucun membre du bureau enregistré</p>
                    ) : (
                      <p>{workers.length} membres du bureau</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Rapports et Statistiques</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Adhérents actifs</p>
                      <p className="text-2xl font-bold text-blue-600">{bureau.total_members}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Véhicules enregistrés</p>
                      <p className="text-2xl font-bold text-purple-600">{bureau.total_vehicles}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Cotisations collectées</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(bureau.total_cotisations || 0).toLocaleString()} GNF
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Membres du bureau</p>
                      <p className="text-2xl font-bold text-orange-600">{workers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Informations système */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-sm">Informations Système</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>🆔 ID Bureau: <span className="font-mono">{bureau.id}</span></p>
              <p>📅 Créé le: {new Date(bureau.created_at).toLocaleDateString('fr-FR')}</p>
              {bureau.validated_at && (
                <p>✅ Validé le: {new Date(bureau.validated_at).toLocaleDateString('fr-FR')}</p>
              )}
              <p>🔐 Accès sécurisé via token unique</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
