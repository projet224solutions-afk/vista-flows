/**
 * MODULE BEAUTÉ - Services de beauté et esthétique
 * Salon de coiffure, esthétique, massage, etc.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scissors } from 'lucide-react';
import { BeautyServices } from './beauty/BeautyServices';
import { BeautyAppointments } from './beauty/BeautyAppointments';
import { BeautyStaff } from './beauty/BeautyStaff';
import { BeautyAnalytics } from './beauty/BeautyAnalytics';

interface BeautyModuleProps {
  serviceId: string;
}

export function BeautyModule({ serviceId }: BeautyModuleProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Scissors className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Module Beauté & Esthétique</h2>
      </div>

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="appointments">Rendez-vous</TabsTrigger>
          <TabsTrigger value="staff">Personnel</TabsTrigger>
          <TabsTrigger value="analytics">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <BeautyServices serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="appointments">
          <BeautyAppointments serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="staff">
          <BeautyStaff serviceId={serviceId} />
        </TabsContent>

        <TabsContent value="analytics">
          <BeautyAnalytics serviceId={serviceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
