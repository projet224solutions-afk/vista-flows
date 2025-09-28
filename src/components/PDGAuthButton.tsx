import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Codes d'accès PDG sécurisés (en production, ces données seraient dans une base de données chiffrée)
const PDG_CREDENTIALS = {
    "PDG001": {
        code: "224SOLUTIONS2024!",
        name: "Directeur Général",
        level: "PDG_SUPREME"
    },
    "ADMIN001": {
        code: "ADMIN@224SOL",
        name: "Administrateur Principal",
        level: "ADMIN_PRINCIPAL"
    },
    "DEV001": {
        code: "DEV@224TECH",
        name: "Développeur Principal",
        level: "DEV_ACCESS"
    }
};

export const PDGAuthButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [userCode, setUserCode] = useState("");
    const [accessCode, setAccessCode] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleAuthentication = async () => {
        setIsLoading(true);
        setError("");

        // Simulation d'une vérification sécurisée
        await new Promise(resolve => setTimeout(resolve, 1500));

        const credential = PDG_CREDENTIALS[userCode as keyof typeof PDG_CREDENTIALS];

        if (!credential) {
            setError("Code utilisateur invalide");
            setIsLoading(false);
            return;
        }

        if (credential.code !== accessCode) {
            setError("Code d'accès incorrect");
            setIsLoading(false);
            return;
        }

        // Authentification réussie
        toast({
            title: "🎉 Accès autorisé",
            description: `Bienvenue ${credential.name}`,
            duration: 3000,
        });

        // Stocker les informations d'authentification PDG
        sessionStorage.setItem("pdg_auth", JSON.stringify({
            userCode,
            name: credential.name,
            level: credential.level,
            timestamp: Date.now()
        }));

    setIsLoading(false);
    setIsOpen(false);
    
    // Redirection vers l'interface PDG dédiée
    navigate("/pdg", { state: { pdgAccess: true, level: credential.level } });
    };

    const resetForm = () => {
        setUserCode("");
        setAccessCode("");
        setError("");
        setShowPassword(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
        }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
          size="sm"
        >
          <Crown className="w-4 h-4 mr-2" />
          Accès PDG
          <Badge variant="secondary" className="ml-2 bg-yellow-400 text-black">
            SÉCURISÉ
          </Badge>
        </Button>
      </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-center">
                        <Crown className="w-6 h-6 text-yellow-500" />
                        Authentification PDG
                        <Lock className="w-5 h-5 text-red-500" />
                    </DialogTitle>
                </DialogHeader>

                <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-center space-x-2">
                            <Badge variant="destructive" className="animate-pulse">
                                ACCÈS RESTREINT
                            </Badge>
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                NIVEAU MAXIMUM
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="userCode" className="text-sm font-semibold">
                                Code Utilisateur
                            </Label>
                            <Input
                                id="userCode"
                                type="text"
                                placeholder="Ex: PDG001, ADMIN001..."
                                value={userCode}
                                onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                                className="font-mono text-center tracking-wider"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="accessCode" className="text-sm font-semibold">
                                Code d'Accès Sécurisé
                            </Label>
                            <div className="relative">
                                <Input
                                    id="accessCode"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Code d'accès confidentiel"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    className="font-mono pr-10"
                                    disabled={isLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-700 text-center">
                                ⚠️ Interface réservée aux dirigeants autorisés
                                <br />
                                🔒 Accès tracé et sécurisé
                            </p>
                        </div>

                        <Button
                            onClick={handleAuthentication}
                            disabled={!userCode || !accessCode || isLoading}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Vérification...
                                </>
                            ) : (
                                <>
                                    <Crown className="w-4 h-4 mr-2" />
                                    Accéder à l'Interface PDG
                                </>
                            )}
                        </Button>

                        <div className="text-xs text-gray-500 text-center space-y-1">
                            <p>🔐 Codes d'accès disponibles pour test :</p>
                            <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                                <p><strong>PDG001</strong> | 224SOLUTIONS2024!</p>
                                <p><strong>ADMIN001</strong> | ADMIN@224SOL</p>
                                <p><strong>DEV001</strong> | DEV@224TECH</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
};
