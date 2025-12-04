/**
 * MODULE MÉTIER E-COMMERCE
 * Boutique en ligne complète avec catalogue et paiement
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Package, TrendingUp, Users, CreditCard, Truck } from 'lucide-react';
import { EcommerceProducts } from './EcommerceProducts';
import EcommerceOrders from './EcommerceOrders';
import EcommerceInventory from './EcommerceInventory';
import EcommerceCustomers from './EcommerceCustomers';
import EcommerceAnalytics from './EcommerceAnalytics';
import EcommerceShipping from './EcommerceShipping';

interface EcommerceModuleProps {
  serviceId: string;
  businessName: string;
}

export default function EcommerceModule({ serviceId, businessName }: EcommerceModuleProps) {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-lg">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Module E-commerce</CardTitle>
                <p className="text-muted-foreground">{businessName}</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produits</p>
                <p className="text-2xl font-bold">124</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commandes</p>
                <p className="text-2xl font-bold">48</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">356</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CA du mois</p>
                <p className="text-2xl font-bold">2.4M</p>
              </div>
              <CreditCard className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets du module */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="products" className="gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Produits</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Commandes</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Stock</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Clients</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2">
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Livraison</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <EcommerceProducts serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <EcommerceOrders serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <EcommerceInventory serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          <EcommerceCustomers serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="shipping" className="mt-6">
          <EcommerceShipping serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <EcommerceAnalytics serviceId={serviceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
