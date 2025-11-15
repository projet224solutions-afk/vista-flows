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
    'Gestion des Utilisateurs': [
      'manage_vendors',
      'manage_drivers',
      'manage_users',
    ] as PermissionKey[],
    'Statistiques et Rapports': [
      'view_statistics',
      'view_reports',
    ] as PermissionKey[],
    'Finance et Paiements': [
      'manage_wallet_transactions',
      'access_pdg_wallet',
      'view_financial_module',
      'manage_commissions',
      'view_payments',
    ] as PermissionKey[],
    'Opérations': [
      'manage_orders',
      'manage_deliveries',
      'manage_sanctions',
    ] as PermissionKey[],
    'Modules Spéciaux': [
      'access_suppliers',
      'manage_agents',
      'create_sub_agents',
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
