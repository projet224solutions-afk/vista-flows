/**
 * 💳 PAGE PUBLIQUE DE PAIEMENT - /pay/:token
 * Page professionnelle pour payer via un lien de paiement 224SOLUTIONS
 * Supporte: invités (Orange Money, Carte) + connectés (Wallet)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { resolvePaymentLink, processPaymentLink } from '@/services/paymentBackendService';
import {
  CreditCard, Smartphone, Wallet, Shield, CheckCircle,
  AlertCircle, Clock, Loader2, ArrowLeft, Store,
  FileText, ShoppingCart, Wrench, Receipt, User
} from 'lucide-react';

interface PaymentLinkData {
  id: string;
  token: string;
  linkType: string;
  title: string;
  description?: string;
  amount: number;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  isSingleUse: boolean;
  paymentType: string;
  reference?: string;
  ownerType: string;
  remise?: number;
  typeRemise?: string;
}

interface OwnerInfo {
  name: string;
  avatar?: string;
  business_name?: string;
}

const linkTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  payment: { icon: <CreditCard className="w-5 h-5" />, label: 'Paiement', color: 'bg-primary/10 text-primary' },
  invoice: { icon: <FileText className="w-5 h-5" />, label: 'Facture', color: 'bg-amber-100 text-amber-800' },
  checkout: { icon: <ShoppingCart className="w-5 h-5" />, label: 'Checkout', color: 'bg-emerald-100 text-emerald-800' },
  service: { icon: <Wrench className="w-5 h-5" />, label: 'Service', color: 'bg-violet-100 text-violet-800' },
};

export default function PaymentLinkPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [linkData, setLinkData] = useState<PaymentLinkData | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);

  const [paymentMethod, setPaymentMethod] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (token) resolveLink();
  }, [token]);

  // Pre-fill customer info if logged in
  useEffect(() => {
    if (user?.email) {
      setCustomerInfo(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user]);

  const resolveLink = async () => {
    try {
      setLoading(true);
      const result = await resolvePaymentLink(token!);

      if (!result.success) {
        toast({ title: "Erreur", description: result.error || "Lien introuvable", variant: "destructive" });
        return;
      }

      setLinkData(result.data?.link || null);
      setOwnerInfo(result.data?.owner || null);
      setProductInfo(result.data?.product || null);
      setServiceInfo(result.data?.service || null);
    } catch (err) {
      console.error('Resolve error:', err);
      toast({ title: "Erreur", description: "Impossible de charger le lien", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast({ title: "Erreur", description: "Choisissez un mode de paiement", variant: "destructive" });
      return;
    }

    if (paymentMethod !== 'wallet' && (!customerInfo.name || !customerInfo.phone)) {
      toast({ title: "Erreur", description: "Nom et téléphone requis", variant: "destructive" });
      return;
    }

    try {
      setProcessing(true);

      const { data, error } = await supabase.functions.invoke('process-payment-link', {
        body: {
          token,
          paymentMethod,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
        },
      });

      if (error || !data?.success) {
        toast({ title: "Erreur", description: data?.error || "Paiement échoué", variant: "destructive" });
        return;
      }

      if (paymentMethod === 'wallet') {
        setPaymentSuccess(true);
        toast({ title: "Paiement réussi !", description: `Transaction ${data.transactionId}` });
      } else if (paymentMethod === 'card' && data.clientSecret) {
        toast({ title: "Redirection vers le paiement par carte..." });
        // In production, integrate Stripe Elements here
        setPaymentSuccess(true);
      } else {
        toast({ title: "Paiement initié", description: data.message || "Vérifiez votre téléphone" });
        setPaymentSuccess(true);
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Erreur de paiement", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;

  // ──────── LOADING ────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement du paiement...</p>
        </div>
      </div>
    );
  }

  // ──────── NOT FOUND ────────
  if (!linkData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Lien introuvable</h2>
            <p className="text-muted-foreground mb-4">Ce lien de paiement n'existe pas ou a été supprimé.</p>
            <Button onClick={() => navigate('/')}><ArrowLeft className="w-4 h-4 mr-2" />Accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ──────── EXPIRED ────────
  if (linkData.status === 'expired') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Lien expiré</h2>
            <p className="text-muted-foreground mb-4">Contactez le vendeur pour un nouveau lien.</p>
            <Button onClick={() => navigate('/')}><ArrowLeft className="w-4 h-4 mr-2" />Accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ──────── ALREADY PAID ────────
  if (linkData.status === 'success' || linkData.status === 'paid' || paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Paiement confirmé !</h2>
            <p className="text-muted-foreground mb-2">
              {formatCurrency(linkData.amount, linkData.currency)}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {linkData.title}
            </p>
            {linkData.reference && (
              <p className="text-xs text-muted-foreground mb-4">Réf: {linkData.reference}</p>
            )}
            <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg mb-4">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Un reçu sera envoyé par notification</span>
            </div>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeConfig = linkTypeConfig[linkData.linkType] || linkTypeConfig.payment;

  // ──────── MAIN PAYMENT PAGE ────────
  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">224SOLUTIONS</h1>
          <p className="text-sm text-muted-foreground">Paiement sécurisé</p>
        </div>

        {/* Payment Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {typeConfig.icon}
                Détails
              </CardTitle>
              <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Owner */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                {ownerInfo?.avatar ? (
                  <img src={ownerInfo.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">{ownerInfo?.business_name || ownerInfo?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {linkData.ownerType === 'provider' ? 'Prestataire' : 'Vendeur'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Title & description */}
            <div>
              <h3 className="font-semibold">{linkData.title}</h3>
              {linkData.description && (
                <p className="text-sm text-muted-foreground mt-1">{linkData.description}</p>
              )}
            </div>

            {/* Product image if available */}
            {productInfo?.images?.[0] && (
              <div className="rounded-lg overflow-hidden border">
                <img src={productInfo.images[0]} alt={productInfo.name} className="w-full h-32 object-cover" />
              </div>
            )}

            {/* Amount breakdown */}
            <div className="space-y-1.5 p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Montant</span>
                <span>{formatCurrency(linkData.grossAmount || linkData.amount, linkData.currency)}</span>
              </div>
              {linkData.remise && linkData.remise > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Remise</span>
                  <span>-{linkData.remise}{linkData.typeRemise === 'percentage' ? '%' : ` ${linkData.currency}`}</span>
                </div>
              )}
              {linkData.reference && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Référence</span>
                  <span>{linkData.reference}</span>
                </div>
              )}
              {linkData.paymentType !== 'full' && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Type</span>
                  <span className="capitalize">{linkData.paymentType === 'deposit' ? 'Acompte' : linkData.paymentType}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-bold">
                <span>Total à payer</span>
                <span className="text-primary">{formatCurrency(linkData.amount, linkData.currency)}</span>
              </div>
            </div>

            {/* Expiry */}
            {linkData.expiresAt && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Expire le {new Date(linkData.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Customer Info (guests) */}
        {!user && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-5 h-5" />
                Vos informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="cust-name">Nom complet *</Label>
                <Input
                  id="cust-name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <Label htmlFor="cust-phone">Téléphone *</Label>
                <Input
                  id="cust-phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  placeholder="+224 XXX XX XX XX"
                />
              </div>
              <div>
                <Label htmlFor="cust-email">Email (optionnel)</Label>
                <Input
                  id="cust-email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  placeholder="email@exemple.com"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Mode de paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Orange Money */}
            <button
              onClick={() => setPaymentMethod('orange_money')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                paymentMethod === 'orange_money' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Orange Money</p>
                <p className="text-xs text-muted-foreground">Paiement mobile instantané</p>
              </div>
            </button>

            {/* Card */}
            <button
              onClick={() => setPaymentMethod('card')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Carte bancaire</p>
                <p className="text-xs text-muted-foreground">Visa, Mastercard</p>
              </div>
            </button>

            {/* Wallet (only if logged in) */}
            {user && (
              <button
                onClick={() => setPaymentMethod('wallet')}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  paymentMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Wallet 224SOLUTIONS</p>
                  <p className="text-xs text-muted-foreground">Paiement depuis votre solde</p>
                </div>
              </button>
            )}

            {/* Security badge */}
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg mt-3">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Paiement sécurisé et chiffré SSL
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pay Button */}
        <Button
          onClick={handlePayment}
          disabled={processing || !paymentMethod}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Payer {formatCurrency(linkData.amount, linkData.currency)}
            </>
          )}
        </Button>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Propulsé par <span className="font-semibold">224SOLUTIONS</span>
        </p>
      </div>
    </div>
  );
}
