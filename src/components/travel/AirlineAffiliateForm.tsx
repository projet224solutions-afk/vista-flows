/**
 * Formulaire de création d'affiliation aérienne
 * Permet de créer un lien d'affiliation pour une compagnie aérienne
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plane, Link2, Globe, Percent, Tag, 
  ImagePlus, X, Check, AlertCircle, ExternalLink,
  DollarSign, MapPin, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CurrencySelect } from '@/components/ui/currency-select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Airline {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  commission_rate: number;
  description: string | null;
  website_url: string | null;
}

interface AirlineAffiliateFormProps {
  onBack: () => void;
  onSuccess: () => void;
  preselectedAirline?: Airline;
  airlines: Airline[];
}

export function AirlineAffiliateForm({ 
  onBack, 
  onSuccess, 
  preselectedAirline,
  airlines 
}: AirlineAffiliateFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    airlineId: preselectedAirline?.id || '',
    title: '',
    description: '',
    shortDescription: '',
    affiliateUrl: preselectedAirline?.website_url || '',
    originCity: '',
    destinationCity: '',
    flightType: 'all' as 'all' | 'one-way' | 'round-trip',
    price: '',
    currency: 'USD',
    commissionRate: preselectedAirline?.commission_rate?.toString() || '',
    images: [] as string[]
  });

  const [imageInput, setImageInput] = useState('');

  const selectedAirline = airlines.find(a => a.id === formData.airlineId) || preselectedAirline;

  useEffect(() => {
    if (selectedAirline) {
      setFormData(prev => ({
        ...prev,
        affiliateUrl: selectedAirline.website_url || prev.affiliateUrl,
        commissionRate: selectedAirline.commission_rate?.toString() || prev.commissionRate
      }));
    }
  }, [formData.airlineId]);

  const handleAddImage = () => {
    if (imageInput && !formData.images.includes(imageInput)) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageInput]
      }));
      setImageInput('');
    }
  };

  const handleRemoveImage = (url: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== url)
    }));
  };

  const generateTitle = () => {
    if (selectedAirline) {
      let title = `Vols ${selectedAirline.name}`;
      if (formData.originCity && formData.destinationCity) {
        title = `${formData.originCity} → ${formData.destinationCity} avec ${selectedAirline.name}`;
      } else if (formData.destinationCity) {
        title = `Vols vers ${formData.destinationCity} - ${selectedAirline.name}`;
      }
      setFormData(prev => ({ ...prev, title }));
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!formData.airlineId || !formData.title || !formData.affiliateUrl) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      // Créer le produit digital en mode affiliation
      const productData = {
        merchant_id: user.id,
        title: formData.title,
        description: formData.description || formData.shortDescription,
        short_description: formData.shortDescription || formData.title,
        category: 'voyage',
        product_mode: 'affiliate',
        affiliate_url: formData.affiliateUrl,
        affiliate_platform: selectedAirline?.name || 'Compagnie aérienne',
        commission_rate: formData.commissionRate ? parseFloat(formData.commissionRate) : 0,
        price: formData.price ? parseFloat(formData.price) : 0,
        currency: formData.currency,
        images: formData.images.length > 0 ? formData.images : (selectedAirline?.logo_url ? [selectedAirline.logo_url] : []),
        status: 'published',
        is_featured: false,
        tags: [
          selectedAirline?.code,
          selectedAirline?.name,
          formData.originCity,
          formData.destinationCity,
          'vol',
          'avion',
          'airline'
        ].filter(Boolean)
      };

      const { error } = await supabase
        .from('digital_products')
        .insert(productData);

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      console.error('Error creating affiliate:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

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
              <h1 className="text-lg font-bold text-foreground">Créer une affiliation</h1>
              <p className="text-xs text-muted-foreground">
                Lien d'affiliation compagnie aérienne
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Sélection compagnie */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plane className="w-4 h-4 text-primary" />
              Compagnie Aérienne
            </CardTitle>
            <CardDescription className="text-xs">
              Sélectionnez la compagnie pour votre affiliation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={formData.airlineId}
              onValueChange={(v) => setFormData(prev => ({ ...prev, airlineId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une compagnie" />
              </SelectTrigger>
              <SelectContent>
                {airlines.map((airline) => (
                  <SelectItem key={airline.id} value={airline.id}>
                    <div className="flex items-center gap-2">
                      {airline.logo_url && (
                        <img src={airline.logo_url} alt="" className="w-5 h-5 object-contain" />
                      )}
                      <span>{airline.name}</span>
                      <Badge variant="outline" className="text-[10px] ml-1">{airline.code}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAirline && (
              <div className="mt-3 p-3 bg-primary/5 rounded-lg flex items-center gap-3">
                {selectedAirline.logo_url && (
                  <img 
                    src={selectedAirline.logo_url} 
                    alt={selectedAirline.name}
                    className="w-12 h-12 object-contain bg-white rounded-lg p-1"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedAirline.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600">
                      <DollarSign className="w-3 h-3 mr-0.5" />
                      {selectedAirline.commission_rate}% commission
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Itinéraire */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Itinéraire (optionnel)
            </CardTitle>
            <CardDescription className="text-xs">
              Spécifiez une route pour un ciblage précis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ville de départ</Label>
                <Input
                  value={formData.originCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, originCity: e.target.value }))}
                  placeholder="Ex: Paris"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Destination</Label>
                <Input
                  value={formData.destinationCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, destinationCity: e.target.value }))}
                  placeholder="Ex: Conakry"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Type de vol</Label>
              <Select
                value={formData.flightType}
                onValueChange={(v: 'all' | 'one-way' | 'round-trip') => 
                  setFormData(prev => ({ ...prev, flightType: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les vols</SelectItem>
                  <SelectItem value="one-way">Aller simple</SelectItem>
                  <SelectItem value="round-trip">Aller-retour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={generateTitle}
              className="w-full"
            >
              Générer le titre automatiquement
            </Button>
          </CardContent>
        </Card>

        {/* Informations produit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Informations de l'offre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">
                Titre <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Vols Paris-Conakry avec Air France"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Description courte</Label>
              <Input
                value={formData.shortDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                placeholder="Résumé en une ligne"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Description détaillée</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez l'offre en détail..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lien d'affiliation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Lien d'Affiliation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">
                URL d'affiliation <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.affiliateUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, affiliateUrl: e.target.value }))}
                placeholder="https://www.airline.com/?ref=votre-id"
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Collez votre lien d'affiliation avec votre ID de tracking
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prix indicatif */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Prix indicatif
            </CardTitle>
            <CardDescription className="text-xs">
              Prix affiché aux visiteurs (optionnel)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Montant</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Ex: 500"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Devise</Label>
                <CurrencySelect
                  value={formData.currency}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                  className="mt-1"
                  showFlag={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="text-xs">Taux de commission (%)</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, commissionRate: e.target.value }))}
                  placeholder="5"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-primary" />
              Images (optionnel)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                placeholder="URL de l'image"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddImage}
                disabled={!imageInput}
              >
                Ajouter
              </Button>
            </div>

            {formData.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.images.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={url} 
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(url)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerte info */}
        <Alert className="bg-blue-500/5 border-blue-500/20">
          <ExternalLink className="w-4 h-4 text-blue-500" />
          <AlertDescription className="text-xs">
            Les visiteurs seront redirigés vers le site de la compagnie aérienne via votre lien d'affiliation.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !formData.airlineId || !formData.title || !formData.affiliateUrl}
            className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Créer l'affiliation
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
