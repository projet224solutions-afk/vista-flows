import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, Package, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  ordersThisMonth: number;
  salesByDay: Array<{ date: string; sales: number; orders: number }>;
  topProducts: Array<{ name: string; sales: number; revenue: number }>;
}

export default function VendorAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    revenueGrowth: 0,
    ordersThisMonth: 0,
    salesByDay: [],
    topProducts: []
  });
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Récupérer le vendor_id
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!vendor) return;

      // Récupérer les liens de paiement réussis
      const { data: paymentLinks } = await supabase
        .from('payment_links')
        .select('id, created_at, total, produit, client_id')
        .eq('vendeur_id', vendor.id)
        .eq('status', 'success');

      // Récupérer les commandes
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, customer_id, status')
        .eq('vendor_id', vendor.id);

      // Récupérer les produits actifs
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendor.id)
        .eq('is_active', true);

      // Calculer le revenu total
      const totalRevenue = (paymentLinks || []).reduce((sum, link) => sum + (link.total || 0), 0) +
                          (orders || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);

      // Nombre total de commandes
      const totalOrders = (paymentLinks || []).length + (orders || []).length;

      // Clients uniques
      const uniqueCustomers = new Set([
        ...(paymentLinks || []).filter(l => l.client_id).map(l => l.client_id),
        ...(orders || []).map(o => o.customer_id)
      ]).size;

      // Ventes par jour (7 derniers jours)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const salesByDay = last7Days.map(date => {
        const dayOrders = (orders || []).filter(o => o.created_at?.startsWith(date));
        const dayPayments = (paymentLinks || []).filter(l => l.created_at?.startsWith(date));
        
        return {
          date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          sales: (dayPayments.reduce((sum, l) => sum + (l.total || 0), 0) +
                 dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)),
          orders: dayOrders.length + dayPayments.length
        };
      });

      // Top 5 produits
      const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
      
      (paymentLinks || []).forEach(link => {
        if (link.produit) {
          if (!productSales[link.produit]) {
            productSales[link.produit] = { name: link.produit, sales: 0, revenue: 0 };
          }
          productSales[link.produit].sales += 1;
          productSales[link.produit].revenue += link.total || 0;
        }
      });

      // Les produits des commandes seront ajoutés via les liens de paiement principalement

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Croissance (comparaison mois en cours vs mois précédent)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const thisMonthOrders = (orders || []).filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      }).length;

      const lastMonthOrders = (orders || []).filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.getMonth() === currentMonth - 1 && orderDate.getFullYear() === currentYear;
      }).length;

      const revenueGrowth = lastMonthOrders > 0 
        ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 
        : 0;

      setAnalytics({
        totalRevenue,
        totalOrders,
        totalCustomers: uniqueCustomers,
        totalProducts: products?.length || 0,
        revenueGrowth,
        ordersThisMonth: thisMonthOrders,
        salesByDay,
        topProducts
      });
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec bouton refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytiques</h2>
        <Button variant="outline" onClick={loadAnalytics} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus Total</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('fr-FR').format(analytics.totalRevenue)} GNF
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.ordersThisMonth} commandes ce mois
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commandes</p>
                <p className="text-2xl font-bold">{analytics.totalOrders}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total commandes
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{analytics.totalCustomers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clients uniques
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Croissance</p>
                <p className={`text-2xl font-bold ${analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.revenueGrowth >= 0 ? '+' : ''}{analytics.revenueGrowth.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  vs mois dernier
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventes sur 7 jours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Ventes - 7 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => new Intl.NumberFormat('fr-FR').format(value) + ' GNF'}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Produits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Top 5 Produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => new Intl.NumberFormat('fr-FR').format(value) + ' GNF'}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenus" />
                <Bar dataKey="sales" fill="#10b981" name="Ventes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Détails des top produits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Détails des Produits Performants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topProducts.length > 0 ? (
            <div className="space-y-3">
              {analytics.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sales} ventes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {new Intl.NumberFormat('fr-FR').format(product.revenue)} GNF
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune vente enregistrée</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}