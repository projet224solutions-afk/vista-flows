import { Card } from '@/components/ui/card';
import { useVendorAnalytics } from '@/hooks/useVendorAnalytics';
import { TrendingUp, ShoppingCart, Target, Package } from 'lucide-react';
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

  const stats = [
    {
      title: "Ventes Aujourd'hui",
      value: `${analytics.today.totalSales.toFixed(2)} GNF`,
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: "Commandes Aujourd'hui",
      value: analytics.today.totalOrders,
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      title: "Taux de Conversion",
      value: `${analytics.today.conversionRate.toFixed(1)}%`,
      icon: Target,
      color: 'text-purple-600'
    },
    {
      title: "Produits Actifs",
      value: analytics.topProducts.length,
      icon: Package,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Graphique des ventes (7 derniers jours) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Ventes - 7 derniers jours</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.week}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            />
            <YAxis />
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
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Produits</h3>
        <div className="space-y-3">
          {analytics.topProducts.map((product, index) => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full font-bold">
                  {index + 1}
                </div>
                <span className="font-medium">{product.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{product.sales} ventes</span>
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
  );
}
