/**
 * MODULE GESTION FOURNISSEURS & ACHATS
 * Point central de gestion des achats de stock vendeur
 * Niveau professionnel POS/ERP
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, ShoppingCart, TrendingUp, Package, Calendar, CalendarDays, CalendarRange, Clock } from 'lucide-react';
import { VendorSuppliersList } from './VendorSuppliersList';
import { PurchasesList } from './PurchasesList';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SupplierPurchaseManagementProps {
  vendorId: string;
}

export function SupplierPurchaseManagement({ vendorId }: SupplierPurchaseManagementProps) {
  const [activeTab, setActiveTab] = useState('purchases');

  // Stats pour les badges
  const { data: stats } = useQuery({
    queryKey: ['supplier-purchase-stats', vendorId],
    queryFn: async () => {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const yearStart = startOfYear(now).toISOString();

      const [
        suppliersRes, 
        validatedPurchasesRes, 
        draftPurchasesRes,
        todayRes,
        weekRes,
        monthRes,
        yearRes
      ] = await Promise.all([
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
          .neq('status', 'validated'),
        // Achats validés aujourd'hui
        supabase
          .from('stock_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('status', 'validated')
          .gte('validated_at', todayStart),
        // Achats validés cette semaine
        supabase
          .from('stock_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('status', 'validated')
          .gte('validated_at', weekStart),
        // Achats validés ce mois
        supabase
          .from('stock_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('status', 'validated')
          .gte('validated_at', monthStart),
        // Achats validés cette année
        supabase
          .from('stock_purchases')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('status', 'validated')
          .gte('validated_at', yearStart)
      ]);

      return {
        suppliersCount: suppliersRes.count || 0,
        validatedPurchasesCount: validatedPurchasesRes.count || 0,
        draftPurchasesCount: draftPurchasesRes.count || 0,
        todayCount: todayRes.count || 0,
        weekCount: weekRes.count || 0,
        monthCount: monthRes.count || 0,
        yearCount: yearRes.count || 0
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

        {/* Carte Achats cliquable avec popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 cursor-pointer hover:border-green-500/40 transition-colors">
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
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="p-3 border-b bg-muted/50">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-green-500" />
                Achats validés
              </h4>
            </div>
            <div className="p-2 space-y-1">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Aujourd'hui</span>
                </div>
                <Badge variant="secondary" className="font-bold">{stats?.todayCount || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Cette semaine</span>
                </div>
                <Badge variant="secondary" className="font-bold">{stats?.weekCount || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Ce mois</span>
                </div>
                <Badge variant="secondary" className="font-bold">{stats?.monthCount || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Cette année</span>
                </div>
                <Badge variant="secondary" className="font-bold">{stats?.yearCount || 0}</Badge>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Carte Brouillons cliquable avec popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 cursor-pointer hover:border-orange-500/40 transition-colors">
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
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="p-3 border-b bg-muted/50">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500" />
                Achats en attente
              </h4>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Non validés</span>
                <Badge variant="outline" className="font-bold bg-orange-500/10 text-orange-600 border-orange-500/30">
                  {stats?.draftPurchasesCount || 0}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Ces achats sont en brouillon ou en attente de validation. Validez-les pour mettre à jour le stock.
              </p>
            </div>
          </PopoverContent>
        </Popover>

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
              <PurchasesList vendorId={vendorId} />
            </TabsContent>

            <TabsContent value="suppliers" className="mt-0">
              <VendorSuppliersList vendorId={vendorId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
