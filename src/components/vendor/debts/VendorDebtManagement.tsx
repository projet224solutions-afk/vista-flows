import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, List } from 'lucide-react';
import { CreateDebtForm } from './CreateDebtForm';
import { DebtsList } from './DebtsList';

interface VendorDebtManagementProps {
  vendorId: string;
}

export function VendorDebtManagement({ vendorId }: VendorDebtManagementProps) {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gestion des Dettes Clients</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Liste des Dettes
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Créer une Dette
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <DebtsList vendorId={vendorId} />
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <CreateDebtForm 
              vendorId={vendorId} 
              onSuccess={() => setActiveTab('list')} 
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
