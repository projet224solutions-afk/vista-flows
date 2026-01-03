/**
 * MODULE CONSTRUCTION & BTP PROFESSIONNEL
 * Inspiré de: Procore, Buildertrend
 * Gestion de chantiers et devis BTP
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HardHat, Hammer, Wrench, Building, DollarSign, Users } from 'lucide-react';

interface ConstructionModuleProps {
  serviceId: string;
  businessName?: string;
}

const SERVICES = [
  { id: 'masonry', name: 'Maçonnerie', icon: Building },
  { id: 'plumbing', name: 'Plomberie', icon: Wrench },
  { id: 'carpentry', name: 'Menuiserie', icon: Hammer },
  { id: 'electrical', name: 'Électricité', icon: HardHat }
];

export function ConstructionModule({ serviceId, businessName }: ConstructionModuleProps) {
  const [stats] = useState({ projects: 18, active: 5, revenue: 28500000, workers: 12 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <HardHat className="w-8 h-8 text-primary" />
          {businessName || 'Construction & BTP'}
        </h2>
        <p className="text-muted-foreground">Gestion de chantiers</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Projets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">En cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ouvriers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workers}</div>
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
          <CardTitle>Services de Construction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SERVICES.map(service => {
              const Icon = service.icon;
              return (
                <Card key={service.id} className="cursor-pointer hover:border-primary">
                  <CardContent className="pt-6 text-center">
                    <Icon className="w-10 h-10 mx-auto mb-2 text-primary" />
                    <h3 className="font-bold text-sm">{service.name}</h3>
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
