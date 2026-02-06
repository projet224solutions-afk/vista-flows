/**
 * 🔍 ID AUDIT MANAGER - Système d'audit et correction des IDs
 * Détecte et corrige les désynchronisations entre tables
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Shield, 
  Database,
  ArrowRight,
  Wrench,
  Eye,
  XCircle
} from 'lucide-react';

interface IdDiscrepancy {
  userId: string;
  email: string;
  fullName: string;
  profilesPublicId: string;
  userIdsCustomId: string | null;
  vendorCode: string | null;
  status: 'desync_user_ids' | 'desync_vendor' | 'desync_both' | 'ok';
  canAutoFix: boolean;
}

export function IdAuditManager() {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<IdDiscrepancy[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastAudit, setLastAudit] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    synced: 0,
    desyncUserIds: 0,
    desyncVendor: 0,
    desyncBoth: 0
  });

  const runAudit = async () => {
    setLoading(true);
    try {
      // Audit côté client (pas de RPC nécessaire)
      await runClientSideAudit();
    } catch (err) {
      console.error('Erreur audit:', err);
      toast.error('Erreur lors de l\'audit');
    } finally {
      setLoading(false);
      setLastAudit(new Date().toLocaleString('fr-FR'));
    }
  };

  const runClientSideAudit = async () => {
    try {
      // Récupérer toutes les données nécessaires
      const [profilesRes, userIdsRes, vendorsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, first_name, last_name, public_id, role'),
        supabase.from('user_ids').select('user_id, custom_id'),
        supabase.from('vendors').select('user_id, vendor_code')
      ]);

      const profiles = profilesRes.data || [];
      const userIds = new Map((userIdsRes.data || []).map(u => [u.user_id, u.custom_id]));
      const vendors = new Map((vendorsRes.data || []).map(v => [v.user_id, v.vendor_code]));

      const results: IdDiscrepancy[] = [];

      for (const profile of profiles) {
        if (!profile.public_id) continue;

        const userIdCustomId = userIds.get(profile.id);
        const vendorCode = vendors.get(profile.id);

        const isUserIdDesync = userIdCustomId && userIdCustomId !== profile.public_id;
        const isVendorDesync = vendorCode && vendorCode !== profile.public_id;

        let status: IdDiscrepancy['status'] = 'ok';
        if (isUserIdDesync && isVendorDesync) status = 'desync_both';
        else if (isUserIdDesync) status = 'desync_user_ids';
        else if (isVendorDesync) status = 'desync_vendor';

        if (status !== 'ok') {
          results.push({
            userId: profile.id,
            email: profile.email || '',
            fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
            profilesPublicId: profile.public_id,
            userIdsCustomId: userIdCustomId || null,
            vendorCode: vendorCode || null,
            status,
            canAutoFix: true
          });
        }
      }

      processAuditResults(results);
    } catch (err) {
      console.error('Erreur audit client:', err);
      toast.error('Erreur lors de l\'audit');
    }
  };

  const processAuditResults = (data: IdDiscrepancy[]) => {
    setDiscrepancies(data);
    setStats({
      total: data.length,
      synced: 0,
      desyncUserIds: data.filter(d => d.status === 'desync_user_ids').length,
      desyncVendor: data.filter(d => d.status === 'desync_vendor').length,
      desyncBoth: data.filter(d => d.status === 'desync_both').length
    });
  };

  const fixSelectedIds = async () => {
    if (selectedIds.size === 0) {
      toast.warning('Sélectionnez au moins un utilisateur');
      return;
    }

    setFixing(true);
    let fixed = 0;
    let errors = 0;

    try {
      for (const userId of selectedIds) {
        const discrepancy = discrepancies.find(d => d.userId === userId);
        if (!discrepancy) continue;

        // Corriger user_ids.custom_id
        if (discrepancy.status === 'desync_user_ids' || discrepancy.status === 'desync_both') {
          const { error: userIdError } = await supabase
            .from('user_ids')
            .update({ custom_id: discrepancy.profilesPublicId })
            .eq('user_id', userId);

          if (userIdError) {
            console.error(`Erreur correction user_ids ${userId}:`, userIdError);
            errors++;
            continue;
          }
        }

        // Corriger vendors.vendor_code
        if (discrepancy.status === 'desync_vendor' || discrepancy.status === 'desync_both') {
          const { error: vendorError } = await supabase
            .from('vendors')
            .update({ vendor_code: discrepancy.profilesPublicId })
            .eq('user_id', userId);

          if (vendorError) {
            console.error(`Erreur correction vendors ${userId}:`, vendorError);
            errors++;
            continue;
          }
        }

        fixed++;
      }

      if (fixed > 0) {
        toast.success(`✅ ${fixed} utilisateur(s) corrigé(s)`);
      }
      if (errors > 0) {
        toast.error(`❌ ${errors} erreur(s) lors de la correction`);
      }

      // Relancer l'audit
      setSelectedIds(new Set());
      await runAudit();
    } catch (err) {
      console.error('Erreur correction:', err);
      toast.error('Erreur lors de la correction');
    } finally {
      setFixing(false);
    }
  };

  const fixAllDiscrepancies = async () => {
    if (discrepancies.length === 0) return;
    
    const allIds = new Set(discrepancies.filter(d => d.canAutoFix).map(d => d.userId));
    setSelectedIds(allIds);
    
    // Attendre un tick pour que l'état soit mis à jour
    setTimeout(() => fixSelectedIds(), 100);
  };

  const toggleSelection = (userId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    if (selectedIds.size === discrepancies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(discrepancies.map(d => d.userId)));
    }
  };

  const getStatusBadge = (status: IdDiscrepancy['status']) => {
    switch (status) {
      case 'desync_user_ids':
        return <Badge variant="destructive" className="text-xs">user_ids désync</Badge>;
      case 'desync_vendor':
        return <Badge className="bg-orange-500 text-xs">vendor désync</Badge>;
      case 'desync_both':
        return <Badge variant="destructive" className="text-xs animate-pulse">CRITIQUE</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">OK</Badge>;
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Audit des IDs Système</CardTitle>
              <CardDescription>
                Vérification et correction des désynchronisations d'identifiants
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={runAudit} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total problèmes</div>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 text-center">
            <div className="text-2xl font-bold text-red-500">{stats.desyncUserIds}</div>
            <div className="text-xs text-muted-foreground">user_ids désync</div>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.desyncVendor}</div>
            <div className="text-xs text-muted-foreground">vendors désync</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.desyncBoth}</div>
            <div className="text-xs text-muted-foreground">Critiques</div>
          </div>
        </div>

        {lastAudit && (
          <p className="text-xs text-muted-foreground">
            Dernier audit: {lastAudit}
          </p>
        )}

        {/* Alerte si problèmes */}
        {discrepancies.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Désynchronisations détectées</AlertTitle>
            <AlertDescription>
              {discrepancies.length} utilisateur(s) avec des IDs incohérents. 
              La source de vérité est <code className="bg-muted px-1 rounded">profiles.public_id</code>.
            </AlertDescription>
          </Alert>
        )}

        {discrepancies.length === 0 && !loading && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-600">Système synchronisé</AlertTitle>
            <AlertDescription className="text-green-600/80">
              Tous les IDs sont correctement synchronisés entre les tables.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        {discrepancies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={fixAllDiscrepancies}
              disabled={fixing || discrepancies.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Corriger tout ({discrepancies.length})
            </Button>
            <Button
              onClick={fixSelectedIds}
              disabled={fixing || selectedIds.size === 0}
              variant="outline"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Corriger sélection ({selectedIds.size})
            </Button>
          </div>
        )}

        {/* Table des problèmes */}
        {discrepancies.length > 0 && (
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={selectedIds.size === discrepancies.length && discrepancies.length > 0}
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="text-green-600">profiles.public_id</span>
                    <span className="text-xs ml-1">(source)</span>
                  </TableHead>
                  <TableHead>
                    <span className="text-red-500">user_ids.custom_id</span>
                  </TableHead>
                  <TableHead>
                    <span className="text-orange-500">vendors.vendor_code</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancies.map((d) => (
                  <TableRow key={d.userId} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.has(d.userId)}
                        onCheckedChange={() => toggleSelection(d.userId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{d.fullName}</p>
                        <p className="text-xs text-muted-foreground">{d.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(d.status)}</TableCell>
                    <TableCell>
                      <code className="bg-green-500/20 text-green-600 px-2 py-1 rounded text-xs font-mono">
                        {d.profilesPublicId}
                      </code>
                    </TableCell>
                    <TableCell>
                      {d.userIdsCustomId ? (
                        <div className="flex items-center gap-1">
                          <code className={`px-2 py-1 rounded text-xs font-mono ${
                            d.userIdsCustomId === d.profilesPublicId 
                              ? 'bg-green-500/20 text-green-600' 
                              : 'bg-red-500/20 text-red-600'
                          }`}>
                            {d.userIdsCustomId}
                          </code>
                          {d.userIdsCustomId !== d.profilesPublicId && (
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.vendorCode ? (
                        <code className={`px-2 py-1 rounded text-xs font-mono ${
                          d.vendorCode === d.profilesPublicId 
                            ? 'bg-green-500/20 text-green-600' 
                            : 'bg-orange-500/20 text-orange-600'
                        }`}>
                          {d.vendorCode}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Légende */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            <span>Source de vérité: <code className="bg-muted px-1 rounded">profiles.public_id</code></span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span>Synchronisé</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-500" />
            <span>Désynchronisé</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IdAuditManager;
