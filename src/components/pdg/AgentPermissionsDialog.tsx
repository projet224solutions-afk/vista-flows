import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Loader2 } from 'lucide-react';
import { useAgentPermissions, AVAILABLE_PERMISSIONS, PermissionKey } from '@/hooks/useAgentPermissions';
import { Agent } from '@/hooks/usePDGAgentsData';

interface AgentPermissionsDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentPermissionsDialog({ agent, open, onOpenChange }: AgentPermissionsDialogProps) {
  const { permissions, loading, setAgentPermissions } = useAgentPermissions(agent?.id);
  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Synchroniser les permissions locales avec les permissions de l'agent
  useEffect(() => {
    if (permissions) {
      setLocalPermissions(permissions);
    }
  }, [permissions]);

  const handleTogglePermission = (key: string) => {
    setLocalPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!agent) return;

    setSaving(true);
    const success = await setAgentPermissions(localPermissions);
    setSaving(false);

    if (success) {
      onOpenChange(false);
    }
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
      'view_service_plans',
      'manage_service_plans',
    ] as PermissionKey[],
    '🏪 Services Professionnels': [
      'view_beauty_services',
      'manage_beauty_services',
      'view_fitness_services',
      'manage_fitness_services',
      'view_restaurant_services',
      'manage_restaurant_services',
      'view_health_services',
      'manage_health_services',
      'view_education_services',
      'manage_education_services',
      'view_transport_services',
      'manage_transport_services',
      'view_hotel_services',
      'manage_hotel_services',
      'view_event_services',
      'manage_event_services',
      'view_repair_services',
      'manage_repair_services',
      'view_legal_services',
      'manage_legal_services',
      'view_finance_services',
      'manage_finance_services',
      'view_tech_services',
      'manage_tech_services',
      'view_cleaning_services',
      'manage_cleaning_services',
      'view_real_estate_services',
      'manage_real_estate_services',
      'view_agriculture_services',
      'manage_agriculture_services',
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

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Permissions de l'Agent</DialogTitle>
              <DialogDescription>
                {agent.name} - Gérez les permissions d'accès
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {Object.entries(permissionCategories).map(([category, keys]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-semibold text-sm text-primary">
                    {category}
                  </h3>
                  <div className="space-y-3 pl-4 border-l-2 border-border">
                    {keys.map((key) => (
                      <div key={key} className="flex items-center space-x-3">
                        <Checkbox
                          id={key}
                          checked={localPermissions[key] || false}
                          onCheckedChange={() => handleTogglePermission(key)}
                        />
                        <Label
                          htmlFor={key}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {AVAILABLE_PERMISSIONS[key]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={loading || saving}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer les Permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
