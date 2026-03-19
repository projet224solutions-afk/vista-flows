/**
 * 📥 PAGE DE TÉLÉCHARGEMENT APRÈS ACHAT NUMÉRIQUE
 * Affiche les fichiers téléchargeables après un achat réussi
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, CheckCircle, FileText, Image, Music, Video, 
  Package, ArrowLeft, ExternalLink, ShoppingBag, AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { LocalPrice } from '@/components/ui/LocalPrice';

interface PurchaseInfo {
  id: string;
  product_id: string;
  amount: number;
  payment_status: string;
  access_granted: boolean;
  download_count: number;
  max_downloads: number;
  created_at: string;
}

interface DigitalProduct {
  id: string;
  title: string;
  description: string | null;
  images: string[] | null;
  file_urls: string[] | null;
  file_type: string | null;
  price: number;
  currency: string | null;
  merchant_id: string | null;
  vendor_id: string | null;
  vendors?: {
    business_name: string;
  };
}

function getFileIcon(url: string) {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <Image className="w-5 h-5" />;
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) return <Music className="w-5 h-5" />;
  if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) return <Video className="w-5 h-5" />;
  if (['pdf', 'doc', 'docx', 'txt', 'epub'].includes(ext)) return <FileText className="w-5 h-5" />;
  return <Package className="w-5 h-5" />;
}

function getFileName(url: string): string {
  try {
    const parts = url.split('/');
    const name = parts[parts.length - 1];
    return decodeURIComponent(name.split('?')[0]);
  } catch {
    return 'Fichier';
  }
}

export default function DigitalPurchaseDownload() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchase, setPurchase] = useState<PurchaseInfo | null>(null);
  const [product, setProduct] = useState<DigitalProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && productId) {
      loadPurchaseAndProduct();
    }
  }, [user?.id, productId]);

  const loadPurchaseAndProduct = async (retryCount = 0) => {
    try {
      // Charger l'achat
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('digital_product_purchases')
        .select('*')
        .eq('product_id', productId!)
        .eq('buyer_id', user!.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (purchaseError) throw purchaseError;

      if (!purchaseData) {
        // Retry up to 3 times with delay (race condition with insert)
        if (retryCount < 3) {
          console.log(`[DigitalPurchaseDownload] Purchase not found, retrying (${retryCount + 1}/3)...`);
          setTimeout(() => loadPurchaseAndProduct(retryCount + 1), 1500);
          return;
        }
        toast.error('Achat non trouvé ou accès non accordé');
        navigate('/marketplace');
        return;
      }

      setPurchase(purchaseData as PurchaseInfo);

      // Charger le produit
      const { data: productData, error: productError } = await supabase
        .from('digital_products')
        .select(`
          id, title, description, images, file_urls, file_type, price, currency, merchant_id, vendor_id,
          vendors:vendor_id(business_name)
        `)
        .eq('id', productId!)
        .single();

      if (productError) throw productError;
      
      const vRaw = (productData as any).vendors;
      setProduct({
        ...productData,
        vendors: Array.isArray(vRaw) ? vRaw[0] : vRaw
      } as DigitalProduct);

    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileUrl: string) => {
    if (!purchase || !purchase.access_granted) {
      toast.error('Accès non autorisé');
      return;
    }

    if (purchase.max_downloads && purchase.download_count >= purchase.max_downloads) {
      toast.error(`Limite de téléchargement atteinte (${purchase.max_downloads} max)`);
      return;
    }

    setDownloading(fileUrl);
    try {
      // Incrémenter le compteur
      await supabase
        .from('digital_product_purchases')
        .update({ download_count: (purchase.download_count || 0) + 1 })
        .eq('id', purchase.id);

      setPurchase(prev => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : prev);

      // Ouvrir le fichier
      window.open(fileUrl, '_blank');
      toast.success('Téléchargement lancé');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de votre achat...</p>
        </div>
      </div>
    );
  }

  if (!purchase || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Achat non trouvé</h2>
            <p className="text-muted-foreground mb-4">
              Vous n'avez pas accès à ce produit ou l'achat n'a pas été finalisé.
            </p>
            <Button onClick={() => navigate('/marketplace')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fileUrls = product.file_urls || [];
  const hasFiles = fileUrls.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        {/* Header succès */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Achat réussi !</h1>
            <p className="text-muted-foreground">
              Votre paiement de <LocalPrice amount={purchase.amount} currency={product.currency || 'GNF'} /> a été confirmé.
            </p>
          </CardContent>
        </Card>

        {/* Info produit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {product.title}
            </CardTitle>
            {product.vendors?.business_name && (
              <CardDescription>Par {product.vendors.business_name}</CardDescription>
            )}
          </CardHeader>
          {product.images?.[0] && (
            <div className="px-6">
              <img 
                src={product.images[0]} 
                alt={product.title} 
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
        </Card>

        {/* Fichiers téléchargeables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Fichiers disponibles
            </CardTitle>
            <CardDescription>
              {purchase.max_downloads 
                ? `${purchase.download_count || 0} / ${purchase.max_downloads} téléchargements utilisés`
                : 'Téléchargements illimités'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasFiles ? (
              fileUrls.map((url, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(url)}
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {getFileName(url)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fichier {index + 1}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(url)}
                    disabled={downloading === url || (purchase.max_downloads > 0 && purchase.download_count >= purchase.max_downloads)}
                  >
                    {downloading === url ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-1" />
                        Télécharger
                      </>
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Aucun fichier attaché à ce produit.</p>
                <p className="text-xs mt-1">Le vendeur n'a pas encore ajouté de fichiers téléchargeables.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/my-digital-purchases')}>
            <ShoppingBag className="w-4 h-4 mr-2" />
            Mes achats
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate('/marketplace')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Marketplace
          </Button>
        </div>
      </div>
    </div>
  );
}
