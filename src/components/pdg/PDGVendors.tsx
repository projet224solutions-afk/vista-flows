/**
 * 🏪 PDG VENDORS MANAGEMENT
 * Gestion centralisée des vendeurs
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, CheckCircle, XCircle, RefreshCw, Eye, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mapping pays → devise (cohérent avec le reste du système)
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

interface Vendor {
  id: string;
  business_name: string;
  user_id: string;
  vendor_code: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  shop_currency?: string | null;
  seller_country_code?: string | null;
  profiles?: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    custom_id: string;
  };
  agent_info?: string;
  subscription?: {
    plan_name: string;
    status: string;
    current_period_end: string;
    billing_cycle: string;
  };
}

export default function PDGVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, inactive: 0, total: 0 });

  // Dialog changement de devise
  const [currencyDialog, setCurrencyDialog] = useState<{
    open: boolean;
    vendor: Vendor | null;
    selectedCountry: string;
    saving: boolean;
  }>({ open: false, vendor: null, selectedCountry: '', saving: false });

  const openCurrencyDialog = (vendor: Vendor) => {
    const currentCountry = COUNTRY_OPTIONS.find(c => c.code === vendor.seller_country_code);
    setCurrencyDialog({
      open: true,
      vendor,
      selectedCountry: currentCountry?.code || '',
      saving: false,
    });
  };

  const handleCurrencyChange = async () => {
    const { vendor, selectedCountry } = currencyDialog;
    if (!vendor || !selectedCountry) return;

    const country = COUNTRY_OPTIONS.find(c => c.code === selectedCountry);
    if (!country) return;

    setCurrencyDialog(d => ({ ...d, saving: true }));

    const { data, error } = await supabase.rpc('admin_change_vendor_currency', {
      p_vendor_id:        vendor.id,
      p_new_currency:     country.currency,
      p_new_country_code: country.code,
      p_reason:           'Changement manuel PDG',
    });

    setCurrencyDialog(d => ({ ...d, saving: false }));

    if (error) {
      toast.error(`Erreur: ${error.message}`);
      return;
    }

    if (!data.success) {
      toast.error(data.error || 'Erreur inconnue');
      return;
    }

    if (!data.changed) {
      toast.info(data.message);
      setCurrencyDialog(d => ({ ...d, open: false }));
      return;
    }

    if (data.warning) {
      toast.warning(data.warning);
    }

    toast.success(
      `Devise changée : ${data.old_currency} → ${data.new_currency} — ${data.products_flagged} produit(s) marqué(s) à réviser`
    );

    setCurrencyDialog(d => ({ ...d, open: false }));
    loadVendors();
  };

  const loadVendors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          profiles!inner(email, first_name, last_name, phone, custom_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrichir avec les infos agents et abonnements
      const enrichedVendors = await Promise.all((data || []).map(async (vendor) => {
        // Récupérer l'info de l'agent créateur
        const { data: agentLink } = await supabase
          .from('agent_created_users')
          .select('agents_management(name)')
          .eq('user_id', vendor.user_id)
          .single();

        // Récupérer le MEILLEUR abonnement actif (par display_order DESC)
        // Note: On ne peut pas order par plans.display_order directement, donc on récupère tous les actifs
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select(`
            status,
            current_period_end,
            billing_cycle,
            plans!inner(display_name, display_order)
          `)
          .eq('user_id', vendor.user_id)
          .eq('status', 'active')
          .gt('current_period_end', new Date().toISOString());

        // Trier côté client pour prendre le meilleur plan (display_order le plus élevé)
        const bestSubscription = subscriptions && subscriptions.length > 0
          ? subscriptions.sort((a, b) =>
              ((b.plans as any)?.display_order || 0) - ((a.plans as any)?.display_order || 0)
            )[0]
          : null;

        return {
          ...vendor,
          agent_info: agentLink?.agents_management?.name || null,
          subscription: bestSubscription ? {
            plan_name: (bestSubscription.plans as any)?.display_name || 'N/A',
            status: bestSubscription.status,
            current_period_end: bestSubscription.current_period_end,
            billing_cycle: bestSubscription.billing_cycle
          } : null
        };
      }));

      setVendors(enrichedVendors as any);

      const active = enrichedVendors.filter(v => v.is_active).length || 0;
      const inactive = enrichedVendors.filter(v => !v.is_active).length || 0;

      setStats({
        active,
        inactive,
        total: enrichedVendors.length || 0
      });
    } catch (error: any) {
      console.error('Erreur chargement vendeurs:', error);
      toast.error('Erreur lors du chargement des vendeurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();

    // Abonnement temps réel pour les nouveaux vendeurs
    const channel = supabase
      .channel('vendors-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'vendors' },
        () => {
          console.log('🔄 Nouveau vendeur détecté, rechargement...');
          loadVendors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Chargement des vendeurs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Vendeurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.total}</span>
              <Store className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.active}</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inactifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.inactive}</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des vendeurs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liste des Vendeurs</CardTitle>
              <CardDescription>{vendors.length} vendeurs enregistrés</CardDescription>
            </div>
            <Button onClick={loadVendors} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vendors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun vendeur enregistré</p>
              </div>
            ) : (
              vendors.map((vendor) => (
                <div key={vendor.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-lg">{vendor.business_name}</p>
                          <Badge variant={vendor.is_verified ? 'default' : 'secondary'} className="text-xs">
                            {vendor.is_verified ? '✓ Vérifié' : '⏳ En attente'}
                          </Badge>
                          <Badge variant={vendor.is_active ? 'default' : 'destructive'} className="text-xs">
                            {vendor.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>📧 {vendor.profiles?.email || 'Email non disponible'}</p>
                          <p>👤 {vendor.profiles?.first_name} {vendor.profiles?.last_name}</p>
                          {vendor.profiles?.phone && <p>📱 {vendor.profiles.phone}</p>}
                          <p>🆔 Code Vendeur: <span className="font-mono font-semibold text-primary">{vendor.vendor_code}</span></p>
                          <p>
                            💱 Devise boutique:{' '}
                            <span className="font-semibold text-primary">
                              {vendor.shop_currency || '—'}
                            </span>
                            {vendor.seller_country_code && (
                              <span className="text-muted-foreground"> ({vendor.seller_country_code})</span>
                            )}
                          </p>
                          {vendor.agent_info && (
                            <p>👥 Créé par l'agent: <span className="font-medium">{vendor.agent_info}</span></p>
                          )}
                          {vendor.subscription ? (
                            <div className="mt-2 p-2 bg-primary/5 rounded border border-primary/20">
                              <p className="font-medium text-primary">📦 Abonnement: {vendor.subscription.plan_name}</p>
                              <p className="text-xs">
                                {vendor.subscription.billing_cycle === 'lifetime' ? (
                                  <>🎁 Offert à vie - Expire le: {new Date(vendor.subscription.current_period_end).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                  })}</>
                                ) : (
                                  <>⏰ Expire le: {new Date(vendor.subscription.current_period_end).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                  })}</>
                                )}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-destructive">⚠️ Aucun abonnement actif</p>
                          )}
                          <p className="text-xs">📅 Créé le: {new Date(vendor.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCurrencyDialog(vendor)}
                        title="Changer la devise de la boutique"
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        Devise
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog changement de devise */}
      <Dialog
        open={currencyDialog.open}
        onOpenChange={(open) => setCurrencyDialog(d => ({ ...d, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Changer la devise — {currencyDialog.vendor?.business_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              Devise actuelle :{' '}
              <span className="font-semibold text-foreground">
                {currencyDialog.vendor?.shop_currency || '—'}{' '}
                ({currencyDialog.vendor?.seller_country_code || '—'})
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Nouveau pays / devise</label>
              <Select
                value={currencyDialog.selectedCountry}
                onValueChange={(val) => setCurrencyDialog(d => ({ ...d, selectedCountry: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays..." />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name} — {c.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currencyDialog.selectedCountry && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 space-y-1">
                <p className="font-semibold">Effets du changement :</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>La devise de la boutique devient <strong>{COUNTRY_OPTIONS.find(c => c.code === currencyDialog.selectedCountry)?.currency}</strong></li>
                  <li>Tous les produits actifs sont marqués <strong>à réviser</strong> — le vendeur doit corriger ses prix</li>
                  <li>Les commandes en cours restent dans l'ancienne devise (normal)</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCurrencyDialog(d => ({ ...d, open: false }))}
              disabled={currencyDialog.saving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCurrencyChange}
              disabled={!currencyDialog.selectedCountry || currencyDialog.saving}
            >
              {currencyDialog.saving ? 'Enregistrement...' : 'Confirmer le changement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
