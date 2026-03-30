/**
 * 💳 GESTIONNAIRE UNIFIÉ DE LIENS DE PAIEMENT
 * Supporte 4 types: payment, invoice, checkout, service
 * Pour vendeurs digitaux, vendeurs physiques et prestataires
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { usePaymentLinks, LinkType } from '@/hooks/usePaymentLinks';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import {
  Link, Plus, Copy, Share2, RefreshCw,
  DollarSign, CheckCircle, Clock, XCircle, AlertCircle,
  ExternalLink, Calendar, User, Package, Edit, Trash2,
  CreditCard, FileText, ShoppingCart, Wrench, Eye,
  QrCode, Ban, MoreVertical, ArrowUpRight, Receipt,
  Smartphone, Store
} from 'lucide-react';

const LINK_TYPES: { value: LinkType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'payment', label: 'Paiement simple', icon: <CreditCard className="w-4 h-4" />, desc: 'Montant + objet pour paiement rapide' },
  { value: 'invoice', label: 'Facture', icon: <FileText className="w-4 h-4" />, desc: 'Référence, description, montant, statut' },
  { value: 'checkout', label: 'Checkout produit', icon: <ShoppingCart className="w-4 h-4" />, desc: 'Produit digital ou physique' },
  { value: 'service', label: 'Service / Prestation', icon: <Wrench className="w-4 h-4" />, desc: 'Restaurant, livraison, transport, prestation' },
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', label: 'En attente' },
  success: { icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Payé' },
  paid: { icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Payé' },
  failed: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Échoué' },
  expired: { icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'bg-muted text-muted-foreground', label: 'Expiré' },
  cancelled: { icon: <Ban className="w-3.5 h-3.5" />, color: 'bg-muted text-muted-foreground', label: 'Annulé' },
};

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  payment: { icon: <CreditCard className="w-3.5 h-3.5" />, color: 'bg-primary/10 text-primary', label: 'Paiement' },
  invoice: { icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', label: 'Facture' },
  checkout: { icon: <ShoppingCart className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Checkout' },
  service: { icon: <Wrench className="w-3.5 h-3.5" />, color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300', label: 'Service' },
};

interface Product { id: string; name: string; price: number; description?: string; images?: string[] }
interface Service { id: string; business_name: string; description?: string; category?: string }

const initialForm = {
  linkType: 'payment' as LinkType,
  product_id: '',
  service_id: '',
  produit: '',
  title: '',
  description: '',
  montant: '',
  devise: 'GNF',
  reference: '',
  client_id: '',
  customer_email: '',
  customer_phone: '',
  remise: '0',
  type_remise: 'percentage' as 'percentage' | 'fixed',
  payment_type: 'full',
  is_single_use: true,
  expires_days: '7',
};

export default function PaymentLinksManager() {
  const { toast } = useToast();
  const {
    paymentLinks, stats, loading, vendorId, ownerType,
    loadPaymentLinks, createPaymentLink, updatePaymentLinkStatus, deletePaymentLink, getPaymentUrl
  } = usePaymentLinks();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState(initialForm);

  const [filters, setFilters] = useState({ status: 'all', type: 'all', search: '' });
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { loadAssets(); }, [vendorId]);
  useEffect(() => { loadPaymentLinks(filters); }, [filters.status, filters.search]);

  const loadAssets = async () => {
    if (vendorId) {
      const { data } = await supabase.from('products').select('id, name, price, description, images')
        .eq('vendor_id', vendorId).eq('is_active', true).order('name');
      setProducts(data || []);
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('professional_services').select('id, business_name, description')
        .eq('user_id', user.id).order('business_name');
      setServices((data || []).map((d: any) => ({ id: d.id, business_name: d.business_name, description: d.description })));
    }
  };

  const filteredLinks = useMemo(() => {
    let result = paymentLinks;
    if (activeTab !== 'all') result = result.filter(l => l.link_type === activeTab);
    if (filters.type !== 'all') result = result.filter(l => l.link_type === filters.type);
    return result;
  }, [paymentLinks, activeTab, filters.type]);

  const handleProductSelect = (productId: string) => {
    const p = products.find(x => x.id === productId);
    if (p) {
      setFormData(f => ({ ...f, product_id: p.id, produit: p.name, title: p.name, description: p.description || '', montant: p.price.toString() }));
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    const s = services.find(x => x.id === serviceId);
    if (s) {
      setFormData(f => ({ ...f, service_id: s.id, produit: s.business_name, title: s.business_name, description: s.description || '' }));
    }
  };

  const handleCreate = async () => {
    if (!formData.produit || !formData.montant) {
      toast({ title: "Erreur", description: "Titre et montant requis", variant: "destructive" });
      return;
    }
    try {
      setCreating(true);
      const token = await createPaymentLink({
        linkType: formData.linkType,
        ownerType,
        produit: formData.produit,
        title: formData.title || formData.produit,
        description: formData.description,
        montant: parseFloat(formData.montant),
        devise: formData.devise,
        reference: formData.reference || undefined,
        client_id: formData.client_id || undefined,
        remise: parseFloat(formData.remise),
        type_remise: formData.type_remise,
        product_id: formData.product_id || undefined,
        service_id: formData.service_id || undefined,
        payment_type: formData.payment_type,
        is_single_use: formData.is_single_use,
        expires_days: parseInt(formData.expires_days) || 7,
      });

      if (token) {
        const url = `${window.location.origin}/pay/${token}`;
        navigator.clipboard.writeText(url);
        toast({ title: "✅ Lien créé et copié !", description: url });
        setShowCreateModal(false);
        setFormData(initialForm);
      }
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (link: any) => {
    const url = getPaymentUrl(link);
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copié !" });
  };

  const shareLink = async (link: any) => {
    const url = getPaymentUrl(link);
    if (navigator.share) {
      await navigator.share({ title: `Paiement - ${link.title || link.produit}`, text: 'Effectuez votre paiement sécurisé', url });
    } else {
      copyLink(link);
    }
  };

  const cancelLink = async (link: any) => {
    if (!confirm(`Annuler le lien "${link.title || link.produit}" ?`)) return;
    await updatePaymentLinkStatus(link.payment_id, 'cancelled');
  };

  const removeLink = async (link: any) => {
    if (!confirm(`Supprimer définitivement "${link.title || link.produit}" ?`)) return;
    await deletePaymentLink(link.payment_id);
  };

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;

  // ─── RENDER ───
  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
        {[
          { icon: <Link className="w-5 h-5 text-primary" />, label: 'Total', value: stats?.total_links || 0 },
          { icon: <CheckCircle className="w-5 h-5 text-emerald-600" />, label: 'Payés', value: stats?.successful_payments || 0, color: 'text-emerald-600' },
          { icon: <Clock className="w-5 h-5 text-amber-600" />, label: 'En attente', value: stats?.pending_payments || 0, color: 'text-amber-600' },
          { icon: <XCircle className="w-5 h-5 text-red-500" />, label: 'Échoués', value: stats?.failed_payments || 0, color: 'text-red-500' },
          { icon: <DollarSign className="w-5 h-5 text-primary" />, label: 'Revenus', value: formatCurrency(stats?.total_revenue || 0, 'GNF'), isRevenue: true },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-3 flex items-center gap-3">
              {s.icon}
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`font-bold ${s.isRevenue ? 'text-sm' : 'text-xl'} ${s.color || ''}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between shrink-0">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            className="sm:w-48"
          />
          <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
            <SelectTrigger className="sm:w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="success">Payés</SelectItem>
              <SelectItem value="failed">Échoués</SelectItem>
              <SelectItem value="expired">Expirés</SelectItem>
              <SelectItem value="cancelled">Annulés</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => loadPaymentLinks(filters)} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1" />Créer un lien
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Nouveau lien de paiement</DialogTitle>
                <DialogDescription>Choisissez le type et remplissez les informations</DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 overflow-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                <div className="space-y-4 px-1 pr-4 pb-2">
                  {/* Link type selection */}
                  <div>
                    <Label className="mb-2 block">Type de lien</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {LINK_TYPES.map(lt => (
                        <button
                          key={lt.value}
                          type="button"
                          onClick={() => setFormData(f => ({ ...f, linkType: lt.value, product_id: '', service_id: '' }))}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                            formData.linkType === lt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                          }`}
                        >
                          {lt.icon}
                          <div>
                            <p className="text-sm font-medium">{lt.label}</p>
                            <p className="text-xs text-muted-foreground">{lt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Product select for checkout type */}
                  {formData.linkType === 'checkout' && products.length > 0 && (
                    <div>
                      <Label>Produit</Label>
                      <Select value={formData.product_id} onValueChange={handleProductSelect}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un produit..." /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5" />
                                {p.name} — {new Intl.NumberFormat('fr-FR').format(p.price)} GNF
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Service select for service type */}
                  {formData.linkType === 'service' && services.length > 0 && (
                    <div>
                      <Label>Service</Label>
                      <Select value={formData.service_id} onValueChange={handleServiceSelect}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un service..." /></SelectTrigger>
                        <SelectContent>
                          {services.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <Wrench className="w-3.5 h-3.5" />
                                {s.business_name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <Label>Titre / Objet *</Label>
                    <Input
                      value={formData.produit}
                      onChange={(e) => setFormData(f => ({ ...f, produit: e.target.value, title: e.target.value }))}
                      placeholder={formData.linkType === 'service' ? 'Ex: Course taxi Kaloum' : 'Ex: Formation Marketing Digital'}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                      placeholder="Description du paiement..."
                      rows={2}
                    />
                  </div>

                  {/* Amount & currency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Montant *</Label>
                      <Input type="number" value={formData.montant}
                        onChange={(e) => setFormData(f => ({ ...f, montant: e.target.value }))} placeholder="0" />
                    </div>
                    <div>
                      <Label>Devise</Label>
                      <Select value={formData.devise} onValueChange={(v) => setFormData(f => ({ ...f, devise: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GNF">GNF</SelectItem>
                          <SelectItem value="FCFA">FCFA</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Reference (for invoice) */}
                  {(formData.linkType === 'invoice' || formData.linkType === 'service') && (
                    <div>
                      <Label>Référence / N° facture</Label>
                      <Input value={formData.reference}
                        onChange={(e) => setFormData(f => ({ ...f, reference: e.target.value }))}
                        placeholder="Ex: INV-2026-001" />
                    </div>
                  )}

                  {/* Payment type */}
                  <div>
                    <Label>Type de règlement</Label>
                    <Select value={formData.payment_type} onValueChange={(v) => setFormData(f => ({ ...f, payment_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Paiement total</SelectItem>
                        <SelectItem value="deposit">Acompte</SelectItem>
                        <SelectItem value="balance">Solde restant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client info (optional) */}
                  <div>
                    <Label>ID Client (optionnel)</Label>
                    <Input value={formData.client_id}
                      onChange={(e) => setFormData(f => ({ ...f, client_id: e.target.value }))}
                      placeholder="Ex: USR0002" />
                    <p className="text-xs text-muted-foreground mt-1">Laissez vide pour un lien public</p>
                  </div>

                  {/* Discount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Remise</Label>
                      <Input type="number" min="0" value={formData.remise}
                        onChange={(e) => setFormData(f => ({ ...f, remise: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Type remise</Label>
                      <Select value={formData.type_remise}
                        onValueChange={(v: 'percentage' | 'fixed') => setFormData(f => ({ ...f, type_remise: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">Fixe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Expiry & single use */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Expire dans (jours)</Label>
                      <Input type="number" min="1" max="365" value={formData.expires_days}
                        onChange={(e) => setFormData(f => ({ ...f, expires_days: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch checked={formData.is_single_use}
                        onCheckedChange={(v) => setFormData(f => ({ ...f, is_single_use: v }))} />
                      <Label className="text-sm">Usage unique</Label>
                    </div>
                  </div>

                  {/* Summary */}
                  {formData.montant && (
                    <div className="p-3 bg-muted rounded-lg space-y-1">
                      <p className="text-sm font-semibold">Résumé</p>
                      {(() => {
                        const m = parseFloat(formData.montant) || 0;
                        const r = parseFloat(formData.remise) || 0;
                        let net = m;
                        if (r > 0) net = formData.type_remise === 'percentage' ? m * (1 - r / 100) : m - r;
                        return (
                          <>
                            <p className="text-xs text-muted-foreground">Montant: {formatCurrency(m, formData.devise)}</p>
                            {r > 0 && <p className="text-xs text-emerald-600">Remise: -{r}{formData.type_remise === 'percentage' ? '%' : ` ${formData.devise}`}</p>}
                            <p className="text-sm font-bold text-primary">À payer: {formatCurrency(net, formData.devise)}</p>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2 pt-3 shrink-0">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Annuler</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Création...</> : <><Plus className="w-4 h-4 mr-2" />Créer le lien</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs by link type */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="shrink-0 w-full justify-start">
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="payment" className="gap-1"><CreditCard className="w-3.5 h-3.5" />Paiements</TabsTrigger>
          <TabsTrigger value="invoice" className="gap-1"><FileText className="w-3.5 h-3.5" />Factures</TabsTrigger>
          <TabsTrigger value="checkout" className="gap-1"><ShoppingCart className="w-3.5 h-3.5" />Checkouts</TabsTrigger>
          <TabsTrigger value="service" className="gap-1"><Wrench className="w-3.5 h-3.5" />Services</TabsTrigger>
        </TabsList>

        <Card className="flex-1 flex flex-col overflow-hidden mt-3">
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2 text-primary" />
                    <span className="text-muted-foreground">Chargement...</span>
                  </div>
                ) : filteredLinks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Link className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Aucun lien de paiement</p>
                    <p className="text-sm">Créez votre premier lien pour recevoir des paiements</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLinks.map((link) => {
                      const st = STATUS_CONFIG[link.status] || STATUS_CONFIG.pending;
                      const tp = TYPE_CONFIG[link.link_type] || TYPE_CONFIG.payment;
                      const url = getPaymentUrl(link);

                      return (
                        <div key={link.id} className="border rounded-xl p-4 hover:bg-accent/30 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Badges */}
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <Badge variant="outline" className={`${tp.color} text-xs gap-1`}>
                                  {tp.icon}{tp.label}
                                </Badge>
                                <Badge variant="outline" className={`${st.color} text-xs gap-1`}>
                                  {st.icon}{st.label}
                                </Badge>
                                {link.payment_type && link.payment_type !== 'full' && (
                                  <Badge variant="outline" className="text-xs">
                                    {link.payment_type === 'deposit' ? 'Acompte' : 'Solde'}
                                  </Badge>
                                )}
                              </div>

                              {/* Title */}
                              <h3 className="font-semibold text-sm truncate">{link.title || link.produit}</h3>
                              {link.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{link.description}</p>
                              )}

                              {/* URL */}
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1.5 break-all">
                                <ExternalLink className="w-3 h-3 shrink-0" />{url}
                              </a>

                              {/* Meta row */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                                <span className="flex items-center gap-1 font-semibold text-foreground">
                                  <DollarSign className="w-3 h-3" />
                                  {formatCurrency(link.total || link.montant, link.devise)}
                                </span>
                                {link.reference && (
                                  <span className="flex items-center gap-1">
                                    <Receipt className="w-3 h-3" />Réf: {link.reference}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(link.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                </span>
                                {link.client && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />{link.client.name}
                                  </span>
                                )}
                                {link.payment_method && (
                                  <span className="flex items-center gap-1 capitalize">
                                    <Smartphone className="w-3 h-3" />{link.payment_method.replace('_', ' ')}
                                  </span>
                                )}
                                {link.wallet_credit_status && (
                                  <Badge variant="outline" className="text-xs">
                                    Crédit: {link.wallet_credit_status === 'credited' ? '✅' : '⏳'} {link.wallet_credit_status}
                                  </Badge>
                                )}
                              </div>

                              {/* Settlement info for paid links */}
                              {(link.status === 'success' || link.status === 'paid') && link.net_amount && (
                                <div className="flex items-center gap-3 text-xs mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                                  <span>Brut: {formatCurrency(link.gross_amount || link.montant, link.devise)}</span>
                                  <span className="text-muted-foreground">Commission: {formatCurrency(link.platform_fee || 0, link.devise)}</span>
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Net: {formatCurrency(link.net_amount, link.devise)}</span>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(link)} title="Copier">
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shareLink(link)} title="Partager">
                                <Share2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowQrModal(url)} title="QR Code">
                                <QrCode className="w-4 h-4" />
                              </Button>
                              {link.status === 'pending' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => cancelLink(link)} title="Annuler">
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </Tabs>

      {/* QR Code Modal */}
      <Dialog open={!!showQrModal} onOpenChange={() => setShowQrModal(null)}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>QR Code du lien</DialogTitle>
            <DialogDescription>Scannez pour accéder au paiement</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {showQrModal && <QRCodeReact value={showQrModal} size={200} />}
          </div>
          <Button onClick={() => { navigator.clipboard.writeText(showQrModal || ''); toast({ title: "Lien copié !" }); }}>
            <Copy className="w-4 h-4 mr-2" />Copier le lien
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
