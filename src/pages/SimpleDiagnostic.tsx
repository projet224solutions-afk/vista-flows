import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RefreshCcw } from "lucide-react";

export default function SimpleDiagnostic() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Application 224Solutions - État
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="font-medium">React</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="font-medium">Router</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="font-medium">UI Components</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              ✅ L'application fonctionne correctement. Si vous voyez cette page, le système de base est opérationnel.
            </p>
            
            <div className="flex gap-2">
              <Button onClick={() => window.location.href = '/'}>
                Retour à l'accueil
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Recharger
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t text-xs text-muted-foreground">
            <p><strong>URL actuelle:</strong> {window.location.href}</p>
            <p><strong>Environnement:</strong> {import.meta.env.MODE}</p>
            <p><strong>Timestamp:</strong> {new Date().toLocaleString('fr-FR')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
