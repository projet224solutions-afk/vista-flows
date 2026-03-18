/**
 * 🎯 PAGE PRODUITS SIMILAIRES - 224SOLUTIONS
 * Affiche uniquement les produits similaires à un produit donné
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSimilarProducts } from '@/hooks/useProductRecommendations';
import { TranslatedProductCard } from '@/components/marketplace/TranslatedProductCard';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function SimilarProductsPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: products, isLoading } = useSimilarProducts(productId, 20);
  const [productName, setProductName] = useState('');

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">Produits similaires</h1>
              {productName && (
                <p className="text-xs text-muted-foreground truncate">
                  Basé sur : {productName}
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
        ) : !products || products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Aucun produit similaire trouvé
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Nous n'avons pas trouvé de produits similaires pour le moment. Explorez notre marketplace pour découvrir d'autres articles.
            </p>
            <Button onClick={() => navigate('/marketplace')}>
              Explorer le marketplace
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {products.length} produit{products.length > 1 ? 's' : ''} similaire{products.length > 1 ? 's' : ''} trouvé{products.length > 1 ? 's' : ''}
            </p>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4 md:overflow-x-visible md:snap-none md:pb-0">
              {products.map((product) => (
                <div key={product.product_id} className="min-w-[160px] snap-start md:min-w-0">
                  <TranslatedProductCard
                    id={product.product_id}
                    image={product.images?.[0] || ''}
                    title={product.name}
                    price={product.price}
                    vendor=""
                    rating={product.rating || 0}
                    reviewCount={0}
                    onBuy={() => navigate(`/product/${product.product_id}`)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
