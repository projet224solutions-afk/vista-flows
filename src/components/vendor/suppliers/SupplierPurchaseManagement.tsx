/**
 * MODULE GESTION FOURNISSEURS & ACHATS
 * Point central de gestion des achats de stock vendeur
 * Niveau professionnel POS/ERP
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, ShoppingCart, TrendingUp, Package } from 'lucide-react';
import { VendorSuppliersList } from './VendorSuppliersList';
import { PurchasesList } from './PurchasesList';
import { ValidatedPurchasesSheet } from './ValidatedPurchasesSheet';
import { DraftPurchasesSheet } from './DraftPurchasesSheet';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SupplierPurchaseManagementProps {
  vendorId: string;
}

export function SupplierPurchaseManagement({ vendorId }: SupplierPurchaseManagementProps) {
  const [activeTab, setActiveTab] = useState('purchases');
  const [isValidatedSheetOpen, setIsValidatedSheetOpen] = useState(false);
  const [isDraftSheetOpen, setIsDraftSheetOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const handleViewPurchase = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setActiveTab('purchases');
  };

  // Stats pour les badges
  const { data: stats } = useQuery({
    queryKey: ['supplier-purchase-stats', vendorId],
    queryFn: async () => {
      const [suppliersRes, validatedPurchasesRes, draftPurchasesRes] = await Promise.all([
        supabase
          .from('vendor_suppliers')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('is_active', true),
        // Compter uniquement les achats validés
        supabase
          .from('stock_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('status', 'validated'),
        // Compter tous les achats non validés (brouillons)
        supabase
          .from('stock_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .neq('status', 'validated')
      ]);

      return {
        suppliersCount: suppliersRes.count || 0,
        validatedPurchasesCount: validatedPurchasesRes.count || 0,
        draftPurchasesCount: draftPurchasesRes.count || 0
      };
    },
    enabled: !!vendorId
  });

  return (
    <div className="space-y-4">
      {/* Header avec stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.suppliersCount || 0}</p>
                <p className="text-xs text-muted-foreground">Fournisseurs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carte Achats cliquable */}
        <Card 
          className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 cursor-pointer hover:border-green-500/40 hover:shadow-md transition-all"
          onClick={() => setIsValidatedSheetOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <ShoppingCart className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.validatedPurchasesCount || 0}</p>
                <p className="text-xs text-muted-foreground">Achats</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carte Brouillons cliquable */}
        <Card 
          className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 cursor-pointer hover:border-orange-500/40 hover:shadow-md transition-all"
          onClick={() => setIsDraftSheetOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Package className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.draftPurchasesCount || 0}</p>
                <p className="text-xs text-muted-foreground">Brouillons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">ERP</p>
                <p className="text-xs text-muted-foreground">Intégré</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5" />
            Gestion Fournisseurs & Achats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="purchases" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Achats
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Fournisseurs
                {stats?.suppliersCount ? (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {stats.suppliersCount}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="purchases" className="mt-0">
              <PurchasesList vendorId={vendorId} initialPurchaseId={selectedPurchaseId} onPurchaseViewed={() => setSelectedPurchaseId(null)} />
            </TabsContent>

            <TabsContent value="suppliers" className="mt-0">
              <VendorSuppliersList vendorId={vendorId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Sheets */}
      <ValidatedPurchasesSheet
        vendorId={vendorId}
        isOpen={isValidatedSheetOpen}
        onClose={() => setIsValidatedSheetOpen(false)}
        onViewPurchase={handleViewPurchase}
      />
      <DraftPurchasesSheet
        vendorId={vendorId}
        isOpen={isDraftSheetOpen}
        onClose={() => setIsDraftSheetOpen(false)}
      />
    </div>
  );
}
