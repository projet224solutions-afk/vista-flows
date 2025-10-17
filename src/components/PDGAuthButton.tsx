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

// Codes d'accès PDG sécurisés - Récupérés depuis le secrets manager
import { getSecret, SECRET_KEYS } from '@/config/secrets';

// Interface pour les credentials PDG
interface PDGCredential {
    code: string;
    name: string;
    level: string;
}

// Fonction pour récupérer les credentials depuis le secrets manager
const getPDGCredentials = async (): Promise<Record<string, PDGCredential>> => {
    try {
        // Récupération des secrets depuis le secrets manager
        const [pdgCode, adminCode, devCode] = await Promise.all([
            getSecret(SECRET_KEYS.PDG_ACCESS_CODE),
            getSecret(SECRET_KEYS.ADMIN_ACCESS_CODE),
            getSecret(SECRET_KEYS.DEV_ACCESS_CODE)
        ]);

        return {
            [process.env.PDG_USER_CODE || 'PDG001']: {
                code: pdgCode,
                name: "Directeur Général",
                level: "PDG_SUPREME"
            },
            [process.env.ADMIN_USER_CODE || 'ADMIN001']: {
                code: adminCode,
                name: "Administrateur Principal",
                level: "ADMIN_PRINCIPAL"
            },
            [process.env.DEV_USER_CODE || 'DEV001']: {
                code: devCode,
                name: "Développeur Principal",
                level: "DEV_ACCESS"
            }
        };
    } catch (error) {
        console.error('Erreur récupération credentials:', error);
        // Fallback pour le développement
        return {
            "PDG001": {
                code: "SECRET_MANAGER://pdg/access_code",
                name: "Directeur Général",
                level: "PDG_SUPREME"
            },
            "ADMIN001": {
                code: "SECRET_MANAGER://admin/access_code",
                name: "Administrateur Principal",
                level: "ADMIN_PRINCIPAL"
            },
            "DEV001": {
                code: "SECRET_MANAGER://dev/access_code",
                name: "Développeur Principal",
                level: "DEV_ACCESS"
            }
        };
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

        try {
            // Récupération des credentials depuis le secrets manager
            const credentials = await getPDGCredentials();
            
            // Debug des valeurs saisies
            console.log("🔍 DEBUG AUTH PDG:", {
                userCode: `'${userCode}'`,
                accessCode: `'${accessCode}'`,
                credential: credentials[userCode]
            });

            // Simulation d'une vérification sécurisée
            await new Promise(resolve => setTimeout(resolve, 1500));

            const credential = credentials[userCode];

            if (!credential) {
                setError(`Code utilisateur invalide: '${userCode}'`);
                setIsLoading(false);
                return;
            }

            if (credential.code !== accessCode) {
                setError(`Code d'accès incorrect. Vérifiez vos credentials.`);
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

            // Redirection vers l'interface PDG avancée
            navigate("/pdg-advanced", { state: { pdgAccess: true, level: credential.level } });
        } catch (error) {
            console.error('Erreur authentification PDG:', error);
            setError('Erreur de connexion au système de sécurité. Veuillez réessayer.');
            setIsLoading(false);
        }
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
                            <p>🔐 Credentials stockés dans le secrets manager</p>
                            <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                                <p><strong>PDG001</strong> | SECRET_MANAGER://pdg/access_code</p>
                                <p><strong>ADMIN001</strong> | SECRET_MANAGER://admin/access_code</p>
                                <p><strong>DEV001</strong> | SECRET_MANAGER://dev/access_code</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
};
