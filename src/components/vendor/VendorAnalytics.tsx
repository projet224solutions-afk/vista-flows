import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, BarChart3, PieChart as PieChartIcon, Download,
  Calendar, Filter, Eye, ShoppingCart, DollarSign, Users,
  Package, Star, ArrowUp, ArrowDown, Activity
} from "lucide-react";

interface AnalyticsData {
  revenue: Array<{date: string, amount: number}>;
  orders: Array<{date: string, count: number}>;
  products: Array<{name: string, sales: number, revenue: number}>;
  customers: Array<{date: string, new: number, returning: number}>;
  categories: Array<{name: string, value: number}>;
}

export default function VendorAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    revenue: [],
    orders: [],
    products: [],
    customers: [],
    categories: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get vendor ID
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) return;

      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Fetch orders data
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items:order_items(
            quantity,
            total_price,
            product:products(name, category_id)
          )
        `)
        .eq('vendor_id', vendor.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      // Process revenue data
      const revenueByDate = processRevenueData(ordersData || [], dateRange);
      const ordersByDate = processOrdersData(ordersData || [], dateRange);
      const productsData = processProductsData(ordersData || []);
      const customersData = processCustomersData(ordersData || [], dateRange);
      const categoriesData = processCategoriesData(ordersData || []);

      setAnalyticsData({
        revenue: revenueByDate,
        orders: ordersByDate,
        products: productsData,
        customers: customersData,
        categories: categoriesData
      });

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données d'analyse.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processRevenueData = (orders: unknown[], range: string) => {
    const data: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const key = range === '7d' || range === '30d' 
        ? date.toLocaleDateString('fr-FR')
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      data[key] = (data[key] || 0) + order.total_amount;
    });

    return Object.entries(data).map(([date, amount]) => ({ date, amount }));
  };

  const processOrdersData = (orders: unknown[], range: string) => {
    const data: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const key = range === '7d' || range === '30d' 
        ? date.toLocaleDateString('fr-FR')
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      data[key] = (data[key] || 0) + 1;
    });

    return Object.entries(data).map(([date, count]) => ({ date, count }));
  };

  const processProductsData = (orders: unknown[]) => {
    const productData: Record<string, { sales: number, revenue: number }> = {};
    
    orders.forEach(order => {
      order.order_items?.forEach((item: unknown) => {
        const productName = item.product?.name || 'Produit inconnu';
        if (!productData[productName]) {
          productData[productName] = { sales: 0, revenue: 0 };
        }
        productData[productName].sales += item.quantity;
        productData[productName].revenue += item.total_price;
      });
    });

    return Object.entries(productData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const processCustomersData = (orders: unknown[], range: string) => {
    // Simulation des données clients nouveaux vs récurrents
    const data: Record<string, { new: number, returning: number }> = {};
    
    const customerFirstOrder: Record<string, string> = {};
    
    orders.forEach(order => {
      const customerId = order.customer_id;
      const orderDate = order.created_at;
      
      if (!customerFirstOrder[customerId] || orderDate < customerFirstOrder[customerId]) {
        customerFirstOrder[customerId] = orderDate;
      }
    });

    orders.forEach(order => {
      const date = new Date(order.created_at);
      const key = range === '7d' || range === '30d' 
        ? date.toLocaleDateString('fr-FR')
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!data[key]) {
        data[key] = { new: 0, returning: 0 };
      }

      const isFirstOrder = customerFirstOrder[order.customer_id] === order.created_at;
      if (isFirstOrder) {
        data[key].new += 1;
      } else {
        data[key].returning += 1;
      }
    });

    return Object.entries(data).map(([date, counts]) => ({ date, ...counts }));
  };

  const processCategoriesData = (orders: unknown[]) => {
    const categoryData: Record<string, number> = {};
    
    orders.forEach(order => {
      order.order_items?.forEach((item: unknown) => {
        const categoryId = item.product?.category_id || 'Autres';
        categoryData[categoryId] = (categoryData[categoryId] || 0) + item.total_price;
      });
    });

    return Object.entries(categoryData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Calculate key metrics
  const totalRevenue = analyticsData.revenue.reduce((sum, item) => sum + item.amount, 0);
  const totalOrders = analyticsData.orders.reduce((sum, item) => sum + item.count, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Growth calculations (compare with previous period)
  const currentPeriodRevenue = totalRevenue;
  const previousPeriodRevenue = currentPeriodRevenue * 0.85; // Simulation
  const revenueGrowth = previousPeriodRevenue > 0 
    ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
    : 0;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (loading) return <div className="p-4">Chargement des analyses...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analyses & Rapports</h2>
          <p className="text-muted-foreground">Analysez les performances de votre business</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as unknown)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="1y">1 an</option>
          </select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-3xl font-bold text-vendeur-primary">
                  {totalRevenue.toLocaleString()} FCFA
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {revenueGrowth >= 0 ? (
                    <ArrowUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(revenueGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-vendeur-accent rounded-xl">
                <DollarSign className="w-6 h-6 text-vendeur-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commandes</p>
                <p className="text-3xl font-bold">{totalOrders}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">12%</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Panier moyen</p>
                <p className="text-3xl font-bold">{averageOrderValue.toLocaleString()} FCFA</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">8%</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux conversion</p>
                <p className="text-3xl font-bold">3.4%</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">0.3%</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution du chiffre d'affaires */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Évolution du chiffre d'affaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} FCFA`, 'CA']} />
                <Area type="monotone" dataKey="amount" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Évolution des commandes */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Évolution des commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.orders}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques secondaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top produits */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Top produits par revenus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.products.slice(0, 5).map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-vendeur-accent rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sales} ventes</p>
                    </div>
                  </div>
                  <p className="font-semibold">{product.revenue.toLocaleString()} FCFA</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Répartition par catégories */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Ventes par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.categories.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.categories.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} FCFA`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Clients nouveaux vs récurrents */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Acquisition clients: Nouveaux vs Récurrents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.customers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="new" 
                stackId="1" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.8}
                name="Nouveaux clients" 
              />
              <Area 
                type="monotone" 
                dataKey="returning" 
                stackId="1" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.8}
                name="Clients récurrents" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}