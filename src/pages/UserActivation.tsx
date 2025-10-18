/**
 * 🔗 ACTIVATION UTILISATEUR - 224SOLUTIONS
 * Page d'activation des utilisateurs via lien d'invitation
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  Download, 
  Smartphone, 
  Monitor,
  Mail,
  Phone,
  ExternalLink,
  ArrowRight,
  Shield,
  Users
} from 'lucide-react';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'invited' | 'active' | 'suspended';
  creator_name: string;
  creator_type: 'agent' | 'sub_agent';
  created_at: string;
}

export default function UserActivation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'pc' | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      loadUserInfo();
      detectDevice();
    }
  }, [token]);

  const detectDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const detectedDevice = isMobile ? 'mobile' : 'pc';
    setDeviceType(detectedDevice);
    
    // Définir l'URL de téléchargement selon le device
    if (detectedDevice === 'mobile') {
      setDownloadUrl('https://play.google.com/store/apps/details?id=com.solutions224.app');
    } else {
      setDownloadUrl('https://224solutions.app/download/desktop');
    }
  };

  const loadUserInfo = async () => {
    try {
      setLoading(true);
      
      const { data: user, error } = await supabase
        .from('agent_users')
        .select(`
          *,
          creator_agent:agents!agent_users_creator_id_fkey(name),
          creator_sub_agent:sub_agents!agent_users_creator_id_fkey(name)
        `)
        .eq('invite_token', token)
        .single();

      if (error) throw error;

      if (!user) {
        toast({
          title: "❌ Lien invalide",
          description: "Ce lien d'invitation n'est pas valide ou a expiré",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      if (user.status === 'active') {
        toast({
          title: "✅ Déjà activé",
          description: "Ce compte a déjà été activé",
        });
        navigate('/auth');
        return;
      }

      // Déterminer le créateur
      const creatorName = user.creator_agent?.name || user.creator_sub_agent?.name || 'Inconnu';
      const creatorType = user.creator_agent ? 'agent' : 'sub_agent';

      setUserInfo({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        creator_name: creatorName,
        creator_type: creatorType,
        created_at: user.created_at
      });
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger les informations utilisateur",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const activateUser = async () => {
    try {
      setActivating(true);
      
      const { error } = await supabase
        .from('agent_users')
        .update({ 
          status: 'active',
          device_type: deviceType,
          activated_at: new Date().toISOString()
        })
        .eq('id', userInfo?.id);

      if (error) throw error;

      // Log de l'activation
      await supabase.from('agent_audit_logs').insert({
        actor_id: userInfo?.id,
        actor_type: 'user',
        action: 'USER_ACTIVATED',
        target_type: 'user',
        target_id: userInfo?.id,
        details: { 
          device_type: deviceType,
          activation_method: 'invite_link',
          user_agent: navigator.userAgent
        }
      });

      toast({
        title: "🎉 Compte activé !",
        description: "Votre compte a été activé avec succès",
      });

      // Rediriger vers le téléchargement après 2 secondes
      setTimeout(() => {
        window.location.href = downloadUrl;
      }, 2000);
    } catch (error) {
      console.error('Erreur activation:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'activer le compte",
        variant: "destructive"
      });
    } finally {
      setActivating(false);
    }
  };

  const downloadApp = () => {
    window.location.href = downloadUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Chargement de votre invitation...</p>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold">Lien invalide</h2>
              <p className="text-muted-foreground">
                Ce lien d'invitation n'est pas valide ou a expiré.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Bienvenue sur 224SOLUTIONS</h1>
            <p className="text-muted-foreground">
              Vous avez été invité par <strong>{userInfo.creator_name}</strong> ({userInfo.creator_type === 'agent' ? 'Agent' : 'Sous-agent'})
            </p>
          </div>

          {/* Informations utilisateur */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Vos Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nom complet</label>
                  <p className="text-lg font-semibold">{userInfo.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg">{userInfo.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                  <p className="text-lg">{userInfo.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Statut</label>
                  <Badge variant="secondary">En attente d'activation</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Détection du device */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {deviceType === 'mobile' ? (
                  <Smartphone className="w-5 h-5 text-blue-500" />
                ) : (
                  <Monitor className="w-5 h-5 text-green-500" />
                )}
                Device Détecté
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                {deviceType === 'mobile' ? (
                  <Smartphone className="w-8 h-8 text-blue-500" />
                ) : (
                  <Monitor className="w-8 h-8 text-green-500" />
                )}
                <div>
                  <p className="font-semibold">
                    {deviceType === 'mobile' ? '📱 Appareil Mobile' : '💻 Ordinateur'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {deviceType === 'mobile' 
                      ? 'Nous vous proposons de télécharger l\'application mobile'
                      : 'Nous vous proposons de télécharger l\'application desktop'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-4">
            <Button 
              onClick={activateUser} 
              disabled={activating}
              className="w-full gap-2 text-lg py-6"
              size="lg"
            >
              {activating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Activation en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Activer mon compte
                </>
              )}
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                onClick={downloadApp}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger l'App
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.open('https://224solutions.app', '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Visiter le Site Web
              </Button>
            </div>
          </div>

          {/* Informations supplémentaires */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Sécurité :</strong> Votre compte sera automatiquement lié à votre {userInfo.creator_type === 'agent' ? 'agent' : 'sous-agent'} créateur. 
              Toutes vos transactions généreront des commissions selon le système établi.
            </AlertDescription>
          </Alert>

          {/* Support */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Besoin d'aide ?</h3>
                  <p className="text-sm text-blue-700">Contactez votre {userInfo.creator_type === 'agent' ? 'agent' : 'sous-agent'} ou notre support</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Email Support
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Phone className="w-4 h-4" />
                  Téléphone
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
