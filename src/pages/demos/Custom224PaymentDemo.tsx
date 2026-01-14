import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

const Custom224PaymentDemo = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            224 Payment Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Démo des paiements 224Solutions (Mobile Money, etc.)
          </p>
          <Button className="w-full" variant="outline">
            Voir la démo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Custom224PaymentDemo;
