import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

/**
 * Composant de test pour accès direct à l'interface PDG sur Lovable
 * Permet de tester rapidement sans authentification complète
 */
export const PDGTestButton = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleDirectAccess = () => {
    setIsLoading(true);
    
    // Simuler l'authentification PDG pour test Lovable
    sessionStorage.setItem("pdg_auth", JSON.stringify({
      userCode: "TEST001",
      name: "Test Lovable",
      level: "PDG_TEST",
      timestamp: Date.now()
    }));

    toast({
      title: "🧪 Mode Test Activé",
      description: "Accès direct à l'interface PDG",
      duration: 2000,
    });

    setTimeout(() => {
      setIsLoading(false);
      navigate("/pdg");
    }, 1000);
  };

  return (
    <Card className="border-2 border-dashed border-orange-300 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <TestTube className="w-5 h-5" />
          Test Lovable - Interface PDG
          <Badge variant="outline" className="bg-orange-100 text-orange-700">
            MODE TEST
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-orange-600">
          🚀 Accès direct à l'interface PDG pour démonstration Lovable
        </p>
        
        <div className="bg-white p-3 rounded border border-orange-200">
          <p className="text-xs text-gray-600 mb-2">
            <strong>Fonctionnalités testables :</strong>
          </p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 📊 Dashboard avec métriques temps réel</li>
            <li>• 👥 Gestion utilisateurs (suspension/validation)</li>
            <li>• 📦 Contrôle produits non-conformes</li>
            <li>• 💰 Gestion financière complète</li>
            <li>• ⚙️ Système mise à jour/rollback</li>
            <li>• 📈 Exports PDF/Excel</li>
          </ul>
        </div>

        <Button 
          onClick={handleDirectAccess}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Chargement...
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 mr-2" />
              Accès Test PDG
            </>
          )}
        </Button>

        <p className="text-xs text-center text-orange-500">
          ⚠️ Mode test - Données de démonstration
        </p>
      </CardContent>
    </Card>
  );
};
