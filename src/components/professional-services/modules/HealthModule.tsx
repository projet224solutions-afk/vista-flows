/**
 * MODULE CABINET MÉDICAL - Stub
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, Users, Calendar, FileText } from 'lucide-react';

interface HealthModuleProps {
  serviceId: string;
  businessName?: string;
}

export function HealthModule({ serviceId, businessName }: HealthModuleProps) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Stethoscope className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">{businessName || 'Cabinet Médical'}</h2>
        <p className="text-muted-foreground">Module Santé</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Consultations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Module en développement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Module en développement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dossiers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Module en développement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Module en développement</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            🏥 Le module Cabinet Médical est en cours de développement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default HealthModule;
