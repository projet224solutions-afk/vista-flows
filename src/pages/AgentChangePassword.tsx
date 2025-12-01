import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAgentAuth } from '@/hooks/useAgentAuth';
import { supabase } from '@/integrations/supabase/client';
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AgentChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { getCurrentAgent, isAuthenticated } = useAgentAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    message: string;
    color: string;
  }>({ score: 0, message: '', color: '' });

  // Rediriger si non connecté
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/agent/login');
    }
  }, [isAuthenticated, navigate]);

  // Vérifier force du mot de passe
  useEffect(() => {
    if (!formData.newPassword) {
      setPasswordStrength({ score: 0, message: '', color: '' });
      return;
    }

    let score = 0;
    let messages: string[] = [];

    // Longueur
    if (formData.newPassword.length >= 8) score++;
    if (formData.newPassword.length >= 12) score++;
    else messages.push('Au moins 8 caractères');

    // Majuscules
    if (/[A-Z]/.test(formData.newPassword)) score++;
    else messages.push('Une majuscule');

    // Minuscules
    if (/[a-z]/.test(formData.newPassword)) score++;
    else messages.push('Une minuscule');

    // Chiffres
    if (/[0-9]/.test(formData.newPassword)) score++;
    else messages.push('Un chiffre');

    // Caractères spéciaux
    if (/[^A-Za-z0-9]/.test(formData.newPassword)) score++;
    else messages.push('Un caractère spécial');

    const strength = {
      0: { message: 'Très faible', color: 'text-red-600' },
      1: { message: 'Faible', color: 'text-orange-600' },
      2: { message: 'Moyen', color: 'text-yellow-600' },
      3: { message: 'Bon', color: 'text-blue-600' },
      4: { message: 'Fort', color: 'text-green-600' },
      5: { message: 'Très fort', color: 'text-green-700' },
      6: { message: 'Excellent', color: 'text-green-800' }
    }[Math.min(score, 6)] || { message: '', color: '' };

    setPasswordStrength({
      score,
      message: messages.length > 0 ? `Manquant: ${messages.join(', ')}` : strength.message,
      color: strength.color
    });
  }, [formData.newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Tous les champs sont requis');
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error('Le nouveau mot de passe doit être différent de l\'ancien');
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error('Le mot de passe n\'est pas assez fort. Utilisez majuscules, minuscules, chiffres et caractères spéciaux.');
      return;
    }

    setIsLoading(true);

    try {
      const agent = getCurrentAgent();
      if (!agent) {
        toast.error('Session expirée');
        navigate('/agent/login');
        return;
      }

      // Appeler Edge Function pour changer le mot de passe
      const { data, error } = await supabase.functions.invoke('change-agent-password', {
        body: {
          agent_id: agent.id,
          current_password: formData.currentPassword,
          new_password: formData.newPassword
        }
      });

      if (error) {
        console.error('[AgentChangePassword] Erreur:', error);
        toast.error('Erreur lors du changement de mot de passe');
        return;
      }

      if (!data.success) {
        toast.error(data.error || 'Mot de passe actuel incorrect');
        return;
      }

      // Succès
      toast.success('Mot de passe modifié avec succès !');
      
      // Réinitialiser formulaire
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Rediriger après 2 secondes
      setTimeout(() => {
        navigate('/agent');
      }, 2000);

    } catch (error) {
      console.error('[AgentChangePassword] Erreur:', error);
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary rounded-2xl shadow-lg">
              <Lock className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Changer le mot de passe</h1>
          <p className="text-muted-foreground">Agent 224Solutions</p>
        </div>

        <Card className="shadow-xl border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle>Nouveau mot de passe</CardTitle>
            <CardDescription>
              Choisissez un mot de passe fort pour protéger votre compte
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mot de passe actuel */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    disabled={isLoading}
                    className="pl-10 pr-10"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Nouveau mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    disabled={isLoading}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Force du mot de passe */}
                {formData.newPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Force:</span>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.score >= 3 ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {passwordStrength.message}
                          </span>
                        ) : (
                          passwordStrength.message
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          passwordStrength.score <= 2 ? 'bg-red-600' :
                          passwordStrength.score === 3 ? 'bg-yellow-600' :
                          passwordStrength.score === 4 ? 'bg-blue-600' :
                          'bg-green-600'
                        }`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={isLoading}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>

              {/* Exigences */}
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-xs text-blue-900">
                  <strong>Exigences du mot de passe:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Au moins 8 caractères</li>
                    <li>Au moins une majuscule (A-Z)</li>
                    <li>Au moins une minuscule (a-z)</li>
                    <li>Au moins un chiffre (0-9)</li>
                    <li>Au moins un caractère spécial (!@#$%...)</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Boutons */}
              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={isLoading || passwordStrength.score < 3 || formData.newPassword !== formData.confirmPassword}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? 'Modification en cours...' : 'Changer le mot de passe'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/agent')}
                  disabled={isLoading}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour au dashboard
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Votre mot de passe doit rester confidentiel</p>
        </div>
      </div>
    </div>
  );
};
