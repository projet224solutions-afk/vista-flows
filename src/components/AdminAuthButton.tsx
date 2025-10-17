import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// Identifiants admin sécurisés
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "224@224gn"
};

export function AdminAuthButton() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuthentication = async () => {
    setError("");
    setLoading(true);

    try {
      // Vérification des identifiants
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        // Stockage de la session admin
        sessionStorage.setItem("admin_authenticated", "true");
        sessionStorage.setItem("admin_user", JSON.stringify({
          username: "admin",
          role: "admin",
          name: "Administrateur Principal",
          loginTime: new Date().toISOString()
        }));

        toast.success("✅ Authentification admin réussie");
        setOpen(false);
        
        // Redirection vers l'interface PDG
        setTimeout(() => {
          navigate("/pdg");
        }, 500);
      } else {
        setError("❌ Identifiants incorrects");
        toast.error("Identifiants incorrects");
      }
    } catch (err) {
      setError("❌ Erreur d'authentification");
      toast.error("Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setError("");
    setShowPassword(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none shadow-lg"
        >
          <Shield className="w-4 h-4 mr-2" />
          Accès Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600">
              <Shield className="w-6 h-6 text-white" />
            </div>
            Authentification Administrateur
          </DialogTitle>
        </DialogHeader>
        <Card className="border-2 border-purple-200">
          <CardContent className="pt-6 space-y-4">
            {/* Message de sécurité */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-purple-700 font-medium mb-1">
                <Lock className="w-4 h-4" />
                Accès sécurisé
              </div>
              <p className="text-purple-600 text-xs">
                Interface réservée aux administrateurs du système
              </p>
            </div>

            {/* Formulaire */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-sm font-medium">
                  Nom d'utilisateur
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAuthentication()}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Entrez le mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAuthentication()}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Bouton de connexion */}
              <Button
                onClick={handleAuthentication}
                disabled={loading || !username || !password}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Authentification...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Se connecter
                  </>
                )}
              </Button>
            </div>

            {/* Identifiants de test (visible en développement) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
              <div className="font-medium text-blue-700 mb-1">📋 Identifiants admin:</div>
              <div className="text-blue-600 space-y-1">
                <div>• Nom d'utilisateur: <code className="bg-white px-1 rounded">admin</code></div>
                <div>• Mot de passe: <code className="bg-white px-1 rounded">224@224gn</code></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
