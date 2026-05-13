/**
 * PDGServiceProvidersList - Liste des prestataires inscrits par type de service
 * Affiche tous les services professionnels avec filtrage par type
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabaseClient';
import { backendFetch } from '@/services/backendApi';
import {
  Search, Users, MapPin, Star, Phone, Mail, _Eye,
  CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw,
  TrendingUp, ShoppingBag, Store, Globe, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

const COUNTRY_OPTIONS = [
  { code: 'GN', name: 'Guinée', currency: 'GNF', flag: '🇬🇳' },
  { code: 'SN', name: 'Sénégal', currency: 'XOF', flag: '🇸🇳' },
  { code: 'CI', name: 'Côte d\'Ivoire', currency: 'XOF', flag: '🇨🇮' },
  { code: 'ML', name: 'Mali', currency: 'XOF', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF', flag: '🇧🇫' },
  { code: 'NE', name: 'Niger', currency: 'XOF', flag: '🇳🇪' },
  { code: 'TG', name: 'Togo', currency: 'XOF', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', currency: 'XOF', flag: '🇧🇯' },
  { code: 'CM', name: 'Cameroun', currency: 'XAF', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', currency: 'XAF', flag: '🇬🇦' },
  { code: 'CG', name: 'Congo', currency: 'XAF', flag: '🇨🇬' },
  { code: 'TD', name: 'Tchad', currency: 'XAF', flag: '🇹🇩' },
  { code: 'CF', name: 'Centrafrique', currency: 'XAF', flag: '🇨🇫' },
  { code: 'GQ', name: 'Guinée Équatoriale', currency: 'XAF', flag: '🇬🇶' },
  { code: 'SL', name: 'Sierra Leone', currency: 'SLL', flag: '🇸🇱' },
  { code: 'NG', name: 'Nigéria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
  { code: 'MA', name: 'Maroc', currency: 'MAD', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', currency: 'DZD', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', currency: 'TND', flag: '🇹🇳' },
  { code: 'FR', name: 'France', currency: 'EUR', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', currency: 'EUR', flag: '🇧🇪' },
  { code: 'US', name: 'États-Unis', currency: 'USD', flag: '🇺🇸' },
  { code: 'GB', name: 'Royaume-Uni', currency: 'GBP', flag: '🇬🇧' },
  { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪' },
  { code: 'ZA', name: 'Afrique du Sud', currency: 'ZAR', flag: '🇿🇦' },
];

interface PDGServiceProvidersListProps {
  activeServiceTab: string;
  serviceTypes: { id: string; code: string; name: string }[];
}

interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  verification_status: string;
  rating: number;
  total_reviews: number;
  total_orders: number;
  total_revenue: number;
  created_at: string;
  service_type_id: string;
  service_type?: { name: string; code: string } | null;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  active: { label: 'Actif', icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  pending: { label: 'En attente', icon: Clock, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  suspended: { label: 'Suspendu', icon: AlertTriangle, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  rejected: { label: 'Rejeté', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
};

export function PDGServiceProvidersList({ activeServiceTab, serviceTypes }: PDGServiceProvidersListProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyDialog, setCurrencyDialog] = useState<{
    open: boolean; provider: Provider | null; selectedCountry: string; saving: boolean; error: string | null;
  }>({ open: false, provider: null, selectedCountry: '', saving: false, error: null });

  const handleServiceCurrencyChange = async () => {
    const { provider, selectedCountry } = currencyDialog;
    if (!provider || !selectedCountry) return;
    const country = COUNTRY_OPTIONS.find(c => c.code === selectedCountry);
    if (!country) return;
    setCurrencyDialog(d => ({ ...d, saving: true, error: null }));
    const result = await backendFetch<any>('/api/vendors/admin/change-currency', {
      method: 'POST',
      body: { vendor_id: provider.user_id, new_currency: country.currency, new_country_code: country.code, reason: 'Changement manuel PDG', entity_type: 'user' },
    });
    setCurrencyDialog(d => ({ ...d, saving: false }));
    if (!result.success) { setCurrencyDialog(d => ({ ...d, error: result.error || 'Erreur inconnue' })); return; }
    if (!result.changed) { toast.info(result.message); setCurrencyDialog(d => ({ ...d, open: false })); return; }
    toast.success(`Devise changée : ${result.old_currency} → ${result.new_currency}`, { duration: 6000 });
    setCurrencyDialog(d => ({ ...d, open: false }));
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professional_services')
        .select('*, service_type:service_types(name, code)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Filtrer les boutiques/digital - ne garder que les services de proximité
      const EXCLUDED_CODES = ['ecommerce', 'dropshipping', 'digital_livre', 'digital_logiciel'];
      const filtered = (data || []).filter(
        (p: any) => !p.service_type || !EXCLUDED_CODES.includes(p.service_type.code)
      );
      setProviders(filtered as Provider[]);
    } catch (err) {
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = providers;
    if (activeServiceTab !== 'all') {
      list = list.filter(p => p.service_type_id === activeServiceTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.business_name.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.address?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [providers, activeServiceTab, searchQuery]);

  const stats = useMemo(() => ({
    total: filtered.length,
    active: filtered.filter(p => p.status === 'active').length,
    pending: filtered.filter(p => p.status === 'pending').length,
    totalRevenue: filtered.reduce((s, p) => s + (p.total_revenue || 0), 0),
    totalOrders: filtered.reduce((s, p) => s + (p.total_orders || 0), 0),
    avgRating: filtered.length > 0
      ? (filtered.reduce((s, p) => s + (p.rating || 0), 0) / filtered.filter(p => p.rating > 0).length || 0).toFixed(1)
      : '0',
  }), [filtered]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const getStatus = (status: string) => {
    const cfg = statusConfig[status] || statusConfig.pending;
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.className} gap-1`}>
        <Icon className="w-3 h-3" />{cfg.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Prestataires</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <ShoppingBag className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Commandes</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">CA Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                {activeServiceTab !== 'all'
                  ? `Prestataires — ${serviceTypes.find(s => s.id === activeServiceTab)?.name}`
                  : 'Tous les Prestataires'}
              </CardTitle>
              <CardDescription>{filtered.length} prestataire(s)</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchProviders}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  {activeServiceTab === 'all' && <TableHead>Type</TableHead>}
                  <TableHead>Statut</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Commandes</TableHead>
                  <TableHead>CA</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeServiceTab === 'all' ? 9 : 8} className="text-center py-12 text-muted-foreground">
                      <Store className="w-8 h-8 opacity-30 mx-auto mb-2" />
                      Aucun prestataire trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.business_name}</div>
                        {p.address && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{p.address}
                          </div>
                        )}
                      </TableCell>
                      {activeServiceTab === 'all' && (
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.service_type?.name || '-'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>{getStatus(p.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          {p.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</div>}
                          {p.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{p.rating?.toFixed(1) || '0.0'}</span>
                          <span className="text-xs text-muted-foreground">({p.total_reviews || 0})</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{p.total_orders || 0}</TableCell>
                      <TableCell className="font-semibold text-primary">{formatCurrency(p.total_revenue || 0)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(p.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrencyDialog({ open: true, provider: p, selectedCountry: '', saving: false, error: null })}
                          className="border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500"
                        >
                          <Globe className="w-3.5 h-3.5 mr-1" />
                          Devise
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog changement de devise service de proximité */}
      <Dialog open={currencyDialog.open} onOpenChange={open => setCurrencyDialog(d => ({ ...d, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Changer la devise — Service
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Service : <strong>{currencyDialog.provider?.business_name}</strong></p>
            <div className="space-y-2">
              <Label>Pays de résidence</Label>
              <Select value={currencyDialog.selectedCountry} onValueChange={v => setCurrencyDialog(d => ({ ...d, selectedCountry: v, error: null }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un pays..." /></SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.flag} {c.name} — {c.currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {currencyDialog.error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{currencyDialog.error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrencyDialog(d => ({ ...d, open: false }))}>Annuler</Button>
            <Button onClick={handleServiceCurrencyChange} disabled={!currencyDialog.selectedCountry || currencyDialog.saving}>
              {currencyDialog.saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />En cours...</> : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
