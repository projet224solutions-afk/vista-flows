import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

const StripePaymentTest = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Test Stripe Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Page de test pour les paiements Stripe.
          </p>
          <Button className="w-full" disabled>
            Stripe non configuré
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StripePaymentTest;
