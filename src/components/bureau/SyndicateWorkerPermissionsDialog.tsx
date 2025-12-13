import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Shield } from 'lucide-react';
import { 
  useSyndicateWorkerPermissions, 
  SYNDICATE_WORKER_PERMISSIONS,
  SyndicateWorkerPermissionKey,
  SyndicateWorkerPermissions
} from '@/hooks/useSyndicateWorkerPermissions';
import { SyndicateWorker } from '@/hooks/useSyndicateWorkersData';

interface SyndicateWorkerPermissionsDialogProps {
  worker: SyndicateWorker | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyndicateWorkerPermissionsDialog({
  worker,
  open,
  onOpenChange,
}: SyndicateWorkerPermissionsDialogProps) {
  const { permissions, loading, setWorkerPermissions, reload } = useSyndicateWorkerPermissions(worker?.id);
  const [localPermissions, setLocalPermissions] = useState<SyndicateWorkerPermissions>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (permissions) {
      setLocalPermissions({ ...permissions });
    }
  }, [permissions]);

  useEffect(() => {
    if (open && worker?.id) {
      reload();
    }
  }, [open, worker?.id, reload]);

  const handleTogglePermission = (key: SyndicateWorkerPermissionKey) => {
    setLocalPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await setWorkerPermissions(localPermissions);
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  // Group permissions by category
  const permissionCategories = {
    'Dashboard & Vue d\'ensemble': [
      'view_dashboard',
      'view_statistics',
    ] as SyndicateWorkerPermissionKey[],
    'Gestion des Membres': [
      'view_members',
      'add_members',
      'edit_members',
      'delete_members',
    ] as SyndicateWorkerPermissionKey[],
    'Taxi-Motards': [
      'view_drivers',
      'add_drivers',
      'edit_drivers',
      'delete_drivers',
    ] as SyndicateWorkerPermissionKey[],
    'Véhicules': [
      'view_vehicles',
      'add_vehicles',
      'edit_vehicles',
      'delete_vehicles',
      'manage_stolen_vehicles',
    ] as SyndicateWorkerPermissionKey[],
    'SOS & Alertes': [
      'view_sos_alerts',
      'manage_sos_alerts',
      'respond_sos',
    ] as SyndicateWorkerPermissionKey[],
    'Tickets de Transport': [
      'view_tickets',
      'generate_tickets',
      'manage_tickets',
    ] as SyndicateWorkerPermissionKey[],
    'Trésorerie & Wallet': [
      'view_wallet',
      'make_transfers',
      'view_transactions',
      'manage_cotisations',
    ] as SyndicateWorkerPermissionKey[],
    'Badges': [
      'view_badges',
      'generate_badges',
    ] as SyndicateWorkerPermissionKey[],
    'Gestion & Paramètres': [
      'view_settings',
      'edit_settings',
      'manage_bureau_info',
    ] as SyndicateWorkerPermissionKey[],
    'Analytics & Rapports': [
      'view_analytics',
      'export_reports',
    ] as SyndicateWorkerPermissionKey[],
    'Communication': [
      'send_notifications',
      'manage_communications',
    ] as SyndicateWorkerPermissionKey[],
  };

  if (!worker) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Permissions du Membre</DialogTitle>
              <DialogDescription>
                {worker.nom} {worker.prenom} - Gérez les permissions d'accès
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
                          {SYNDICATE_WORKER_PERMISSIONS[key]}
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
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
