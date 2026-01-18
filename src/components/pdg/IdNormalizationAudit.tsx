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
  Eye, XCircle, Info, Copy, Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

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
}

// Format d'ID standard: 3 lettres majuscules + 4+ chiffres (ex: VND0001, CLT0123, AGT0001)
const ID_FORMAT_REGEX = /^[A-Z]{3}\d{4,}$/;

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

  // Validate ID format
  const validateIdFormat = (id: string): { valid: boolean; error?: string } => {
    if (!id) {
      return { valid: false, error: 'Veuillez entrer un ID' };
    }

    const upperCaseId = id.toUpperCase().trim();

    if (upperCaseId.length < 7) {
      return { valid: false, error: 'L\'ID doit contenir au moins 7 caractères (3 lettres + 4 chiffres)' };
    }

    const prefix = upperCaseId.substring(0, 3);
    if (!VALID_PREFIXES.includes(prefix)) {
      return { 
        valid: false, 
        error: `Préfixe invalide "${prefix}". Préfixes valides: ${VALID_PREFIXES.join(', ')}` 
      };
    }

    if (!ID_FORMAT_REGEX.test(upperCaseId)) {
      return { 
        valid: false, 
        error: 'Format invalide. Format attendu: 3 lettres majuscules + 4+ chiffres (ex: VND0001)' 
      };
    }

    return { valid: true };
  };

  // Search for a specific ID
  const handleSearchId = async () => {
    const normalizedId = searchId.toUpperCase().trim();
    
    const validation = validateIdFormat(normalizedId);
    if (!validation.valid) {
      setSearchError(validation.error || 'Format invalide');
      setSearchResult(null);
      return;
    }

    setSearchError(null);
    setSearching(true);
    setSearchResult(null);

    try {
      // Search in user_ids table
      const { data: userIdData, error: userIdError } = await supabase
        .from('user_ids')
        .select('*')
        .eq('custom_id', normalizedId)
        .maybeSingle();

      if (userIdError) throw userIdError;

      // If found in user_ids, get profile to determine role
      let userRole: string | undefined;
      if (userIdData) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userIdData.user_id)
          .maybeSingle();
        
        userRole = profileData?.role || undefined;
      }

      // Search in normalization logs
      const { data: normLogs, error: normError } = await supabase
        .from('id_normalization_logs')
        .select('*')
        .or(`original_id.eq.${normalizedId},corrected_id.eq.${normalizedId}`)
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
          id: normalizedId,
          table: 'user_ids',
          user_id: userIdData.user_id,
          role: userRole,
          created_at: userIdData.created_at,
          normalization_history: mappedLogs
        });
      } else if (mappedLogs.length > 0) {
        // ID found only in normalization logs (might have been corrected)
        const latestLog = mappedLogs[0];
        setSearchResult({
          found: true,
          id: normalizedId,
          table: 'normalization_logs',
          user_id: latestLog.user_id,
          role: latestLog.role_type,
          created_at: latestLog.created_at,
          normalization_history: mappedLogs
        });
      } else {
        setSearchResult({
          found: false,
          id: normalizedId,
          table: 'none'
        });
      }

      toast.success(`Recherche terminée pour ${normalizedId}`);
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

  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('id_normalization_logs')
        .select('*');

      if (error) throw error;

      const logsData = data || [];
      
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
  }, [loadStats, loadLogs]);

  const handleRefresh = () => {
    loadStats();
    loadLogs();
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
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total corrections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.byReason['duplicate_detected'] || 0}</p>
                <p className="text-xs text-muted-foreground">Doublons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.byReason['format_invalid'] || 0}</p>
                <p className="text-xs text-muted-foreground">Formats invalides</p>
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
                <p className="text-2xl font-bold">{Object.keys(stats?.byRole || {}).length}</p>
                <p className="text-xs text-muted-foreground">Rôles concernés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="search" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search" className="gap-2">
            <Eye className="w-4 h-4" />
            Rechercher ID
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Search className="w-4 h-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytiques
          </TabsTrigger>
        </TabsList>

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
