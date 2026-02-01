import { Card } from '@/components/ui/card';
import { useVendorAnalytics } from '@/hooks/useVendorAnalytics';
import { TrendingUp, ShoppingCart, Target, Package, Store, Globe } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function VendorAnalyticsDashboard() {
  const { analytics, loading } = useVendorAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) return null;

  // Stats secondaires (sans la carte Ventes principales)
  const secondaryStats = [
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
      {/* Carte Ventes principale avec répartition */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Ventes Aujourd'hui</p>
            <p className="text-3xl font-bold mt-1 text-green-600">
              {analytics.today.totalSales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} GNF
            </p>
          </div>
          <TrendingUp className="h-10 w-10 text-green-600" />
        </div>
        
        {/* Répartition POS / En ligne */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <Store className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ventes POS</p>
              <p className="text-lg font-bold text-blue-600">{analytics.today.posOrders}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-cyan-100 dark:bg-cyan-900/50 rounded-full">
              <Globe className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En ligne</p>
              <p className="text-lg font-bold text-cyan-600">{analytics.today.onlineOrders}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* KPIs secondaires */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {secondaryStats.map((stat) => (
          <Card key={stat.title} className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`h-7 w-7 sm:h-8 sm:w-8 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

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
