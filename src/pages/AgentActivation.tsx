import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { agentInvitationService } from '@/services/agentInvitationService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function AgentActivation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [valid, setValid] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const result = await agentInvitationService.validateInvitation(token);
      
      if (result.valid && result.invitation) {
        setValid(true);
        setInvitation(result.invitation);
        // Pré-remplir l'email
        setFormData(prev => ({ ...prev, email: result.invitation.email }));
      } else {
        toast.error(result.error || 'Invitation invalide');
      }
    } catch (error) {
      console.error('Erreur validation:', error);
      toast.error('Erreur lors de la validation de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setValidating(true);

      // 1. Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'agent',
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // 2. Accepter l'invitation et lier le compte
      const result = await agentInvitationService.acceptInvitation(
        token,
        authData.user.id
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('🎉 Compte agent activé avec succès!');
      
      // Redirection vers le dashboard agent
      setTimeout(() => {
        navigate('/agent');
      }, 2000);

    } catch (error) {
      console.error('Erreur activation:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'activation');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-lg">Vérification de l'invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="w-10 h-10 text-red-500" />
              <CardTitle>Invitation Invalide</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Cette invitation n'est pas valide ou a expiré.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <CardTitle>Déjà Connecté</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Vous êtes déjà connecté. Souhaitez-vous accepter cette invitation avec ce compte?
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/agent')} 
                variant="outline"
                className="flex-1"
              >
                Mon Dashboard
              </Button>
              <Button 
                onClick={async () => {
                  if (!token) return;
                  const result = await agentInvitationService.acceptInvitation(token, user.id);
                  if (result.success) {
                    navigate('/agent');
                  }
                }}
                className="flex-1"
              >
                Accepter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">🎉 Activation Compte Agent</CardTitle>
          <p className="text-muted-foreground">
            Bienvenue! Créez votre compte pour accéder à votre interface agent.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                placeholder="Minimum 6 caractères"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
                placeholder="Confirmer le mot de passe"
              />
            </div>

            {invitation && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Informations Agent</h4>
                <p className="text-sm text-muted-foreground">
                  Rôle: Agent 224Solutions
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={validating}
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activation en cours...
                </>
              ) : (
                '🚀 Activer mon compte'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
