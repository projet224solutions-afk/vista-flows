/**
 * MODULE MÉTIER RESTAURANT
 * Gestion complète d'un restaurant professionnel
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, ShoppingCart, Package, Clock, TrendingUp, Users } from 'lucide-react';
import { RestaurantMenu } from './RestaurantMenu';
import { RestaurantOrders } from './RestaurantOrders';
import { RestaurantStock } from './RestaurantStock';
import { RestaurantReservations } from './RestaurantReservations';
import { RestaurantAnalytics } from './RestaurantAnalytics';
import { RestaurantStaff } from './RestaurantStaff';

interface RestaurantModuleProps {
  serviceId: string;
  businessName: string;
}

export default function RestaurantModule({ serviceId, businessName }: RestaurantModuleProps) {
  const [activeTab, setActiveTab] = useState('menu');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 rounded-lg">
                <Utensils className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Module Restaurant</CardTitle>
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
                <p className="text-sm text-muted-foreground">Commandes aujourd'hui</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plats au menu</p>
                <p className="text-2xl font-bold">48</p>
              </div>
              <Utensils className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock articles</p>
                <p className="text-2xl font-bold">156</p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temps moyen</p>
                <p className="text-2xl font-bold">32min</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets du module */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="menu" className="gap-2">
            <Utensils className="w-4 h-4" />
            <span className="hidden sm:inline">Menu</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Commandes</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Stock</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Réservations</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Personnel</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="mt-6">
          <RestaurantMenu serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <RestaurantOrders serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="stock" className="mt-6">
          <RestaurantStock serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="reservations" className="mt-6">
          <RestaurantReservations serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <RestaurantStaff serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <RestaurantAnalytics serviceId={serviceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
