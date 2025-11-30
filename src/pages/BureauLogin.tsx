import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { OTPInput } from '@/components/auth/OTPInput';
import { useBureauAuth } from '@/hooks/useBureauAuth';
import { Building2, Lock, Mail, Phone, ArrowLeft, ShieldCheck, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const BureauLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, verifyOTP, resendOTP, isLoading, requiresOTP, identifier, otpExpiresAt, isAuthenticated } = useBureauAuth();

  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/bureau');
    }
  }, [isAuthenticated, navigate]);

  // Étape 1: Soumission login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.identifier || !formData.password) {
      return;
    }

    await login(formData.identifier, formData.password);
  };

  // Étape 2: Vérification OTP
  const handleVerifyOTP = async (otp: string) => {
    await verifyOTP(otp);
  };

  // Renvoyer OTP
  const handleResendOTP = async () => {
    await resendOTP();
  };

  // Retour au login
  const handleBackToLogin = () => {
    setFormData({ identifier: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo et titre */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-600 rounded-2xl shadow-lg">
              <Building2 className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Espace Bureau Syndicat</h1>
          <p className="text-muted-foreground">224Solutions - Connexion sécurisée</p>
        </div>

        {!requiresOTP ? (
          /* ====== ÉTAPE 1: LOGIN ====== */
          <Card className="shadow-xl border-t-4 border-t-green-600">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Connexion Bureau</CardTitle>
              <CardDescription>
                Entrez vos identifiants de président pour accéder à votre espace
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Identifiant */}
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email ou Téléphone du Président</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="president@example.com ou 628XXXXXX"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      disabled={isLoading}
                      className="pl-10"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Email ou téléphone du président du bureau syndicat
                  </p>
                </div>

                {/* Mot de passe */}
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={isLoading}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Infos sécurité */}
                <Alert className="bg-green-50 border-green-200">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-900">
                    <strong>Authentification sécurisée:</strong> Un code de vérification vous sera envoyé par email après validation de votre mot de passe.
                  </AlertDescription>
                </Alert>

                {/* Info bureau */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    <strong>💡 Pour les bureaux syndicat:</strong> Utilisez les identifiants du président (email ou téléphone) fournis lors de la création du bureau.
                  </p>
                </div>

                {/* Bouton connexion */}
                <Button
                  type="submit"
                  disabled={isLoading || !formData.identifier || !formData.password}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                </Button>

                {/* Lien retour */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à l'accueil
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* ====== ÉTAPE 2: VÉRIFICATION OTP ====== */
          <div className="space-y-4">
            <OTPInput
              identifier={identifier}
              onVerify={handleVerifyOTP}
              onResendOTP={handleResendOTP}
              isLoading={isLoading}
              expiresAt={otpExpiresAt}
            />

            {/* Bouton retour */}
            <Button
              variant="outline"
              onClick={handleBackToLogin}
              disabled={isLoading}
              className="w-full max-w-md mx-auto block"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Problème de connexion ? Contactez le support 224Solutions
          </p>
          <p className="text-xs">
            Système sécurisé avec MFA (Multi-Factor Authentication)
          </p>
        </div>
      </div>
    </div>
  );
};
