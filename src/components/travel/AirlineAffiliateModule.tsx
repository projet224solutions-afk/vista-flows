/**
 * Module d'Affiliation Compagnies Aériennes
 * Permet aux utilisateurs de créer et gérer leurs liens d'affiliation aérienne
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plane, Plus, ExternalLink, Users, 
  TrendingUp, DollarSign, Eye, Copy, Check,
  Briefcase, Globe, Link2, Star, Search, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MerchantActivationDialog } from '@/components/digital-products/MerchantActivationDialog';
import { AirlineAffiliateForm } from './AirlineAffiliateForm';

interface Airline {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  commission_rate: number;
  description: string | null;
  website_url: string | null;
}

interface AirlineAffiliateModuleProps {
  onBack: () => void;
}

export function AirlineAffiliateModule({ onBack }: AirlineAffiliateModuleProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAirline, setSelectedAirline] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('airlines');
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [myAffiliateProducts, setMyAffiliateProducts] = useState<any[]>([]);

  const isMerchant = profile?.role === 'vendeur';

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Charger les compagnies aériennes
      const { data: airlinesData } = await (supabase as any)
        .from('airline_partners')
        .select('*')
        .eq('is_active', true);

      setAirlines(airlinesData || []);

      // Vérifier statut affilié
      if (user) {
        const { data: affiliateData } = await (supabase as any)
          .from('travel_affiliates')
          .select('affiliate_code, status')
          .eq('user_id', user.id)
          .single();

        if (affiliateData) {
          setIsAffiliate(true);
          setAffiliateCode(affiliateData.affiliate_code);
        }

        // Charger les produits d'affiliation de l'utilisateur
        const { data: productsData } = await supabase
          .from('digital_products')
          .select('*')
          .eq('merchant_id', user.id)
          .eq('category', 'voyage')
          .eq('product_mode', 'affiliate')
          .order('created_at', { ascending: false });

        setMyAffiliateProducts(productsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBecomeAffiliate = () => {
    if (!user) {
      toast.info('Connexion requise');
      navigate('/auth', { state: { redirectTo: '/digital-products' } });
      return;
    }

    if (!isMerchant) {
      setShowActivationDialog(true);
      return;
    }

    setShowCreateForm(true);
  };

  const handleAirlineSelect = (airline: Airline) => {
    if (!user) {
      toast.info('Connexion requise pour créer une affiliation');
      navigate('/auth', { state: { redirectTo: '/digital-products' } });
      return;
    }

    if (!isMerchant) {
      setShowActivationDialog(true);
      return;
    }

    setSelectedAirline(airline.id);
    setShowCreateForm(true);
  };

  const handleActivationSuccess = () => {
    setShowActivationDialog(false);
    setShowCreateForm(true);
  };

  const handleProductCreated = () => {
    setShowCreateForm(false);
    setSelectedAirline(null);
    loadData();
    toast.success('Lien d\'affiliation créé avec succès!');
  };

  const copyAffiliateCode = () => {
    if (affiliateCode) {
      navigator.clipboard.writeText(affiliateCode);
      setCopiedCode(true);
      toast.success('Code copié!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const filteredAirlines = airlines.filter(airline =>
    airline.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    airline.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (showCreateForm) {
    const preselectedAirline = airlines.find(a => a.id === selectedAirline);
    return (
      <AirlineAffiliateForm
        onBack={() => {
          setShowCreateForm(false);
          setSelectedAirline(null);
        }}
        onSuccess={handleProductCreated}
        preselectedAirline={preselectedAirline}
        airlines={airlines}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">Affiliation Aérienne</h1>
              <p className="text-xs text-muted-foreground">
                Programme de partenariat compagnies aériennes
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Bannière Affilié */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-b border-primary/20">
        {isAffiliate && affiliateCode ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                <Check className="w-3 h-3 mr-1" />
                Affilié actif
              </Badge>
              <span className="text-sm font-mono font-bold text-foreground">{affiliateCode}</span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={copyAffiliateCode}
              className="gap-1"
            >
              {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copier
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Gagnez des commissions!
              </p>
              <p className="text-xs text-muted-foreground">
                Inscrivez-vous comme affilié voyage
              </p>
            </div>
            <Button 
              size="sm"
              onClick={handleBecomeAffiliate}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
            >
              Devenir affilié
            </Button>
          </div>
        )}
      </div>

      {/* Stats rapides pour affiliés */}
      {isAffiliate && myAffiliateProducts.length > 0 && (
        <section className="px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
              <CardContent className="p-3 text-center">
                <Link2 className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                <p className="text-xl font-bold text-foreground">{myAffiliateProducts.length}</p>
                <p className="text-[10px] text-muted-foreground">Liens actifs</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
              <CardContent className="p-3 text-center">
                <Eye className="w-5 h-5 mx-auto text-green-500 mb-1" />
                <p className="text-xl font-bold text-foreground">
                  {myAffiliateProducts.reduce((acc, p) => acc + (p.views_count || 0), 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">Vues totales</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
              <CardContent className="p-3 text-center">
                <TrendingUp className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                <p className="text-xl font-bold text-foreground">
                  {myAffiliateProducts.reduce((acc, p) => acc + (p.sales_count || 0), 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">Clics</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 py-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="airlines" className="gap-2">
            <Plane className="w-4 h-4" />
            Compagnies
          </TabsTrigger>
          <TabsTrigger value="my-links" className="gap-2">
            <Link2 className="w-4 h-4" />
            Mes liens
          </TabsTrigger>
        </TabsList>

        {/* Onglet Compagnies */}
        <TabsContent value="airlines" className="mt-4 space-y-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une compagnie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtres rapides */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Badge 
              variant={selectedAirline === null ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedAirline(null)}
            >
              Toutes
            </Badge>
            {airlines.slice(0, 4).map((airline) => (
              <Badge 
                key={airline.id}
                variant="outline"
                className="cursor-pointer whitespace-nowrap"
              >
                {airline.code}
              </Badge>
            ))}
          </div>

          {/* Liste des compagnies */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Compagnies Partenaires
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {filteredAirlines.map((airline) => (
                <Card 
                  key={airline.id}
                  className="cursor-pointer hover:shadow-md transition-all border-border/50"
                  onClick={() => handleAirlineSelect(airline)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {airline.logo_url ? (
                        <img 
                          src={airline.logo_url} 
                          alt={airline.name}
                          className="w-12 h-12 object-contain rounded-lg bg-white p-1"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <Plane className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{airline.name}</h4>
                          <Badge variant="outline" className="text-[10px]">{airline.code}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {airline.description || 'Compagnie aérienne partenaire'}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600">
                            <DollarSign className="w-3 h-3 mr-0.5" />
                            {airline.commission_rate}% commission
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="shrink-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {filteredAirlines.length === 0 && (
            <div className="text-center py-12">
              <Plane className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Aucune compagnie trouvée</p>
            </div>
          )}
        </TabsContent>

        {/* Onglet Mes liens */}
        <TabsContent value="my-links" className="mt-4 space-y-4">
          {!user ? (
            <Card className="bg-muted/50">
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Connectez-vous</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Créez un compte pour gérer vos liens d'affiliation
                </p>
                <Button onClick={() => navigate('/auth')}>
                  Se connecter
                </Button>
              </CardContent>
            </Card>
          ) : myAffiliateProducts.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="p-6 text-center">
                <Link2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Aucun lien d'affiliation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Créez votre premier lien d'affiliation aérienne pour commencer à gagner des commissions
                </p>
                <Button onClick={handleBecomeAffiliate} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Créer un lien
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myAffiliateProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {product.images?.[0] ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <Plane className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground line-clamp-1">{product.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {product.short_description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            <Eye className="w-3 h-3 mr-1" />
                            {product.views_count || 0} vues
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {product.status === 'published' ? 'Actif' : 'Brouillon'}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          if (product.affiliate_url) {
                            window.open(product.affiliate_url, '_blank');
                          }
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* FAB pour créer */}
      {user && isMerchant && (
        <div className="fixed bottom-24 right-4 z-50">
          <Button
            onClick={() => setShowCreateForm(true)}
            className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Dialog d'activation */}
      <MerchantActivationDialog
        open={showActivationDialog}
        onOpenChange={setShowActivationDialog}
        onSuccess={handleActivationSuccess}
      />
    </div>
  );
}
