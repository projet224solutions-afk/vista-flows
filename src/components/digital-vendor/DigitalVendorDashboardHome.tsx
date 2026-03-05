/**
 * Dashboard Home dédié pour les vendeurs de produits numériques
 * Affiche uniquement les stats et actions liées aux produits digitaux et affiliations
 */

import { memo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Laptop, Plus, Eye, TrendingUp, DollarSign,
  Link, Package, FileText, BookOpen, Plane, Box, ShoppingCart
} from 'lucide-react';
import { useMerchantDigitalProducts, DigitalProduct } from '@/hooks/useDigitalProducts';
import { SectionLoader } from '@/components/ui/GlobalLoader';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const UniversalWalletTransactions = lazy(() => import('@/components/wallet/UniversalWalletTransactions'));

const categoryIcons: Record<string, React.ComponentType<any>> = {
  voyage: Plane,
  logiciel: Laptop,
  formation: FileText,
  livre: BookOpen,
  dropshipping: Box,
  custom: Package,
};

const DigitalVendorDashboardHome = memo(function DigitalVendorDashboardHome() {
  const navigate = useNavigate();
  const { products, loading } = useMerchantDigitalProducts();

  const publishedCount = products.filter(p => p.status === 'published').length;
  const draftCount = products.filter(p => p.status === 'draft').length;
  const affiliateCount = products.filter(p => p.product_mode === 'affiliate').length;
  const directCount = products.filter(p => p.product_mode === 'direct').length;
  const totalViews = products.reduce((sum, p) => sum + (p.views_count || 0), 0);
  const totalSales = products.reduce((sum, p) => sum + (p.sales_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200/50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <Laptop className="w-5 h-5 text-purple-600" />
                Espace Vendeur Digital
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez vos produits numériques et programmes d'affiliation
              </p>
            </div>
            <Button
              onClick={() => navigate('/vendeur-digital/add-product')}
              className="bg-purple-600 hover:bg-purple-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau produit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Total Produits</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold">{products.length}</div>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px]">{directCount} directs</Badge>
              <Badge variant="outline" className="text-[10px]">{affiliateCount} affil.</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Publiés</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{publishedCount}</div>
            {draftCount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">{draftCount} brouillon{draftCount > 1 ? 's' : ''}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Vues totales</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{totalViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Ventes</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{totalSales}</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Wallet */}
        <Suspense fallback={<SectionLoader />}>
          <div>
            <UniversalWalletTransactions />
          </div>
        </Suspense>

        {/* Recent Products */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Produits récents</CardTitle>
                  <CardDescription className="text-xs">Vos derniers produits numériques</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/vendeur-digital/products')}>
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <SectionLoader />
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Laptop className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">Aucun produit numérique</p>
                  <Button onClick={() => navigate('/vendeur-digital/add-product')} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Créer mon premier produit
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.slice(0, 5).map((product) => {
                    const CategoryIcon = categoryIcons[product.category] || Package;
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => navigate(`/digital-product/${product.id}`)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <CategoryIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{product.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{product.product_mode === 'affiliate' ? 'Affiliation' : 'Direct'}</span>
                            <span>•</span>
                            <span>{product.views_count || 0} vues</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(product.created_at), { addSuffix: true, locale: fr })}</span>
                          </div>
                        </div>
                        <Badge
                          variant={product.status === 'published' ? 'default' : 'secondary'}
                          className="text-[10px] flex-shrink-0"
                        >
                          {product.status === 'published' ? 'Publié' : product.status === 'draft' ? 'Brouillon' : product.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/vendeur-digital/add-product')}
            >
              <Plus className="w-5 h-5 text-purple-600" />
              <span className="text-xs">Ajouter un produit</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/vendeur-digital/products')}
            >
              <Laptop className="w-5 h-5 text-blue-600" />
              <span className="text-xs">Mes produits</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/vendeur-digital/affiliate')}
            >
              <Link className="w-5 h-5 text-green-600" />
              <span className="text-xs">Affiliation</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/vendeur-digital/wallet')}
            >
              <DollarSign className="w-5 h-5 text-orange-600" />
              <span className="text-xs">Portefeuille</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export { DigitalVendorDashboardHome };
export default DigitalVendorDashboardHome;
