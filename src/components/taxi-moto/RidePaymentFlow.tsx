/**
 * COMPOSANT FLOW DE PAIEMENT POUR COURSE TERMINÉE
 * Intégration exclusive Jomy.africa
 * 224Solutions - Taxi-Moto System
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { JomyPaymentSelector } from "@/components/payment/JomyPaymentSelector";

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
    const [showRating, setShowRating] = useState(false);
    const [rating, setRating] = useState(0);

    const handlePaymentSuccess = (transactionId: string) => {
        console.log('[RidePaymentFlow] Payment success:', transactionId);
        toast.success('🎉 Paiement effectué avec succès !');
        setShowRating(true);
    };

    const handlePaymentFailed = (error: string) => {
        console.error('[RidePaymentFlow] Payment failed:', error);
        toast.error(`Erreur de paiement: ${error}`);
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
        <JomyPaymentSelector
            amount={amount}
            orderId={rideId}
            description={`Course taxi-moto #${rideId}`}
            transactionType="taxi"
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentFailed={handlePaymentFailed}
            onCancel={onCancel}
            enableEscrow={true}
        />
    );
}
