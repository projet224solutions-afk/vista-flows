/**
 * MODULE SANTÉ - Services médicaux et consultations
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stethoscope } from 'lucide-react';
import { HealthConsultations } from './health/HealthConsultations';
import { HealthPatientRecords } from './health/HealthPatientRecords';
import { HealthAnalytics } from './health/HealthAnalytics';

interface HealthModuleProps {
  serviceId: string;
}

export function HealthModule({ serviceId }: HealthModuleProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Stethoscope className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Module Santé & Consultations</h2>
      </div>

      <Tabs defaultValue="consultations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
          <TabsTrigger value="patients">Dossiers patients</TabsTrigger>
          <TabsTrigger value="analytics">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="consultations">
          <HealthConsultations serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="patients">
          <HealthPatientRecords serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="analytics">
          <HealthAnalytics serviceId={serviceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
