// @ts-nocheck
/**
 * COMPOSANT DE PAIEMENT TAXI-MOTO ULTRA PROFESSIONNEL
 * Interface de paiement multi-options avec sÃ©curitÃ© avancÃ©e
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    CreditCard,
    Smartphone,
    Wallet,
    Banknote,
    Shield,
    CheckCircle,
    AlertTriangle,
    Lock,
    Receipt,
    Download
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface PaymentMethod {
    id: string;
    type: 'mobile_money' | 'card' | 'wallet_224' | 'cash';
    name: string;
    icon: unknown;
    description: string;
    processingFee: number;
    isAvailable: boolean;
    estimatedTime: string;
}

interface PaymentDetails {
    rideId: string;
    amount: number;
    currency: string;
    breakdown: {
        baseAmount: number;
        taxes: number;
        processingFee: number;
        total: number;
    };
}

interface TaxiMotoPaymentProps {
    paymentDetails: PaymentDetails;
    onPaymentComplete: (paymentData: unknown) => void;
    onPaymentCancel: () => void;
}

export default function TaxiMotoPayment({
    paymentDetails,
    onPaymentComplete,
    onPaymentCancel
}: TaxiMotoPaymentProps) {
    const { user, profile } = useAuth();

    const [selectedMethod, setSelectedMethod] = useState<string>('');
    const [paymentInProgress, setPaymentInProgress] = useState(false);
    const [paymentStep, setPaymentStep] = useState<'select' | 'details' | 'processing' | 'success' | 'error'>('select');
    const [paymentError, setPaymentError] = useState<string>('');

    // DonnÃ©es spÃ©cifiques aux mÃ©thodes de paiement
    const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardName, setCardName] = useState('');

    // Solde wallet 224Solutions (simulÃ©)
    const [walletBalance, setWalletBalance] = useState(0);

    const paymentMethods: PaymentMethod[] = [
        {
            id: 'mobile_money',
            type: 'mobile_money',
            name: 'Mobile Money',
            icon: Smartphone,
            description: 'Orange Money, Free Money, Wave',
            processingFee: 0,
            isAvailable: true,
            estimatedTime: 'InstantanÃ©'
        },
        {
            id: 'card',
            type: 'card',
            name: 'Carte Bancaire',
            icon: CreditCard,
            description: 'Visa, Mastercard',
            processingFee: Math.round(paymentDetails.amount * 0.025), // 2.5%
            isAvailable: true,
            estimatedTime: '1-2 minutes'
        },
        {
            id: 'wallet_224',
            type: 'wallet_224',
            name: 'Portefeuille 224Solutions',
            icon: Wallet,
            description: `Solde: ${(walletBalance || 0).toLocaleString()} GNF`,
            processingFee: 0,
            isAvailable: walletBalance >= (paymentDetails?.amount || 0),
            estimatedTime: 'InstantanÃ©'
        },
        {
            id: 'cash',
            type: 'cash',
            name: 'EspÃ¨ces',
            icon: Banknote,
            description: 'Paiement au conducteur',
            processingFee: 0,
            isAvailable: true,
            estimatedTime: 'Ã€ la livraison'
        }
    ];

    /**
     * Calcule le total avec les frais
     */
    const calculateTotal = (methodId: string) => {
        const method = paymentMethods.find(m => m.id === methodId);
        const processingFee = method?.processingFee || 0;
        const amount = paymentDetails?.amount || 0;
        return amount + processingFee;
    };

    /**
     * Traite le paiement
     */
    const processPayment = async () => {
        if (!selectedMethod) {
            toast.error('Veuillez sÃ©lectionner une mÃ©thode de paiement');
            return;
        }

        const method = paymentMethods.find(m => m.id === selectedMethod);
        if (!method) return;

        // Validation des donnÃ©es selon la mÃ©thode
        if (method.type === 'mobile_money' && !mobileMoneyNumber) {
            toast.error('Veuillez saisir votre numÃ©ro de tÃ©lÃ©phone');
            return;
        }

        if (method.type === 'card') {
            if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
                toast.error('Veuillez remplir tous les champs de la carte');
                return;
            }
        }

        setPaymentInProgress(true);
        setPaymentStep('processing');
        setPaymentError('');

        try {
            // Simuler le traitement du paiement
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Simuler une chance d'Ã©chec pour dÃ©monstration
            if (Math.random() < 0.1) { // 10% de chance d'Ã©chec
                throw new Error('Paiement refusÃ© par votre banque');
            }

            // SuccÃ¨s du paiement
            const paymentData = {
                paymentId: `PAY-${Date.now()}`,
                method: method.type,
                amount: calculateTotal(selectedMethod),
                currency: paymentDetails.currency,
                status: 'completed',
                timestamp: new Date().toISOString(),
                reference: generatePaymentReference()
            };

            setPaymentStep('success');

            // Mettre Ã  jour le solde wallet si utilisÃ©
            if (method.type === 'wallet_224') {
                setWalletBalance(prev => prev - calculateTotal(selectedMethod));
            }

            setTimeout(() => {
                onPaymentComplete(paymentData);
            }, 2000);

        } catch (error: unknown) {
            setPaymentError(error.message);
            setPaymentStep('error');
        } finally {
            setPaymentInProgress(false);
        }
    };

    /**
     * GÃ©nÃ¨re une rÃ©fÃ©rence de paiement
     */
    const generatePaymentReference = () => {
        return `224SOL-${Date.now().toString().slice(-8)}`;
    };

    /**
     * TÃ©lÃ©charge le reÃ§u
     */
    const downloadReceipt = () => {
        toast.success('ReÃ§u tÃ©lÃ©chargÃ© avec succÃ¨s');
        // En production: gÃ©nÃ©rer et tÃ©lÃ©charger le PDF du reÃ§u
    };

    /**
     * Formate le numÃ©ro de carte
     */
    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

    // Ã‰tape de sÃ©lection de mÃ©thode
    if (paymentStep === 'select') {
        return (
            <div className="space-y-4">
                {/* RÃ©sumÃ© du paiement */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-primary-orange-600" />
                            RÃ©sumÃ© du paiement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span>Course #{paymentDetails?.rideId || 'N/A'}</span>
                            <span>{(paymentDetails?.breakdown?.baseAmount || 0).toLocaleString()} GNF</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>TVA (18%)</span>
                            <span>{(paymentDetails?.breakdown?.taxes || 0).toLocaleString()} GNF</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span className="text-primary-orange-600">
                                {(paymentDetails?.amount || 0).toLocaleString()} {paymentDetails?.currency || 'GNF'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* MÃ©thodes de paiement */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle>Choisissez votre mÃ©thode de paiement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {paymentMethods.map((method) => {
                            const Icon = method.icon;
                            const total = calculateTotal(method.id);
                            const isSelected = selectedMethod === method.id;

                            return (
                                <button
                                    key={method.id}
                                    onClick={() => method.isAvailable && setSelectedMethod(method.id)}
                                    disabled={!method.isAvailable}
                                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${!method.isAvailable
                                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                            : isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${method.isAvailable ? 'bg-blue-100' : 'bg-gray-100'
                                                }`}>
                                                <Icon className={`w-5 h-5 ${method.isAvailable ? 'text-blue-600' : 'text-gray-400'
                                                    }`} />
                                            </div>
                                            <div>
                                                <div className="font-semibold">{method.name}</div>
                                                <div className="text-sm text-gray-600">{method.description}</div>
                                                <div className="text-xs text-gray-500">{method.estimatedTime}</div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="font-bold">
                                                {(total || 0).toLocaleString()} GNF
                                            </div>
                                            {method.processingFee > 0 && (
                                                <div className="text-xs text-orange-600">
                                                    +{(method.processingFee || 0).toLocaleString()} frais
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Boutons d'action */}
                <div className="flex gap-3">
                    <Button
                        onClick={onPaymentCancel}
                        variant="outline"
                        className="flex-1"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={() => setPaymentStep('details')}
                        disabled={!selectedMethod}
                        className="flex-1"
                    >
                        Continuer
                    </Button>
                </div>
            </div>
        );
    }

    // Ã‰tape de saisie des dÃ©tails
    if (paymentStep === 'details') {
        const method = paymentMethods.find(m => m.id === selectedMethod);
        if (!method) return null;

        return (
            <div className="space-y-4">
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <method.icon className="w-5 h-5 text-blue-600" />
                            {method.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Mobile Money */}
                        {method.type === 'mobile_money' && (
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    NumÃ©ro de tÃ©lÃ©phone
                                </label>
                                <Input
                                    type="tel"
                                    placeholder="77 123 45 67"
                                    value={mobileMoneyNumber}
                                    onChange={(e) => setMobileMoneyNumber(e.target.value)}
                                    className="text-lg"
                                />
                                <p className="text-xs text-gray-600 mt-1">
                                    Vous recevrez un code de confirmation par SMS
                                </p>
                            </div>
                        )}

                        {/* Carte bancaire */}
                        {method.type === 'card' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        NumÃ©ro de carte
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="1234 5678 9012 3456"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        maxLength={19}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                                            Date d'expiration
                                        </label>
                                        <Input
                                            type="text"
                                            placeholder="MM/AA"
                                            value={cardExpiry}
                                            onChange={(e) => setCardExpiry(e.target.value)}
                                            maxLength={5}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                                            CVV
                                        </label>
                                        <Input
                                            type="password"
                                            placeholder="123"
                                            value={cardCvv}
                                            onChange={(e) => setCardCvv(e.target.value)}
                                            maxLength={4}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Nom sur la carte
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="JOHN DOE"
                                        value={cardName}
                                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Wallet 224Solutions */}
                        {method.type === 'wallet_224' && (
                            <div className="text-center py-4">
                                <Wallet className="w-16 h-16 mx-auto mb-4 text-primary-orange-600" />
                                <p className="text-lg font-semibold">
                                    Solde disponible: {(walletBalance || 0).toLocaleString()} GNF
                                </p>
                                <p className="text-sm text-gray-600">
                                    Montant Ã  dÃ©biter: {(calculateTotal(selectedMethod) || 0).toLocaleString()} GNF
                                </p>
                            </div>
                        )}

                        {/* EspÃ¨ces */}
                        {method.type === 'cash' && (
                            <div className="text-center py-4">
                                <Banknote className="w-16 h-16 mx-auto mb-4 text-primary-orange-600" />
                                <p className="text-lg font-semibold">Paiement en espÃ¨ces</p>
                                <p className="text-sm text-gray-600">
                                    Vous paierez {(calculateTotal(selectedMethod) || 0).toLocaleString()} GNF au conducteur
                                </p>
                                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                                    <p className="text-xs text-yellow-800">
                                        ðŸ’¡ PrÃ©parez l'appoint pour faciliter la transaction
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* SÃ©curitÃ© */}
                        <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 rounded-lg">
                            <Shield className="w-4 h-4 text-primary-orange-600" />
                            <p className="text-xs text-primary-orange-800">
                                Paiement sÃ©curisÃ© par 224Solutions. Vos donnÃ©es sont protÃ©gÃ©es.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* RÃ©sumÃ© final */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">Total Ã  payer</span>
                            <span className="text-xl font-bold text-primary-orange-600">
                                {(calculateTotal(selectedMethod) || 0).toLocaleString()} GNF
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Boutons d'action */}
                <div className="flex gap-3">
                    <Button
                        onClick={() => setPaymentStep('select')}
                        variant="outline"
                        className="flex-1"
                    >
                        Retour
                    </Button>
                    <Button
                        onClick={processPayment}
                        disabled={paymentInProgress}
                        className="flex-1"
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        Payer maintenant
                    </Button>
                </div>
            </div>
        );
    }

    // Ã‰tape de traitement
    if (paymentStep === 'processing') {
        return (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold mb-2">Traitement du paiement</h3>
                    <p className="text-gray-600 mb-4">
                        Veuillez patienter, nous traitons votre paiement...
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Shield className="w-4 h-4" />
                        <span>Transaction sÃ©curisÃ©e</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Ã‰tape de succÃ¨s
    if (paymentStep === 'success') {
        return (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-primary-orange-600" />
                    <h3 className="text-xl font-semibold text-primary-orange-800 mb-2">
                        Paiement rÃ©ussi !
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Votre paiement de {(calculateTotal(selectedMethod) || 0).toLocaleString()} GNF a Ã©tÃ© traitÃ© avec succÃ¨s.
                    </p>
                    <div className="bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-primary-orange-800">
                            RÃ©fÃ©rence: {generatePaymentReference()}
                        </p>
                    </div>
                    <Button onClick={downloadReceipt} variant="outline" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        TÃ©lÃ©charger le reÃ§u
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Ã‰tape d'erreur
    if (paymentStep === 'error') {
        return (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-600" />
                    <h3 className="text-xl font-semibold text-red-800 mb-2">
                        Erreur de paiement
                    </h3>
                    <p className="text-gray-600 mb-4">{paymentError}</p>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => setPaymentStep('details')}
                            variant="outline"
                            className="flex-1"
                        >
                            RÃ©essayer
                        </Button>
                        <Button
                            onClick={() => setPaymentStep('select')}
                            className="flex-1"
                        >
                            Changer de mÃ©thode
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return null;
}
