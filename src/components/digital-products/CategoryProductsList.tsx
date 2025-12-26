/**
 * Liste des produits par catégorie
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ExternalLink, ShoppingCart, Star, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useDigitalProducts } from '@/hooks/useDigitalProducts';
import { cn } from '@/lib/utils';
import { DigitalProductForm } from './DigitalProductForm';
import { MerchantActivationDialog } from './MerchantActivationDialog';
import { toast } from 'sonner';

interface CategoryProductsListProps {
  category: 'dropshipping' | 'voyage' | 'logiciel' | 'formation' | 'livre' | 'custom';
  title: string;
  description: string;
  gradient: string;
  onBack: () => void;
}

export function CategoryProductsList({ 
  category, 
  title, 
  description, 
  gradient,
  onBack 
}: CategoryProductsListProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { products, loading } = useDigitalProducts({ category });
  const [showProductForm, setShowProductForm] = useState(false);
  const [showActivationDialog, setShowActivationDialog] = useState(false);

  const isMerchant = profile?.role === 'vendeur';

  const handleAddProduct = () => {
    if (!user) {
      toast.info('Connexion requise pour ajouter un produit');
      navigate('/auth', { state: { redirectTo: '/digital-products' } });
      return;
    }

    if (!isMerchant) {
      setShowActivationDialog(true);
      return;
    }

    setShowProductForm(true);
  };

  const handleActivationSuccess = () => {
    setShowActivationDialog(false);
    setShowProductForm(true);
  };

  const handleProductCreated = () => {
    setShowProductForm(false);
    toast.success('Produit créé et publié!');
  };

  const handleProductClick = (product: any) => {
    if (product.product_mode === 'affiliate' && product.affiliate_url) {
      window.open(product.affiliate_url, '_blank');
    } else {
      navigate(`/product/${product.id}?type=digital`);
    }
  };

  const formatPrice = (price: number, currency: string = 'GNF') => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(price) + ' ' + currency;
  };

  if (showProductForm) {
    return (
      <DigitalProductForm
        category={category}
        onBack={() => setShowProductForm(false)}
        onSuccess={handleProductCreated}
      />
    );
  }

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
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            {user && isMerchant && (
              <Button
                size="sm"
                onClick={handleAddProduct}
                className={cn('bg-gradient-to-r text-white', gradient)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Products Grid */}
      <section className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className={cn(
              'w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center',
              'bg-gradient-to-br text-white/80',
              gradient
            )}>
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Aucun produit disponible</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Soyez le premier à ajouter un produit dans cette catégorie!
            </p>
            {user ? (
              <Button onClick={handleAddProduct} className={cn('bg-gradient-to-r text-white', gradient)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un produit
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth', { state: { redirectTo: '/digital-products' } })}>
                Se connecter pour ajouter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <Card 
                key={product.id}
                className="cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-200"
                onClick={() => handleProductClick(product)}
              >
                <div className="relative aspect-square bg-muted">
                  {product.images && product.images[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={cn(
                      'w-full h-full flex items-center justify-center',
                      'bg-gradient-to-br text-white/50',
                      gradient
                    )}>
                      <ShoppingCart className="w-10 h-10" />
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.product_mode === 'affiliate' && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Affilié
                      </Badge>
                    )}
                    {product.is_featured && (
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-yellow-500">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-3">
                  <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
                    {product.title}
                  </h3>
                  
                  {product.short_description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                      {product.short_description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary text-sm">
                      {formatPrice(product.price, product.currency)}
                    </span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span className="text-xs">{product.views_count || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Add Product FAB for non-merchants */}
      {user && !isMerchant && products.length > 0 && (
        <div className="fixed bottom-24 right-4 z-50">
          <Button
            onClick={handleAddProduct}
            className={cn('rounded-full w-14 h-14 shadow-lg bg-gradient-to-r text-white', gradient)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Merchant Add FAB */}
      {user && isMerchant && products.length > 0 && (
        <div className="fixed bottom-24 right-4 z-50">
          <Button
            onClick={handleAddProduct}
            className={cn('rounded-full w-14 h-14 shadow-lg bg-gradient-to-r text-white', gradient)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <MerchantActivationDialog
        open={showActivationDialog}
        onOpenChange={setShowActivationDialog}
        onSuccess={handleActivationSuccess}
      />
    </div>
  );
}
