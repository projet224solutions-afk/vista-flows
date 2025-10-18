/**
 * 📦 GESTION PRODUITS & COMMANDES - 224SOLUTIONS
 * Interface de gestion des produits et commandes pour PDG
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Edit, 
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  Shield,
  Clock,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  status: 'active' | 'blocked' | 'pending' | 'rejected';
  vendor: string;
  created_at: string;
  compliance_score: number;
  sales_count: number;
  revenue: number;
}

interface Order {
  id: string;
  order_number: string;
  customer: string;
  product: string;
  quantity: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  vendor: string;
}

export default function PDGProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Charger les produits
  const loadProducts = async () => {
    try {
      const response = await fetch('/api/admin/products/all');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        // Données de démonstration
        setProducts([
          {
            id: '1',
            name: 'iPhone 15 Pro',
            category: 'Électronique',
            price: 1200000,
            status: 'active',
            vendor: 'TechStore Conakry',
            created_at: '2024-10-01',
            compliance_score: 95,
            sales_count: 45,
            revenue: 54000000
          },
          {
            id: '2',
            name: 'Samsung Galaxy S24',
            category: 'Électronique',
            price: 950000,
            status: 'blocked',
            vendor: 'Mobile World',
            created_at: '2024-09-28',
            compliance_score: 60,
            sales_count: 0,
            revenue: 0
          },
          {
            id: '3',
            name: 'Laptop Dell XPS 13',
            category: 'Informatique',
            price: 2500000,
            status: 'pending',
            vendor: 'Computer Center',
            created_at: '2024-10-03',
            compliance_score: 85,
            sales_count: 12,
            revenue: 30000000
          }
        ]);
      }
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    }
  };

  // Charger les commandes
  const loadOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders/all');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        // Données de démonstration
        setOrders([
          {
            id: '1',
            order_number: 'CMD-2024-001',
            customer: 'Mamadou Diallo',
            product: 'iPhone 15 Pro',
            quantity: 1,
            total: 1200000,
            status: 'pending',
            created_at: '2024-10-05',
            vendor: 'TechStore Conakry'
          },
          {
            id: '2',
            order_number: 'CMD-2024-002',
            customer: 'Fatoumata Camara',
            product: 'Laptop Dell XPS 13',
            quantity: 1,
            total: 2500000,
            status: 'processing',
            created_at: '2024-10-04',
            vendor: 'Computer Center'
          }
        ]);
      }
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
    }
  };

  // Bloquer un produit
  const blockProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/block`, {
        method: 'POST'
      });

      if (response.ok) {
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, status: 'blocked' } : p
        ));
        toast({
          title: "🚫 Produit bloqué",
          description: "Le produit a été bloqué avec succès",
        });
      }
    } catch (error) {
      console.error('Erreur blocage produit:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de bloquer le produit",
        variant: "destructive"
      });
    }
  };

  // Valider un produit
  const validateProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/validate`, {
        method: 'POST'
      });

      if (response.ok) {
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, status: 'active' } : p
        ));
        toast({
          title: "✅ Produit validé",
          description: "Le produit a été validé avec succès",
        });
      }
    } catch (error) {
      console.error('Erreur validation produit:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de valider le produit",
        variant: "destructive"
      });
    }
  };

  // Exporter les données
  const exportData = async (type: 'products' | 'orders') => {
    try {
      const response = await fetch(`/api/admin/export/${type}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "📊 Export réussi",
          description: `Les données ${type} ont été exportées`,
        });
      }
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "❌ Erreur export",
        description: "Impossible d'exporter les données",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
    setLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'blocked': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <AlertTriangle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger value="orders">Commandes</TabsTrigger>
        </TabsList>

        {/* Onglet Produits */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Gestion des Produits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filtres et recherche */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher un produit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actifs</option>
                  <option value="blocked">Bloqués</option>
                  <option value="pending">En attente</option>
                  <option value="rejected">Rejetés</option>
                </select>
                <Button onClick={() => exportData('products')} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </div>

              {/* Tableau des produits */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Vendeur</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Conformité</TableHead>
                    <TableHead>Ventes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.category}</div>
                        </div>
                      </TableCell>
                      <TableCell>{product.vendor}</TableCell>
                      <TableCell>{product.price.toLocaleString()} FCFA</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(product.status)}>
                          {getStatusIcon(product.status)}
                          <span className="ml-1 capitalize">{product.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${product.compliance_score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm">{product.compliance_score}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{product.sales_count} ventes</div>
                          <div className="text-gray-500">{product.revenue.toLocaleString()} FCFA</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {product.status === 'active' ? (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => blockProduct(product.id)}
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => validateProduct(product.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Commandes */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Gestion des Commandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Statistiques des commandes */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">En attente</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {orders.filter(o => o.status === 'pending').length}
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium">En cours</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {orders.filter(o => o.status === 'processing').length}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Livrées</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {orders.filter(o => o.status === 'delivered').length}
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium">Annulées</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {orders.filter(o => o.status === 'cancelled').length}
                  </div>
                </div>
              </div>

              {/* Tableau des commandes */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>{order.product}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>{order.total.toLocaleString()} FCFA</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1 capitalize">{order.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>{order.created_at}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
