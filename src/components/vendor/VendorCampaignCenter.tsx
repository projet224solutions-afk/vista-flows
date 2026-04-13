/**
 * 📢 VENDOR CAMPAIGN CENTER - Centre de campagnes vendeur
 * 224Solutions - Système de diffusion multicanal
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import { useToast } from '@/hooks/use-toast';
import {
  Megaphone, Plus, Send, Users, Mail, MessageSquare, Bell,
  Smartphone, BarChart3, Clock, CheckCircle, XCircle, AlertTriangle,
  Eye, TrendingUp, Filter, Calendar, Pause, RefreshCw, Target
} from 'lucide-react';
import {
  listCampaigns, createCampaign, sendCampaign, cancelCampaign,
  getCampaign, getCampaignAnalytics, previewAudience,
  type VendorCampaign, type CampaignChannel, type CampaignTargetType,
  type AudiencePreview, type CampaignAnalytics, type CreateCampaignPayload,
} from '@/services/campaignBackendService';

// ==================== CONSTANTS ====================

const TARGET_TYPES: { value: CampaignTargetType; label: string; description: string }[] = [
  { value: 'all_clients', label: 'Tous les clients', description: 'Tous vos clients actifs' },
  { value: 'digital_only', label: 'Clients digitaux', description: 'Commandes en ligne uniquement' },
  { value: 'physical_only', label: 'Clients physiques', description: 'Achats en boutique uniquement' },
  { value: 'hybrid', label: 'Clients hybrides', description: 'Achètent en ligne et en boutique' },
  { value: 'active', label: 'Clients actifs', description: 'Achat dans les 30 derniers jours' },
  { value: 'inactive', label: 'Clients inactifs', description: 'Pas d\'achat depuis 90+ jours' },
  { value: 'recent_buyers', label: 'Acheteurs récents', description: 'Achat cette semaine' },
  { value: 'dormant', label: 'Clients dormants', description: 'Pas d\'achat depuis 6+ mois' },
  { value: 'vip', label: 'Clients VIP', description: '500K+ GNF ou 10+ commandes' },
  { value: 'custom', label: 'Segment personnalisé', description: 'Filtres personnalisés' },
];

const CHANNELS: { id: CampaignChannel; label: string; icon: typeof Mail; description: string }[] = [
  { id: 'in_app', label: 'In-App', icon: Bell, description: 'Notification dans l\'app' },
  { id: 'push', label: 'Push', icon: Smartphone, description: 'Notification push mobile' },
  { id: 'email', label: 'Email', icon: Mail, description: 'Email marketing' },
  { id: 'sms', label: 'SMS', icon: MessageSquare, description: 'Message texte' },
];

const MESSAGE_TYPES = [
  { value: 'announcement', label: 'Annonce' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'alert', label: 'Alerte' },
  { value: 'update', label: 'Mise à jour' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'reminder', label: 'Rappel' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: Clock },
  scheduled: { label: 'Programmée', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Calendar },
  queued: { label: 'En file', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Clock },
  sending: { label: 'En cours', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: Send },
  sent: { label: 'Envoyée', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
  partial: { label: 'Partielle', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', icon: AlertTriangle },
  failed: { label: 'Échouée', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Pause },
};

// ==================== MAIN COMPONENT ====================

export default function VendorCampaignCenter() {
  const { vendorId, loading: vendorLoading } = useCurrentVendor();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<VendorCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<VendorCampaign | null>(null);
  const [selectedAnalytics, setSelectedAnalytics] = useState<CampaignAnalytics | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // ==================== DATA LOADING ====================

  const loadCampaigns = useCallback(async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      const data = await listCampaigns(statusFilter);
      setCampaigns(data);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de charger les campagnes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [vendorId, statusFilter, toast]);

  useEffect(() => {
    if (!vendorLoading && vendorId) loadCampaigns();
  }, [vendorLoading, vendorId, loadCampaigns]);

  // ==================== ACTIONS ====================

  const handleSendCampaign = async (campaignId: string) => {
    try {
      const result = await sendCampaign(campaignId);
      toast({
        title: 'Campagne lancée',
        description: `${result.total_eligible} destinataires éligibles, ${result.total_deliveries} envois en cours`,
      });
      loadCampaigns();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Échec de l\'envoi', variant: 'destructive' });
    }
  };

  const handleCancelCampaign = async (campaignId: string) => {
    try {
      await cancelCampaign(campaignId);
      toast({ title: 'Campagne annulée' });
      loadCampaigns();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Échec de l\'annulation', variant: 'destructive' });
    }
  };

  const handleViewDetail = async (campaign: VendorCampaign) => {
    try {
      const [detail, analytics] = await Promise.all([
        getCampaign(campaign.id),
        getCampaignAnalytics(campaign.id),
      ]);
      setSelectedCampaign(detail);
      setSelectedAnalytics(analytics);
      setShowDetailDialog(true);
    } catch {
      setSelectedCampaign(campaign);
      setSelectedAnalytics(null);
      setShowDetailDialog(true);
    }
  };

  // ==================== STATS ====================

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    sending: campaigns.filter(c => ['sending', 'queued'].includes(c.status)).length,
    totalReach: campaigns.reduce((sum, c) => sum + c.total_sent, 0),
  };

  // ==================== RENDER ====================

  if (vendorLoading) return <div className="flex justify-center p-8"><RefreshCw className="animate-spin h-6 w-6" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Centre de Campagnes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Envoyez des messages à vos clients via plusieurs canaux
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Campagne
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Megaphone className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Campagnes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">Envoyées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-xs text-muted-foreground">Brouillons</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReach.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Messages envoyés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Toutes les campagnes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="sending">En cours</SelectItem>
            <SelectItem value="sent">Envoyées</SelectItem>
            <SelectItem value="failed">Échouées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadCampaigns} className="gap-1">
          <RefreshCw className="h-3 w-3" /> Actualiser
        </Button>
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mes Campagnes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw className="animate-spin h-5 w-5 text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Aucune campagne</p>
              <p className="text-sm mt-1">Créez votre première campagne pour contacter vos clients</p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Créer une campagne
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(campaign => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  onView={() => handleViewDetail(campaign)}
                  onSend={() => handleSendCampaign(campaign.id)}
                  onCancel={() => handleCancelCampaign(campaign.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateCampaignDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={() => { setShowCreateDialog(false); loadCampaigns(); }}
      />

      {/* Detail Dialog */}
      <CampaignDetailDialog
        open={showDetailDialog}
        campaign={selectedCampaign}
        analytics={selectedAnalytics}
        onClose={() => setShowDetailDialog(false)}
      />
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function CampaignRow({ campaign, onView, onSend, onCancel }: {
  campaign: VendorCampaign;
  onView: () => void;
  onSend: () => void;
  onCancel: () => void;
}) {
  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium truncate">{campaign.title}</h3>
          <Badge className={`text-[10px] ${statusCfg.color}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusCfg.label}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {campaign.total_targeted} ciblés
          </span>
          <span className="flex items-center gap-1">
            <Send className="h-3 w-3" />
            {campaign.total_sent} envoyés
          </span>
          <span className="flex items-center gap-1">
            {campaign.selected_channels?.map(ch => {
              const chCfg = CHANNELS.find(c => c.id === ch);
              if (!chCfg) return null;
              const Icon = chCfg.icon;
              return <Icon key={ch} className="h-3 w-3" />;
            })}
          </span>
          <span>{new Date(campaign.created_at).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onView}>
          <Eye className="h-4 w-4" />
        </Button>
        {['draft', 'scheduled'].includes(campaign.status) && (
          <Button size="sm" onClick={onSend} className="gap-1">
            <Send className="h-3 w-3" /> Envoyer
          </Button>
        )}
        {['draft', 'scheduled', 'sending', 'queued'].includes(campaign.status) && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <XCircle className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================== CREATE CAMPAIGN DIALOG ====================

function CreateCampaignDialog({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [form, setForm] = useState<CreateCampaignPayload>({
    title: '',
    message_body: '',
    message_type: 'announcement',
    target_type: 'all_clients',
    target_filters: {},
    selected_channels: ['in_app'],
  });

  const resetForm = () => {
    setStep(1);
    setForm({
      title: '',
      message_body: '',
      message_type: 'announcement',
      target_type: 'all_clients',
      target_filters: {},
      selected_channels: ['in_app'],
    });
    setAudiencePreview(null);
  };

  const [previewFailed, setPreviewFailed] = useState(false);

  const loadPreview = async () => {
    setLoadingPreview(true);
    setPreviewFailed(false);
    try {
      const preview = await previewAudience(form.target_type, form.target_filters);
      setAudiencePreview(preview);
    } catch {
      setPreviewFailed(true);
      setAudiencePreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (step === 2) loadPreview();
  }, [step, form.target_type]);

  const handleToggleChannel = (channel: CampaignChannel) => {
    setForm(prev => {
      const current = prev.selected_channels;
      const updated = current.includes(channel)
        ? current.filter(c => c !== channel)
        : [...current, channel];
      return { ...prev, selected_channels: updated.length > 0 ? updated : current };
    });
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.message_body.trim() || form.selected_channels.length === 0) {
      toast({ title: 'Champs requis', description: 'Remplissez le titre, le message et choisissez au moins un canal', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      await createCampaign(form);
      toast({ title: 'Campagne créée', description: 'Vous pouvez l\'envoyer depuis la liste' });
      resetForm();
      onCreated();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Échec de la création', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Nouvelle Campagne
            <Badge variant="outline" className="ml-2">Étape {step}/3</Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          {step === 1 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Titre de la campagne *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Soldes de printemps -30%"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label>Sujet email (optionnel)</Label>
                <Input
                  value={form.subject || ''}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Affiché comme objet d'email"
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  value={form.message_body}
                  onChange={e => setForm(p => ({ ...p, message_body: e.target.value }))}
                  placeholder="Votre message à envoyer aux clients..."
                  rows={5}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground">{form.message_body.length}/5000</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de message</Label>
                  <Select value={form.message_type} onValueChange={v => setForm(p => ({ ...p, message_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESSAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>URL Image (optionnel)</Label>
                  <Input
                    value={form.image_url || ''}
                    onChange={e => setForm(p => ({ ...p, image_url: e.target.value || undefined }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lien (optionnel)</Label>
                  <Input
                    value={form.link_url || ''}
                    onChange={e => setForm(p => ({ ...p, link_url: e.target.value || undefined }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texte du lien</Label>
                  <Input
                    value={form.link_text || ''}
                    onChange={e => setForm(p => ({ ...p, link_text: e.target.value || undefined }))}
                    placeholder="En savoir plus"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!form.title.trim() || !form.message_body.trim()}>
                  Suivant: Audience
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" /> Ciblage de l'audience
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {TARGET_TYPES.map(tt => (
                    <div
                      key={tt.value}
                      onClick={() => setForm(p => ({ ...p, target_type: tt.value }))}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        form.target_type === tt.value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-muted-foreground/30'
                      }`}
                    >
                      <p className="font-medium text-sm">{tt.label}</p>
                      <p className="text-xs text-muted-foreground">{tt.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {form.target_type === 'custom' && (
                <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                  <Label>Filtres personnalisés</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Commandes minimum</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.target_filters?.min_orders || ''}
                        onChange={e => setForm(p => ({ ...p, target_filters: { ...p.target_filters, min_orders: e.target.value ? parseInt(e.target.value) : undefined } }))}
                        placeholder="Ex: 3"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Dépensé minimum (GNF)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.target_filters?.min_spent || ''}
                        onChange={e => setForm(p => ({ ...p, target_filters: { ...p.target_filters, min_spent: e.target.value ? parseInt(e.target.value) : undefined } }))}
                        placeholder="Ex: 100000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Audience Preview */}
              {audiencePreview && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">Audience estimée : {audiencePreview.total} clients</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {CHANNELS.map(ch => {
                        const count = audiencePreview.channels[ch.id] || 0;
                        const Icon = ch.icon;
                        return (
                          <div key={ch.id} className="p-2 rounded-md bg-background">
                            <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-sm font-bold">{count}</p>
                            <p className="text-[10px] text-muted-foreground">{ch.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
              {loadingPreview && <p className="text-sm text-muted-foreground text-center">Calcul de l'audience...</p>}
              {previewFailed && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Impossible de calculer l'audience (vérifiez que le backend et la base sont configurés). Vous pouvez continuer malgré tout.</span>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
                <Button onClick={() => setStep(3)} disabled={loadingPreview || (!previewFailed && !audiencePreview) || (audiencePreview !== null && audiencePreview.total === 0)}>
                  Suivant: Canaux
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Send className="h-4 w-4" /> Canaux de diffusion
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {CHANNELS.map(ch => {
                    const Icon = ch.icon;
                    const selected = form.selected_channels.includes(ch.id);
                    const available = audiencePreview?.channels[ch.id] || 0;
                    return (
                      <div
                        key={ch.id}
                        onClick={() => handleToggleChannel(ch.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selected} />
                          <Icon className="h-5 w-5" />
                          <div>
                            <p className="font-medium text-sm">{ch.label}</p>
                            <p className="text-xs text-muted-foreground">{available} éligibles</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Résumé avant envoi
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Titre:</span> {form.title}</p>
                    <p><span className="text-muted-foreground">Audience:</span> {audiencePreview?.total || 0} clients</p>
                    <p><span className="text-muted-foreground">Canaux:</span> {form.selected_channels.map(ch => CHANNELS.find(c => c.id === ch)?.label).join(', ')}</p>
                    <p><span className="text-muted-foreground">Type:</span> {MESSAGE_TYPES.find(t => t.value === form.message_type)?.label}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
                <Button onClick={handleSubmit} disabled={creating} className="gap-2">
                  {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Créer la campagne
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ==================== DETAIL DIALOG ====================

function CampaignDetailDialog({ open, campaign, analytics, onClose }: {
  open: boolean;
  campaign: VendorCampaign | null;
  analytics: CampaignAnalytics | null;
  onClose: () => void;
}) {
  if (!campaign) return null;

  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            {campaign.title}
            <Badge className={`${statusCfg.color} ml-2`}>{statusCfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">Aperçu</TabsTrigger>
              <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Message</Label>
                    <p className="text-sm">{campaign.message_body}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Ciblage</Label>
                      <p className="text-sm font-medium">
                        {TARGET_TYPES.find(t => t.value === campaign.target_type)?.label || campaign.target_type}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Canaux</Label>
                      <div className="flex gap-1 mt-1">
                        {campaign.selected_channels?.map(ch => {
                          const chCfg = CHANNELS.find(c => c.id === ch);
                          if (!chCfg) return null;
                          return <Badge key={ch} variant="outline" className="text-[10px]">{chCfg.label}</Badge>;
                        })}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Créée le</Label>
                      <p className="text-sm">{new Date(campaign.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 pt-2">
                    <StatBox label="Ciblés" value={campaign.total_targeted} />
                    <StatBox label="Éligibles" value={campaign.total_eligible} />
                    <StatBox label="Envoyés" value={campaign.total_sent} color="text-green-600" />
                    <StatBox label="Échoués" value={campaign.total_failed} color="text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4 mt-4">
              {analytics ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{analytics.rates.delivery_rate}%</p>
                        <p className="text-xs text-muted-foreground">Taux de délivrance</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{analytics.rates.read_rate}%</p>
                        <p className="text-xs text-muted-foreground">Taux de lecture</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold text-red-600">{analytics.rates.failure_rate}%</p>
                        <p className="text-xs text-muted-foreground">Taux d'échec</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* By Channel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Performance par canal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(analytics.by_channel).map(([channel, stats]) => {
                          const chCfg = CHANNELS.find(c => c.id === channel);
                          const deliveryRate = stats.total > 0 ? Math.round(((stats.delivered || 0) / stats.total) * 100) : 0;
                          return (
                            <div key={channel} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{chCfg?.label || channel}</span>
                                <span className="text-muted-foreground">
                                  {stats.sent || 0} envoyés / {stats.total} total ({deliveryRate}%)
                                </span>
                              </div>
                              <Progress value={deliveryRate} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Analytics disponibles après l'envoi</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/50">
      <p className={`text-xl font-bold ${color || ''}`}>{value.toLocaleString()}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
