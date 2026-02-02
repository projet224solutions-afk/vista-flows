import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Shield, AlertTriangle, Loader2, Trash2, Plus } from 'lucide-react';
import { usePDGAgentPermissions } from '@/hooks/usePDGAgentPermissions';
import { usePDGAgentsData } from '@/hooks/usePDGAgentsData';

interface PermissionManagerProps {
  pdgId: string;
}

export function PDGAgentPermissionManager({ pdgId }: PermissionManagerProps) {
  const { permissions, permissionCatalog, loading, grantPermission, revokePermission, loadPermissions } = usePDGAgentPermissions(pdgId);
  const { agents, loading: agentsLoading } = usePDGAgentsData(pdgId);
  
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [grantingPermissions, setGrantingPermissions] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleTogglePermission = (key: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedPermissions(newSet);
  };

  const handleGrantPermissions = async () => {
    if (!selectedAgent || selectedPermissions.size === 0) return;

    setGrantingPermissions(true);
    let successCount = 0;
    
    for (const permKey of selectedPermissions) {
      const success = await grantPermission(
        selectedAgent,
        permKey,
        expiresInDays ? parseInt(expiresInDays) : undefined
      );
      if (success) successCount++;
    }

    setGrantingPermissions(false);
    if (successCount > 0) {
      setSelectedPermissions(new Set());
      setSelectedAgent('');
      setExpiresInDays('');
      setShowDialog(false);
      await loadPermissions();
    }
  };

  const handleRevokePermission = async (permissionKey: string) => {
    const success = await revokePermission(selectedAgent, permissionKey, 'Révocation manuelle');
    if (success) {
      await loadPermissions();
    }
  };

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const permissionsByCategory = permissionCatalog.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof permissionCatalog>);

  const agentPermissions = permissions.filter(p => p.agent_id === selectedAgent);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestion des permissions agents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sélection de l'agent */}
          <div className="space-y-2">
            <Label>Sélectionner un agent</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name} ({agent.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAgent && (
            <>
              {/* Permissions actuelles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Permissions accordées ({agentPermissions.length})
                  </Label>
                  <Button 
                    onClick={() => setShowDialog(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter permission
                  </Button>
                </div>

                {agentPermissions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {agentPermissions.map(perm => (
                      <Card key={perm.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{perm.permission_name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {perm.pdg_permission_catalog?.category}
                            </div>
                            {perm.expires_at && (
                              <div className="text-xs text-orange-600 mt-1">
                                Expire: {new Date(perm.expires_at).toLocaleDateString()}
                              </div>
                            )}
                            <div className="flex gap-1 mt-2">
                              <Badge 
                                variant="outline"
                                className={getRiskColor(perm.pdg_permission_catalog?.risk_level || 'medium')}
                              >
                                {perm.pdg_permission_catalog?.risk_level}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokePermission(perm.permission_key)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Aucune permission accordée. Cliquez sur "Ajouter permission" pour en ajouter.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Avertissement pour permissions critiques */}
              {agentPermissions.some(p => p.pdg_permission_catalog?.risk_level === 'critical') && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Attention: Cet agent a accès à des permissions critiques. Assurez-vous que c'est intentionnel.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour ajouter permissions */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Ajouter permissions</DialogTitle>
            <DialogDescription>
              Sélectionnez les permissions à accorder à cet agent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden">
            {/* Durée d'expiration */}
            <div className="space-y-2">
              <Label>Durée de validité (jours)</Label>
              <Input
                type="number"
                placeholder="Laisser vide pour sans expiration"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                min="1"
                max="365"
              />
              <p className="text-xs text-gray-500">
                Durée avant expiration automatique. Laisser vide = sans limite de temps.
              </p>
            </div>

            {/* Permissions par catégorie */}
            <ScrollArea className="flex-1">
              <Tabs defaultValue={Object.keys(permissionsByCategory)[0] || 'users'}>
                <TabsList className="grid grid-cols-4">
                  {Object.keys(permissionsByCategory).map(category => (
                    <TabsTrigger key={category} value={category} className="text-xs">
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <TabsContent key={category} value={category} className="space-y-3 pr-4">
                    {perms.map(perm => (
                      <div key={perm.permission_key} className="flex items-start space-x-2 p-2 border rounded-md">
                        <Checkbox
                          id={perm.permission_key}
                          checked={selectedPermissions.has(perm.permission_key)}
                          onCheckedChange={() => handleTogglePermission(perm.permission_key)}
                          disabled={grantingPermissions}
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={perm.permission_key}
                            className="font-semibold cursor-pointer text-sm"
                          >
                            {perm.permission_name}
                          </Label>
                          <p className="text-xs text-gray-600 mt-1">
                            {perm.description}
                          </p>
                          <div className="flex gap-1 mt-2">
                            {perm.requires_2fa && (
                              <Badge variant="outline" className="text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                2FA requis
                              </Badge>
                            )}
                            <Badge 
                              variant="outline"
                              className={`text-xs ${getRiskColor(perm.risk_level)}`}
                            >
                              {perm.risk_level}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </ScrollArea>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button 
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={grantingPermissions}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleGrantPermissions}
              disabled={selectedPermissions.size === 0 || grantingPermissions}
            >
              {grantingPermissions && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Accorder {selectedPermissions.size} permission{selectedPermissions.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
