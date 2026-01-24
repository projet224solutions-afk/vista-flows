/**
 * 📊 ID NORMALIZATION AUDIT - PDG ONLY
 * Suivi des corrections automatiques d'ID lors des inscriptions
 * Avec recherche avancée et validation de format
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  RefreshCw, Search, AlertTriangle, CheckCircle, 
  TrendingUp, Calendar, Shield, Hash, ChevronLeft, ChevronRight,
  Eye, XCircle, Info, Copy, Check, Wand2, Loader2, Layers
} from 'lucide-react';
import { generateUniqueId, type RoleType } from '@/lib/autoIdGenerator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { IdReorganizationPanel } from './IdReorganizationPanel';
import { UserActivitySearch } from './UserActivitySearch';
import { WalletAuditTool } from './WalletAuditTool';
import { Wallet } from 'lucide-react';

interface NormalizationLog {
  id: string;
  user_id: string;
  role_type: string;
  original_id: string;
  corrected_id: string;
  reason: string;
  reason_details: any;
  auth_provider: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

interface Stats {
  total: number;
  totalUserIds: number;
  standardFormatCount: number;
  nonStandardFormatCount: number;
  byRole: Record<string, number>;
  byReason: Record<string, number>;
  dailyTrends: { date: string; count: number }[];
}

interface IdSearchResult {
  found: boolean;
  id: string;
  table: string;
  user_id?: string;
  role?: string;
  created_at?: string;
  normalization_history?: NormalizationLog[];
  profile?: {
    full_name?: string;
    email?: string;
    role?: string;
  };
}

// Format d'ID standard: 3 lettres majuscules + 4 chiffres (ex: VND0001, CLT0123, AGT0001)
// Mais on accepte aussi les formats existants pour la recherche
const ID_FORMAT_REGEX = /^[A-Z]{3}\d{4,}$/;
const SEARCH_ID_REGEX = /^[A-Z]{3}\d{3,}$/; // Plus permissif pour la recherche

const VALID_PREFIXES = ['VND', 'CLT', 'AGT', 'DRV', 'BUR', 'ADM', 'PDG'];

const REASONS_MAP: Record<string, { label: string; color: string }> = {
  'duplicate_detected': { label: 'Doublon détecté', color: '#EF4444' },
  'format_invalid': { label: 'Format invalide', color: '#F59E0B' },
  'sequence_gap': { label: 'Gap de séquence', color: '#3B82F6' },
  'counter_mismatch': { label: 'Compteur désynchronisé', color: '#8B5CF6' },
  'manual_override': { label: 'Correction manuelle', color: '#10B981' },
  'collision_resolved': { label: 'Collision résolue', color: '#EC4899' },
  'prefix_mismatch': { label: 'Préfixe incorrect', color: '#F97316' },
  'migration_fix': { label: 'Correction migration', color: '#06B6D4' },
};

const ROLE_COLORS: Record<string, string> = {
  'vendor': '#3B82F6',
  'client': '#10B981',
  'agent': '#F59E0B',
  'driver': '#8B5CF6',
  'bureau': '#EC4899',
};

const PREFIX_TO_ROLE: Record<string, string> = {
  'VND': 'Vendeur',
  'CLT': 'Client',
  'AGT': 'Agent',
  'DRV': 'Livreur',
  'BUR': 'Bureau',
  'ADM': 'Admin',
  'PDG': 'PDG',
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];

export default function IdNormalizationAudit() {
  const [logs, setLogs] = useState<NormalizationLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    roleType: 'all',
    reason: 'all',
    search: ''
  });
  const limit = 20;

  // ID Search/Track state
  const [searchId, setSearchId] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<IdSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allUserIds, setAllUserIds] = useState<any[]>([]);
  const [nonStandardUsers, setNonStandardUsers] = useState<any[]>([]);
  const [loadingNonStandard, setLoadingNonStandard] = useState(false);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctingAll, setCorrectingAll] = useState(false);

  // Validate ID format for search (more permissive)
  const validateSearchId = (id: string): { valid: boolean; error?: string; isStandard?: boolean } => {
    if (!id || id.trim().length < 3) {
      return { valid: false, error: 'Veuillez entrer au moins 3 caractères' };
    }

    const upperCaseId = id.toUpperCase().trim();

    // Vérifier si c'est un format standard
    const isStandardFormat = ID_FORMAT_REGEX.test(upperCaseId);
    
    // Accepter n'importe quel format alphanumérique pour la recherche
    if (!/^[A-Z0-9]{3,}$/i.test(upperCaseId)) {
      return { 
        valid: false, 
        error: 'L\'ID doit contenir uniquement des lettres et chiffres' 
      };
    }

    return { valid: true, isStandard: isStandardFormat };
  };

  // Check if ID matches standard format
  const isStandardFormat = (id: string): boolean => {
    if (!id) return false;
    const upperCaseId = id.toUpperCase().trim();
    const prefix = upperCaseId.substring(0, 3);
    return ID_FORMAT_REGEX.test(upperCaseId) && VALID_PREFIXES.includes(prefix);
  };

  // Load all user IDs for listing
  const loadAllUserIds = async () => {
    try {
      const { data, error } = await supabase
        .from('user_ids')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAllUserIds(data || []);
    } catch (error: any) {
      console.error('Erreur chargement user_ids:', error);
    }
  };

  // Load all users with non-standard IDs
  const loadNonStandardUsers = async () => {
    setLoadingNonStandard(true);
    try {
      // Get all user_ids
      const { data: userIdsData, error: userIdsError } = await supabase
        .from('user_ids')
        .select('*')
        .order('created_at', { ascending: false });

      if (userIdsError) throw userIdsError;

      // Filter non-standard IDs
      const nonStandardIds = (userIdsData || []).filter(item => !isStandardFormat(item.custom_id));
      
      // Get profiles for these users
      const userIds = nonStandardIds.map(item => item.user_id);
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combine data
        const combined = nonStandardIds.map(item => {
          const profile = (profilesData || []).find(p => p.id === item.user_id);
          return {
            ...item,
            profile
          };
        });

        setNonStandardUsers(combined);
      } else {
        setNonStandardUsers([]);
      }
    } catch (error: any) {
      console.error('Erreur chargement utilisateurs non-standard:', error);
      toast.error('Erreur lors du chargement des utilisateurs non-standard');
    } finally {
      setLoadingNonStandard(false);
    }
  };

  // Search for a specific ID
  const handleSearchId = async () => {
    const normalizedId = searchId.toUpperCase().trim();
    
    const validation = validateSearchId(normalizedId);
    if (!validation.valid) {
      setSearchError(validation.error || 'Format invalide');
      setSearchResult(null);
      return;
    }

    setSearchError(null);
    setSearching(true);
    setSearchResult(null);

    try {
      // Search in user_ids table - exact match first
      let { data: userIdData, error: userIdError } = await supabase
        .from('user_ids')
        .select('*')
        .eq('custom_id', normalizedId)
        .maybeSingle();

      if (userIdError) throw userIdError;

      // If not found with exact match, try partial search
      if (!userIdData) {
        const { data: partialData, error: partialError } = await supabase
          .from('user_ids')
          .select('*')
          .ilike('custom_id', `%${normalizedId}%`)
          .limit(1)
          .maybeSingle();

        if (partialError) throw partialError;
        userIdData = partialData;
      }

      // If found in user_ids, get profile to determine role
      let userRole: string | undefined;
      let profileData: any = null;
      if (userIdData) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('role, full_name, email')
          .eq('id', userIdData.user_id)
          .maybeSingle();
        
        profileData = pData;
        userRole = pData?.role || undefined;
      }

      // Search in normalization logs
      const { data: normLogs, error: normError } = await supabase
        .from('id_normalization_logs')
        .select('*')
        .or(`original_id.ilike.%${normalizedId}%,corrected_id.ilike.%${normalizedId}%`)
        .order('created_at', { ascending: false });

      if (normError) throw normError;

      const mappedLogs: NormalizationLog[] = (normLogs || []).map(log => ({
        ...log,
        ip_address: log.ip_address ? String(log.ip_address) : null,
        reason: String(log.reason)
      }));

      if (userIdData) {
        setSearchResult({
          found: true,
          id: userIdData.custom_id,
          table: 'user_ids',
          user_id: userIdData.user_id,
          role: userRole,
          created_at: userIdData.created_at,
          normalization_history: mappedLogs,
          profile: profileData
        });
        toast.success(`ID trouvé: ${userIdData.custom_id}`);
      } else if (mappedLogs.length > 0) {
        // ID found only in normalization logs (might have been corrected)
        const latestLog = mappedLogs[0];
        setSearchResult({
          found: true,
          id: latestLog.corrected_id || latestLog.original_id,
          table: 'normalization_logs',
          user_id: latestLog.user_id,
          role: latestLog.role_type,
          created_at: latestLog.created_at,
          normalization_history: mappedLogs
        });
        toast.success(`ID trouvé dans les logs de normalisation`);
      } else {
        setSearchResult({
          found: false,
          id: normalizedId,
          table: 'none'
        });
        toast.info(`Aucun ID trouvé pour "${normalizedId}"`);
      }

    } catch (error: any) {
      console.error('Erreur recherche ID:', error);
      toast.error('Erreur lors de la recherche');
      setSearchError('Erreur lors de la recherche dans la base de données');
    } finally {
      setSearching(false);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`ID copié: ${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Map profile role to RoleType for ID generation
  const mapRoleToRoleType = (role: string | undefined | null): RoleType | null => {
    if (!role) return null;
    
    // Convert to string and normalize
    const roleStr = String(role).toLowerCase().trim();
    console.log('🔍 Mapping role:', role, '→', roleStr);
    
    const mapping: Record<string, RoleType> = {
      'vendor': 'vendor',
      'vendeur': 'vendor',
      'client': 'client',
      'agent': 'agent',
      'driver': 'driver',
      'livreur': 'driver',
      'taxi': 'driver',
      'bureau': 'bureau',
      'pdg': 'pdg',
      'transitaire': 'transitaire',
      'worker': 'worker',
      'admin': 'pdg',
    };
    
    const result = mapping[roleStr] || null;
    console.log('🔍 Mapped result:', result);
    return result;
  };

  // Correct a single non-standard ID
  const handleCorrectId = async (item: any) => {
    const role = item.profile?.role;
    const roleType = mapRoleToRoleType(role);

    if (!roleType) {
      toast.error(`Impossible de corriger: rôle "${role}" non reconnu`);
      return;
    }

    setCorrectingId(item.id);

    try {
      const originalId = item.custom_id;

      // Retry loop to handle DB-level unique constraint races
      let newId: string | null = null;
      const maxAttempts = 5;
      let attempt = 0;

      while (attempt < maxAttempts) {
        attempt++;
        newId = await generateUniqueId(roleType);

        console.log(`🔄 Correction ID (tentative ${attempt}/${maxAttempts}): ${originalId} → ${newId} (${roleType})`);

        // 1. Mettre à jour user_ids.custom_id
        const { error: updateError } = await supabase
          .from('user_ids')
          .update({ custom_id: newId })
          .eq('id', item.id);

        if (!updateError) {
          // 2. CRITIQUE: Synchroniser profiles.public_id pour éviter les désynchronisations
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ public_id: newId })
            .eq('id', item.user_id);

          if (profileError) {
            console.error('⚠️ Erreur sync profiles.public_id:', profileError);
            // Continuer quand même, l'ID principal est corrigé
          } else {
            console.log(`✅ profiles.public_id synchronisé: ${newId}`);
          }

          // 3. Log the normalization (best effort)
          const { error: logError } = await supabase
            .from('id_normalization_logs')
            .insert({
              user_id: item.user_id,
              role_type: roleType,
              original_id: originalId,
              corrected_id: newId,
              reason: 'format_invalid',
              reason_details: {
                original_format: originalId,
                corrected_format: newId,
                correction_type: 'manual_pdg_correction',
                profiles_synced: !profileError,
                timestamp: new Date().toISOString()
              },
              metadata: {
                corrected_by: 'pdg_audit_interface',
                profile_email: item.profile?.email,
                profile_name: item.profile?.full_name
              }
            });

          if (logError) {
            console.error('Erreur log normalisation:', logError);
          }

          toast.success(`ID corrigé: ${originalId} → ${newId}`);

          // Force refresh the lists with a small delay to ensure DB is updated
          setTimeout(async () => {
            await loadNonStandardUsers();
            await loadStats();
            await loadAllUserIds();
          }, 500);

          return;
        }

        // If duplicate key, retry with a new ID
        const isDuplicate =
          (updateError as any)?.code === '23505' ||
          String(updateError.message || '').includes('user_ids_custom_id_key') ||
          String(updateError.message || '').includes('duplicate key value');

        if (!isDuplicate) {
          throw updateError;
        }

        console.warn(`⚠️ Conflit d'unicité sur ${newId}, nouvelle tentative...`, updateError);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      throw new Error(`Impossible de corriger: conflit d'unicité après ${maxAttempts} tentatives`);

    } catch (error: any) {
      console.error('Erreur correction ID:', error);
      toast.error(`Erreur lors de la correction: ${error.message}`);
    } finally {
      setCorrectingId(null);
    }
  };

  // Correct all non-standard IDs - one by one to avoid conflicts
  const handleCorrectAllIds = async () => {
    if (nonStandardUsers.length === 0) {
      toast.info('Aucun ID à corriger');
      return;
    }

    const toCorrect = nonStandardUsers.filter(item => {
      const roleType = mapRoleToRoleType(item.profile?.role);
      return roleType !== null;
    });

    if (toCorrect.length === 0) {
      toast.error('Aucun ID ne peut être corrigé (rôles non reconnus)');
      return;
    }

    setCorrectingAll(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process one by one with retries to avoid unique constraint races
    for (const item of toCorrect) {
      try {
        const roleType = mapRoleToRoleType(item.profile?.role)!;
        const originalId = item.custom_id;

        const maxAttempts = 5;
        let attempt = 0;
        let updated = false;
        let lastError: any = null;

        while (attempt < maxAttempts && !updated) {
          attempt++;
          const newId = await generateUniqueId(roleType);

          // 1. Mettre à jour user_ids.custom_id
          const { error: updateError } = await supabase
            .from('user_ids')
            .update({ custom_id: newId })
            .eq('id', item.id);

          if (!updateError) {
            // 2. CRITIQUE: Synchroniser profiles.public_id
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ public_id: newId })
              .eq('id', item.user_id);

            if (profileError) {
              console.error(`⚠️ Erreur sync profiles.public_id pour ${item.user_id}:`, profileError);
            }

            // 3. Log the normalization (best effort)
            await supabase
              .from('id_normalization_logs')
              .insert({
                user_id: item.user_id,
                role_type: roleType,
                original_id: originalId,
                corrected_id: newId,
                reason: 'format_invalid',
                reason_details: {
                  original_format: originalId,
                  corrected_format: newId,
                  correction_type: 'bulk_pdg_correction',
                  profiles_synced: !profileError,
                  timestamp: new Date().toISOString()
                },
                metadata: {
                  corrected_by: 'pdg_audit_interface',
                  profile_email: item.profile?.email,
                  profile_name: item.profile?.full_name
                }
              });

            successCount++;
            updated = true;
            break;
          }

          const isDuplicate =
            (updateError as any)?.code === '23505' ||
            String(updateError.message || '').includes('user_ids_custom_id_key') ||
            String(updateError.message || '').includes('duplicate key value');

          if (!isDuplicate) {
            throw updateError;
          }

          lastError = updateError;
          console.warn(`⚠️ Conflit d'unicité (bulk) sur tentative ${attempt}/${maxAttempts}`, updateError);
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        if (!updated) {
          throw lastError || new Error(`Conflit d'unicité après ${maxAttempts} tentatives`);
        }

        // Small delay between corrections to reduce contention
        await new Promise((resolve) => setTimeout(resolve, 120));

      } catch (error: any) {
        console.error(`Erreur correction ${item.custom_id}:`, error);
        errors.push(`${item.custom_id}: ${error.message}`);
        errorCount++;
      }
    }

    setCorrectingAll(false);

    if (successCount > 0) {
      toast.success(`${successCount} ID(s) corrigé(s) avec succès`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} erreur(s): ${errors.slice(0, 2).join(', ')}`);
    }

    // Refresh all data
    await loadNonStandardUsers();
    await loadStats();
    await loadAllUserIds();
  };

  const loadStats = useCallback(async () => {
    try {
      // Load normalization logs
      const { data: normData, error: normError } = await supabase
        .from('id_normalization_logs')
        .select('*');

      if (normError) throw normError;

      // Load all user_ids for stats
      const { data: userIdsData, error: userIdsError } = await supabase
        .from('user_ids')
        .select('custom_id, created_at');

      if (userIdsError) throw userIdsError;

      const logsData = normData || [];
      const userIds = userIdsData || [];
      
      // Calculate standard vs non-standard format counts
      let standardFormatCount = 0;
      let nonStandardFormatCount = 0;
      
      userIds.forEach(item => {
        if (isStandardFormat(item.custom_id)) {
          standardFormatCount++;
        } else {
          nonStandardFormatCount++;
        }
      });
      
      const byRole: Record<string, number> = {};
      const byReason: Record<string, number> = {};
      const dailyCounts: Record<string, number> = {};

      logsData.forEach(log => {
        byRole[log.role_type] = (byRole[log.role_type] || 0) + 1;
        byReason[log.reason] = (byReason[log.reason] || 0) + 1;
        const date = format(new Date(log.created_at), 'yyyy-MM-dd');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      const dailyTrends = Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7);

      setStats({
        total: logsData.length,
        totalUserIds: userIds.length,
        standardFormatCount,
        nonStandardFormatCount,
        byRole,
        byReason,
        dailyTrends
      });
    } catch (error: any) {
      console.error('Erreur chargement stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('id_normalization_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (filters.roleType !== 'all') {
        query = query.eq('role_type', filters.roleType);
      }

      if (filters.reason !== 'all') {
        query = query.eq('reason', filters.reason as any);
      }

      if (filters.search) {
        const searchTerm = filters.search.toUpperCase().trim();
        query = query.or(`original_id.ilike.%${searchTerm}%,corrected_id.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const mappedLogs: NormalizationLog[] = (data || []).map(log => ({
        ...log,
        ip_address: log.ip_address ? String(log.ip_address) : null,
        reason: String(log.reason)
      }));

      setLogs(mappedLogs);
      setTotalPages(Math.ceil((count || 0) / limit));
    } catch (error: any) {
      console.error('Erreur chargement logs:', error);
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadStats();
    loadLogs();
    loadAllUserIds();
    loadNonStandardUsers();
  }, [loadStats, loadLogs]);

  const handleRefresh = () => {
    loadStats();
    loadLogs();
    loadAllUserIds();
    loadNonStandardUsers();
    toast.success('Données actualisées');
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      'vendor': 'bg-blue-500',
      'client': 'bg-green-500',
      'agent': 'bg-yellow-500',
      'driver': 'bg-purple-500',
      'bureau': 'bg-pink-500',
    };
    return (
      <Badge className={`${colors[role] || 'bg-gray-500'} text-white`}>
        {role.toUpperCase()}
      </Badge>
    );
  };

  const getReasonBadge = (reason: string) => {
    const info = REASONS_MAP[reason] || { label: reason, color: '#6B7280' };
    return (
      <Badge 
        variant="outline" 
        style={{ borderColor: info.color, color: info.color }}
      >
        {info.label}
      </Badge>
    );
  };

  const roleChartData = stats ? Object.entries(stats.byRole).map(([role, count]) => ({
    name: role.toUpperCase(),
    value: count,
    color: ROLE_COLORS[role] || '#6B7280'
  })) : [];

  const reasonChartData = stats ? Object.entries(stats.byReason).map(([reason, count]) => ({
    name: REASONS_MAP[reason]?.label || reason,
    value: count
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Hash className="w-6 h-6 text-primary" />
            Audit Normalisation ID
          </h2>
          <p className="text-muted-foreground mt-1">
            Suivi des corrections automatiques d'ID - Format: <code className="bg-muted px-1 rounded">AAA0001</code>
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Format Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Format d'ID Standard</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-1">
            <p><strong>Format:</strong> 3 lettres majuscules + 4+ chiffres</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {VALID_PREFIXES.map(prefix => (
                <Badge key={prefix} variant="secondary" className="font-mono">
                  {prefix} → {PREFIX_TO_ROLE[prefix] || prefix}
                </Badge>
              ))}
            </div>
            <p className="text-xs mt-2 text-muted-foreground">
              Exemples: VND0001, CLT0123, AGT0045, DRV0001
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Hash className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalUserIds || 0}</p>
                <p className="text-xs text-muted-foreground">Total IDs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.standardFormatCount || 0}</p>
                <p className="text-xs text-muted-foreground">Format standard</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.nonStandardFormatCount || 0}</p>
                <p className="text-xs text-muted-foreground">Format non-standard</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Corrections</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="non-standard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="non-standard" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Non-Standard ({nonStandardUsers.length})
          </TabsTrigger>
          <TabsTrigger value="reorganize" className="gap-2">
            <Layers className="w-4 h-4" />
            Réorganiser
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Eye className="w-4 h-4" />
            Activité
          </TabsTrigger>
          <TabsTrigger value="wallet-audit" className="gap-2">
            <Wallet className="w-4 h-4" />
            Audit Wallet
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="w-4 h-4" />
            Rechercher ID
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Hash className="w-4 h-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytiques
          </TabsTrigger>
        </TabsList>

        {/* Non-Standard Users Tab */}
        <TabsContent value="non-standard" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Utilisateurs avec ID Non-Standard
                  </CardTitle>
                  <CardDescription>
                    Ces utilisateurs ont des IDs qui ne suivent pas le format standard (3 lettres + 4 chiffres)
                  </CardDescription>
                </div>
                {nonStandardUsers.length > 0 && (
                  <Button
                    onClick={handleCorrectAllIds}
                    disabled={correctingAll}
                    className="gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                  >
                    {correctingAll ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    {correctingAll ? 'Correction en cours...' : `Corriger tout (${nonStandardUsers.length})`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingNonStandard ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Chargement...</span>
                </div>
              ) : nonStandardUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <h4 className="font-semibold text-green-700 dark:text-green-400">Parfait !</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tous les utilisateurs ont des IDs au format standard
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">ID Actuel</TableHead>
                        <TableHead>Problème</TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Date création</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nonStandardUsers.map((item) => {
                        const prefix = item.custom_id?.substring(0, 3) || '';
                        const isValidPrefix = VALID_PREFIXES.includes(prefix);
                        const hasCorrectLength = item.custom_id?.length >= 7;
                        
                        let problem = '';
                        if (!isValidPrefix && !hasCorrectLength) {
                          problem = 'Préfixe invalide + longueur incorrecte';
                        } else if (!isValidPrefix) {
                          problem = `Préfixe "${prefix}" non reconnu`;
                        } else if (!hasCorrectLength) {
                          problem = 'Longueur incorrecte (< 7 caractères)';
                        } else if (!ID_FORMAT_REGEX.test(item.custom_id)) {
                          problem = 'Format incorrect';
                        }
                        
                        return (
                          <TableRow key={item.id} className="bg-yellow-500/5">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="font-mono font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                                  {item.custom_id}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopyId(item.custom_id)}
                                >
                                  {copiedId === item.custom_id ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">
                                {problem}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.profile?.full_name || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-32">
                              {item.profile?.email || '-'}
                            </TableCell>
                            <TableCell>
                              {item.profile?.role ? getRoleBadge(item.profile.role) : (
                                <Badge variant="outline" className="text-gray-500">Non défini</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCorrectId(item)}
                                  disabled={correctingId === item.id || !item.profile?.role}
                                  className="gap-1 text-xs border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                                  title={!item.profile?.role ? 'Rôle non défini - impossible de corriger' : 'Corriger cet ID'}
                                >
                                  {correctingId === item.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Wand2 className="w-3 h-3" />
                                  )}
                                  Corriger
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSearchId(item.custom_id);
                                  }}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Détails
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
              
              {/* Summary */}
              {nonStandardUsers.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-muted-foreground">
                        {nonStandardUsers.length} utilisateur(s) avec ID non-standard
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Format standard: VND0001, CLT0123, AGT0045, DRV0001, BUR0001, ADM0001, PDG0001
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reorganization Tab */}
        <TabsContent value="reorganize" className="space-y-4">
          <IdReorganizationPanel />
        </TabsContent>

        {/* User Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <UserActivitySearch />
        </TabsContent>

        {/* Wallet Audit Tab */}
        <TabsContent value="wallet-audit" className="space-y-4">
          <WalletAuditTool />
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Rechercher & Suivre un ID
              </CardTitle>
              <CardDescription>
                Entrez un ID au format standard pour vérifier son existence et son historique
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="search-id">ID à rechercher</Label>
                  <Input
                    id="search-id"
                    placeholder="Ex: VND0001, CLT0123, AGT0045..."
                    value={searchId}
                    onChange={(e) => {
                      setSearchId(e.target.value.toUpperCase());
                      setSearchError(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchId()}
                    className={`font-mono uppercase ${searchError ? 'border-red-500' : ''}`}
                  />
                  {searchError && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {searchError}
                    </p>
                  )}
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleSearchId} 
                    disabled={searching || !searchId}
                    className="gap-2"
                  >
                    {searching ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Rechercher
                  </Button>
                </div>
              </div>

              {/* Search Result */}
              {searchResult && (
                <div className="mt-6">
                  {searchResult.found ? (
                    <Card className="border-green-500/50 bg-green-500/5">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-full">
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-green-700 dark:text-green-400">
                                ID Trouvé
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-lg font-bold bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded">
                                  {searchResult.id}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleCopyId(searchResult.id)}
                                >
                                  {copiedId === searchResult.id ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                          {searchResult.role && getRoleBadge(searchResult.role)}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Table source</p>
                            <p className="font-medium">{searchResult.table}</p>
                          </div>
                          {searchResult.user_id && (
                            <div>
                              <p className="text-xs text-muted-foreground">User ID</p>
                              <p className="font-mono text-xs truncate" title={searchResult.user_id}>
                                {searchResult.user_id.substring(0, 8)}...
                              </p>
                            </div>
                          )}
                          {searchResult.created_at && (
                            <div>
                              <p className="text-xs text-muted-foreground">Date création</p>
                              <p className="font-medium">
                                {format(new Date(searchResult.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Normalization History */}
                        {searchResult.normalization_history && searchResult.normalization_history.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h5 className="font-semibold mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                              Historique de normalisation ({searchResult.normalization_history.length})
                            </h5>
                            <div className="space-y-2">
                              {searchResult.normalization_history.map((log) => (
                                <div 
                                  key={log.id} 
                                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm"
                                >
                                  <span className="text-muted-foreground whitespace-nowrap">
                                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <code className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs line-through">
                                      {log.original_id}
                                    </code>
                                    <span>→</span>
                                    <code className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-bold">
                                      {log.corrected_id}
                                    </code>
                                    {getReasonBadge(log.reason)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-red-500/50 bg-red-500/5">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-500/20 rounded-full">
                            <XCircle className="w-6 h-6 text-red-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-red-700 dark:text-red-400">
                              ID Non Trouvé
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              L'ID <code className="font-bold">{searchResult.id}</code> n'existe pas dans le système
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Profile details if available */}
              {searchResult?.found && searchResult.profile && (
                <Card className="mt-4 border-primary/20">
                  <CardContent className="p-4">
                    <h5 className="font-semibold mb-2 text-sm">Détails du profil</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {searchResult.profile.full_name && (
                        <div>
                          <p className="text-xs text-muted-foreground">Nom complet</p>
                          <p className="font-medium">{searchResult.profile.full_name}</p>
                        </div>
                      )}
                      {searchResult.profile.email && (
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium truncate">{searchResult.profile.email}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent User IDs List */}
              <Card className="mt-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    IDs récents ({allUserIds.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Derniers IDs enregistrés dans le système
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allUserIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun ID enregistré
                    </p>
                  ) : (
                    <ScrollArea className="h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-32">ID</TableHead>
                            <TableHead>Format</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allUserIds.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono font-medium">
                                {item.custom_id}
                              </TableCell>
                              <TableCell>
                                {isStandardFormat(item.custom_id) ? (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    Standard
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                    Non-standard
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(item.created_at), 'dd/MM/yyyy', { locale: fr })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSearchId(item.custom_id);
                                    handleSearchId();
                                  }}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Voir
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher un ID (ex: VND0001)..."
                    value={filters.search}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value.toUpperCase() }))}
                    className="w-full font-mono uppercase"
                  />
                </div>
                <Select
                  value={filters.roleType}
                  onValueChange={(v) => setFilters(f => ({ ...f, roleType: v }))}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="vendor">Vendeur</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="driver">Livreur</SelectItem>
                    <SelectItem value="bureau">Bureau</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.reason}
                  onValueChange={(v) => setFilters(f => ({ ...f, reason: v }))}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Raison" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les raisons</SelectItem>
                    {Object.entries(REASONS_MAP).map(([value, info]) => (
                      <SelectItem key={value} value={value}>{info.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>ID Original</TableHead>
                      <TableHead>ID Corrigé</TableHead>
                      <TableHead>Raison</TableHead>
                      <TableHead>Provider</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Aucun log de normalisation trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(log.role_type)}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded line-through dark:bg-red-900/50 dark:text-red-400">
                              {log.original_id}
                            </code>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold dark:bg-green-900/50 dark:text-green-400">
                              {log.corrected_id}
                            </code>
                          </TableCell>
                          <TableCell>{getReasonBadge(log.reason)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {log.auth_provider || 'email'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tendances journalières */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tendances (7 derniers jours)</CardTitle>
                <CardDescription>Nombre de corrections par jour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.dailyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(v) => format(new Date(v), 'dd/MM')}
                        fontSize={12}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        labelFormatter={(v) => format(new Date(v), 'dd MMMM yyyy', { locale: fr })}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Répartition par rôle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Répartition par rôle</CardTitle>
                <CardDescription>Distribution des corrections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {roleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Répartition par raison */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Répartition par raison</CardTitle>
                <CardDescription>Types de corrections effectuées</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reasonChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {reasonChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
