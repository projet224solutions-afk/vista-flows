/**
 * Actions rapides pharmacie — inspiré CVS/Walgreens POS
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus, ShoppingCart, Users, FileText, Package,
  Pill, ClipboardList, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PharmacyQuickActionsProps {
  onTabChange: (tab: string) => void;
}

const actions = [
  { icon: Plus, label: 'Nouveau produit', route: '/vendeur/products', color: 'bg-emerald-500' },
  { icon: Pill, label: 'Ordonnance', tab: 'prescriptions', color: 'bg-blue-500' },
  { icon: ShoppingCart, label: 'Commandes', route: '/vendeur/orders', color: 'bg-violet-500' },
  { icon: Users, label: 'Patients', tab: 'clients', color: 'bg-amber-500' },
  { icon: Package, label: 'Inventaire', tab: 'inventory', color: 'bg-rose-500' },
  { icon: ClipboardList, label: 'Alertes stock', tab: 'alerts', color: 'bg-orange-500' },
  { icon: FileText, label: 'Rapports', tab: 'reports', color: 'bg-cyan-500' },
  { icon: BarChart3, label: 'Analytics', tab: 'overview', color: 'bg-indigo-500' },
];

export function PharmacyQuickActions({ onTabChange }: PharmacyQuickActionsProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                if (action.route) navigate(action.route);
                else if (action.tab) onTabChange(action.tab);
              }}
              className="flex flex-col items-center gap-1.5 p-2 md:p-3 rounded-xl hover:bg-muted/50 transition-all group"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${action.color} flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all`}>
                <action.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-muted-foreground text-center leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
