/**
 * Composant de Connexion Universelle Intelligente
 * Support: Agent, Bureau Syndicat, Travailleur
 * Identifiant flexible: Email, Téléphone, ID unique
 *
 * CORRECTIONS DE SÉCURITÉ:
 * - Utilisation de SecureStorage au lieu de localStorage
 * - Sessions chiffrées avec AES-GCM
 * - Protection contre XSS
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Building2, Users, Lock, Mail, Phone, IdCard, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SecureStorage } from '@/lib/secureStorage';
import { useTranslation } from '@/hooks/useTranslation';

type UserType = 'agent' | 'bureau' | 'worker';

interface UniversalLoginProps {
  defaultType?: UserType;
  onSuccess?: () => void;
}

export default function UniversalLogin({ defaultType, onSuccess }: UniversalLoginProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [userType, setUserType] = useState<UserType>(defaultType || 'agent');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [identifierType, setIdentifierType] = useState<'email' | 'phone' | 'id' | null>(null);

  // Détection automatique du type d'identifiant
  const detectIdentifierType = (value: string): 'email' | 'phone' | 'id' => {
    if (value.includes('@')) return 'email';
    const cleanValue = value.replace(/\s+/g, '');
    if (/^[678]\d{8}$/.test(cleanValue)) return 'phone';
    return 'id';
  };

  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    if (value) {
      setIdentifierType(detectIdentifierType(value));
    } else {
      setIdentifierType(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!identifier || !password) {
        throw new Error(t('auth.universal.errors.fillAllFields'));
      }

      console.log('🔐 Tentative de connexion:', { userType, identifier, identifierType });

      // Appel à l'Edge Function de connexion universelle
      const { data, error: fnError } = await supabase.functions.invoke('universal-login', {
        body: {
          identifier: identifier.trim(),
          password,
          role: userType
        }
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || t('auth.universal.errors.connection'));

      console.log('✅ Connexion réussie:', data.session.role);

      // Stocker la session de manière sécurisée (chiffrée avec AES-GCM)
      await SecureStorage.setItem(`${userType}_session`, data.session);

      toast.success(t('auth.universal.toast.success'));
      
      // Redirection selon le rôle
      if (data.session.role === 'agent') {
        navigate('/agent-dashboard');
      } else if (data.session.role === 'bureau') {
        navigate('/bureau');
      } else if (data.session.role === 'worker') {
        navigate('/worker');
      }

      if (onSuccess) onSuccess();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.universal.errors.connection');
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Erreur connexion:', err);
    } finally {
      setLoading(false);
    }
  };

  const userTypes = [
    { 
      value: 'agent' as UserType, 
      label: t('auth.universal.accountType.agent'), 
      icon: UserCheck,
      color: 'bg-blue-500',
      description: t('auth.universal.accountType.agentDesc')
    },
    { 
      value: 'bureau' as UserType, 
      label: t('auth.universal.accountType.bureau'), 
      icon: Building2,
      color: 'bg-green-500',
      description: t('auth.universal.accountType.bureauDesc')
    },
    { 
      value: 'worker' as UserType, 
      label: t('auth.universal.accountType.worker'), 
      icon: Users,
      color: 'bg-orange-500',
      description: t('auth.universal.accountType.workerDesc')
    }
  ];

  const getIdentifierIcon = () => {
    if (identifierType === 'email') return <Mail className="h-4 w-4" />;
    if (identifierType === 'phone') return <Phone className="h-4 w-4" />;
    if (identifierType === 'id') return <IdCard className="h-4 w-4" />;
    return <UserCheck className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <UserCheck className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center">
            {t('auth.universal.title')}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {t('auth.universal.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sélection du type d'utilisateur */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('auth.universal.accountType.label')}</Label>
            <div className="grid grid-cols-1 gap-2">
              {userTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = userType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setUserType(type.value)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${type.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                    {isSelected && (
                      <Badge variant="default" className="ml-auto">{t('auth.universal.selected')}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formulaire de connexion */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Identifiant flexible */}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="flex items-center gap-2">
                <span>{t('auth.universal.identifier.label')}</span>
                {identifierType && (
                  <Badge variant="outline" className="text-xs">
                    {getIdentifierIcon()}
                    <span className="ml-1">
                      {identifierType === 'email' && t('auth.universal.identifier.email')}
                      {identifierType === 'phone' && t('auth.universal.identifier.phone')}
                      {identifierType === 'id' && t('auth.universal.identifier.id')}
                    </span>
                  </Badge>
                )}
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder={t('auth.universal.identifier.placeholder')}
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                disabled={loading}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('auth.universal.identifier.hint')}
              </p>
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.universal.password.label')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.universal.password.placeholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Bouton de connexion */}
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold"
              disabled={loading || !identifier || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('auth.universal.loggingIn')}
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  {t('auth.universal.loginAction')}
                </>
              )}
            </Button>
          </form>

          {/* Information système */}
          <div className="pt-4 border-t">
            <div className="bg-primary/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <UserCheck className="h-4 w-4" />
                {t('auth.universal.info.title')}
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                <li>{t('auth.universal.info.item1')}</li>
                <li>{t('auth.universal.info.item2')}</li>
                <li>{t('auth.universal.info.item3')}</li>
              </ul>
            </div>
          </div>

          {/* Retour */}
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground"
            >
              {t('auth.universal.backHome')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
