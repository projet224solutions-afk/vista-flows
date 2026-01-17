/**
 * Formulaire unifié de création de produit numérique
 * Version professionnelle avec distinction claire Direct vs Affiliation
 * Inspiré de ClickBank, Gumroad, Teachable
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Video,
  Sparkles,
  ChevronRight,
  Tag
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { VideoUploadPreview } from '@/components/ui/video-upload-preview';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Import des composants professionnels
import { SalesModeSelector, type SalesMode } from './SalesModeSelector';
import { AffiliateForm, type AffiliateFormData } from './AffiliateForm';
import { DirectSaleForm, type DirectSaleFormData } from './DirectSaleForm';

type ProductCategory = 'dropshipping' | 'voyage' | 'logiciel' | 'formation' | 'livre' | 'custom' | 'ai';

interface DigitalProductFormProps {
  category: ProductCategory;
  onBack: () => void;
  onSuccess: () => void;
}

const categoryConfig: Record<ProductCategory, {
  title: string;
  description: string;
  icon: string;
  defaultMode: SalesMode;
  allowDirectSale: boolean;
  allowAffiliate: boolean;
}> = {
  dropshipping: {
    title: 'Produit Dropshipping',
    description: 'Importez un produit depuis Amazon, AliExpress ou Alibaba',
    icon: '📦',
    defaultMode: 'affiliate',
    allowDirectSale: false,
    allowAffiliate: true
  },
  voyage: {
    title: 'Voyage & Billetterie',
    description: 'Vols, hôtels, locations - en affiliation ou propres services',
    icon: '✈️',
    defaultMode: 'affiliate',
    allowDirectSale: true,
    allowAffiliate: true
  },
  logiciel: {
    title: 'Logiciel & SaaS',
    description: 'Vendez votre logiciel ou promouvez en affiliation',
    icon: '💻',
    defaultMode: 'affiliate',
    allowDirectSale: true,
    allowAffiliate: true
  },
  formation: {
    title: 'Formation & Coaching',
    description: 'Créez et vendez vos propres formations',
    icon: '🎓',
    defaultMode: 'direct',
    allowDirectSale: true,
    allowAffiliate: true
  },
  livre: {
    title: 'Livre & eBook',
    description: 'Vendez vos eBooks ou promouvez en affiliation',
    icon: '📚',
    defaultMode: 'direct',
    allowDirectSale: true,
    allowAffiliate: true
  },
  custom: {
    title: 'Produit Numérique',
    description: 'Templates, scripts, designs, services...',
    icon: '✨',
    defaultMode: 'direct',
    allowDirectSale: true,
    allowAffiliate: false
  },
  ai: {
    title: 'Outil IA',
    description: 'Solutions et services d\'intelligence artificielle',
    icon: '🤖',
    defaultMode: 'affiliate',
    allowDirectSale: true,
    allowAffiliate: true
  }
};

type FormStep = 'mode' | 'details' | 'pricing' | 'media' | 'review';

export function DigitalProductForm({ category, onBack, onSuccess }: DigitalProductFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = categoryConfig[category];
  
  const [currentStep, setCurrentStep] = useState<FormStep>('mode');
  const [loading, setLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  
  // Mode de vente
  const [salesMode, setSalesMode] = useState<SalesMode>(config.defaultMode);
  
  // Types de produits par catégorie
  const productTypes: Record<ProductCategory, { value: string; label: string }[]> = {
    logiciel: [
      { value: 'logiciel_montage', label: 'Logiciel de montage vidéo' },
      { value: 'antivirus', label: 'Antivirus / Sécurité' },
      { value: 'vpn', label: 'VPN' },
      { value: 'saas', label: 'SaaS / Application en ligne' },
      { value: 'plugin', label: 'Plugin / Extension' },
      { value: 'theme', label: 'Thème / Template' },
      { value: 'autre_logiciel', label: 'Autre logiciel' }
    ],
    voyage: [
      { value: 'reservation_hotel', label: 'Réservation hôtel' },
      { value: 'billet_avion', label: 'Billet d\'avion' },
      { value: 'location_voiture', label: 'Location de voiture' },
      { value: 'croisiere', label: 'Croisière' },
      { value: 'excursion', label: 'Excursion / Visite guidée' },
      { value: 'assurance_voyage', label: 'Assurance voyage' },
      { value: 'autre_voyage', label: 'Autre service voyage' }
    ],
    formation: [
      { value: 'formation_video', label: 'Formation vidéo' },
      { value: 'cours_en_ligne', label: 'Cours en ligne' },
      { value: 'coaching', label: 'Coaching / Mentorat' },
      { value: 'masterclass', label: 'Masterclass' },
      { value: 'certification', label: 'Certification' },
      { value: 'webinaire', label: 'Webinaire' },
      { value: 'autre_formation', label: 'Autre formation' }
    ],
    livre: [
      { value: 'ebook', label: 'eBook' },
      { value: 'audiobook', label: 'Livre audio' },
      { value: 'guide_pdf', label: 'Guide PDF' },
      { value: 'rapport', label: 'Rapport / Étude' },
      { value: 'magazine', label: 'Magazine numérique' },
      { value: 'autre_livre', label: 'Autre publication' }
    ],
    dropshipping: [
      { value: 'produit_aliexpress', label: 'Produit AliExpress' },
      { value: 'produit_amazon', label: 'Produit Amazon' },
      { value: 'produit_alibaba', label: 'Produit Alibaba' },
      { value: 'autre_dropship', label: 'Autre produit dropshipping' }
    ],
    custom: [
      { value: 'template', label: 'Template / Modèle' },
      { value: 'graphisme', label: 'Graphisme / Design' },
      { value: 'musique', label: 'Musique / Audio' },
      { value: 'video', label: 'Vidéo / Animation' },
      { value: 'script', label: 'Script / Code' },
      { value: 'service_digital', label: 'Service numérique' },
      { value: 'autre_custom', label: 'Autre produit numérique' }
    ],
    ai: [
      { value: 'outil_ia', label: 'Outil IA' },
      { value: 'chatbot', label: 'Chatbot IA' },
      { value: 'api_ia', label: 'API IA' },
      { value: 'modele_ia', label: 'Modèle IA' },
      { value: 'prompt', label: 'Pack de prompts' },
      { value: 'autre_ia', label: 'Autre solution IA' }
    ]
  };

  // Données de base
  const [baseData, setBaseData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    tags: '',
    productType: '',
    publishImmediately: true
  });
  
  // Données d'affiliation
  const [affiliateData, setAffiliateData] = useState<AffiliateFormData>({
    affiliateUrl: '',
    affiliatePlatform: '',
    affiliateNetwork: 'direct',
    commissionRate: '',
    commissionType: 'percentage',
    cookieDuration: '30d',
    payoutThreshold: '',
    trackingId: ''
  });
  
  // Données de vente directe
  const [directData, setDirectData] = useState<DirectSaleFormData>({
    price: '',
    originalPrice: '',
    currency: 'GNF',
    pricingType: 'one_time',
    subscriptionInterval: 'monthly',
    minimumPrice: '',
    suggestedPrice: '',
    allowRefunds: true,
    refundPeriod: '30',
    limitedQuantity: false,
    maxQuantity: '',
    requireEmail: true,
    instantDelivery: true,
    accessDuration: 'lifetime'
  });
  
  // Médias
  const [images, setImages] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  const steps: { id: FormStep; label: string }[] = [
    { id: 'mode', label: 'Mode' },
    { id: 'details', label: 'Détails' },
    { id: 'pricing', label: salesMode === 'affiliate' ? 'Affiliation' : 'Prix' },
    { id: 'media', label: 'Médias' },
    { id: 'review', label: 'Validation' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

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

  const handleVideoSelect = (file: File | null, url: string | null) => {
    setVideoFile(file);
    setVideoPreviewUrl(url);
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    } else {
      onBack();
    }
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 'mode':
        return true;
      case 'details':
        if (!baseData.title.trim()) {
          toast.error('Le titre est obligatoire');
          return false;
        }
        return true;
      case 'pricing':
        if (salesMode === 'affiliate') {
          if (!affiliateData.affiliateUrl) {
            toast.error('Le lien d\'affiliation est obligatoire');
            return false;
          }
        } else {
          if (!directData.price || parseFloat(directData.price) < 0) {
            toast.error('Le prix est obligatoire');
            return false;
          }
        }
        return true;
      case 'media':
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Récupérer le vendor_id
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Upload de la vidéo si présente
      let videoUrl: string | null = null;
      if (videoFile) {
        setUploadingVideo(true);
        const videoFileName = `${user.id}/videos/${Date.now()}_${videoFile.name}`;
        
        const { error: videoError } = await supabase.storage
          .from('product-images')
          .upload(videoFileName, videoFile);

        if (!videoError) {
          const { data: videoUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(videoFileName);
          videoUrl = videoUrlData.publicUrl;
        }
        setUploadingVideo(false);
      }

      // Construction des données selon le mode
      const productData: any = {
        merchant_id: user.id,
        vendor_id: vendor?.id || null,
        title: baseData.title.trim(),
        description: baseData.description.trim(),
        short_description: baseData.shortDescription.trim(),
        images: images,
        video_url: videoUrl,
        category: category,
        product_type: baseData.productType || null,
        product_mode: salesMode,
        tags: baseData.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: baseData.publishImmediately ? 'published' : 'draft',
        published_at: baseData.publishImmediately ? new Date().toISOString() : null
      };

      if (salesMode === 'affiliate') {
        productData.affiliate_url = affiliateData.affiliateUrl;
        productData.affiliate_platform = affiliateData.affiliatePlatform || affiliateData.affiliateNetwork;
        productData.commission_rate = affiliateData.commissionRate ? parseFloat(affiliateData.commissionRate) : 0;
        productData.price = 0; // Prix affiché = 0 car redirection
        productData.original_price = null;
      } else {
        productData.price = parseFloat(directData.price);
        productData.original_price = directData.originalPrice ? parseFloat(directData.originalPrice) : null;
        productData.commission_rate = 0;
        productData.affiliate_url = null;
        productData.affiliate_platform = null;
      }

      const { error } = await supabase
        .from('digital_products')
        .insert(productData);

      if (error) throw error;

      toast.success(salesMode === 'affiliate' 
        ? 'Produit affilié créé avec succès!' 
        : 'Produit en vente directe créé!'
      );
      onSuccess();
    } catch (error) {
      console.error('Erreur création produit:', error);
      toast.error('Erreur lors de la création du produit');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    console.log('[DigitalProductForm] Rendering step:', currentStep, 'salesMode:', salesMode);
    
    switch (currentStep) {
      case 'mode':
        console.log('[DigitalProductForm] Rendering SalesModeSelector');
        return (
          <SalesModeSelector
            value={salesMode}
            onChange={(mode) => {
              console.log('[DigitalProductForm] Mode changed to:', mode);
              setSalesMode(mode);
            }}
            disabled={!config.allowDirectSale && !config.allowAffiliate}
          />
        );
      
      case 'details':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Informations du produit
                </CardTitle>
                <CardDescription className="text-xs">
                  {salesMode === 'affiliate' 
                    ? 'Décrivez le produit partenaire que vous promouvez'
                    : 'Présentez votre produit aux acheteurs potentiels'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">
                    Titre du produit <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={baseData.title}
                    onChange={(e) => setBaseData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={salesMode === 'affiliate' 
                      ? "Ex: Formation Marketing Digital - Systeme.io"
                      : "Ex: Ma Formation Complète React.js"
                    }
                    className="mt-1.5"
                  />
                </div>

                {/* Type de produit - Champ libre */}
                <div>
                  <Label htmlFor="productType" className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" />
                    Type de produit
                  </Label>
                  <Input
                    id="productType"
                    value={baseData.productType}
                    onChange={(e) => setBaseData(prev => ({ ...prev, productType: e.target.value }))}
                    placeholder="Ex: Logiciel de montage, Antivirus, Réservation hôtel..."
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Saisissez le type de produit que vous proposez
                  </p>
                </div>

                <div>
                  <Label htmlFor="shortDescription">Description courte</Label>
                  <Input
                    id="shortDescription"
                    value={baseData.shortDescription}
                    onChange={(e) => setBaseData(prev => ({ ...prev, shortDescription: e.target.value }))}
                    placeholder="Résumé accrocheur en une phrase"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description complète</Label>
                  <Textarea
                    id="description"
                    value={baseData.description}
                    onChange={(e) => setBaseData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={salesMode === 'affiliate'
                      ? "Décrivez les avantages du produit et pourquoi vos visiteurs devraient l'acheter..."
                      : "Décrivez votre produit en détail : ce qu'il contient, ses bénéfices..."
                    }
                    rows={5}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                  <Input
                    id="tags"
                    value={baseData.tags}
                    onChange={(e) => setBaseData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="marketing, formation, business, affiliation"
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'pricing':
        return salesMode === 'affiliate' ? (
          <AffiliateForm
            data={affiliateData}
            onChange={(updates) => setAffiliateData(prev => ({ ...prev, ...updates }))}
          />
        ) : (
          <DirectSaleForm
            data={directData}
            onChange={(updates) => setDirectData(prev => ({ ...prev, ...updates }))}
          />
        );
      
      case 'media':
        return (
          <div className="space-y-4">
            {/* Images */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Images du produit
                </CardTitle>
                <CardDescription className="text-xs">
                  Ajoutez des images attractives pour présenter le produit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {images.map((img, i) => (
                        <div key={i} className="relative shrink-0">
                          <img
                            src={img}
                            alt={`Image ${i + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border border-border"
                          />
                          <button
                            onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Cliquez pour ajouter des images
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      PNG, JPG jusqu'à 5MB
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

            {/* Vidéo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  Vidéo de présentation
                  <Badge variant="outline" className="text-[10px]">Optionnel</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VideoUploadPreview
                  maxDuration={5}
                  maxSizeMB={20}
                  onVideoSelect={handleVideoSelect}
                  currentVideoUrl={videoPreviewUrl}
                  label=""
                  helpText="Une courte vidéo de présentation (5 secondes max)"
                />
              </CardContent>
            </Card>
          </div>
        );
      
      case 'review':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Résumé de votre produit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mode */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant={salesMode === 'affiliate' ? 'secondary' : 'default'}>
                    {salesMode === 'affiliate' ? '🔗 Affiliation' : '💰 Vente directe'}
                  </Badge>
                </div>

                {/* Titre */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Titre</span>
                  <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                    {baseData.title || 'Non défini'}
                  </span>
                </div>

                {/* Prix ou Commission */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    {salesMode === 'affiliate' ? 'Commission' : 'Prix'}
                  </span>
                  <span className="text-sm font-medium text-primary">
                    {salesMode === 'affiliate' 
                      ? `${affiliateData.commissionRate || '0'}%`
                      : `${parseFloat(directData.price || '0').toLocaleString()} GNF`
                    }
                  </span>
                </div>

                {/* Images */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Images</span>
                  <span className="text-sm text-foreground">
                    {images.length} image(s)
                  </span>
                </div>

                {/* Catégorie */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Catégorie</span>
                  <span className="text-sm text-foreground">
                    {config.icon} {config.title}
                  </span>
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
                    checked={baseData.publishImmediately}
                    onCheckedChange={(v) => setBaseData(prev => ({ ...prev, publishImmediately: v }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(10rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <h1 className="text-lg font-bold text-foreground">{config.title}</h1>
              </div>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={cn(
                    'flex-1 h-1.5 rounded-full transition-all',
                    idx <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                  )}
                />
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground mx-0.5 shrink-0" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {steps.map((step, idx) => (
              <span
                key={step.id}
                className={cn(
                  'text-[10px]',
                  idx <= currentStepIndex ? 'text-primary font-medium' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {renderStepContent()}
      </div>

      {/* Footer Actions (placé au-dessus du QuickFooter global) */}
      <div className="fixed left-0 right-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] bg-card border-t border-border p-4 z-[90]">
        {currentStep === 'review' ? (
          <Button
            onClick={handleSubmit}
            disabled={loading || uploadingVideo}
            className="w-full h-12"
          >
            {loading || uploadingVideo ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadingVideo ? 'Upload vidéo...' : 'Création en cours...'}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {baseData.publishImmediately ? 'Créer et publier' : 'Enregistrer comme brouillon'}
              </>
            )}
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              Retour
            </Button>
            <Button
              onClick={() => {
                if (validateStep()) handleNext();
              }}
              className="flex-1"
            >
              Continuer
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
