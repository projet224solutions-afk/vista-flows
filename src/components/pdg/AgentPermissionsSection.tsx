import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { AVAILABLE_PERMISSIONS, PermissionKey } from '@/hooks/useAgentPermissions';

interface AgentPermissionsSectionProps {
  permissions: Record<string, boolean>;
  onPermissionChange: (key: string, value: boolean) => void;
  loading?: boolean;
}

export function AgentPermissionsSection({ 
  permissions, 
  onPermissionChange,
  loading 
}: AgentPermissionsSectionProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['💰 Finance', '📋 Gestion']));

  const toggleCategory = (category: string) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(category)) {
      newOpen.delete(category);
    } else {
      newOpen.add(category);
    }
    setOpenCategories(newOpen);
  };

  const permissionCategories = {
    '💰 Finance': [
      'view_finance',
      'manage_finance',
      'view_banking',
      'manage_banking',
      'manage_wallet_transactions',
      'access_pdg_wallet',
      'view_financial_module',
      'manage_commissions',
      'view_payments',
      'manage_payments',
    ] as PermissionKey[],
    '📋 Gestion': [
      'view_users',
      'manage_users',
      'view_products',
      'manage_products',
      'view_transfer_fees',
      'manage_transfer_fees',
      'view_kyc',
      'manage_kyc',
      'view_service_subscriptions',
      'manage_service_subscriptions',
    ] as PermissionKey[],
    '⚙️ Opérations': [
      'view_agents',
      'manage_agents',
      'create_sub_agents',
      'view_syndicat',
      'manage_syndicat',
      'view_bureau_monitoring',
      'manage_bureau_monitoring',
      'view_driver_subscriptions',
      'manage_driver_subscriptions',
      'view_stolen_vehicles',
      'manage_stolen_vehicles',
      'view_orders',
      'manage_orders',
      'view_vendors',
      'manage_vendors',
      'view_vendor_kyc',
      'manage_vendor_kyc',
      'view_vendor_certification',
      'manage_vendor_certification',
      'view_drivers',
      'manage_drivers',
      'view_quotes_invoices',
      'manage_quotes_invoices',
      'access_communication',
      'manage_communication',
      'view_agent_wallet_audit',
      'manage_agent_wallet_audit',
    ] as PermissionKey[],
    '🔧 Système': [
      'view_security',
      'manage_security',
      'view_id_normalization',
      'manage_id_normalization',
      'view_bug_bounty',
      'manage_bug_bounty',
      'view_config',
      'manage_config',
      'view_maintenance',
      'manage_maintenance',
      'view_api',
      'manage_api',
      'view_debug',
      'manage_debug',
    ] as PermissionKey[],
    '🧠 Intelligence': [
      'access_ai_assistant',
      'access_copilot',
      'access_copilot_dashboard',
      'view_copilot_audit',
      'view_reports',
      'manage_reports',
      'view_statistics',
    ] as PermissionKey[],
    '🎯 Spécial': [
      'manage_sanctions',
      'access_suppliers',
      'manage_deliveries',
    ] as PermissionKey[],
  };

  const getActiveCategoryCount = (keys: PermissionKey[]) => {
    return keys.filter(key => permissions[key] === true).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-base font-semibold">Permissions Avancées</Label>
      <p className="text-xs text-muted-foreground mb-3">
        Gérez les accès aux différentes fonctionnalités du système
      </p>
      <ScrollArea className="h-[350px] pr-4">
        <div className="space-y-2 pb-2">
          {Object.entries(permissionCategories).map(([category, keys]) => {
            const activeCount = getActiveCategoryCount(keys);
            
            return (
              <Collapsible 
                key={category}
                open={openCategories.has(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <span className="font-medium text-sm">{category}</span>
                  <div className="flex items-center gap-2">
                    {activeCount > 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {activeCount}/{keys.length}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${openCategories.has(category) ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1.5 pl-3 pt-2 pb-1 border-l-2 border-muted ml-2">
                    {keys.map((key) => (
                      <div key={key} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`perm-${key}`}
                          checked={permissions[key] || false}
                          onCheckedChange={(checked) => onPermissionChange(key, checked === true)}
                        />
                        <label
                          htmlFor={`perm-${key}`}
                          className="text-xs font-normal cursor-pointer flex-1 leading-tight"
                        >
                          {AVAILABLE_PERMISSIONS[key]}
                        </label>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
