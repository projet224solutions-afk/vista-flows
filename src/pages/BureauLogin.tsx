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
import { useTranslation } from '@/hooks/useTranslation';

export const BureauLogin: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, verifyOTP, resendOTP, isLoading, requiresOTP, identifier, otpExpiresAt, isAuthenticated } = useBureauAuth();

  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });

  // Rediriger si dÃ©jÃ  connectÃ©
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/bureau');
    }
  }, [isAuthenticated, navigate]);

  // Ã‰tape 1: Soumission login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.identifier || !formData.password) {
      return;
    }

    await login(formData.identifier, formData.password);
  };

  // Ã‰tape 2: VÃ©rification OTP
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
    <div className="min-h-screen bg-primary-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo et titre */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary-orange-600 rounded-2xl shadow-lg">
              <Building2 className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t('auth.bureau.space')}</h1>
          <p className="text-muted-foreground">{t('auth.agent.secureLogin')}</p>
        </div>

        {!requiresOTP ? (
          /* ====== Ã‰TAPE 1: LOGIN ====== */
          <Card className="shadow-xl border-t-4 border-t-primary-orange-600">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">{t('auth.bureau.loginTitle')}</CardTitle>
              <CardDescription>
                {t('auth.bureau.loginDesc')}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Identifiant */}
                <div className="space-y-2">
                  <Label htmlFor="identifier">{t('auth.bureau.emailOrPhone')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="identifier"
                      type="text"
                      placeholder={t('auth.bureau.emailOrPhonePlaceholder')}
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
                    {t('auth.bureau.emailOrPhoneHint')}
                  </p>
                </div>

                {/* Mot de passe */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={isLoading}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Infos sÃ©curitÃ© */}
                <Alert className="bg-primary-blue-50 border-primary-orange-200">
                  <ShieldCheck className="h-4 w-4 text-primary-orange-600" />
                  <AlertDescription className="text-sm text-primary-orange-900">
                    {t('auth.agent.securityInfo')}
                  </AlertDescription>
                </Alert>

                {/* Info bureau */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    ðŸ’¡ {t('auth.bureau.infoNote')}
                  </p>
                </div>

                {/* Bouton connexion */}
                <Button
                  type="submit"
                  disabled={isLoading || !formData.identifier || !formData.password}
                  className="w-full bg-primary-orange-600 hover:bg-primary-orange-700"
                  size="lg"
                >
                  {isLoading ? t('auth.agent.connecting') : t('auth.login')}
                </Button>

                {/* Lien retour */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('auth.agent.backToHome')}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* ====== Ã‰TAPE 2: VÃ‰RIFICATION OTP ====== */
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
              {t('auth.agent.backToLogin')}
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            {t('auth.bureau.contactSupport')}
          </p>
          <p className="text-xs">
            {t('auth.agent.mfaInfo')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BureauLogin;
