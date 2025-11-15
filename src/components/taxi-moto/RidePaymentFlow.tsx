/**
 * COMPOSANT FLOW DE PAIEMENT POUR COURSE TERMINÉE
 * Gère le paiement après une course complétée
 * 224Solutions - Taxi-Moto System
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    CreditCard,
    Wallet,
    Smartphone,
    DollarSign,
    CheckCircle,
    Loader2,
    Star
} from "lucide-react";
import { toast } from "sonner";
import { PaymentsService, PaymentMethod } from "@/services/taxi/paymentsService";

interface RidePaymentFlowProps {
    rideId: string;
    amount: number;
    onPaymentSuccess: () => void;
    onCancel: () => void;
}

export default function RidePaymentFlow({
    rideId,
    amount,
    onPaymentSuccess,
    onCancel
}: RidePaymentFlowProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [processing, setProcessing] = useState(false);
    const [showRating, setShowRating] = useState(false);
    const [rating, setRating] = useState(0);

    const paymentMethods = [
        {
            id: 'wallet' as PaymentMethod,
            name: 'Wallet 224Solutions',
            icon: Wallet,
            description: 'Payez avec votre portefeuille',
            color: 'bg-green-500',
            available: true
        },
        {
            id: 'card' as PaymentMethod,
            name: 'Carte bancaire',
            icon: CreditCard,
            description: 'Visa, Mastercard',
            color: 'bg-blue-500',
            available: true
        },
        {
            id: 'orange_money' as PaymentMethod,
            name: 'Orange Money',
            icon: Smartphone,
            description: 'Mobile Money',
            color: 'bg-orange-500',
            available: true
        },
        {
            id: 'cash' as PaymentMethod,
            name: 'Espèces',
            icon: DollarSign,
            description: 'Paiement en espèces',
            color: 'bg-gray-500',
            available: true
        }
    ];

    const handlePayment = async () => {
        if (!selectedMethod) {
            toast.error('Veuillez sélectionner un mode de paiement');
            return;
        }

        setProcessing(true);

        try {
            const result = await PaymentsService.initiatePayment({
                rideId,
                amount,
                paymentMethod: selectedMethod
            });

            if (result.success) {
                toast.success('🎉 Paiement effectué avec succès !');
                setShowRating(true);
            } else {
                throw new Error(result.error || 'Erreur de paiement');
            }
        } catch (error) {
            console.error('Payment error:', error);
            toast.error('Erreur lors du paiement. Veuillez réessayer.');
        } finally {
            setProcessing(false);
        }
    };

    const handleSubmitRating = () => {
        if (rating > 0) {
            toast.success(`Merci pour votre note de ${rating} étoiles !`);
        }
        onPaymentSuccess();
    };

    if (showRating) {
        return (
            <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        Paiement réussi !
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center">
                        <p className="text-lg font-semibold mb-2">Comment était votre course ?</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Notez votre expérience
                        </p>

                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className="transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-10 h-10 ${
                                            star <= rating
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>

                        <Button
                            onClick={handleSubmitRating}
                            className="w-full"
                        >
                            Terminer
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Payer la course</span>
                    <Badge variant="default" className="bg-green-500 text-lg px-3 py-1">
                        {amount.toLocaleString()} GNF
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Choisissez votre mode de paiement
                </p>

                <div className="space-y-3">
                    {paymentMethods.map((method) => {
                        const Icon = method.icon;
                        const isSelected = selectedMethod === method.id;

                        return (
                            <button
                                key={method.id}
                                onClick={() => setSelectedMethod(method.id)}
                                disabled={!method.available || processing}
                                className={`w-full p-4 rounded-lg border-2 transition-all ${
                                    isSelected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50'
                                } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`${method.color} p-2 rounded-lg`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-semibold">{method.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {method.description}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <CheckCircle className="w-5 h-5 text-primary" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <Separator />

                <div className="flex gap-2">
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        className="flex-1"
                        disabled={processing}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handlePayment}
                        className="flex-1"
                        disabled={!selectedMethod || processing}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Traitement...
                            </>
                        ) : (
                            <>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Payer maintenant
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
