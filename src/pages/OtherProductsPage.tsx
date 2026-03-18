/**
 * 🎯 PAGE AUTRES PRODUITS - 224SOLUTIONS
 * Affiche les recommandations personnalisées et produits achetés ensemble
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePersonalizedRecommendations,
  useAlsoBoughtProducts,
} from '@/hooks/useProductRecommendations';
import { TranslatedProductCard } from '@/components/marketplace/TranslatedProductCard';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function OtherProductsPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: personalized, isLoading: loadingPersonalized } = usePersonalizedRecommendations(16);
  const { data: alsoBought, isLoading: loadingAlsoBought } = useAlsoBoughtProducts(productId, 12);
  const [productName, setProductName] = useState('');

  const isLoading = loadingPersonalized || loadingAlsoBought;

  useEffect(() => {
    if (!productId) return;
    supabase
      .from('products')
      .select('name')
      .eq('id', productId)
      .single()
      .then(({ data }) => {
        if (data) setProductName(data.name);
      });
  }, [productId]);

  // Combiner et dédupliquer
  const allProducts = (() => {
    const map = new Map<string, any>();
    (alsoBought || []).forEach((p) => map.set(p.product_id, { ...p, section: 'Souvent achetés ensemble' }));
    (personalized || []).forEach((p) => {
      if (!map.has(p.product_id)) map.set(p.product_id, { ...p, section: 'Sélection pour vous' });
    });
    // Exclure le produit actuel
    if (productId) map.delete(productId);
    return Array.from(map.values());
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">Autres produits</h1>
              {productName && (
                <p className="text-xs text-muted-foreground truncate">
                  En rapport avec : {productName}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de produits */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4 md:overflow-x-visible md:snap-none md:pb-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="min-w-[160px] snap-start md:min-w-0 space-y-3">
                <Skeleton className="w-full aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : allProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Aucune suggestion disponible
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Nous n'avons pas encore assez de données pour vous proposer des recommandations. Continuez à explorer nos produits !
            </p>
            <Button onClick={() => navigate('/marketplace')}>
              Explorer le marketplace
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {allProducts.length} produit{allProducts.length > 1 ? 's' : ''} recommandé{allProducts.length > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {allProducts.map((product) => (
                <TranslatedProductCard
                  key={product.product_id}
                  id={product.product_id}
                  image={product.images?.[0] || ''}
                  title={product.name}
                  price={product.price}
                  vendor=""
                  rating={product.rating || 0}
                  reviewCount={0}
                  onBuy={() => navigate(`/product/${product.product_id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
