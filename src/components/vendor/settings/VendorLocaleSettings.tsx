/**
 * PARAMÈTRES DE LOCALISATION VENDEUR
 * Permet de changer manuellement la langue et la devise
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/useLocale';
import LanguageSelector from '@/components/LanguageSelector';
import { CurrencySelect } from '@/components/ui/currency-select';
import { useToast } from '@/hooks/use-toast';

export default function VendorLocaleSettings() {
  const { _language, currency, setCurrency, country, loading, refreshGeo } = useLocale();
  const { toast } = useToast();

  const handleRefreshGeo = async () => {
    // Supprimer TOUS les flags manuels ET les valeurs stockées pour permettre la redétection
    localStorage.removeItem('app_language_manual');
    localStorage.removeItem('app_currency_manual');
    localStorage.removeItem('app_language');
    localStorage.removeItem('app_currency');
    localStorage.removeItem('user_country');
    localStorage.removeItem('geo_detection_cache');

    await refreshGeo();

    toast({
      title: "Position actualisée",
      description: "La langue et la devise ont été mises à jour selon votre position.",
    });
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency); // setCurrency already sets manual flag internally
    toast({
      title: "Devise mise à jour",
      description: `La devise a été changée en ${newCurrency}.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Langue et Devise
        </CardTitle>
        <CardDescription>
          Configurez vos préférences de langue et de devise
          {country && (
            <span className="block mt-1 text-xs">
              Pays détecté: <strong>{country}</strong>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sélecteur de langue */}
        <div className="space-y-2">
          <LanguageSelector variant="default" />
        </div>

        {/* Sélecteur de devise */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            Devise préférée
          </label>
          <CurrencySelect
            value={currency}
            onValueChange={handleCurrencyChange}
            showFlag={true}
            showName={true}
            className="w-full"
          />
        </div>

        {/* Bouton de réinitialisation */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleRefreshGeo}
            disabled={loading}
            className="w-full gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Détecter automatiquement ma position
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Réinitialise la langue et la devise selon votre localisation actuelle
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
