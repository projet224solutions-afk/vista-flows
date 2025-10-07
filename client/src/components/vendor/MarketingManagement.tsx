import { useState, useEffect } from 'react';
import { getErrorMessage, logError } from '@/lib/errors';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usePromoCodes } from "@/hooks/useVendorData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Megaphone, Tag, Mail, MessageSquare, TrendingUp, 
  Users, Eye, MousePointer, Plus, Copy, Edit, Trash2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
}

const campaignTypeLabels = {
  email: 'Email',
  sms: 'SMS',
  notification: 'Notification',
  social: 'Réseaux sociaux'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800'
};

const statusLabels = {
  draft: 'Brouillon',
  active: 'Active',
  paused: 'En pause',
  completed: 'Terminée'
};

export default function MarketingManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { promoCodes, loading: promoLoading, error: promoError, createPromoCode } = usePromoCodes();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);

  const [promoForm, setPromoForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: 0,
    minimum_order_amount: 0,
    usage_limit: 100,
    valid_until: ''
  });

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    type: 'email' as Campaign['type'],
    target_audience: '',
    content: ''
  });

  useEffect(() => {
    if (!user) return;
    fetchCampaigns();
  }, [user]);

  const fetchCampaigns = async () => {
    try {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) return;

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les campagnes.",
        variant: "destructive"
      });
    } finally {
      setCampaignsLoading(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPromoCode({
        ...promoForm,
        valid_from: new Date().toISOString(),
        is_active: true
      });
      
      toast({
        title: "Code promo créé",
        description: "Le code promotionnel a été créé avec succès."
      });
      
      setIsPromoDialogOpen(false);
      setPromoForm({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        minimum_order_amount: 0,
        usage_limit: 100,
        valid_until: ''
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) throw new Error('Vendor not found');

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert([{
          ...campaignForm,
          vendor_id: vendor.id,
          content: { message: campaignForm.content },
          target_audience: { segment: campaignForm.target_audience }
        }])
        .select()
        .single();

      if (error) throw error;

      setCampaigns(prev => [data, ...prev]);
      toast({
        title: "Campagne créée",
        description: "La campagne marketing a été créée avec succès."
      });

      setIsCampaignDialogOpen(false);
      setCampaignForm({
        name: '',
        type: 'email',
        target_audience: '',
        content: ''
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la campagne.",
        variant: "destructive"
      });
    }
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code copié",
      description: "Le code promotionnel a été copié dans le presse-papiers."
    });
  };

  const generateRandomCode = () => {
    const code = 'PROMO' + Math.random().toString(36).substr(2, 6).toUpperCase();
    setPromoForm(prev => ({ ...prev, code }));
  };

  const totalSent = campaigns.reduce((acc, c) => acc + c.sent_count, 0);
  const totalOpened = campaigns.reduce((acc, c) => acc + c.opened_count, 0);
  const totalClicked = campaigns.reduce((acc, c) => acc + c.clicked_count, 0);
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0';

  if (promoLoading || campaignsLoading) {
    return <div className="p-4">Chargement des données marketing...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Marketing & Promotions</h2>
          <p className="text-muted-foreground">Gérez vos campagnes marketing et codes promotionnels</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="w-4 h-4 mr-2" />
                Code promo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un code promotionnel</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePromo} className="space-y-4">
                <div>
                  <Label htmlFor="code">Code promotionnel *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={promoForm.code}
                      onChange={(e) => setPromoForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="PROMO2024"
                      required
                    />
                    <Button type="button" variant="outline" onClick={generateRandomCode}>
                      Générer
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={promoForm.description}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Promotion de fin d'année"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount_type">Type de remise</Label>
                    <Select 
                      value={promoForm.discount_type} 
                      onValueChange={(value: 'percentage' | 'fixed_amount') => 
                        setPromoForm(prev => ({ ...prev, discount_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage</SelectItem>
                        <SelectItem value="fixed_amount">Montant fixe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="discount_value">
                      Valeur {promoForm.discount_type === 'percentage' ? '(%)' : '(GNF)'}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      value={promoForm.discount_value}
                      onChange={(e) => setPromoForm(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minimum_order">Commande minimum (FCFA)</Label>
                    <Input
                      id="minimum_order"
                      type="number"
                      value={promoForm.minimum_order_amount}
                      onChange={(e) => setPromoForm(prev => ({ ...prev, minimum_order_amount: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="usage_limit">Limite d'utilisation</Label>
                    <Input
                      id="usage_limit"
                      type="number"
                      value={promoForm.usage_limit}
                      onChange={(e) => setPromoForm(prev => ({ ...prev, usage_limit: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="valid_until">Valide jusqu'au</Label>
                  <Input
                    id="valid_until"
                    type="datetime-local"
                    value={promoForm.valid_until}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, valid_until: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Créer le code promo</Button>
                  <Button type="button" variant="outline" onClick={() => setIsPromoDialogOpen(false)}>
                    Annuler
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Campagne
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une campagne marketing</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom de la campagne *</Label>
                  <Input
                    id="name"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Campagne Black Friday 2024"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type de campagne</Label>
                  <Select 
                    value={campaignForm.type} 
                    onValueChange={(value: Campaign['type']) => 
                      setCampaignForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="social">Réseaux sociaux</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="target">Audience cible</Label>
                  <Input
                    id="target"
                    value={campaignForm.target_audience}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, target_audience: e.target.value }))}
                    placeholder="Clients VIP, Nouveaux clients, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="content">Contenu du message</Label>
                  <Textarea
                    id="content"
                    value={campaignForm.content}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Votre message promotionnel..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Créer la campagne</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCampaignDialogOpen(false)}>
                    Annuler
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistiques marketing */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Messages envoyés</p>
                <p className="text-2xl font-bold">{totalSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Taux d'ouverture</p>
                <p className="text-2xl font-bold">{openRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MousePointer className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Taux de clic</p>
                <p className="text-2xl font-bold">{clickRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Codes promo actifs</p>
                <p className="text-2xl font-bold">{promoCodes.filter(p => p.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Codes promotionnels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Codes promotionnels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {promoCodes.map((promo) => (
              <div key={promo.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-lg">{promo.code}</h4>
                    <Badge variant={promo.is_active ? "default" : "secondary"}>
                      {promo.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  {promo.description && (
                    <p className="text-sm text-muted-foreground mb-2">{promo.description}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Remise</p>
                      <p className="font-medium">
                        {promo.discount_type === 'percentage' 
                          ? `${promo.discount_value}%` 
                          : `${promo.discount_value.toLocaleString()} FCFA`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Utilisations</p>
                      <p className="font-medium">
                        {promo.used_count} / {promo.usage_limit || '∞'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Commande min.</p>
                      <p className="font-medium">{promo.minimum_order_amount.toLocaleString()} FCFA</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expire le</p>
                      <p className="font-medium">
                        {promo.valid_until 
                          ? new Date(promo.valid_until).toLocaleDateString('fr-FR')
                          : 'Jamais'
                        }
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="outline" onClick={() => copyPromoCode(promo.code)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {promoCodes.length === 0 && (
            <div className="text-center py-8">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun code promotionnel</h3>
              <p className="text-muted-foreground">
                Créez votre premier code promotionnel pour attirer plus de clients.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campagnes marketing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Campagnes marketing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{campaign.name}</h4>
                    <Badge className={statusColors[campaign.status]}>
                      {statusLabels[campaign.status]}
                    </Badge>
                    <Badge variant="outline">
                      {campaignTypeLabels[campaign.type]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                    <div>
                      <p className="text-muted-foreground">Envoyés</p>
                      <p className="font-medium">{campaign.sent_count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ouverts</p>
                      <p className="font-medium">{campaign.opened_count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Clics</p>
                      <p className="font-medium">{campaign.clicked_count}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="outline">
                    Voir détails
                  </Button>
                  {campaign.status === 'draft' && (
                    <Button size="sm">
                      Lancer
                    </Button>
                  )}
                  {campaign.status === 'active' && (
                    <Button size="sm" variant="outline">
                      Pause
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {campaigns.length === 0 && (
            <div className="text-center py-8">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune campagne</h3>
              <p className="text-muted-foreground">
                Créez votre première campagne marketing pour promouvoir vos produits.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}