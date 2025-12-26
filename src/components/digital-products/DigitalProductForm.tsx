/**
 * Formulaire unifié de création de produit numérique
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  Link as LinkIcon, 
  Tag, 
  DollarSign,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ProductCategory = 'dropshipping' | 'voyage' | 'logiciel' | 'formation' | 'livre' | 'custom' | 'ai';

interface DigitalProductFormProps {
  category: ProductCategory;
  onBack: () => void;
  onSuccess: () => void;
}

const categoryConfig: Record<ProductCategory, {
  title: string;
  description: string;
  showSourceUrl: boolean;
  showAffiliateUrl: boolean;
  showFileUpload: boolean;
  platforms?: string[];
}> = {
  dropshipping: {
    title: 'Produit Dropshipping',
    description: 'Importez un produit depuis Amazon, AliExpress ou Alibaba',
    showSourceUrl: true,
    showAffiliateUrl: false,
    showFileUpload: false,
    platforms: ['amazon', 'aliexpress', 'alibaba', 'other']
  },
  voyage: {
    title: 'Voyage & Billetterie',
    description: 'Ajoutez un lien affilié vers un service de voyage',
    showSourceUrl: false,
    showAffiliateUrl: true,
    showFileUpload: false
  },
  logiciel: {
    title: 'Logiciel',
    description: 'Promouvoir un logiciel ou SaaS en affiliation',
    showSourceUrl: false,
    showAffiliateUrl: true,
    showFileUpload: false
  },
  formation: {
    title: 'Formation',
    description: 'Créez et vendez vos propres formations',
    showSourceUrl: false,
    showAffiliateUrl: false,
    showFileUpload: true
  },
  livre: {
    title: 'Livre / eBook',
    description: 'Vendez vos eBooks ou en affiliation',
    showSourceUrl: false,
    showAffiliateUrl: true,
    showFileUpload: true
  },
  custom: {
    title: 'Produit Numérique Personnalisé',
    description: 'Templates, scripts, designs, services...',
    showSourceUrl: false,
    showAffiliateUrl: false,
    showFileUpload: true
  },
  ai: {
    title: 'Outil / Service IA',
    description: 'Outils et services basés sur l\'intelligence artificielle',
    showSourceUrl: false,
    showAffiliateUrl: true,
    showFileUpload: false
  }
};

export function DigitalProductForm({ category, onBack, onSuccess }: DigitalProductFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = categoryConfig[category];
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    price: '',
    originalPrice: '',
    commissionRate: '',
    productMode: 'direct' as 'direct' | 'affiliate',
    affiliateUrl: '',
    affiliatePlatform: '',
    sourceUrl: '',
    sourcePlatform: 'other' as 'amazon' | 'aliexpress' | 'alibaba' | 'other',
    tags: '',
    publishImmediately: true
  });
  const [images, setImages] = useState<string[]>([]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    const uploadedUrls: string[] = [];
    
    for (const file of Array.from(files)) {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (!error) {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    setImages(prev => [...prev, ...uploadedUrls]);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      toast.error('Le prix est obligatoire');
      return;
    }
    if (formData.productMode === 'affiliate' && !formData.affiliateUrl) {
      toast.error('Le lien d\'affiliation est obligatoire');
      return;
    }

    setLoading(true);
    try {
      // Récupérer le vendor_id
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const productData = {
        merchant_id: user.id,
        vendor_id: vendor?.id || null,
        title: formData.title.trim(),
        description: formData.description.trim(),
        short_description: formData.shortDescription.trim(),
        images: images,
        category: category,
        product_mode: formData.productMode,
        price: parseFloat(formData.price),
        original_price: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        commission_rate: formData.commissionRate ? parseFloat(formData.commissionRate) : 0,
        affiliate_url: formData.affiliateUrl || null,
        affiliate_platform: formData.affiliatePlatform || null,
        source_url: formData.sourceUrl || null,
        source_platform: config.showSourceUrl ? formData.sourcePlatform : null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: formData.publishImmediately ? 'published' : 'draft',
        published_at: formData.publishImmediately ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('digital_products')
        .insert(productData);

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Erreur création produit:', error);
      toast.error('Erreur lors de la création du produit');
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
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{config.title}</h1>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Mode de vente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Mode de vente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.productMode}
              onValueChange={(v) => handleChange('productMode', v)}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="direct"
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                  formData.productMode === 'direct'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <RadioGroupItem value="direct" id="direct" className="sr-only" />
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-xs font-medium">Vente directe</span>
              </Label>
              <Label
                htmlFor="affiliate"
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                  formData.productMode === 'affiliate'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <RadioGroupItem value="affiliate" id="affiliate" className="sr-only" />
                <Globe className="w-5 h-5 text-primary" />
                <span className="text-xs font-medium">Affiliation</span>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Informations de base */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Informations du produit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Titre du produit *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Ex: Formation complète React.js"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="shortDescription">Description courte</Label>
              <Input
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => handleChange('shortDescription', e.target.value)}
                placeholder="Résumé en une phrase"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">Description complète</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Décrivez votre produit en détail..."
                rows={4}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder="formation, react, web, développement"
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Prix */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Prix et commission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price">Prix (GNF) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="50000"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="originalPrice">Prix barré</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e) => handleChange('originalPrice', e.target.value)}
                  placeholder="75000"
                  className="mt-1.5"
                />
              </div>
            </div>

            {formData.productMode === 'affiliate' && (
              <div>
                <Label htmlFor="commissionRate">Commission (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  value={formData.commissionRate}
                  onChange={(e) => handleChange('commissionRate', e.target.value)}
                  placeholder="10"
                  className="mt-1.5"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source URL (Dropshipping) */}
        {config.showSourceUrl && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-primary" />
                Source du produit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sourcePlatform">Plateforme source</Label>
                <Select
                  value={formData.sourcePlatform}
                  onValueChange={(v) => handleChange('sourcePlatform', v)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amazon">Amazon</SelectItem>
                    <SelectItem value="aliexpress">AliExpress</SelectItem>
                    <SelectItem value="alibaba">Alibaba</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sourceUrl">Lien du produit source</Label>
                <Input
                  id="sourceUrl"
                  value={formData.sourceUrl}
                  onChange={(e) => handleChange('sourceUrl', e.target.value)}
                  placeholder="https://..."
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Affiliate URL */}
        {(config.showAffiliateUrl || formData.productMode === 'affiliate') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Lien d'affiliation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="affiliatePlatform">Plateforme partenaire</Label>
                <Input
                  id="affiliatePlatform"
                  value={formData.affiliatePlatform}
                  onChange={(e) => handleChange('affiliatePlatform', e.target.value)}
                  placeholder="Ex: Air France, Booking, Norton..."
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="affiliateUrl">Lien d'affiliation *</Label>
                <Input
                  id="affiliateUrl"
                  value={formData.affiliateUrl}
                  onChange={(e) => handleChange('affiliateUrl', e.target.value)}
                  placeholder="https://affiliate.example.com/..."
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Images */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Images du produit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Image ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-border shrink-0"
                    />
                  ))}
                </div>
              )}
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Cliquez pour ajouter des images
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Publication */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">Publier immédiatement</p>
                <p className="text-xs text-muted-foreground">
                  Le produit sera visible sur le marketplace
                </p>
              </div>
              <Switch
                checked={formData.publishImmediately}
                onCheckedChange={(v) => handleChange('publishImmediately', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Création en cours...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              {formData.publishImmediately ? 'Créer et publier' : 'Enregistrer comme brouillon'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
