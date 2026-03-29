/**
 * Formulaire spÃ©cialisÃ© pour les produits d'affiliation
 * InspirÃ© de ClickBank, ShareASale, Impact
 */

import { useState } from 'react';
import { 
  Link2, 
  Globe, 
  Percent, 
  Tag, 
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Shield,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CurrencySelect } from '@/components/ui/currency-select';
import { cn } from '@/lib/utils';

export interface AffiliateFormData {
  affiliateUrl: string;
  affiliatePlatform: string;
  affiliateNetwork: string;
  commissionRate: string;
  commissionType: 'percentage' | 'fixed' | 'recurring';
  cookieDuration: string;
  payoutThreshold: string;
  trackingId: string;
  displayPrice: string;
  displayCurrency: string;
}

interface AffiliateFormProps {
  data: AffiliateFormData;
  onChange: (data: Partial<AffiliateFormData>) => void;
  onValidateUrl?: () => void;
  urlValidationStatus?: 'idle' | 'validating' | 'valid' | 'invalid';
}

const affiliateNetworks = [
  { id: 'direct', name: 'Programme Direct', description: 'Affiliation directe avec le vendeur' },
  { id: 'amazon', name: 'Amazon Associates', description: 'Programme d\'affiliation Amazon' },
  { id: 'clickbank', name: 'ClickBank', description: 'Produits numÃ©riques, commissions Ã©levÃ©es' },
  { id: 'cj', name: 'CJ Affiliate', description: 'Grandes marques internationales' },
  { id: 'shareasale', name: 'ShareASale', description: 'RÃ©seau diversifiÃ© de marchands' },
  { id: 'impact', name: 'Impact', description: 'Partenariats de marques premium' },
  { id: 'systeme', name: 'Systeme.io', description: 'Formations et produits numÃ©riques' },
  { id: 'booking', name: 'Booking.com', description: 'RÃ©servations hÃ´teliÃ¨res' },
  { id: 'awin', name: 'Awin', description: 'RÃ©seau europÃ©en majeur' },
  { id: 'rakuten', name: 'Rakuten', description: 'Grands dÃ©taillants en ligne' },
  { id: 'other', name: 'Autre rÃ©seau', description: 'Autre plateforme d\'affiliation' }
];

const commissionTypes = [
  { id: 'percentage', label: 'Pourcentage', description: 'Commission en % de la vente' },
  { id: 'fixed', label: 'Montant fixe', description: 'Commission fixe par vente' },
  { id: 'recurring', label: 'RÃ©current', description: 'Commission sur abonnements' }
];

