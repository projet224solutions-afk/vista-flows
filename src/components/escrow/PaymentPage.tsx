/**
 * 💳 PAGE DE PAIEMENT SÉCURISÉ - 224SECURE
 * Interface client pour payer via lien de paiement sécurisé
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  MapPin, 
  Clock, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import EscrowService, { EscrowInvoice, EscrowTransaction } from '../../services/escrow/EscrowService';

interface PaymentPageProps {}

const PaymentPage: React.FC<PaymentPageProps> = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState<EscrowInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transaction, setTransaction] = useState<EscrowTransaction | null>(null);

  const escrowService = EscrowService.getInstance();

  // Charger la facture
  useEffect(() => {
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/escrow/invoice/${invoiceId}`);
      
      if (!response.ok) {
        throw new Error('Facture non trouvée ou expirée');
      }

      const data = await response.json();
      setInvoice(data.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod || !invoice) {
      alert('Veuillez sélectionner une méthode de paiement');
      return;
    }

    setIsProcessing(true);
    try {
      // Simuler l'ID client (en production, récupérer depuis l'auth)
      const clientId = 'client_' + Date.now();
      
      const transaction = await escrowService.initiateEscrow(
        invoice.id,
        clientId,
        selectedPaymentMethod,
        {
          // Données de paiement selon la méthode
          method: selectedPaymentMethod,
          timestamp: Date.now()
        }
      );

      setTransaction(transaction);
      setPaymentSuccess(true);
      
      console.log('💳 Paiement initié:', transaction.id);
    } catch (err) {
      console.error('Erreur paiement:', err);
      alert('Erreur lors du traitement du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentSuccess && transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Paiement sécurisé !</h2>
            <p className="text-gray-600 mb-4">
              Votre paiement de <strong>{transaction.totalAmount} GNF</strong> est sécurisé par 224SECURE.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                🛡️ Le livreur sera payé après confirmation de la livraison.
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>ID Transaction: <span className="font-mono">{transaction.id}</span></p>
              <p>Statut: <Badge variant="outline">{transaction.status}</Badge></p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Facture non trouvée</h2>
            <p className="text-gray-600 mb-4">Cette facture n'existe pas ou a expiré.</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const feeAmount = Math.round(invoice.amount * 0.01);
  const totalAmount = invoice.amount + feeAmount;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="w-8 h-8 text-blue-600 mr-2" />
              <span className="text-2xl font-bold text-blue-600">224SECURE</span>
            </div>
            <CardTitle className="text-lg">Paiement sécurisé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Détails de la facture */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">Trajet</span>
              </div>
              <div className="ml-6 space-y-1">
                <p className="text-sm font-medium">De: {invoice.startLocation}</p>
                <p className="text-sm font-medium">Vers: {invoice.endLocation}</p>
              </div>
            </div>

            {invoice.description && (
              <div className="text-sm text-gray-600">
                <p>{invoice.description}</p>
              </div>
            )}

            {/* Résumé des frais */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Montant du trajet:</span>
                <span className="font-medium">{invoice.amount} GNF</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Frais 224SECURE (1%):</span>
                <span className="font-medium">{feeAmount} GNF</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total à payer:</span>
                <span className="text-green-600">{totalAmount} GNF</span>
              </div>
            </div>

            {/* Méthodes de paiement */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800">Méthode de paiement</h3>
              
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={selectedPaymentMethod === 'wallet'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <Wallet className="w-5 h-5 text-blue-600 mr-3" />
                  <span>224SOLUTIONS Wallet</span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mobile_money"
                    checked={selectedPaymentMethod === 'mobile_money'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <Smartphone className="w-5 h-5 text-green-600 mr-3" />
                  <span>Mobile Money</span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={selectedPaymentMethod === 'credit_card'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <CreditCard className="w-5 h-5 text-purple-600 mr-3" />
                  <span>Carte bancaire</span>
                </label>
              </div>
            </div>

            {/* Information de sécurité */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Paiement sécurisé par 224SECURE</p>
                  <p>Votre argent est protégé. Le livreur sera payé uniquement après confirmation de la livraison.</p>
                </div>
              </div>
            </div>

            {/* Bouton de paiement */}
            <Button
              onClick={handlePayment}
              disabled={!selectedPaymentMethod || isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Traitement...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Payer {totalAmount} GNF
                </>
              )}
            </Button>

            {/* Informations supplémentaires */}
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>• Paiement sécurisé par 224SECURE</p>
              <p>• Frais de 1% inclus dans le total</p>
              <p>• Remboursement possible en cas de problème</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentPage;
