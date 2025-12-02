/**
 * Composant de Connexion Universelle Intelligente
 * Support: Agent, Bureau Syndicat, Travailleur
 * Identifiant flexible: Email, Téléphone, ID unique
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

type UserType = 'agent' | 'bureau' | 'worker';

interface UniversalLoginProps {
  defaultType?: UserType;
  onSuccess?: () => void;
}

export default function UniversalLogin({ defaultType, onSuccess }: UniversalLoginProps) {
  const navigate = useNavigate();
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
        throw new Error('Veuillez remplir tous les champs');
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
      if (!data?.success) throw new Error(data?.error || 'Erreur de connexion');

      console.log('✅ Connexion réussie:', data.session.role);
      
      // Stocker la session dans localStorage
      localStorage.setItem(`${userType}_session`, JSON.stringify(data.session));
      
      toast.success('Connexion réussie !');
      
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
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
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
      label: 'Agent', 
      icon: UserCheck,
      color: 'bg-blue-500',
      description: 'Accès agent principal ou sous-agent'
    },
    { 
      value: 'bureau' as UserType, 
      label: 'Bureau Syndicat', 
      icon: Building2,
      color: 'bg-green-500',
      description: 'Accès bureau syndical'
    },
    { 
      value: 'worker' as UserType, 
      label: 'Travailleur', 
      icon: Users,
      color: 'bg-orange-500',
      description: 'Accès membre travailleur'
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
            Connexion Intelligente
          </CardTitle>
          <CardDescription className="text-center text-base">
            Système universel avec identifiant flexible
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sélection du type d'utilisateur */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Type de compte</Label>
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
                      <Badge variant="default" className="ml-auto">Sélectionné</Badge>
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
                <span>Identifiant</span>
                {identifierType && (
                  <Badge variant="outline" className="text-xs">
                    {getIdentifierIcon()}
                    <span className="ml-1">
                      {identifierType === 'email' && 'Email'}
                      {identifierType === 'phone' && 'Téléphone'}
                      {identifierType === 'id' && 'ID Unique'}
                    </span>
                  </Badge>
                )}
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Email, Téléphone ou ID"
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                disabled={loading}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Entrez votre email, numéro de téléphone ou identifiant unique
              </p>
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
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
                  Connexion en cours...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  Se connecter
                </>
              )}
            </Button>
          </form>

          {/* Information système */}
          <div className="pt-4 border-t">
            <div className="bg-primary/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <UserCheck className="h-4 w-4" />
                Connexion intelligente activée
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                <li>✓ Détection automatique du type d'identifiant</li>
                <li>✓ Sécurité renforcée avec rate-limiting</li>
                <li>✓ Support multi-plateforme</li>
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
              ← Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
