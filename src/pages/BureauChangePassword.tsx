import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Shield, Lock, AlertCircle } from "lucide-react";
import { useBureauAuth } from "@/hooks/useBureauAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BureauChangePassword = () => {
  const navigate = useNavigate();
  const bureauAuth = useBureauAuth() as any;
  const [bureauData, setBureauData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: "",
    color: ""
  });

  const [isLoading, setIsLoading] = useState(false);

  // Charger les données du bureau (depuis MFA ou token)
  useEffect(() => {
    const loadBureauData = async () => {
      // Vérifier d'abord si on a une session MFA
      if (bureauAuth?.bureau) {
        setBureauData(bureauAuth.bureau);
        setLoading(false);
        return;
      }

      // Sinon, chercher le token de retour
      const returnToken = localStorage.getItem('bureau_return_token');
      if (returnToken) {
        try {
          const { data, error } = await supabase
            .from('syndicate_bureaus' as any)
            .select('*')
            .eq('access_token', returnToken)
            .single();

          if (error) throw error;
          if (data) {
            setBureauData(data);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Erreur chargement bureau:', error);
        }
      }

      // Aucune session trouvée
      toast.error('Session expirée. Veuillez vous reconnecter.');
      navigate('/bureau/login');
    };

    loadBureauData();
  }, [bureauAuth, navigate]);

  // Calculer la force du nouveau mot de passe
  useEffect(() => {
    const password = formData.newPassword;
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let message = "";
    let color = "";

    if (password.length === 0) {
      message = "";
      color = "";
    } else if (score <= 2) {
      message = "Faible";
      color = "text-red-500";
    } else if (score <= 4) {
      message = "Bon";
      color = "text-yellow-500";
    } else {
      message = "Excellent";
      color = "text-green-500";
    }

    setPasswordStrength({ score, message, color });
  }, [formData.newPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error("Le nouveau mot de passe est trop faible");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error("Le nouveau mot de passe doit être différent de l'ancien");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('change-bureau-password', {
        body: {
          bureau_id: bureauData.id,
          current_password: formData.currentPassword,
          new_password: formData.newPassword
        }
      });

      if (error) {
        console.error("Erreur lors du changement de mot de passe:", error);
        toast.error("Une erreur s'est produite");
        return;
      }

      if (data && data.success) {
        toast.success("Mot de passe modifié avec succès !");
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        
        // Rediriger selon le mode d'accès
        setTimeout(() => {
          const returnToken = localStorage.getItem('bureau_return_token');
          if (returnToken) {
            localStorage.removeItem('bureau_return_token');
            navigate(`/bureau/${returnToken}`);
          } else {
            navigate('/bureau');
          }
        }, 2000);
      } else {
        toast.error(data?.message || "Erreur inconnue");
      }
    } catch (error) {
      console.error("Erreur lors du changement de mot de passe:", error);
      toast.error("Une erreur s'est produite");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!bureauData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-green-500 to-green-700 p-4 rounded-2xl shadow-xl">
              <Shield className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
            Modifier votre mot de passe
          </h1>
          <p className="text-gray-600 mt-2">Bureau Syndicat - {bureauData.president_name || bureauData.bureau_code}</p>
        </div>

        <Card className="shadow-xl border-green-100">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              Changement de mot de passe
            </CardTitle>
            <CardDescription className="text-center">
              Sécurisez votre compte avec un nouveau mot de passe
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert className="mb-6 border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Exigences du mot de passe :</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Au moins 8 caractères</li>
                  <li>Au moins une lettre majuscule</li>
                  <li>Au moins une lettre minuscule</li>
                  <li>Au moins un chiffre</li>
                  <li>Au moins un caractère spécial (!@#$%^&*)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mot de passe actuel */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-600" />
                  Mot de passe actuel
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="pr-10 border-green-200 focus:border-green-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Nouveau mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-600" />
                  Nouveau mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="pr-10 border-green-200 focus:border-green-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Indicateur de force du mot de passe */}
                {formData.newPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Force du mot de passe :</span>
                      <span className={`font-semibold ${passwordStrength.color}`}>
                        {passwordStrength.message}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.score <= 2
                            ? "bg-red-500"
                            : passwordStrength.score <= 4
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmer le nouveau mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-600" />
                  Confirmer le nouveau mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pr-10 border-green-200 focus:border-green-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Indicateur de correspondance */}
                {formData.confirmPassword && (
                  <div className="text-sm">
                    {formData.newPassword === formData.confirmPassword ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Les mots de passe correspondent
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Les mots de passe ne correspondent pas
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/bureau')}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  disabled={isLoading || passwordStrength.score < 3 || formData.newPassword !== formData.confirmPassword}
                >
                  {isLoading ? "Modification..." : "Modifier le mot de passe"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BureauChangePassword;
