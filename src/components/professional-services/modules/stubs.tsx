/**
 * MODULES STUBS - Services en cours de développement
 * Les modules Traiteur et Mode seront développés prochainement
 */

import { Card, CardContent } from '@/components/ui/card';
import { Utensils, ShoppingBag } from 'lucide-react';

interface ModuleProps {
  serviceId: string;
  businessName: string;
}

// Traiteur - Inspiré de ezCater
export function CateringModule({ serviceId, businessName }: ModuleProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
          <Utensils className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{businessName}</h2>
          <p className="text-muted-foreground">Service Traiteur</p>
        </div>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <Utensils className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Module Traiteur</h3>
          <p className="text-muted-foreground">
            🍱 Gestion des menus, devis événements et commandes groupe.<br/>
            Module en cours de développement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Mode - Inspiré de Shopify/ASOS
export function FashionModule({ serviceId, businessName }: ModuleProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-fuchsia-500 to-purple-500 rounded-xl">
          <ShoppingBag className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{businessName}</h2>
          <p className="text-muted-foreground">Boutique Mode</p>
        </div>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Module Boutique Mode</h3>
          <p className="text-muted-foreground">
            👗 Catalogue produits, gestion des tailles et stocks.<br/>
            Module en cours de développement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default {
  CateringModule,
  FashionModule
};
