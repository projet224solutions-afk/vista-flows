/**
 * PAGE D'INSCRIPTION VIA LIEN D'AFFILIATION AGENT
 * Permet aux utilisateurs de s'inscrire via un lien partagé par un agent
 * 224SOLUTIONS
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, CheckCircle, Shield, Users, Store, Briefcase, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgentInfo {
  agent_id: string;
  agent_name: string;
  target_role: string;
}

export default function AgentAffiliateRegister() {
  const [searchParams] = useSearchParams();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  // Token depuis URL params ou query string
  const affiliateToken = token || searchParams.get('ref');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  
  // Formulaire
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    first_name: '',
    last_name: '',
    role: 'client' as 'client' | 'vendeur' | 'service'
  });

  useEffect(() => {
    if (affiliateToken) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, [affiliateToken]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('agent-affiliate-link?action=validate-token&token=' + affiliateToken, {
        method: 'GET'
      });

      if (error) throw error;

      if (data?.valid) {
        setTokenValid(true);
        setAgentInfo({
          agent_id: data.agent_id,
          agent_name: data.agent_name,
          target_role: data.target_role || 'all'
        });
        
        // Si le lien cible un rôle spécifique, le présélectionner
        if (data.target_role && data.target_role !== 'all') {
          setFormData(prev => ({ ...prev, role: data.target_role }));
        }
      } else {
        setTokenValid(false);
        toast.error('Lien invalide ou expiré', {
          description: 'Ce lien d\'affiliation n\'est plus valide.'
        });
      }
    } catch (error) {
      console.error('Erreur validation token:', error);
      setTokenValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('register-with-affiliate', {
        body: {
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          affiliate_token: affiliateToken
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Compte créé avec succès !', {
        description: agentInfo ? `Vous avez été parrainé par ${agentInfo.agent_name}` : 'Bienvenue sur Vista Flows'
      });

      // Rediriger vers la page de connexion
      navigate('/auth', { 
        state: { 
          message: 'Compte créé ! Connectez-vous pour continuer.',
          email: formData.email 
        } 
      });

    } catch (error: any) {
      console.error('Erreur inscription:', error);
      toast.error('Erreur lors de l\'inscription', {
        description: error.message || 'Veuillez réessayer'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'client': return <Users className="h-5 w-5" />;
      case 'vendeur': return <Store className="h-5 w-5" />;
      case 'service': return <Briefcase className="h-5 w-5" />;
      default: return <Users className="h-5 w-5" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'client': return 'Client';
      case 'vendeur': return 'Vendeur';
      case 'service': return 'Prestataire de service';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification du lien...</p>
        </div>
      </div>
    );
  }

  // Lien invalide
  if (!affiliateToken || !tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle className="text-xl text-red-600">Lien invalide</CardTitle>
            <CardDescription>
              Ce lien d'affiliation n'existe pas ou a expiré.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Si vous avez reçu ce lien d'un agent, contactez-le pour obtenir un nouveau lien valide.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to="/auth">
                S'inscrire normalement
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header avec info agent */}
        {agentInfo && (
          <div className="text-center mb-6">
            <Badge variant="secondary" className="mb-2 px-4 py-1">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Lien vérifié
            </Badge>
            <p className="text-sm text-muted-foreground">
              Inscription via <span className="font-semibold text-primary">{agentInfo.agent_name}</span>
            </p>
          </div>
        )}

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Créer votre compte</CardTitle>
            <CardDescription>
              Rejoignez Vista Flows et accédez à tous nos services
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Rôle */}
              <div className="space-y-2">
                <Label>Je souhaite m'inscrire en tant que</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: 'client' | 'vendeur' | 'service') => 
                    setFormData(prev => ({ ...prev, role: value }))
                  }
                  disabled={agentInfo?.target_role && agentInfo.target_role !== 'all'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(!agentInfo?.target_role || agentInfo.target_role === 'all' || agentInfo.target_role === 'client') && (
                      <SelectItem value="client">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Client - Acheter des produits/services
                        </div>
                      </SelectItem>
                    )}
                    {(!agentInfo?.target_role || agentInfo.target_role === 'all' || agentInfo.target_role === 'vendeur') && (
                      <SelectItem value="vendeur">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          Vendeur - Ouvrir ma boutique
                        </div>
                      </SelectItem>
                    )}
                    {(!agentInfo?.target_role || agentInfo.target_role === 'all' || agentInfo.target_role === 'service') && (
                      <SelectItem value="service">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Prestataire - Offrir mes services
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Nom et prénom */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Votre prénom"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Votre nom"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="votre@email.com"
                  required
                />
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+224 6XX XXX XXX"
                />
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 6 caractères"
                  required
                />
              </div>

              {/* Confirmer mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Répétez le mot de passe"
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création du compte...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Créer mon compte
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
            <p>
              Vous avez déjà un compte ?{' '}
              <Link to="/auth" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
            <p className="text-xs">
              En créant un compte, vous acceptez nos{' '}
              <Link to="/terms" className="underline">Conditions d'utilisation</Link>
              {' '}et notre{' '}
              <Link to="/privacy" className="underline">Politique de confidentialité</Link>
            </p>
          </CardFooter>
        </Card>

        {/* Retour */}
        <div className="text-center mt-6">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
