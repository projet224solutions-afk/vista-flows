/**
 * MODULE AGRICULTURE PROFESSIONNEL
 * Inspiré de: FarmLogs, AgroStar
 * Vente de produits agricoles locaux
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sprout, Apple, Egg, Fish, DollarSign, TrendingUp } from 'lucide-react';

interface AgricultureModuleProps {
  serviceId: string;
  businessName?: string;
}

const CATEGORIES = [
  { id: 'fruits', name: 'Fruits & Légumes', icon: Apple },
  { id: 'dairy', name: 'Produits Laitiers', icon: Egg },
  { id: 'meat', name: 'Viandes', icon: Fish },
  { id: 'cereals', name: 'Céréales', icon: Sprout }
];

export function AgricultureModule({ serviceId, businessName }: AgricultureModuleProps) {
  const [stats] = useState({ products: 45, orders: 78, revenue: 2850000 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Sprout className="w-8 h-8 text-primary" />
          {businessName || 'Produits Agricoles'}
        </h2>
        <p className="text-muted-foreground">Produits frais locaux</p>
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
          <CardTitle>Catégories de Produits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <Card key={cat.id} className="cursor-pointer hover:border-primary">
                  <CardContent className="pt-6 text-center">
                    <Icon className="w-10 h-10 mx-auto mb-2 text-primary" />
                    <h3 className="font-bold text-sm">{cat.name}</h3>
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
