import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  CreditCard, Smartphone, Wallet, Shield, CheckCircle, 
  AlertCircle, Clock, DollarSign, User, Package, Calendar,
  Lock, ExternalLink, ArrowLeft, Loader2
} from 'lucide-react';

interface PaymentDetails {
  id: string;
  payment_id: string;
  produit: string;
  description?: string;
  montant: number;
  frais: number;
  total: number;
  devise: string;
  status: string;
  expires_at: string;
  created_at: string;
  vendeur: {
    name: string;
    avatar?: string;
  };
  client?: {
    name: string;
    email: string;
  };
}

export default function PaymentPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (paymentId) {
      loadPaymentDetails();
    }
  }, [paymentId]);

  const loadPaymentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payments/${paymentId}`);
      
      if (response.ok) {
        const data = await response.json();
        setPaymentDetails(data.payment);
      } else {
        throw new Error('Lien de paiement non trouvé');
      }
    } catch (error) {
      console.error('Erreur chargement paiement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails du paiement",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!paymentMethod) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un moyen de paiement",
        variant: "destructive"
      });
      return;
    }

    if (!clientInfo.name || !clientInfo.email) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir vos informations",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessing(true);
      
      // Simuler le traitement du paiement
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: paymentId,
          payment_method: paymentMethod,
          client_id: user?.id,
          transaction_id: `txn_${Date.now()}`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Paiement réussi !",
          description: "Votre paiement a été traité avec succès",
        });
        
        // Rediriger vers une page de confirmation
        navigate(`/payment/success/${paymentId}`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du paiement');
      }
    } catch (error) {
      console.error('Erreur paiement:', error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Impossible de traiter le paiement",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement des détails du paiement...</p>
        </div>
      </div>
    );
  }

  if (!paymentDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Lien de paiement non trouvé</h2>
            <p className="text-gray-600 mb-4">
              Ce lien de paiement n'existe pas ou a été supprimé.
            </p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentDetails.status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h2 className="text-xl font-semibold mb-2">Lien expiré</h2>
            <p className="text-gray-600 mb-4">
              Ce lien de paiement a expiré. Veuillez contacter le vendeur pour un nouveau lien.
            </p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentDetails.status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Paiement confirmé !</h2>
            <p className="text-gray-600 mb-4">
              Votre paiement de {formatCurrency(paymentDetails.total, paymentDetails.devise)} a été traité avec succès.
            </p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* En-tête */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              224SOLUTIONS
            </h1>
            <p className="text-gray-600">Paiement sécurisé</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Détails du paiement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Détails du paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">{paymentDetails.vendeur.name}</p>
                  <p className="text-sm text-gray-600">Vendeur</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">{paymentDetails.produit}</h3>
                {paymentDetails.description && (
                  <p className="text-gray-600 mt-1">{paymentDetails.description}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Montant :</span>
                  <span>{formatCurrency(paymentDetails.montant, paymentDetails.devise)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Frais de transaction (1%) :</span>
                  <span>{formatCurrency(paymentDetails.frais, paymentDetails.devise)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total à payer :</span>
                  <span className="text-blue-600">
                    {formatCurrency(paymentDetails.total, paymentDetails.devise)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Créé le {new Date(paymentDetails.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              
              <Badge className={getStatusColor(paymentDetails.status)}>
                {paymentDetails.status === 'pending' ? 'En attente de paiement' : paymentDetails.status}
              </Badge>
            </CardContent>
          </Card>

          {/* Formulaire de paiement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Informations de paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informations client */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                    placeholder="Votre nom complet"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                    placeholder="votre@email.com"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                    placeholder="+224 XXX XX XX XX"
                  />
                </div>
              </div>

              {/* Méthode de paiement */}
              <div>
                <Label htmlFor="payment-method">Moyen de paiement *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un moyen de paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Wallet 224SOLUTIONS
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Carte bancaire
                      </div>
                    </SelectItem>
                    <SelectItem value="mobile_money">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        Mobile Money
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sécurité */}
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
                <div className="text-sm">
                  <p className="font-semibold text-green-800">Paiement sécurisé</p>
                  <p className="text-green-600">Vos données sont protégées par SSL</p>
                </div>
              </div>

              {/* Bouton de paiement */}
              <Button
                onClick={processPayment}
                disabled={processing || !paymentMethod || !clientInfo.name || !clientInfo.email}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payer {formatCurrency(paymentDetails.total, paymentDetails.devise)}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
