/**
 * MODULE TRANSPORT - Service VTC et transport de personnes
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car } from 'lucide-react';
import { TransportRides } from './transport/TransportRides';
import { TransportVehicles } from './transport/TransportVehicles';
import { TransportAnalytics } from './transport/TransportAnalytics';

interface TransportModuleProps {
  serviceId: string;
}

export function TransportModule({ serviceId }: TransportModuleProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Car className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Module Transport & VTC</h2>
      </div>

      <Tabs defaultValue="rides" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rides">Courses</TabsTrigger>
          <TabsTrigger value="vehicles">Flotte</TabsTrigger>
          <TabsTrigger value="analytics">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="rides">
          <TransportRides serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="vehicles">
          <TransportVehicles serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="analytics">
          <TransportAnalytics serviceId={serviceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
