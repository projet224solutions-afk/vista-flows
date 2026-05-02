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
  _Eye,
  XCircle
} from 'lucide-react';

interface IdDiscrepancy {
  userId: string;
  email: string;
  fullName: string;
  profilesPublicId: string;
  userIdsCustomId: string | null;
  vendorCode: string | null;
  status: 'desync_user_ids' | 'desync_vendor' | 'desync_both' | 'missing_user_id' | 'conflict' | 'ok';
  canAutoFix: boolean;
  conflictWith?: string; // userId du conflit potentiel
}

interface DuplicateInfo {
  id: string;
  users: string[];
  count: number;
}

export function IdAuditManager() {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<IdDiscrepancy[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastAudit, setLastAudit] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    synced: 0,
    desyncUserIds: 0,
    desyncVendor: 0,
    desyncBoth: 0,
    conflicts: 0,
    missing: 0
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
      const userIdsData = userIdsRes.data || [];
      const vendorsData = vendorsRes.data || [];

      // Maps pour recherche rapide
      const userIdsByUserId = new Map(userIdsData.map(u => [u.user_id, u.custom_id]));
      const userIdsByCustomId = new Map(userIdsData.map(u => [u.custom_id, u.user_id]));
      const vendors = new Map(vendorsData.map(v => [v.user_id, v.vendor_code]));

      // Détection des doublons dans profiles.public_id
      const publicIdCounts = new Map<string, string[]>();
      for (const profile of profiles) {
        if (profile.public_id) {
          const existing = publicIdCounts.get(profile.public_id) || [];
          existing.push(profile.id);
          publicIdCounts.set(profile.public_id, existing);
        }
      }

      const foundDuplicates: DuplicateInfo[] = [];
      publicIdCounts.forEach((users, id) => {
        if (users.length > 1) {
          foundDuplicates.push({ id, users, count: users.length });
        }
      });
      setDuplicates(foundDuplicates);

      const results: IdDiscrepancy[] = [];

      for (const profile of profiles) {
        if (!profile.public_id) continue;

        const userIdCustomId = userIdsByUserId.get(profile.id);
        const vendorCode = vendors.get(profile.id);

        // Vérifier si le public_id cible est déjà utilisé par un autre user dans user_ids
        const existingOwner = userIdsByCustomId.get(profile.public_id);
        const hasConflict = existingOwner && existingOwner !== profile.id;

        const isUserIdDesync = userIdCustomId && userIdCustomId !== profile.public_id;
        const isVendorDesync = vendorCode && vendorCode !== profile.public_id;
        const isMissingUserIdEntry = !userIdCustomId;

        let status: IdDiscrepancy['status'] = 'ok';
        let canAutoFix = true;

        if (hasConflict) {
          status = 'conflict';
          canAutoFix = false; // Conflit = correction manuelle nécessaire
        } else if (isUserIdDesync && isVendorDesync) {
          status = 'desync_both';
        } else if (isUserIdDesync) {
          status = 'desync_user_ids';
        } else if (isVendorDesync) {
          status = 'desync_vendor';
        } else if (isMissingUserIdEntry) {
          status = 'missing_user_id';
        }

        if (status !== 'ok') {
          results.push({
            userId: profile.id,
            email: profile.email || '',
            fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
            profilesPublicId: profile.public_id,
            userIdsCustomId: userIdCustomId || null,
            vendorCode: vendorCode || null,
            status,
            canAutoFix,
            conflictWith: hasConflict ? existingOwner : undefined
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
      desyncBoth: data.filter(d => d.status === 'desync_both').length,
      conflicts: data.filter(d => d.status === 'conflict').length,
      missing: data.filter(d => d.status === 'missing_user_id').length
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
    let skipped = 0;

    try {
      for (const userId of selectedIds) {
        const discrepancy = discrepancies.find(d => d.userId === userId);
        if (!discrepancy) continue;

        // Ne pas corriger les conflits automatiquement
        if (discrepancy.status === 'conflict') {
          console.warn(`⚠️ Conflit détecté pour ${userId}, correction manuelle requise`);
          skipped++;
          continue;
        }

        // Créer ou corriger user_ids.custom_id
        if (discrepancy.status === 'missing_user_id') {
          // Créer une nouvelle entrée
          const { error: insertError } = await supabase
            .from('user_ids')
            .insert({
              user_id: userId,
              custom_id: discrepancy.profilesPublicId
            });

          if (insertError) {
            // Si doublon, essayer un update
            if (insertError.message.includes('duplicate')) {
              const { error: updateError } = await supabase
                .from('user_ids')
                .update({ custom_id: discrepancy.profilesPublicId })
                .eq('user_id', userId);

              if (updateError) {
                console.error(`Erreur insert/update user_ids ${userId}:`, updateError);
                errors++;
                continue;
              }
            } else {
              console.error(`Erreur insertion user_ids ${userId}:`, insertError);
              errors++;
              continue;
            }
          }
          fixed++;
          continue;
        }

        // Corriger user_ids.custom_id (désynchronisé)
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
      if (skipped > 0) {
        toast.warning(`⚠️ ${skipped} conflit(s) ignoré(s) - correction manuelle requise`);
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
        return <Badge className="bg-amber-500 text-white text-xs">vendor désync</Badge>;
      case 'desync_both':
        return <Badge variant="destructive" className="text-xs animate-pulse">CRITIQUE</Badge>;
      case 'missing_user_id':
        return <Badge className="bg-blue-500 text-white text-xs">Manquant</Badge>;
      case 'conflict':
        return <Badge className="bg-purple-600 text-white text-xs animate-pulse">⚠️ CONFLIT</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">OK</Badge>;
    }
  };

  useEffect(() => {
    runAudit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="text-xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <div className="text-xl font-bold text-destructive">{stats.desyncUserIds}</div>
            <div className="text-xs text-muted-foreground">user_ids</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-center">
            <div className="text-xl font-bold text-amber-600">{stats.desyncVendor}</div>
            <div className="text-xs text-muted-foreground">vendors</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <div className="text-xl font-bold text-destructive">{stats.desyncBoth}</div>
            <div className="text-xs text-muted-foreground">Critiques</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 text-center">
            <div className="text-xl font-bold text-blue-600">{stats.missing}</div>
            <div className="text-xs text-muted-foreground">Manquants</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-center">
            <div className="text-xl font-bold text-purple-600">{stats.conflicts}</div>
            <div className="text-xs text-muted-foreground">Conflits</div>
          </div>
        </div>

        {/* Alerte doublons */}
        {duplicates.length > 0 && (
          <Alert variant="destructive" className="animate-pulse">
            <XCircle className="h-4 w-4" />
            <AlertTitle>🚨 Doublons détectés dans profiles.public_id!</AlertTitle>
            <AlertDescription>
              {duplicates.map(d => (
                <div key={d.id} className="mt-1">
                  <code className="bg-muted px-1 rounded">{d.id}</code> utilisé par {d.count} utilisateurs
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

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
                  <TableRow
                    key={d.userId}
                    className={`hover:bg-muted/50 ${d.status === 'conflict' ? 'bg-purple-500/5' : ''}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(d.userId)}
                        onCheckedChange={() => toggleSelection(d.userId)}
                        disabled={!d.canAutoFix}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{d.fullName}</p>
                        <p className="text-xs text-muted-foreground">{d.email}</p>
                        {d.conflictWith && (
                          <p className="text-xs text-purple-600 mt-1">
                            ⚠️ ID déjà utilisé par un autre user
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(d.status)}</TableCell>
                    <TableCell>
                      <code className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-mono">
                        {d.profilesPublicId}
                      </code>
                    </TableCell>
                    <TableCell>
                      {d.userIdsCustomId ? (
                        <div className="flex items-center gap-1">
                          <code className={`px-2 py-1 rounded text-xs font-mono ${
                            d.userIdsCustomId === d.profilesPublicId
                              ? 'bg-primary/10 text-primary'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {d.userIdsCustomId}
                          </code>
                          {d.userIdsCustomId !== d.profilesPublicId && (
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">Aucun</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.vendorCode ? (
                        <code className={`px-2 py-1 rounded text-xs font-mono ${
                          d.vendorCode === d.profilesPublicId
                            ? 'bg-primary/10 text-primary'
                            : 'bg-amber-500/10 text-amber-600'
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
