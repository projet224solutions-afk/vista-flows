/**
 * Module principal Vol/Hôtel
 * Gère les 3 modes: API, Affiliate, Simple
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Plane, Hotel, Settings, 
  Users, Briefcase, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TravelModeSelector, TravelMode } from './TravelModeSelector';
import { FlightsSection } from './FlightsSection';
import { HotelsSection } from './HotelsSection';
import { AffiliateRegistration } from './AffiliateRegistration';
import { AffiliateDashboard } from './AffiliateDashboard';
import { cn } from '@/lib/utils';

interface TravelModuleProps {
  onBack: () => void;
}

export function TravelModule({ onBack }: TravelModuleProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [currentMode, setCurrentMode] = useState<TravelMode>('affiliate');
  const [activeTab, setActiveTab] = useState('flights');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showAffiliateRegistration, setShowAffiliateRegistration] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [showAffiliateDashboard, setShowAffiliateDashboard] = useState(false);
  const [loading, setLoading] = useState(true);

  // Récupérer le code affilié depuis l'URL si présent
  const refCode = searchParams.get('ref');

  useEffect(() => {
    loadConfig();
    if (user) {
      checkAffiliateStatus();
    }
  }, [user]);

  const loadConfig = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('travel_module_config')
        .select('*')
        .single();

      if (data && !error) {
        setCurrentMode(data.config_mode as TravelMode);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAffiliateStatus = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('travel_affiliates')
        .select('affiliate_code, status')
        .eq('user_id', user?.id)
        .single();

      if (data && !error) {
        setIsAffiliate(true);
        setAffiliateCode(data.affiliate_code);
      }
    } catch (error) {
      // Pas affilié
    }
  };

  const handleModeChange = async (mode: TravelMode) => {
    setCurrentMode(mode);
    setShowModeSelector(false);
    
    // Sauvegarder le mode (si admin)
    try {
      await (supabase as any)
        .from('travel_module_config')
        .update({ config_mode: mode })
        .eq('id', (await (supabase as any).from('travel_module_config').select('id').single()).data.id);
    } catch (error) {
      console.error('Error saving mode:', error);
    }
  };

  const handleAffiliateSuccess = (code: string) => {
    setAffiliateCode(code);
    setIsAffiliate(true);
    setShowAffiliateRegistration(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Afficher le sélecteur de mode
  if (showModeSelector) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowModeSelector(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">Configuration</h1>
            </div>
          </div>
        </header>
        <div className="px-4 py-6">
          <TravelModeSelector 
            currentMode={currentMode} 
            onModeSelect={handleModeChange} 
          />
        </div>
      </div>
    );
  }

  // Afficher le formulaire d'inscription affilié
  if (showAffiliateRegistration) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowAffiliateRegistration(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">Inscription Affilié</h1>
            </div>
          </div>
        </header>
        <div className="px-4 py-6">
          <AffiliateRegistration 
            onSuccess={handleAffiliateSuccess}
            onCancel={() => setShowAffiliateRegistration(false)}
          />
        </div>
      </div>
    );
  }

  // Afficher le dashboard affilié
  if (showAffiliateDashboard && isAffiliate) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowAffiliateDashboard(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">Mon Espace Affilié</h1>
            </div>
          </div>
        </header>
        <div className="px-4 py-6">
          <AffiliateDashboard 
            onViewServices={() => setShowAffiliateDashboard(false)}
          />
        </div>
      </div>
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
              <h1 className="text-lg font-bold text-foreground">Vol / Hôtel</h1>
              <p className="text-xs text-muted-foreground">
                {currentMode === 'api' ? 'Réservation en temps réel' :
                 currentMode === 'affiliate' ? 'Programme d\'affiliation' : 
                 'Partenaires voyage'}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowModeSelector(true)}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Bannière affilié (mode affiliate) */}
      {currentMode === 'affiliate' && user && (
        <div className="px-4 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-500/20">
          {isAffiliate ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-foreground">
                  Affilié: <span className="font-mono font-bold">{affiliateCode}</span>
                </span>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowAffiliateDashboard(true)}
              >
                Mon Dashboard
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
                onClick={() => setShowAffiliateRegistration(true)}
              >
                Devenir affilié
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 py-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flights" className="gap-2">
            <Plane className="w-4 h-4" />
            Vols
          </TabsTrigger>
          <TabsTrigger value="hotels" className="gap-2">
            <Hotel className="w-4 h-4" />
            Hôtels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flights" className="mt-4">
          <FlightsSection 
            mode={currentMode}
            isAffiliate={isAffiliate}
            affiliateCode={affiliateCode || refCode || undefined}
          />
        </TabsContent>

        <TabsContent value="hotels" className="mt-4">
          <HotelsSection 
            mode={currentMode}
            isAffiliate={isAffiliate}
            affiliateCode={affiliateCode || refCode || undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
