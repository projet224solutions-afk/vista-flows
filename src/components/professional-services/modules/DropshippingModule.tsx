/**
 * MODULE DROPSHIPPING PROFESSIONNEL
 * Inspiré de: Shopify, Oberlo, Spocket
 * E-commerce dropshipping avec intégration fournisseurs
 * Extension Chine: Alibaba, AliExpress, 1688
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, Globe, TrendingUp, DollarSign, ShoppingCart, AlertCircle, Flag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChinaDashboard, ChinaProductImport, ChinaSuppliersList, ChinaCostCalculator } from '@/components/dropshipping/china';

interface DropshippingModuleProps {
  serviceId: string;
  businessName?: string;
}

const SUPPLIERS = [
  { id: 'aliexpress', name: 'AliExpress', logo: '🇨🇳', products: 50000 },
  { id: 'amazon', name: 'Amazon', logo: '📦', products: 30000 },
  { id: 'cjdropshipping', name: 'CJ Dropshipping', logo: '🚚', products: 25000 }
];

export function DropshippingModule({ serviceId, businessName }: DropshippingModuleProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats] = useState({ 
    importedProducts: 142, 
    pendingOrders: 8, 
    revenue: 6750000, 
    profit: 1350000 
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-8 h-8 text-primary" />
            {businessName || 'Boutique Dropshipping'}
          </h2>
          <p className="text-muted-foreground">Vente sans stock avec fournisseurs internationaux</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Globe className="w-3 h-3" />
          {SUPPLIERS.length} fournisseurs
        </Badge>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Dropshipping:</strong> Vendez des produits sans gérer de stock. 
          Les commandes sont automatiquement envoyées aux fournisseurs qui livrent directement vos clients.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produits Importés</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.importedProducts}</div>
            <p className="text-xs text-muted-foreground">Dans votre catalogue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commandes en Attente</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenue.toLocaleString()} GNF</div>
            <p className="text-xs text-muted-foreground">Ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Profit Net</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.profit.toLocaleString()} GNF</div>
            <p className="text-xs text-muted-foreground">Marge: 20%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
          <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
          <TabsTrigger value="import">Importer</TabsTrigger>
          <TabsTrigger value="china" className="flex items-center gap-1">
            <Flag className="w-3 h-3" />
            Chine
          </TabsTrigger>
          <TabsTrigger value="china-import">Import Chine</TabsTrigger>
          <TabsTrigger value="china-costs">Coûts</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commandes Récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune commande récente</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Les commandes de vos clients seront automatiquement transmises aux fournisseurs
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fournisseurs Connectés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {SUPPLIERS.map(supplier => (
                  <Card key={supplier.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-4xl">{supplier.logo}</div>
                          <div>
                            <h3 className="font-bold text-lg">{supplier.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {supplier.products.toLocaleString()} produits disponibles
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Connecté
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importer des Produits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Recherchez des produits à vendre</h3>
                <p className="text-muted-foreground mb-4">
                  Parcourez les catalogues de vos fournisseurs et importez les produits dans votre boutique
                </p>
                <Button size="lg">
                  <Globe className="w-4 h-4 mr-2" />
                  Parcourir les Catalogues
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-bold mb-2">💡 Avantages du Dropshipping</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✅ Pas de gestion de stock</li>
                <li>✅ Pas d'investissement initial en inventaire</li>
                <li>✅ Expédition automatique par le fournisseur</li>
                <li>✅ Large choix de produits disponibles</li>
                <li>✅ Mise à jour automatique des prix et stocks</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === EXTENSION DROPSHIPPING CHINE === */}
        <TabsContent value="china" className="space-y-4">
          <ChinaDashboard />
        </TabsContent>

        <TabsContent value="china-import" className="space-y-4">
          <ChinaProductImport />
        </TabsContent>

        <TabsContent value="china-costs" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <ChinaCostCalculator />
            <ChinaSuppliersList />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
