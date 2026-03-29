/**
 * Formulaire spécialisé pour la vente directe
 * Inspiré de Gumroad, Teachable, Podia
 */

import { useState } from 'react';
import { 
  Package, 
  FileText, 
  Upload, 
  DollarSign, 
  Clock, 
  Shield, 
  Users,
  Zap,
  Lock,
  Download,
  Mail,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export interface DirectSaleFormData {
  price: string;
  originalPrice: string;
  currency: string;
  pricingType: 'one_time' | 'subscription' | 'pay_what_you_want';
  subscriptionInterval: 'monthly' | 'yearly' | 'lifetime';
  minimumPrice: string;
  suggestedPrice: string;
  allowRefunds: boolean;
  refundPeriod: string;
  limitedQuantity: boolean;
  maxQuantity: string;
  requireEmail: boolean;
  instantDelivery: boolean;
  accessDuration: 'lifetime' | '1_year' | '6_months' | '3_months' | '1_month';
}

interface DirectSaleFormProps {
  data: DirectSaleFormData;
  onChange: (data: Partial<DirectSaleFormData>) => void;
}

const pricingTypes = [
  { 
    id: 'one_time', 
    label: 'Paiement unique', 
    icon: DollarSign,
    description: 'Un seul paiement pour un accès complet'
  },
  { 
    id: 'subscription', 
    label: 'Abonnement', 
    icon: RefreshCw,
    description: 'Paiement récurrent mensuel ou annuel'
  },
  { 
    id: 'pay_what_you_want', 
    label: 'Prix libre', 
    icon: Users,
    description: 'Le client choisit son prix'
  }
];

const accessDurations = [
  { id: 'lifetime', label: 'Accès à vie' },
  { id: '1_year', label: '1 an' },
  { id: '6_months', label: '6 mois' },
  { id: '3_months', label: '3 mois' },
  { id: '1_month', label: '1 mois' }
];

export function DirectSaleForm({ data, onChange }: DirectSaleFormProps) {
  return (
    <div className="space-y-4">
      {/* Type de tarification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Modèle de Tarification
          </CardTitle>
          <CardDescription className="text-xs">
            Choisissez comment vous souhaitez être payé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {pricingTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.id}
                  onClick={() => onChange({ pricingType: type.id as DirectSaleFormData['pricingType'] })}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    data.pricingType === type.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    data.pricingType === type.id
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                  {data.pricingType === type.id && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Prix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Configuration du Prix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Paiement unique ou abonnement */}
          {(data.pricingType === 'one_time' || data.pricingType === 'subscription') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="price" className="text-xs">
                    Prix {data.pricingType === 'subscription' && '(par période)'} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="price"
                      type="number"
                      value={data.price}
                      onChange={(e) => onChange({ price: e.target.value })}
                      placeholder="50000"
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      GNF
                    </span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="originalPrice" className="text-xs">
                    Prix barré (optionnel)
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="originalPrice"
                      type="number"
                      value={data.originalPrice}
                      onChange={(e) => onChange({ originalPrice: e.target.value })}
                      placeholder="75000"
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      GNF
                    </span>
                  </div>
                </div>
              </div>

              {data.pricingType === 'subscription' && (
                <div>
                  <Label className="text-xs">Fréquence de facturation</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {(['monthly', 'yearly', 'lifetime'] as const).map((interval) => (
                      <div
                        key={interval}
                        onClick={() => onChange({ subscriptionInterval: interval })}
                        className={cn(
                          'p-2 rounded-lg border cursor-pointer text-center transition-all text-xs',
                          data.subscriptionInterval === interval
                            ? 'border-primary bg-primary/5 font-medium'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {interval === 'monthly' && 'Mensuel'}
                        {interval === 'yearly' && 'Annuel'}
                        {interval === 'lifetime' && 'À vie'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Prix libre */}
          {data.pricingType === 'pay_what_you_want' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="minimumPrice" className="text-xs">
                  Prix minimum <span className="text-destructive">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="minimumPrice"
                    type="number"
                    value={data.minimumPrice}
                    onChange={(e) => onChange({ minimumPrice: e.target.value })}
                    placeholder="0"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    GNF
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="suggestedPrice" className="text-xs">
                  Prix suggéré
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="suggestedPrice"
                    type="number"
                    value={data.suggestedPrice}
                    onChange={(e) => onChange({ suggestedPrice: e.target.value })}
                    placeholder="30000"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    GNF
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Réduction affichée */}
          {data.originalPrice && parseFloat(data.originalPrice) > parseFloat(data.price) && (
            <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
              <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                -{Math.round((1 - parseFloat(data.price) / parseFloat(data.originalPrice)) * 100)}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                Économie de {(parseFloat(data.originalPrice) - parseFloat(data.price)).toLocaleString()} GNF
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Options de livraison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Livraison & Accès
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Livraison instantanée</p>
                <p className="text-xs text-muted-foreground">Accès immédiat après paiement</p>
              </div>
            </div>
            <Switch
              checked={data.instantDelivery}
              onCheckedChange={(v) => onChange({ instantDelivery: v })}
            />
          </div>

          <div>
            <Label className="text-xs">Durée d'accès au contenu</Label>
            <Select
              value={data.accessDuration}
              onValueChange={(v) => onChange({ accessDuration: v as DirectSaleFormData['accessDuration'] })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choisir la durée" />
              </SelectTrigger>
              <SelectContent>
                {accessDurations.map((duration) => (
                  <SelectItem key={duration.id} value={duration.id}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Email requis</p>
                <p className="text-xs text-muted-foreground">Collecter l'email pour la livraison</p>
              </div>
            </div>
            <Switch
              checked={data.requireEmail}
              onCheckedChange={(v) => onChange({ requireEmail: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Politique de remboursement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Garantie & Remboursement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Autoriser les remboursements</p>
                <p className="text-xs text-muted-foreground">Satisfait ou remboursé</p>
              </div>
            </div>
            <Switch
              checked={data.allowRefunds}
              onCheckedChange={(v) => onChange({ allowRefunds: v })}
            />
          </div>

          {data.allowRefunds && (
            <div>
              <Label className="text-xs">Période de garantie</Label>
              <Select
                value={data.refundPeriod}
                onValueChange={(v) => onChange({ refundPeriod: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choisir la période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="14">14 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="60">60 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quantité limitée */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Exclusivité (optionnel)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Quantité limitée</p>
                <p className="text-xs text-muted-foreground">Créer de l'urgence</p>
              </div>
            </div>
            <Switch
              checked={data.limitedQuantity}
              onCheckedChange={(v) => onChange({ limitedQuantity: v })}
            />
          </div>

          {data.limitedQuantity && (
            <div>
              <Label htmlFor="maxQuantity" className="text-xs">
                Nombre maximum de ventes
              </Label>
              <Input
                id="maxQuantity"
                type="number"
                value={data.maxQuantity}
                onChange={(e) => onChange({ maxQuantity: e.target.value })}
                placeholder="100"
                className="mt-1.5"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Alert className="bg-primary/5 border-primary/20">
        <Shield className="w-4 h-4 text-primary" />
        <AlertDescription className="text-xs text-muted-foreground">
          <strong className="text-foreground">Protection vendeur :</strong> Tous les paiements sont sécurisés. 
          Vous recevez vos fonds après validation de la livraison.
        </AlertDescription>
      </Alert>
    </div>
  );
}
