/**
 * 📊 ID NORMALIZATION AUDIT - PDG ONLY
 * Suivi des corrections automatiques d'ID lors des inscriptions
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, Search, AlertTriangle, CheckCircle, 
  TrendingUp, Calendar, User, Shield, Hash, ChevronLeft, ChevronRight
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

const REASONS_MAP: Record<string, { label: string; color: string }> = {
  'duplicate_detected': { label: 'Doublon détecté', color: '#EF4444' },
  'format_invalid': { label: 'Format invalide', color: '#F59E0B' },
  'sequence_gap': { label: 'Gap de séquence', color: '#3B82F6' },
  'counter_mismatch': { label: 'Compteur désynchronisé', color: '#8B5CF6' },
  'manual_override': { label: 'Correction manuelle', color: '#10B981' },
  'collision_resolved': { label: 'Collision résolue', color: '#EC4899' },
};

const ROLE_COLORS: Record<string, string> = {
  'vendor': '#3B82F6',
  'client': '#10B981',
  'agent': '#F59E0B',
  'driver': '#8B5CF6',
  'bureau': '#EC4899',
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

  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('id_normalization_logs')
        .select('*');

      if (error) throw error;

      const logsData = data || [];
      
      // Calculer les stats
      const byRole: Record<string, number> = {};
      const byReason: Record<string, number> = {};
      const dailyCounts: Record<string, number> = {};

      logsData.forEach(log => {
        // Par rôle
        byRole[log.role_type] = (byRole[log.role_type] || 0) + 1;
        
        // Par raison
        byReason[log.reason] = (byReason[log.reason] || 0) + 1;
        
        // Par jour
        const date = format(new Date(log.created_at), 'yyyy-MM-dd');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      // Convertir dailyCounts en tableau trié
      const dailyTrends = Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // Derniers 7 jours

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
        query = query.or(`original_id.ilike.%${filters.search}%,corrected_id.ilike.%${filters.search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Map data to our interface with proper type handling
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

  // Données pour les graphiques
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
            Suivi des corrections automatiques d'ID lors des inscriptions
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

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
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs" className="gap-2">
            <Search className="w-4 h-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytiques
          </TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher un ID..."
                    value={filters.search}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    className="w-full"
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
                            <code className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded line-through">
                              {log.original_id}
                            </code>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
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
