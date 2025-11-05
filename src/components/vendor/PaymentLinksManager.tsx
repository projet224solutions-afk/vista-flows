import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { supabase } from '@/integrations/supabase/client';
import {
  Link, Plus, Copy, Share2, RefreshCw, 
  DollarSign, CheckCircle, Clock, XCircle, AlertCircle, ExternalLink,
  Calendar, User, Package, Edit, Trash2
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  images?: string[];
}

export default function PaymentLinksManager() {
  const { toast } = useToast();
  const {
    paymentLinks,
    stats,
    loading,
    loadPaymentLinks,
    createPaymentLink: createLink,
    updatePaymentLinkStatus,
    deletePaymentLink
  } = usePaymentLinks();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Formulaire de création
  const [formData, setFormData] = useState<{
    product_id: string;
    produit: string;
    description: string;
    montant: string;
    devise: string;
    client_id: string;
    remise: string;
    type_remise: 'percentage' | 'fixed';
  }>({
    product_id: '',
    produit: '',
    description: '',
    montant: '',
    devise: 'GNF',
    client_id: '',
    remise: '0',
    type_remise: 'percentage'
  });

  // Filtres
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  // Charger les produits du vendeur
  useEffect(() => {
    loadVendorProducts();
  }, []);

  // Recharger quand les filtres changent
  useEffect(() => {
    loadPaymentLinks(filters);
  }, [filters.status, filters.search]);

  const loadVendorProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Récupérer le vendeur
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!vendor) return;

      // Récupérer les produits actifs du vendeur
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, description, images')
        .eq('vendor_id', vendor.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive"
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setFormData({
        ...formData,
        product_id: product.id,
        produit: product.name,
        description: product.description || '',
        montant: product.price.toString(),
        remise: '0',
        type_remise: 'percentage'
      });
    }
  };

  const handleRefresh = () => {
    loadPaymentLinks(filters);
  };

  const handleCreatePaymentLink = async () => {
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

      const paymentId = await createLink({
        produit: formData.produit,
        description: formData.description,
        montant: parseFloat(formData.montant),
        devise: formData.devise,
        client_id: formData.client_id || undefined,
        remise: parseFloat(formData.remise),
        type_remise: formData.type_remise
      });

      if (paymentId) {
        const paymentUrl = `${window.location.origin}/payment/${paymentId}`;
        
        // Copier le lien automatiquement
        navigator.clipboard.writeText(paymentUrl);
        toast({
          title: "Lien copié",
          description: "Le lien de paiement a été copié dans le presse-papiers",
        });

        // Réinitialiser le formulaire
        setShowCreateModal(false);
        setSelectedProduct(null);
        setFormData({ product_id: '', produit: '', description: '', montant: '', devise: 'GNF', client_id: '', remise: '0', type_remise: 'percentage' });
      }
    } catch (error: any) {
      console.error('Erreur création lien:', error);
    } finally {
      setCreating(false);
    }
  };

  const copyPaymentLink = async (paymentId: string) => {
    try {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/payment/${paymentId}`;
      await navigator.clipboard.writeText(link);
      toast({
        title: "Lien copié",
        description: "Le lien de paiement a été copié dans le presse-papiers",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive"
      });
    }
  };

  const sharePaymentLink = async (paymentId: string) => {
    try {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/payment/${paymentId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'Lien de paiement 224SOLUTIONS',
          text: 'Effectuez votre paiement via ce lien sécurisé',
          url: link
        });
        toast({
          title: "Lien partagé",
          description: "Le lien a été partagé avec succès",
        });
      } else {
        // Fallback: copier le lien
        await copyPaymentLink(paymentId);
      }
    } catch (error) {
      console.error('Erreur partage:', error);
      // Si l'utilisateur annule le partage, on ne montre pas d'erreur
    }
  };

  const handleEditLink = (link: any) => {
    console.log('Editing link:', link);
    console.log('Client data:', link.client);
    
    setEditingLink(link);
    setFormData({
      product_id: '',
      produit: link.produit,
      description: link.description || '',
      montant: link.montant.toString(),
      devise: link.devise,
      client_id: link.client?.public_id || '',
      remise: (link.remise || 0).toString(),
      type_remise: link.type_remise || 'percentage'
    });
    setShowEditModal(true);
  };

  const handleUpdateLink = async () => {
    if (!editingLink || !formData.montant) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    try {
      setUpdating(true);

      const newMontant = parseFloat(formData.montant);
      const newRemise = parseFloat(formData.remise);
      let montantApresRemise = newMontant;
      
      // Calculer le montant après remise
      if (newRemise > 0) {
        if (formData.type_remise === 'percentage') {
          montantApresRemise = newMontant * (1 - newRemise / 100);
        } else {
          montantApresRemise = newMontant - newRemise;
        }
      }
      
      const newFrais = montantApresRemise * 0.01;
      const newTotal = montantApresRemise + newFrais;

      // Si un client_id est fourni, trouver l'UUID correspondant
      let clientUuid: string | null = null;
      if (formData.client_id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('public_id', formData.client_id)
          .single();

        if (profileError || !profile) {
          toast({
            title: "Erreur",
            description: "ID client introuvable",
            variant: "destructive"
          });
          setUpdating(false);
          return;
        }
        clientUuid = profile.id;
      }

      const { error } = await supabase
        .from('payment_links')
        .update({
          produit: formData.produit,
          description: formData.description || null,
          montant: newMontant,
          remise: newRemise,
          type_remise: formData.type_remise,
          frais: newFrais,
          total: newTotal,
          devise: formData.devise,
          client_id: clientUuid
        })
        .eq('payment_id', editingLink.payment_id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Lien de paiement mis à jour",
      });

      setShowEditModal(false);
      setEditingLink(null);
      setFormData({ product_id: '', produit: '', description: '', montant: '', devise: 'GNF', client_id: '', remise: '0', type_remise: 'percentage' });
      await loadPaymentLinks(filters);
    } catch (error: any) {
      console.error('Erreur mise à jour:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le lien",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteLink = async (paymentId: string, produit: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le lien pour "${produit}" ?`)) {
      return;
    }

    try {
      await deletePaymentLink(paymentId);
    } catch (error) {
      console.error('Erreur suppression:', error);
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
    <div className="h-full flex flex-col space-y-4 p-4 overflow-hidden">
      {/* En-tête avec statistiques - Version compacte */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Link className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Total Liens</p>
                <p className="text-xl font-bold">{stats?.total_links || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Réussis</p>
                <p className="text-xl font-bold text-green-600">{stats?.successful_payments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-yellow-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">En Attente</p>
                <p className="text-xl font-bold text-yellow-600">{stats?.pending_payments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Revenus</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(stats?.total_revenue || 0, 'GNF')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions et filtres - Version compacte */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between shrink-0">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <Input
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="sm:w-48"
          />
          <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="success">Réussi</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
              <SelectItem value="expired">Expiré</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-1" />
                Créer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Créer un lien de paiement</DialogTitle>
                <DialogDescription>
                  Sélectionnez un produit de votre stock pour créer un lien de paiement
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-1 overflow-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                <div className="space-y-4 px-1 pr-4 pb-2">
                  <div>
                    <Label htmlFor="product">Sélectionner un produit *</Label>
                    <Select value={formData.product_id} onValueChange={handleProductSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un produit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingProducts ? (
                          <SelectItem value="loading" disabled>Chargement...</SelectItem>
                        ) : products.length === 0 ? (
                          <SelectItem value="empty" disabled>Aucun produit disponible</SelectItem>
                        ) : (
                          products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                {product.name} - {new Intl.NumberFormat('fr-FR').format(product.price)} GNF
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {products.length === 0 && !loadingProducts && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Ajoutez d'abord des produits dans votre stock
                      </p>
                    )}
                  </div>

                  {selectedProduct && selectedProduct.images && selectedProduct.images.length > 0 && (
                    <div className="rounded-lg overflow-hidden border">
                      <img 
                        src={selectedProduct.images[0]} 
                        alt={selectedProduct.name}
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="produit">Nom du produit *</Label>
                    <Input
                      id="produit"
                      value={formData.produit}
                      onChange={(e) => setFormData({ ...formData, produit: e.target.value })}
                      placeholder="Nom du produit"
                      required
                      disabled={!!selectedProduct}
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
                      disabled={!!selectedProduct}
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
                        disabled={!!selectedProduct}
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
                      placeholder="Ex: USR0002"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Laissez vide pour un lien public accessible à tous
                    </p>
                  </div>
                  
                  {/* Section Remise */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Remise (Réduction)</Label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="remise">Montant remise</Label>
                        <Input
                          id="remise"
                          type="number"
                          min="0"
                          value={formData.remise}
                          onChange={(e) => setFormData({ ...formData, remise: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="type_remise">Type</Label>
                        <Select value={formData.type_remise} onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, type_remise: value })}>
                          <SelectTrigger id="type_remise">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                            <SelectItem value="fixed">Montant fixe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {formData.montant && (
                    <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                      <p className="text-sm text-blue-800">
                        <strong>Résumé :</strong>
                      </p>
                      {(() => {
                        const montant = parseFloat(formData.montant) || 0;
                        const remise = parseFloat(formData.remise) || 0;
                        let montantApresRemise = montant;
                        
                        if (remise > 0) {
                          if (formData.type_remise === 'percentage') {
                            montantApresRemise = montant * (1 - remise / 100);
                          } else {
                            montantApresRemise = montant - remise;
                          }
                        }
                        
                        return (
                          <>
                            <p className="text-xs text-blue-700">
                              Montant initial : {formatCurrency(montant, formData.devise)}
                            </p>
                            {remise > 0 && (
                              <>
                                <p className="text-xs text-green-700 font-semibold">
                                  Remise : -{remise}{formData.type_remise === 'percentage' ? '%' : ` ${formData.devise}`}
                                  {' '}({formatCurrency(montant - montantApresRemise, formData.devise)})
                                </p>
                                <p className="text-xs text-blue-700">
                                  Montant après remise : {formatCurrency(montantApresRemise, formData.devise)}
                                </p>
                              </>
                            )}
                            <p className="text-sm text-blue-900 font-bold mt-2">
                              Montant à demander : {formatCurrency(montantApresRemise, formData.devise)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              (Les frais de traitement seront ajoutés pour le client)
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="flex justify-end gap-2 pt-4 shrink-0">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreatePaymentLink} disabled={creating}>
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

      {/* Liste des liens de paiement avec scroll */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="text-lg">Mes liens de paiement</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Chargement...
                </div>
              ) : paymentLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Aucun lien de paiement</p>
                  <p className="text-sm">Créez votre premier lien pour recevoir des paiements</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentLinks.map((link) => (
                    <div key={link.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">{link.produit}</h3>
                            <Badge className={`${getStatusColor(link.status)} text-xs flex items-center gap-1`}>
                              {getStatusIcon(link.status)}
                              <span className="capitalize">{link.status}</span>
                            </Badge>
                          </div>
                          
                          {link.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{link.description}</p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <DollarSign className="w-3 h-3" />
                              {formatCurrency(link.total, link.devise)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(link.created_at).toLocaleDateString('fr-FR', { 
                                day: '2-digit', 
                                month: 'short' 
                              })}
                            </span>
                            {link.client && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {link.client.name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyPaymentLink(link.payment_id)}
                            className="h-8 w-8 p-0"
                            title="Copier le lien"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sharePaymentLink(link.payment_id)}
                            className="h-8 w-8 p-0"
                            title="Partager"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>

                          {link.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLink(link)}
                              className="h-8 w-8 p-0"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/payment/${link.payment_id}`, '_blank')}
                            className="h-8 w-8 p-0"
                            title="Ouvrir"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLink(link.payment_id, link.produit)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modal de modification */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Modifier le lien de paiement</DialogTitle>
            <DialogDescription>
              Modifiez les informations du lien de paiement
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 overflow-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div className="space-y-4 px-1 pr-4 pb-2">
              <div>
                <Label htmlFor="edit-produit">Produit / Service *</Label>
                <Input
                  id="edit-produit"
                  value={formData.produit}
                  onChange={(e) => setFormData({ ...formData, produit: e.target.value })}
                  placeholder="Nom du produit"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du produit"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-montant">Montant *</Label>
                  <Input
                    id="edit-montant"
                    type="number"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-devise">Devise</Label>
                  <Select value={formData.devise} onValueChange={(value) => setFormData({ ...formData, devise: value })}>
                    <SelectTrigger id="edit-devise">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GNF">GNF</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-client_id">ID Client (optionnel)</Label>
                <Input
                  id="edit-client_id"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  placeholder="Ex: USR0002"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Laissez vide pour un lien public accessible à tous
                </p>
              </div>
              
              {/* Section Remise dans le modal d'édition */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Remise (Réduction)</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-remise">Montant remise</Label>
                    <Input
                      id="edit-remise"
                      type="number"
                      min="0"
                      value={formData.remise}
                      onChange={(e) => setFormData({ ...formData, remise: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-type_remise">Type</Label>
                    <Select value={formData.type_remise} onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, type_remise: value })}>
                      <SelectTrigger id="edit-type_remise">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                        <SelectItem value="fixed">Montant fixe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {formData.montant && (
                <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                  <p className="text-sm text-blue-800">
                    <strong>Résumé :</strong>
                  </p>
                  {(() => {
                    const montant = parseFloat(formData.montant) || 0;
                    const remise = parseFloat(formData.remise) || 0;
                    let montantApresRemise = montant;
                    
                    if (remise > 0) {
                      if (formData.type_remise === 'percentage') {
                        montantApresRemise = montant * (1 - remise / 100);
                      } else {
                        montantApresRemise = montant - remise;
                      }
                    }
                    
                    return (
                      <>
                        <p className="text-xs text-blue-700">
                          Montant initial : {formatCurrency(montant, formData.devise)}
                        </p>
                        {remise > 0 && (
                          <>
                            <p className="text-xs text-green-700 font-semibold">
                              Remise : -{remise}{formData.type_remise === 'percentage' ? '%' : ` ${formData.devise}`}
                              {' '}({formatCurrency(montant - montantApresRemise, formData.devise)})
                            </p>
                            <p className="text-xs text-blue-700">
                              Montant après remise : {formatCurrency(montantApresRemise, formData.devise)}
                            </p>
                          </>
                        )}
                        <p className="text-sm text-blue-900 font-bold mt-2">
                          Montant à demander : {formatCurrency(montantApresRemise, formData.devise)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          (Les frais de traitement seront ajoutés pour le client)
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="flex justify-end gap-2 pt-4 shrink-0">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateLink} disabled={updating}>
              {updating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Mettre à jour
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