export function AffiliateForm({ 
  data, 
  onChange, 
  onValidateUrl,
  urlValidationStatus = 'idle' 
}: AffiliateFormProps) {
  const selectedNetwork = affiliateNetworks.find(n => n.id === data.affiliateNetwork);

  const getUrlPlaceholder = () => {
    switch (data.affiliateNetwork) {
      case 'amazon':
        return 'https://www.amazon.fr/dp/XXXX?tag=votre-id';
      case 'clickbank':
        return 'https://hop.clickbank.net/?affiliate=xxx&vendor=xxx';
      case 'systeme':
        return 'https://systeme.io/votre-lien-affilie';
      case 'booking':
        return 'https://www.booking.com/...?aid=XXXXX';
      default:
        return 'https://example.com/votre-lien-affilie';
    }
  };

  return (
    <div className="space-y-4">
      {/* SÃ©lection du rÃ©seau d'affiliation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            RÃ©seau d'Affiliation
          </CardTitle>
          <CardDescription className="text-xs">
            SÃ©lectionnez la plateforme d'oÃ¹ provient votre lien d'affiliation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={data.affiliateNetwork}
            onValueChange={(v) => onChange({ affiliateNetwork: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir un rÃ©seau" />
            </SelectTrigger>
            <SelectContent>
              {affiliateNetworks.map((network) => (
                <SelectItem key={network.id} value={network.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{network.name}</span>
                    <span className="text-xs text-muted-foreground">{network.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedNetwork && selectedNetwork.id !== 'direct' && (
            <div className="mt-3 p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                RÃ©seau vÃ©rifiÃ© : {selectedNetwork.name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lien d'affiliation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Lien d'Affiliation
          </CardTitle>
          <CardDescription className="text-xs">
            Collez votre lien d'affiliation complet avec votre ID de tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="affiliateUrl" className="text-xs">
              URL d'affiliation <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2 mt-1.5">
              <div className="relative flex-1">
                <Input
                  id="affiliateUrl"
                  value={data.affiliateUrl}
                  onChange={(e) => onChange({ affiliateUrl: e.target.value })}
                  placeholder={getUrlPlaceholder()}
                  className={cn(
                    'pr-10',
                    urlValidationStatus === 'valid' && 'border-primary-orange-500 focus-visible:ring-primary-orange-500',
                    urlValidationStatus === 'invalid' && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {urlValidationStatus === 'validating' && (
                    <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                  )}
                  {urlValidationStatus === 'valid' && (
                    <CheckCircle2 className="w-4 h-4 text-primary-orange-500" />
                  )}
                  {urlValidationStatus === 'invalid' && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
              {onValidateUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onValidateUrl}
                  disabled={!data.affiliateUrl || urlValidationStatus === 'validating'}
                >
                  VÃ©rifier
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="affiliatePlatform" className="text-xs">
              Nom du produit/service partenaire
            </Label>
            <Input
              id="affiliatePlatform"
              value={data.affiliatePlatform}
              onChange={(e) => onChange({ affiliatePlatform: e.target.value })}
              placeholder="Ex: Formation Marketing Digital Pro"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="trackingId" className="text-xs">
              ID de tracking (optionnel)
            </Label>
            <Input
              id="trackingId"
              value={data.trackingId}
              onChange={(e) => onChange({ trackingId: e.target.value })}
              placeholder="Ex: sub_id, aff_id, clickid..."
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Ajoutez un ID pour suivre vos performances sur cette promotion
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prix affichÃ© au client */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Prix affichÃ©
          </CardTitle>
          <CardDescription className="text-xs">
            Prix indicatif affichÃ© aux visiteurs (optionnel)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="displayPrice" className="text-xs">
                Montant
              </Label>
              <Input
                id="displayPrice"
                type="number"
                value={data.displayPrice}
                onChange={(e) => onChange({ displayPrice: e.target.value })}
                placeholder="Ex: 50000"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="displayCurrency" className="text-xs">
                Devise
              </Label>
              <CurrencySelect
                value={data.displayCurrency || 'USD'}
                onValueChange={(v) => onChange({ displayCurrency: v })}
                className="mt-1.5"
                showFlag={true}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Ce prix est affichÃ© pour information. Le prix rÃ©el est dÃ©fini sur la plateforme partenaire.
          </p>
        </CardContent>
      </Card>

      {/* Informations sur les commissions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            Structure de Commission
          </CardTitle>
          <CardDescription className="text-xs">
            DÃ©finissez les termes de votre commission d'affiliation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type de commission */}
          <div>
            <Label className="text-xs mb-2 block">Type de commission</Label>
            <div className="grid grid-cols-3 gap-2">
              {commissionTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => onChange({ commissionType: type.id as AffiliateFormData['commissionType'] })}
                  className={cn(
                    'p-2 rounded-lg border cursor-pointer text-center transition-all',
                    data.commissionType === type.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className="text-xs font-medium">{type.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="commissionRate" className="text-xs">
                {data.commissionType === 'fixed' ? 'Montant (GNF)' : 'Taux (%)'}
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="commissionRate"
                  type="number"
                  value={data.commissionRate}
                  onChange={(e) => onChange({ commissionRate: e.target.value })}
                  placeholder={data.commissionType === 'fixed' ? '50000' : '30'}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {data.commissionType === 'fixed' ? 'GNF' : '%'}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="cookieDuration" className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                DurÃ©e du cookie
              </Label>
              <Select
                value={data.cookieDuration}
                onValueChange={(v) => onChange({ cookieDuration: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="DurÃ©e" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 heures</SelectItem>
                  <SelectItem value="7d">7 jours</SelectItem>
                  <SelectItem value="30d">30 jours</SelectItem>
                  <SelectItem value="60d">60 jours</SelectItem>
                  <SelectItem value="90d">90 jours</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                  <SelectItem value="unknown">Non spÃ©cifiÃ©</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info rÃ©current */}
          {data.commissionType === 'recurring' && (
            <Alert>
              <TrendingUp className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Les commissions rÃ©currentes sont versÃ©es chaque mois tant que le client reste abonnÃ©.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Alerte informative */}
      <Alert className="bg-primary/5 border-primary/20">
        <ExternalLink className="w-4 h-4 text-primary" />
        <AlertDescription className="text-xs text-muted-foreground">
          <strong className="text-foreground">Note :</strong> Les visiteurs seront redirigÃ©s vers votre lien d'affiliation. 
          Assurez-vous que votre lien est actif et correctement configurÃ© sur la plateforme partenaire.
        </AlertDescription>
      </Alert>
    </div>
  );
}
