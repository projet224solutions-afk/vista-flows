import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ContractForm from '@/components/vendor/contracts/ContractForm';
import ContractsList from '@/components/vendor/contracts/ContractsList';
import AIContractForm from '@/components/vendor/contracts/AIContractForm';
import AIContractEditor from '@/components/vendor/contracts/AIContractEditor';
import { FileText, History, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export default function VendorContracts() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewingContract, setViewingContract] = useState<any>(null);
  const [loadingContract, setLoadingContract] = useState(false);

  const handleContractCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleAIContractCreated = async (contractId: string) => {
    setLoadingContract(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      
      setViewingContract(data);
    } catch (error) {
      console.error('Error loading contract:', error);
    } finally {
      setLoadingContract(false);
    }
  };

  const handleContractSaved = () => {
    setRefreshKey(prev => prev + 1);
  };

  // If viewing a generated contract
  if (viewingContract) {
    return (
      <div className="container mx-auto p-6">
        <AIContractEditor
          contract={viewingContract}
          onSaved={handleContractSaved}
          onClose={() => {
            setViewingContract(null);
            setRefreshKey(prev => prev + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestion des Contrats</h1>
        <p className="text-muted-foreground">
          Créez et gérez vos contrats professionnels
        </p>
      </div>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Contrat IA
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2">
            <FileText className="w-4 h-4" />
            Créer Manuellement
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <History className="w-4 h-4" />
            Mes Contrats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <AIContractForm onSuccess={handleAIContractCreated} />
        </TabsContent>

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
