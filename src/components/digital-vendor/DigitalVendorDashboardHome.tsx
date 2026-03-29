/**
 * Dashboard Home dÃ©diÃ© pour les vendeurs de produits numÃ©riques
 * Stats rÃ©elles avec ventilation : CA brut, commissions, revenu net
 */

import { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Laptop, Plus, Eye, TrendingUp, DollarSign,
  Link, Package, FileText, BookOpen, Plane, Box, ShoppingCart,
  Users, Download, Info, BarChart3
} from 'lucide-react';
import { useMerchantDigitalProducts, DigitalProduct } from '@/hooks/useDigitalProducts';
import { SectionLoader } from '@/components/ui/GlobalLoader';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const categoryIcons: Record<string, React.ComponentType<any>> = {
  voyage: Plane,
  logiciel: Laptop,
  formation: FileText,
  livre: BookOpen,
  dropshipping: Box,
  custom: Package,
  ai: Laptop,
};

interface MerchantStats {
  totalSales: number;
  grossRevenue: number;
  totalCommissions: number;
  netRevenue: number;
  activeSubscribers: number;
  totalDownloads: number;
  subscriptionRevenue: number;
}

const DigitalVendorDashboardHome = memo(function DigitalVendorDashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, loading } = useMerchantDigitalProducts();
  const [stats, setStats] = useState<MerchantStats>({
    totalSales: 0, grossRevenue: 0, totalCommissions: 0,
    netRevenue: 0, activeSubscribers: 0, totalDownloads: 0, subscriptionRevenue: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const publishedCount = products.filter(p => p.status === 'published').length;
  const draftCount = products.filter(p => p.status === 'draft').length;
  const affiliateCount = products.filter(p => p.product_mode === 'affiliate').length;
  const directCount = products.filter(p => p.product_mode === 'direct').length;
  const totalViews = products.reduce((sum, p) => sum + (p.views_count || 0), 0);

  useEffect(() => {
    if (!user?.id) return;
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const [purchasesRes, subscriptionsRes] = await Promise.all([
          supabase
            .from('digital_product_purchases')
            .select('id, amount, download_count, commission_amount')
            .eq('merchant_id', user.id)
            .eq('payment_status', 'completed'),
          supabase
            .from('digital_subscriptions')
            .select('id, amount_per_period, status')
            .eq('merchant_id', user.id)
        ]);

        const purchases = purchasesRes.data || [];
        const subscriptions = subscriptionsRes.data || [];

        const totalSales = purchases.length;
        const grossRevenue = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalCommissions = purchases.reduce((sum, p) => sum + (p.commission_amount || 0), 0);
        const netRevenue = grossRevenue - totalCommissions;
        const totalDownloads = purchases.reduce((sum, p) => sum + (p.download_count || 0), 0);
        const activeSubs = subscriptions.filter(s => s.status === 'active');
        const activeSubscribers = activeSubs.length;
        const subscriptionRevenue = activeSubs.reduce((sum, s) => sum + (s.amount_per_period || 0), 0);

        setStats({ totalSales, grossRevenue, totalCommissions, netRevenue, activeSubscribers, totalDownloads, subscriptionRevenue });
      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [user?.id]);

  const fmtNum = (n: number) => n.toLocaleString('fr-FR');

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Welcome */}
        <Card className="bg-gradient-to-r from-primary-blue-50 to-primary-orange-50 dark:from-primary-blue-950/30 dark:to-primary-orange-950/30 border-primary-blue-200/50 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-primary-blue-600" />
                  Espace Vendeur Digital
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  GÃ©rez vos produits numÃ©riques et programmes d'affiliation
                </p>
              </div>
              <Button
                onClick={() => navigate('/vendeur-digital/add-product')}
                className="bg-gradient-to-r from-primary-blue-600 to-primary-orange-500 hover:from-primary-blue-700 hover:to-primary-orange-600 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau produit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Stats - with breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 [&>*]:shadow-sm [&>*]:transition-shadow [&>*]:hover:shadow-md [&>*]:border-primary-blue-100/70">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-primary-orange-600" />
                <span className="text-xs text-muted-foreground">Ventes</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-primary-orange-600">
                {statsLoading ? '...' : stats.totalSales}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">achats confirmÃ©s</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-primary-orange-600" />
                <span className="text-xs text-muted-foreground">CA brut</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">Montant total des ventes avant dÃ©duction des commissions d'affiliation</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-primary-orange-600">
                {statsLoading ? '...' : fmtNum(stats.grossRevenue)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">GNF total</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary-blue-600" />
                <span className="text-xs text-muted-foreground">Revenu net</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">CA brut âˆ’ commissions affiliÃ©s = revenu net perÃ§u</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-primary-blue-600">
                {statsLoading ? '...' : fmtNum(stats.netRevenue)}
              </div>
              {!statsLoading && stats.totalCommissions > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  âˆ’{fmtNum(stats.totalCommissions)} GNF commissions
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-primary-blue-600" />
                <span className="text-xs text-muted-foreground">AbonnÃ©s</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-primary-blue-600">
                {statsLoading ? '...' : stats.activeSubscribers}
              </div>
              {!statsLoading && stats.subscriptionRevenue > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {fmtNum(stats.subscriptionRevenue)} GNF/pÃ©riode
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 [&>*]:shadow-sm [&>*]:transition-shadow [&>*]:hover:shadow-md [&>*]:border-primary-orange-100/70">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Produits</span>
              </div>
              <div className="text-lg font-bold">{products.length}</div>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px]">{directCount} directs</Badge>
                <Badge variant="outline" className="text-[10px]">{affiliateCount} affil.</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-primary-orange-600" />
                <span className="text-xs text-muted-foreground">PubliÃ©s</span>
              </div>
              <div className="text-lg font-bold text-primary-orange-600">{publishedCount}</div>
              {draftCount > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">{draftCount} brouillon{draftCount > 1 ? 's' : ''}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-primary-blue-600" />
                <span className="text-xs text-muted-foreground">TÃ©lÃ©chargements</span>
              </div>
              <div className="text-lg font-bold text-primary-blue-600">
                {statsLoading ? '...' : stats.totalDownloads}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-primary-blue-600" />
                <span className="text-xs text-muted-foreground">Vues totales</span>
              </div>
              <div className="text-lg font-bold text-primary-blue-600">{totalViews}</div>
              {stats.totalSales > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Conversion : {((stats.totalSales / Math.max(totalViews, 1)) * 100).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Products */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Produits rÃ©cents</CardTitle>
                <CardDescription className="text-xs">Vos derniers produits numÃ©riques</CardDescription>
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
                <p className="text-sm text-muted-foreground mb-3">Aucun produit numÃ©rique</p>
                <Button onClick={() => navigate('/vendeur-digital/add-product')} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  CrÃ©er mon premier produit
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {products.slice(0, 5).map((product) => {
                  const CategoryIcon = categoryIcons[product.category] || Package;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-gradient-to-r hover:from-primary-blue-50/70 hover:to-primary-orange-50/70 transition-colors cursor-pointer"
                      onClick={() => navigate(`/digital-product/${product.id}`)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CategoryIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{product.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{product.product_mode === 'affiliate' ? 'Affiliation' : 'Direct'}</span>
                          <span>â€¢</span>
                          <span>{product.sales_count || 0} ventes</span>
                          <span>â€¢</span>
                          <span>{product.views_count || 0} vues</span>
                        </div>
                      </div>
                      <Badge
                        variant={product.status === 'published' ? 'default' : 'secondary'}
                        className={product.status === 'published'
                          ? 'text-[10px] flex-shrink-0 bg-gradient-to-r from-primary-blue-600 to-primary-orange-500 text-white border-0'
                          : 'text-[10px] flex-shrink-0'}
                      >
                        {product.status === 'published' ? 'PubliÃ©' : product.status === 'draft' ? 'Brouillon' :
                         product.status === 'rejected' ? 'RejetÃ©' : product.status === 'archived' ? 'ArchivÃ©' : product.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:border-primary-blue-300 hover:bg-primary-blue-50/40" onClick={() => navigate('/vendeur-digital/add-product')}>
                <Plus className="w-5 h-5 text-primary-blue-600" />
                <span className="text-xs">Ajouter un produit</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/vendeur-digital/products')}>
                <Laptop className="w-5 h-5 text-primary-blue-600" />
                <span className="text-xs">Mes produits</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/vendeur-digital/affiliate')}>
                <Link className="w-5 h-5 text-primary-orange-600" />
                <span className="text-xs">Affiliation</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/vendeur-digital/wallet')}>
                <DollarSign className="w-5 h-5 text-primary-orange-600" />
                <span className="text-xs">Portefeuille</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
});

export { DigitalVendorDashboardHome };
export default DigitalVendorDashboardHome;
