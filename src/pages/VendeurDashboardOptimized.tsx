/**
 * VENDEUR DASHBOARD OPTIMISÉ - 224SOLUTIONS
 * Interface vendeur complète et performante
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Package,
    ShoppingCart,
    TrendingUp,
    Users,
    DollarSign,
    Plus,
    Search,
    Filter,
    Download,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    AlertTriangle,
    Clock
} from "lucide-react";

interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

interface Order {
    id: string;
    customerName: string;
    productName: string;
    quantity: number;
    total: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    createdAt: string;
}

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    totalOrders: number;
    totalSpent: number;
    lastOrder: string;
}

export default function VendeurDashboardOptimized() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Statistiques calculées avec useMemo pour optimiser les performances
    const stats = useMemo(() => {
        const totalProducts = products.length;
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        const lowStockProducts = products.filter(product => product.stock < 10).length;
        const totalCustomers = customers.length;

        return {
            totalProducts,
            totalOrders,
            totalRevenue,
            pendingOrders,
            lowStockProducts,
            totalCustomers
        };
    }, [products, orders, customers]);

    // Chargement initial optimisé
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // Simulation de chargement de données
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Données de démonstration
            setProducts([
                {
                    id: '1',
                    name: 'Produit A',
                    price: 15000,
                    stock: 25,
                    category: 'Électronique',
                    status: 'active',
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    name: 'Produit B',
                    price: 25000,
                    stock: 5,
                    category: 'Vêtements',
                    status: 'active',
                    createdAt: new Date().toISOString()
                }
            ]);

            setOrders([
                {
                    id: '1',
                    customerName: 'Client A',
                    productName: 'Produit A',
                    quantity: 2,
                    total: 30000,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                }
            ]);

            setCustomers([
                {
                    id: '1',
                    name: 'Client A',
                    email: 'client@example.com',
                    phone: '+224 123 456 789',
                    totalOrders: 5,
                    totalSpent: 150000,
                    lastOrder: new Date().toISOString()
                }
            ]);
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fonctions optimisées
    const addProduct = (product: Omit<Product, 'id' | 'createdAt'>) => {
        const newProduct: Product = {
            ...product,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        };
        setProducts(prev => [...prev, newProduct]);
    };

    const updateOrderStatus = (orderId: string, status: Order['status']) => {
        setOrders(prev => prev.map(order => 
            order.id === orderId ? { ...order, status } : order
        ));
    };

    const deleteProduct = (productId: string) => {
        setProducts(prev => prev.filter(product => product.id !== productId));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-50 mb-4 mx-auto"></div>
                    <p className="text-gray-700 text-lg font-semibold">Chargement du dashboard vendeur...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* En-tête */}
            <div className="bg-white shadow-lg border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Dashboard Vendeur</h1>
                            <p className="text-gray-600">Gestion complète de votre boutique</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Nouveau Produit
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenu principal */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="products">Produits</TabsTrigger>
                        <TabsTrigger value="orders">Commandes</TabsTrigger>
                        <TabsTrigger value="customers">Clients</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        <TabsTrigger value="settings">Paramètres</TabsTrigger>
                    </TabsList>

                    {/* Dashboard */}
                    <TabsContent value="dashboard" className="space-y-6">
                        {/* Statistiques */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-blue-700">Total Produits</CardTitle>
                                    <Package className="h-4 w-4 text-blue-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-800">{stats.totalProducts}</div>
                                    <p className="text-xs text-gray-500">
                                        {stats.lowStockProducts} en rupture
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-green-700">Commandes</CardTitle>
                                    <ShoppingCart className="h-4 w-4 text-green-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-800">{stats.totalOrders}</div>
                                    <p className="text-xs text-gray-500">
                                        {stats.pendingOrders} en attente
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-purple-700">Revenus</CardTitle>
                                    <DollarSign className="h-4 w-4 text-purple-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-purple-800">{stats.totalRevenue.toLocaleString()} FCFA</div>
                                    <p className="text-xs text-gray-500">
                                        Total des ventes
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-orange-700">Clients</CardTitle>
                                    <Users className="h-4 w-4 text-orange-600" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-orange-800">{stats.totalCustomers}</div>
                                    <p className="text-xs text-gray-500">
                                        Clients actifs
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Actions rapides */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Actions Rapides</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Button onClick={() => setActiveTab('products')} variant="outline" className="h-20 flex flex-col gap-2">
                                        <Package className="w-6 h-6" />
                                        <span className="text-sm">Gérer Produits</span>
                                    </Button>
                                    <Button onClick={() => setActiveTab('orders')} variant="outline" className="h-20 flex flex-col gap-2">
                                        <ShoppingCart className="w-6 h-6" />
                                        <span className="text-sm">Voir Commandes</span>
                                    </Button>
                                    <Button onClick={() => setActiveTab('customers')} variant="outline" className="h-20 flex flex-col gap-2">
                                        <Users className="w-6 h-6" />
                                        <span className="text-sm">Gérer Clients</span>
                                    </Button>
                                    <Button onClick={() => setActiveTab('analytics')} variant="outline" className="h-20 flex flex-col gap-2">
                                        <TrendingUp className="w-6 h-6" />
                                        <span className="text-sm">Analytics</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Produits */}
                    <TabsContent value="products" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Gestion des Produits</CardTitle>
                                    <Button>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Ajouter Produit
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Rechercher un produit..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <Button variant="outline">
                                            <Filter className="w-4 h-4 mr-2" />
                                            Filtrer
                                        </Button>
                                    </div>
                                    
                                    <div className="grid gap-4">
                                        {products.map((product) => (
                                            <Card key={product.id} className="p-4">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h3 className="font-semibold">{product.name}</h3>
                                                        <p className="text-sm text-gray-600">{product.category}</p>
                                                        <p className="text-sm text-gray-600">Stock: {product.stock}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold">{product.price.toLocaleString()} FCFA</p>
                                                        <div className="flex gap-2 mt-2">
                                                            <Button size="sm" variant="outline">
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" variant="outline">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="text-red-600">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Commandes */}
                    <TabsContent value="orders" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestion des Commandes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {orders.map((order) => (
                                        <Card key={order.id} className="p-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-semibold">Commande #{order.id}</h3>
                                                    <p className="text-sm text-gray-600">Client: {order.customerName}</p>
                                                    <p className="text-sm text-gray-600">Produit: {order.productName}</p>
                                                    <p className="text-sm text-gray-600">Quantité: {order.quantity}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold">{order.total.toLocaleString()} FCFA</p>
                                                    <Badge className={
                                                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                                        order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                        'bg-red-100 text-red-800'
                                                    }>
                                                        {order.status}
                                                    </Badge>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button size="sm" variant="outline">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="outline">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Clients */}
                    <TabsContent value="customers" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Gestion des Clients</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {customers.map((customer) => (
                                        <Card key={customer.id} className="p-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-semibold">{customer.name}</h3>
                                                    <p className="text-sm text-gray-600">{customer.email}</p>
                                                    <p className="text-sm text-gray-600">{customer.phone}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold">{customer.totalSpent.toLocaleString()} FCFA</p>
                                                    <p className="text-sm text-gray-600">{customer.totalOrders} commandes</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button size="sm" variant="outline">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="outline">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Analytics */}
                    <TabsContent value="analytics" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Analytics et Rapports</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8">
                                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                        Analytics en cours de développement
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Graphiques et rapports détaillés seront disponibles bientôt.
                                    </p>
                                    <Button>
                                        <Download className="w-4 h-4 mr-2" />
                                        Exporter Rapport
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Paramètres */}
                    <TabsContent value="settings" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Paramètres du Vendeur</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="shop-name">Nom de la boutique</Label>
                                        <Input id="shop-name" placeholder="Ma Boutique" />
                                    </div>
                                    <div>
                                        <Label htmlFor="shop-description">Description</Label>
                                        <Input id="shop-description" placeholder="Description de votre boutique" />
                                    </div>
                                    <div>
                                        <Label htmlFor="shop-address">Adresse</Label>
                                        <Input id="shop-address" placeholder="Adresse de votre boutique" />
                                    </div>
                                    <Button>Enregistrer les modifications</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}