/**
 * PARAMÈTRES DE LOCALISATION VENDEUR
 * Permet de changer la langue et la devise d'AFFICHAGE (conversion de prix).
 * La devise du wallet est verrouillée selon le pays de résidence et ne peut
 * être modifiée que par un administrateur.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/useLocale';
import LanguageSelector from '@/components/LanguageSelector';
import { CurrencySelect } from '@/components/ui/currency-select';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';

export default function VendorLocaleSettings() {
  const { _language, currency, setCurrency, country, loading, refreshGeo } = useLocale();
  const { toast } = useToast();
  const { wallet } = useWallet();

  const handleRefreshGeo = async () => {
    localStorage.removeItem('app_language_manual');
    localStorage.removeItem('app_currency_manual');
    localStorage.removeItem('app_language');
    localStorage.removeItem('app_currency');
    localStorage.removeItem('user_country');
    localStorage.removeItem('geo_detection_cache');

    await refreshGeo();

    toast({
      title: "Position actualisée",
      description: "La langue et la devise d'affichage ont été mises à jour selon votre position.",
    });
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    toast({
      title: "Devise d'affichage mise à jour",
      description: `La devise d'affichage a été changée en ${newCurrency}. La devise de votre wallet reste ${wallet?.currency || '—'}.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Langue et Devise d'affichage
        </CardTitle>
        <CardDescription>
          Configurez vos préférences de langue et de devise pour l'affichage des prix
          {country && (
            <span className="block mt-1 text-xs">
              Pays détecté: <strong>{country}</strong>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Devise wallet verrouillée — information uniquement */}
        {wallet && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Devise wallet verrouillée : {wallet.currency}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                La devise de votre wallet est assignée selon votre pays de résidence.
                Pour la modifier, contactez le support.
              </p>
            </div>
          </div>
        )}

        {/* Sélecteur de langue */}
        <div className="space-y-2">
          <LanguageSelector variant="default" />
        </div>

        {/* Sélecteur de devise d'affichage */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            Devise d'affichage des prix
          </label>
          <CurrencySelect
            value={currency}
            onValueChange={handleCurrencyChange}
            showFlag={true}
            showName={true}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Change uniquement comment les prix sont affichés, pas la devise de votre wallet.
          </p>
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
            Réinitialise la langue et la devise d'affichage selon votre localisation actuelle
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
