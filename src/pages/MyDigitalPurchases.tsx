/**
 * 📚 BIBLIOTHÈQUE D'ACHATS NUMÉRIQUES
 * Liste tous les produits numériques achetés par l'utilisateur
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, Package, ArrowLeft, ShoppingBag, 
  Calendar, Loader2, FileText
} from 'lucide-react';
import { LocalPrice } from '@/components/ui/LocalPrice';

interface PurchaseWithProduct {
  id: string;
  product_id: string;
  amount: number;
  payment_status: string;
  access_granted: boolean;
  download_count: number;
  max_downloads: number;
  created_at: string;
  product_title?: string;
  product_image?: string;
  product_currency?: string;
}

export default function MyDigitalPurchases() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadPurchases();
  }, [user?.id]);

  const loadPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('digital_product_purchases')
        .select('*')
        .eq('buyer_id', user!.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Charger les détails des produits
      const productIds = (data || []).map(p => p.product_id);
      const { data: products } = await supabase
        .from('digital_products')
        .select('id, title, images, currency')
        .in('id', productIds);

      const productMap = new Map((products || []).map(p => [p.id, p]));

      const enriched: PurchaseWithProduct[] = (data || []).map(purchase => {
        const prod = productMap.get(purchase.product_id);
        return {
          ...purchase,
          product_title: prod?.title || 'Produit inconnu',
          product_image: Array.isArray(prod?.images) ? (prod.images as string[])[0] : undefined,
          product_currency: prod?.currency || 'GNF'
        };
      });

      setPurchases(enriched);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-6 h-6" />
              Mes achats numériques
            </h1>
            <p className="text-sm text-muted-foreground">{purchases.length} produit(s) acheté(s)</p>
          </div>
        </div>

        {purchases.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucun achat</h3>
              <p className="text-muted-foreground mb-4">Vous n'avez pas encore acheté de produit numérique.</p>
              <Button onClick={() => navigate('/marketplace')}>
                Découvrir le marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {purchases.map(purchase => (
              <Card 
                key={purchase.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/digital-purchase/${purchase.product_id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {purchase.product_image ? (
                    <img 
                      src={purchase.product_image} 
                      alt={purchase.product_title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{purchase.product_title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(purchase.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <LocalPrice amount={purchase.amount} currency={purchase.product_currency || 'GNF'} className="text-sm font-medium" />
                      {purchase.access_granted && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Download className="w-3 h-3 mr-1" />
                          {purchase.download_count || 0} DL
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
