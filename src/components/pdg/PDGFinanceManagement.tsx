import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Link, TrendingUp, Users, CreditCard, 
  Download, RefreshCw, Eye, Calendar, Filter, Search,
  CheckCircle, Clock, XCircle, AlertCircle, BarChart3,
  PieChart, Activity, ExternalLink
} from "lucide-react";

interface PaymentLink {
  id: string;
  payment_id: string;
  vendeur_id: string;
  client_id?: string;
  produit: string;
  description?: string;
  montant: number;
  frais: number;
  total: number;
  devise: string;
  status: 'pending' | 'success' | 'failed' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  paid_at?: string;
  vendeur: {
    name: string;
    business_name?: string;
  };
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

export default function PDGFinanceManagement() {
  const { toast } = useToast();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateRange: 'all'
  });

  useEffect(() => {
    loadPaymentData();
  }, [filters]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      // Récupérer tous les liens de paiement (admin/PDG)
      const response = await fetch('/api/payments/admin/all');
      
      if (response.ok) {
        const data = await response.json();
        setPaymentLinks(data.payment_links || []);
        setStats(data.stats || null);
      } else {
        // Fallback avec des données mockées pour la démo
        setPaymentLinks([]);
        setStats({
          total_links: 0,
          successful_payments: 0,
          pending_payments: 0,
          failed_payments: 0,
          expired_payments: 0,
          total_revenue: 0,
          total_fees: 0,
          avg_payment_amount: 0
        });
      }
    } catch (error) {
      console.error('Erreur chargement données financières:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données financières",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = (format: 'csv' | 'pdf') => {
    toast({
      title: "Export en cours",
      description: `Export des données au format ${format.toUpperCase()}...`,
    });
    // TODO: Implémenter l'export
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
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

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion Financière</h2>
          <p className="text-gray-600">Suivi des liens de paiement et revenus</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => exportData('csv')} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => exportData('pdf')} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={loadPaymentData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques globales */}
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
                <p className="text-sm font-medium text-gray-600">Revenus Totaux</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats?.total_revenue || 0, 'GNF')}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Frais Collectés</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats?.total_fees || 0, 'GNF')}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interface à onglets */}
      <Tabs defaultValue="links" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="links">Liens de Paiement</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        {/* Onglet Liens de Paiement */}
        <TabsContent value="links" className="space-y-4">
          {/* Filtres */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Rechercher</Label>
                  <Input
                    id="search"
                    placeholder="Produit, vendeur, client..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
                
                <div className="w-full sm:w-48">
                  <Label htmlFor="status">Statut</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les statuts</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="success">Réussi</SelectItem>
                      <SelectItem value="failed">Échoué</SelectItem>
                      <SelectItem value="expired">Expiré</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full sm:w-48">
                  <Label htmlFor="dateRange">Période</Label>
                  <Select value={filters.dateRange} onValueChange={(value) => setFilters({ ...filters, dateRange: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les périodes</SelectItem>
                      <SelectItem value="today">Aujourd'hui</SelectItem>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="year">Cette année</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tableau des liens */}
          <Card>
            <CardHeader>
              <CardTitle>Liens de Paiement</CardTitle>
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
                  <p>Aucun lien de paiement trouvé</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Vendeur</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Frais</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{link.produit}</p>
                            {link.description && (
                              <p className="text-sm text-gray-500">{link.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span>{link.vendeur.business_name || link.vendeur.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {link.client ? (
                            <div>
                              <p className="font-medium">{link.client.name}</p>
                              <p className="text-sm text-gray-500">{link.client.email}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(link.montant, link.devise)}</TableCell>
                        <TableCell>{formatCurrency(link.frais, link.devise)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(link.total, link.devise)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(link.status)}>
                            {getStatusIcon(link.status)}
                            <span className="ml-1 capitalize">{link.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{new Date(link.created_at).toLocaleDateString('fr-FR')}</p>
                            {link.paid_at && (
                              <p className="text-gray-500">
                                Payé: {new Date(link.paid_at).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/payment/${link.payment_id}`, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/payment/${link.payment_id}`)}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Analyses */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Évolution des revenus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Graphique d'évolution des revenus
                  <br />
                  (À implémenter)
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Répartition par statut
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Graphique de répartition
                  <br />
                  (À implémenter)
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onglet Paramètres */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres des liens de paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fees">Taux de frais (%)</Label>
                <Input
                  id="fees"
                  type="number"
                  defaultValue="1"
                  className="w-32"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Pourcentage de frais prélevés sur chaque transaction
                </p>
              </div>
              
              <div>
                <Label htmlFor="expiry">Durée d'expiration (jours)</Label>
                <Input
                  id="expiry"
                  type="number"
                  defaultValue="7"
                  className="w-32"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Nombre de jours avant expiration d'un lien
                </p>
              </div>
              
              <Button>
                <Activity className="w-4 h-4 mr-2" />
                Sauvegarder les paramètres
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}