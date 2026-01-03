/**
 * MODULE FREELANCE & ADMINISTRATIF PROFESSIONNEL
 * Inspiré de: Upwork, Fiverr, Freelancer
 * Gestion de missions freelance et services administratifs
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Briefcase, FileText, Calculator, Users, DollarSign, Clock } from 'lucide-react';

interface FreelanceModuleProps {
  serviceId: string;
  businessName?: string;
}

const SERVICES = [
  { id: 'secretary', name: 'Secrétariat', icon: FileText },
  { id: 'accounting', name: 'Comptabilité', icon: Calculator },
  { id: 'hr', name: 'Ressources Humaines', icon: Users },
  { id: 'translation', name: 'Traduction', icon: FileText }
];

export function FreelanceModule({ serviceId, businessName }: FreelanceModuleProps) {
  const [stats] = useState({ projects: 32, completed: 28, revenue: 3400000, hours: 156 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Briefcase className="w-8 h-8 text-primary" />
          {businessName || 'Services Administratifs'}
        </h2>
        <p className="text-muted-foreground">Freelance & Support administratif</p>
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
            <CardTitle className="text-sm">Terminés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Heures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hours}h</div>
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
          <CardTitle>Services Proposés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {SERVICES.map(service => {
              const Icon = service.icon;
              return (
                <Card key={service.id} className="cursor-pointer hover:border-primary">
                  <CardContent className="pt-6">
                    <Icon className="w-8 h-8 text-primary mb-2" />
                    <h3 className="font-bold">{service.name}</h3>
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
