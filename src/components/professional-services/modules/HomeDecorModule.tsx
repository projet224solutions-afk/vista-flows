/**
 * MODULE MAISON & DÉCO PROFESSIONNEL
 * Inspiré de: IKEA, Wayfair, Made.com
 * E-commerce décoration et ameublement
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Sofa, Lamp, Bed, DollarSign, Package } from 'lucide-react';

interface HomeDecorModuleProps {
  serviceId: string;
  businessName?: string;
}

const CATEGORIES = [
  { id: 'furniture', name: 'Meubles', icon: Sofa },
  { id: 'lighting', name: 'Éclairage', icon: Lamp },
  { id: 'bedroom', name: 'Chambre', icon: Bed },
  { id: 'decor', name: 'Décoration', icon: Home }
];

export function HomeDecorModule({ serviceId, businessName }: HomeDecorModuleProps) {
  const [activeTab, setActiveTab] = useState('catalog');
  const [stats] = useState({ products: 178, orders: 45, revenue: 12300000 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Home className="w-8 h-8 text-primary" />
          {businessName || 'Maison & Déco'}
        </h2>
        <p className="text-muted-foreground">Meubles et décoration</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">CA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenue.toLocaleString()} GNF</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catégories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <Card key={cat.id} className="cursor-pointer hover:border-primary">
                  <CardContent className="pt-6 text-center">
                    <Icon className="w-10 h-10 mx-auto mb-2 text-primary" />
                    <h3 className="font-bold">{cat.name}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
