/**
 * Système d'Authentification Amélioré
 * - Parcours en étapes fluide
 * - Connexion sociale (Google, Facebook)
 * - Détection intelligente du type de compte
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  UserCheck, Store, Truck, Bike, Ship, ArrowLeft, ArrowRight,
  Lock, Mail, Phone, Loader2, Eye, EyeOff, AlertCircle, Check,
  ChevronRight, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type AccountType = 'client' | 'marchand' | 'livreur' | 'taxi_moto' | 'transitaire';
type AuthMode = 'login' | 'signup';
type Step = 'type' | 'method' | 'form';

interface AccountTypeOption {
  value: AccountType;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}

const accountTypes: AccountTypeOption[] = [
  {
    value: 'client',
    label: 'Client',
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    description: 'Achetez et commandez'
  },
  {
    value: 'marchand',
    label: 'Marchand',
    icon: Store,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
    description: 'Vendez vos produits'
  },
  {
    value: 'livreur',
    label: 'Livreur',
    icon: Truck,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    description: 'Livrez des colis'
  },
  {
    value: 'taxi_moto',
    label: 'Taxi Moto',
    icon: Bike,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    description: 'Transport de personnes'
  },
  {
    value: 'transitaire',
    label: 'Transitaire',
    icon: Ship,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    description: 'Import/Export'
  }
];

export default function EnhancedAuth() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('type');
  const [mode, setMode] = useState<AuthMode>('login');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        toast.success('Connexion réussie !');
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    setError(null);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: accountType ? {
            account_type: accountType
          } : undefined
        }
      });
      
      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(message);
      toast.error(message);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Inscription
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              account_type: accountType
            }
          }
        });
        
        if (error) throw error;
        toast.success('Vérifiez votre email pour confirmer votre inscription !');
      } else {
        // Connexion
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        toast.success('Connexion réussie !');
        navigate('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur d\'authentification';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+224${phone}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          data: {
            account_type: accountType
          }
        }
      });
      
      if (error) throw error;
      toast.success('Code OTP envoyé sur votre téléphone !');
      // TODO: Show OTP input
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur d\'envoi OTP';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'form') setStep('method');
    else if (step === 'method') setStep('type');
    else navigate('/');
  };

  const goNext = () => {
    if (step === 'type' && accountType) setStep('method');
    else if (step === 'method' && authMethod) setStep('form');
  };

  const selectedType = accountTypes.find(t => t.value === accountType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden">
        {/* Header avec progression */}
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <CardTitle className="text-xl font-bold">
                {mode === 'login' ? 'Connexion' : 'Inscription'}
              </CardTitle>
              <CardDescription>
                {step === 'type' && 'Choisissez votre type de compte'}
                {step === 'method' && 'Comment souhaitez-vous continuer ?'}
                {step === 'form' && 'Entrez vos informations'}
              </CardDescription>
            </div>
          </div>
          
          {/* Progress indicators */}
          <div className="flex gap-2">
            {['type', 'method', 'form'].map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s === step ? 'bg-primary' : 
                  ['type', 'method', 'form'].indexOf(step) > i ? 'bg-primary/50' : 'bg-primary/20'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {/* Étape 1: Sélection du type de compte */}
            {step === 'type' && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  {accountTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = accountType === type.value;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setAccountType(type.value)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected 
                            ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' 
                            : `${type.bgColor} border-transparent`
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-white'} flex items-center justify-center mb-2`}>
                          <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : type.color}`} />
                        </div>
                        <div className="font-semibold text-sm">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                        {isSelected && (
                          <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={goNext}
                  disabled={!accountType}
                  className="w-full h-12 mt-4"
                >
                  Continuer
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>

                {/* Toggle login/signup */}
                <div className="text-center pt-4 border-t">
                  <button
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {mode === 'login' 
                      ? "Pas encore de compte ? S'inscrire" 
                      : "Déjà un compte ? Se connecter"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Étape 2: Méthode d'authentification */}
            {step === 'method' && (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Type sélectionné */}
                {selectedType && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${selectedType.bgColor} border`}>
                    <selectedType.icon className={`h-5 w-5 ${selectedType.color}`} />
                    <span className="font-medium">{selectedType.label}</span>
                    <Badge variant="secondary" className="ml-auto">Sélectionné</Badge>
                  </div>
                )}

                {/* Connexion sociale */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Continuez avec
                  </p>
                  
                  <Button
                    variant="outline"
                    className="w-full h-12 gap-3 text-base font-medium hover:bg-red-50 hover:border-red-200"
                    onClick={() => handleSocialLogin('google')}
                    disabled={socialLoading !== null}
                  >
                    {socialLoading === 'google' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Google
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-12 gap-3 text-base font-medium hover:bg-blue-50 hover:border-blue-200"
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={socialLoading !== null}
                  >
                    {socialLoading === 'facebook' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    )}
                    Facebook
                  </Button>
                </div>

                <div className="relative py-4">
                  <Separator />
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-sm text-muted-foreground">
                    ou
                  </span>
                </div>

                {/* Options classiques */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className={`h-16 flex-col gap-2 ${authMethod === 'email' ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => { setAuthMethod('email'); setStep('form'); }}
                  >
                    <Mail className="h-5 w-5" />
                    <span className="text-xs">Email</span>
                  </Button>
                  <Button
                    variant="outline"
                    className={`h-16 flex-col gap-2 ${authMethod === 'phone' ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => { setAuthMethod('phone'); setStep('form'); }}
                  >
                    <Phone className="h-5 w-5" />
                    <span className="text-xs">Téléphone</span>
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}

            {/* Étape 3: Formulaire */}
            {step === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <form 
                  onSubmit={authMethod === 'email' ? handleEmailAuth : handlePhoneAuth}
                  className="space-y-4"
                >
                  {/* Type sélectionné */}
                  {selectedType && (
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${selectedType.bgColor} border mb-4`}>
                      <selectedType.icon className={`h-5 w-5 ${selectedType.color}`} />
                      <span className="font-medium text-sm">{selectedType.label}</span>
                    </div>
                  )}

                  {/* Champs selon le mode et la méthode */}
                  {mode === 'signup' && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nom complet</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Votre nom complet"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={loading}
                        className="h-12"
                        required
                      />
                    </div>
                  )}

                  {authMethod === 'email' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="votre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                          className="h-12"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            className="h-12 pr-10"
                            required
                            minLength={6}
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
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Numéro de téléphone</Label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 bg-muted rounded-lg border text-sm font-medium">
                          +224
                        </div>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="6XX XXX XXX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={loading}
                          className="h-12 flex-1"
                          required
                          pattern="[0-9]{9}"
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-5 w-5" />
                        {mode === 'login' ? 'Se connecter' : "S'inscrire"}
                      </>
                    )}
                  </Button>

                  {/* Toggle login/signup */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {mode === 'login' 
                        ? "Pas encore de compte ? S'inscrire" 
                        : "Déjà un compte ? Se connecter"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* Footer info */}
        <div className="px-6 pb-6">
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>Connexion sécurisée avec 224Solutions</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
