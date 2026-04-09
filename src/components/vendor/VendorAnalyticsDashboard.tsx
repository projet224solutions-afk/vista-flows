import { Card } from '@/components/ui/card';
import { useVendorAnalytics } from '@/hooks/useVendorAnalytics';
import { useEffect, useState } from 'react';
import { createVendorBoost, getVendorBoosts, getVendorVisibilitySummary } from '@/services/marketplaceVisibilityService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TrendingUp, Target, Package } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function VendorAnalyticsDashboard() {
  const { analytics, loading } = useVendorAnalytics();
  const [visibility, setVisibility] = useState<any>(null);
  const [vendorBoosts, setVendorBoosts] = useState<any[]>([]);
  const [boostType, setBoostType] = useState<'product' | 'shop'>('shop');
  const [boostTargetId, setBoostTargetId] = useState('');
  const [boostScore, setBoostScore] = useState(20);
  const [boostDays, setBoostDays] = useState(7);
  const [creatingBoost, setCreatingBoost] = useState(false);

  useEffect(() => {
    let mounted = true;
    getVendorVisibilitySummary().then((resp) => {
      if (!mounted) return;
      if (resp.success) setVisibility(resp.data || null);
    });

    getVendorBoosts().then((resp) => {
      if (!mounted) return;
      if (resp.success) setVendorBoosts(resp.data || []);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateBoost = async () => {
    if (!boostTargetId.trim()) {
      toast.error('Renseignez un ID cible pour le boost');
      return;
    }

    setCreatingBoost(true);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + boostDays * 24 * 60 * 60 * 1000);

      const response = await createVendorBoost({
        targetType: boostType,
        targetId: boostTargetId.trim(),
        boostScore,
        budgetAmount: boostScore * boostDays,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      });

      if (!response.success) {
        toast.error(response.error || 'Échec création boost');
        return;
      }

      toast.success('Boost créé', {
        description: 'Votre boost est enregistré et sera visible selon son statut.',
      });

      const boosts = await getVendorBoosts();
      if (boosts.success) setVendorBoosts(boosts.data || []);
    } finally {
      setCreatingBoost(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) return null;

  const stats = [
    {
      title: "Ventes Aujourd'hui",
      value: `${analytics.today.totalSales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} GNF`,
      subtitle: `POS: ${analytics.today.posOrders} • En ligne: ${analytics.today.onlineOrders}`,
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: "Taux de Conversion",
      value: `${analytics.today.conversionRate.toFixed(1)}%`,
      icon: Target,
      color: 'text-purple-600'
    },
    {
      title: "Produits Actifs",
      value: analytics.activeProductsCount,
      icon: Package,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs - grille responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                <p className="text-lg font-bold mt-1 truncate">{stat.value}</p>
                {'subtitle' in stat && stat.subtitle && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.subtitle}</p>
                )}
              </div>
              <stat.icon className={`h-6 w-6 flex-shrink-0 ml-2 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {visibility && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Visibilité Marketplace</p>
              <p className="text-xl font-bold">
                Score actuel: {Number(visibility.currentVisibilityScore || 0).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">
                Plan: {String(visibility.planName || 'free').toUpperCase()} | Base: {Number(visibility.baseVisibilityScore || 0).toFixed(1)} | Boost actif: +{Number(visibility.activeBoostScore || 0).toFixed(1)}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Boosts actifs: {Array.isArray(visibility.boosts) ? visibility.boosts.filter((b: any) => b.status === 'active').length : 0}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold">Boost Visibilité</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Créez un boost ciblé sur votre boutique ou un produit précis pour augmenter votre exposition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Type de boost</Label>
              <Select value={boostType} onValueChange={(v: 'product' | 'shop') => setBoostType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">Boutique</SelectItem>
                  <SelectItem value="product">Produit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ID cible (UUID)</Label>
              <Input value={boostTargetId} onChange={(e) => setBoostTargetId(e.target.value)} placeholder="UUID produit ou boutique" />
            </div>
            <div>
              <Label>Score boost</Label>
              <Input type="number" min={1} max={100} value={boostScore} onChange={(e) => setBoostScore(Number(e.target.value || 0))} />
            </div>
            <div>
              <Label>Durée (jours)</Label>
              <Input type="number" min={1} max={90} value={boostDays} onChange={(e) => setBoostDays(Number(e.target.value || 1))} />
            </div>
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            Boosts enregistrés: {vendorBoosts.length} | Actifs: {vendorBoosts.filter((b: any) => b.status === 'active').length}
          </div>
        </div>
      </Card>

      {/* Graphique des ventes + Top Produits - côte à côte en paysage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Graphique des ventes (7 derniers jours) */}
        <Card className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Ventes - 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analytics.week}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(2)} GNF`}
                labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR')}
              />
              <Area 
                type="monotone" 
                dataKey="total_sales" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Produits */}
        <Card className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Top Produits</h3>
          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {analytics.topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-sm sm:text-base line-clamp-1">{product.name}</span>
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">{product.sales} ventes</span>
              </div>
            ))}
            {analytics.topProducts.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucune vente enregistrée
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
