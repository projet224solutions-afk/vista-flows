import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ContractForm from '@/components/vendor/contracts/ContractForm';
import ContractsList from '@/components/vendor/contracts/ContractsList';
import { FileText, History } from 'lucide-react';

export default function VendorContracts() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleContractCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestion des Contrats</h1>
        <p className="text-muted-foreground">
          Créez et gérez vos contrats professionnels
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="gap-2">
            <FileText className="w-4 h-4" />
            Créer un Contrat
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <History className="w-4 h-4" />
            Mes Contrats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <ContractForm onSuccess={handleContractCreated} />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <ContractsList refresh={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
