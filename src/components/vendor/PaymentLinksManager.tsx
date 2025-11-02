import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Link, Plus, Copy, Share2, Eye, Trash2, RefreshCw, 
  DollarSign, Calendar, User, CreditCard, AlertCircle,
  CheckCircle, Clock, XCircle, ExternalLink
} from 'lucide-react';

interface PaymentLink {
  id: string;
  payment_id: string;
  produit: string;
  description?: string;
  montant: number;
  frais: number;
  total: number;
  devise: string;
  status: 'pending' | 'success' | 'failed' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  client?: {
    name: string;
    email: string;
  };
}

interface PaymentStats {
  total_links: number;
  successful_payments: number;
  pending_payments: number;
  failed_payments: number;
  expired_payments: number;
  total_revenue: number;
  total_fees: number;
  avg_payment_amount: number;
}

export default function PaymentLinksManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Formulaire de création
  const [formData, setFormData] = useState({
    produit: '',
    description: '',
    montant: '',
    devise: 'GNF',
    client_id: ''
  });

  // Filtres
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  // Charger les données
  useEffect(() => {
    loadPaymentLinks();
  }, [filters]);

  const loadPaymentLinks = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) return;

      // Récupérer l'ID du vendeur
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!vendor) {
        throw new Error('Vendeur non trouvé');
      }

      // Construire la requête avec filtres
      let query = (supabase as any)
        .from('payment_links')
        .select(`
          *,
          client:profiles!payment_links_client_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('vendeur_id', vendor.id)
        .order('created_at', { ascending: false });

      // Appliquer le filtre de statut
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Appliquer le filtre de recherche
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,payment_id.ilike.%${filters.search}%`);
      }

      const { data: links, error } = await query;

      if (error) throw error;

      // Formater les données
      const formattedLinks = (links || []).map((link: any) => ({
        ...link,
        client: link.client ? {
          name: `${link.client.first_name || ''} ${link.client.last_name || ''}`.trim(),
          email: link.client.email
        } : undefined
      })) as PaymentLink[];

      setPaymentLinks(formattedLinks);

      // Calculer les statistiques
      const totalRevenue = formattedLinks
        .filter(l => l.status === 'success')
        .reduce((sum, l) => sum + (l.total || 0), 0);

      setStats({
        total_links: formattedLinks.length,
        pending_payments: formattedLinks.filter(l => l.status === 'pending').length,
        successful_payments: formattedLinks.filter(l => l.status === 'success').length,
        expired_payments: formattedLinks.filter(l => l.status === 'expired').length,
        failed_payments: formattedLinks.filter(l => l.status === 'failed').length,
        total_revenue: totalRevenue,
        total_fees: formattedLinks
          .filter(l => l.status === 'success')
          .reduce((sum, l) => sum + (l.frais || 0), 0),
        avg_payment_amount: formattedLinks.length > 0 ? totalRevenue / formattedLinks.filter(l => l.status === 'success').length : 0
      });

    } catch (error) {
      console.error('Erreur chargement liens paiement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les liens de paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createPaymentLink = async () => {
    if (!formData.produit || !formData.montant) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    try {
      setCreating(true);
      
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      // Récupérer l'ID du vendeur
      const { data: vendor, error: vendorError } = await (supabase as any)
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (vendorError || !vendor) {
        throw new Error('Vendeur non trouvé');
      }

      const montant = parseFloat(formData.montant);
      const frais = montant * 0.01; // 1% de frais
      const total = montant + frais;

      // Générer un ID de paiement unique
      const paymentId = `PAY${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Créer le lien de paiement
      const { data: paymentLink, error: insertError } = await (supabase as any)
        .from('payment_links')
        .insert({
          payment_id: paymentId,
          vendeur_id: vendor.id,
          client_id: formData.client_id || null,
          produit: formData.produit,
          description: formData.description || null,
          montant: montant,
          frais: frais,
          total: total,
          devise: formData.devise,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Générer l'URL du lien
      const paymentUrl = `${window.location.origin}/payment/${paymentId}`;

      toast({
        title: "Succès",
        description: "Lien de paiement créé avec succès !",
      });
      
      // Afficher le lien généré
      setShowCreateModal(false);
      setFormData({ produit: '', description: '', montant: '', devise: 'GNF', client_id: '' });
      loadPaymentLinks();
      
      // Copier le lien automatiquement
      navigator.clipboard.writeText(paymentUrl);
      toast({
        title: "Lien copié",
        description: "Le lien de paiement a été copié dans le presse-papiers",
      });
    } catch (error: any) {
      console.error('Erreur création lien:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le lien de paiement",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const copyPaymentLink = (paymentId: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/payment/${paymentId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Lien copié",
      description: "Le lien de paiement a été copié dans le presse-papiers",
    });
  };

  const sharePaymentLink = (paymentId: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/payment/${paymentId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Lien de paiement 224SOLUTIONS',
        text: 'Effectuez votre paiement via ce lien sécurisé',
        url: link
      });
    } else {
      copyPaymentLink(paymentId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Liens</p>
                <p className="text-2xl font-bold">{stats?.total_links || 0}</p>
              </div>
              <Link className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paiements Réussis</p>
                <p className="text-2xl font-bold text-green-600">{stats?.successful_payments || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Attente</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pending_payments || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenus Totaux</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats?.total_revenue || 0, 'GNF')}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions et filtres */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Input
            placeholder="Rechercher un produit..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-64"
          />
          <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="success">Réussi</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
              <SelectItem value="expired">Expiré</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadPaymentLinks} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Créer un lien
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Créer un lien de paiement</DialogTitle>
                <DialogDescription>
                  Générez un lien sécurisé pour recevoir des paiements
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="produit">Nom du produit *</Label>
                  <Input
                    id="produit"
                    value={formData.produit}
                    onChange={(e) => setFormData({ ...formData, produit: e.target.value })}
                    placeholder="Ex: iPhone 15 Pro"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du produit ou service..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="montant">Montant *</Label>
                    <Input
                      id="montant"
                      type="number"
                      value={formData.montant}
                      onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="devise">Devise</Label>
                    <Select value={formData.devise} onValueChange={(value) => setFormData({ ...formData, devise: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GNF">GNF</SelectItem>
                        <SelectItem value="FCFA">FCFA</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="client_id">ID Client (optionnel)</Label>
                  <Input
                    id="client_id"
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    placeholder="ID du client destinataire"
                  />
                </div>
                
                {formData.montant && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Résumé :</strong><br />
                      Montant : {formatCurrency(parseFloat(formData.montant) || 0, formData.devise)}<br />
                      Frais (1%) : {formatCurrency((parseFloat(formData.montant) || 0) * 0.01, formData.devise)}<br />
                      <strong>Total : {formatCurrency((parseFloat(formData.montant) || 0) * 1.01, formData.devise)}</strong>
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </Button>
                <Button onClick={createPaymentLink} disabled={creating}>
                  {creating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4 mr-2" />
                      Créer le lien
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Liste des liens de paiement */}
      <Card>
        <CardHeader>
          <CardTitle>Mes liens de paiement</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Chargement...
            </div>
          ) : paymentLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Link className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Aucun lien de paiement créé</p>
              <p className="text-sm">Créez votre premier lien pour commencer à recevoir des paiements</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentLinks.map((link) => (
                <div key={link.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{link.produit}</h3>
                        <Badge className={getStatusColor(link.status)}>
                          {getStatusIcon(link.status)}
                          <span className="ml-1 capitalize">{link.status}</span>
                        </Badge>
                      </div>
                      
                      {link.description && (
                        <p className="text-sm text-gray-600 mb-2">{link.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(link.total, link.devise)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(link.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        {link.client && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {link.client.name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyPaymentLink(link.payment_id)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sharePaymentLink(link.payment_id)}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/payment/${link.payment_id}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
