import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Shield, DollarSign, Users, Settings, MessageSquare, Lock } from 'lucide-react';
import { toast } from 'sonner';
import PDGFinance from '@/components/pdg/PDGFinance';
import PDGUsers from '@/components/pdg/PDGUsers';
import PDGSecurity from '@/components/pdg/PDGSecurity';
import PDGConfig from '@/components/pdg/PDGConfig';
import PDGCopilot from '@/components/pdg/PDGCopilot';

export default function PDG224Solutions() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mfaVerified, setMfaVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPDGAccess = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      // Vérifier le rôle admin
      if (profile?.role !== 'admin') {
        toast.error('Accès refusé - Réservé au PDG');
        navigate('/');
        return;
      }

      // Log de l'accès PDG
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'PDG_ACCESS',
        target_type: 'dashboard',
        data_json: { timestamp: new Date().toISOString() }
      });

      setLoading(false);
    };

    checkPDGAccess();
  }, [user, profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Interface PDG 224SOLUTIONS
              </h1>
              <p className="text-slate-300">
                Contrôle total de la plateforme
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Sécurisé</span>
            </div>
          </div>
          
          {!mfaVerified && (
            <Card className="bg-orange-500/10 border-orange-500/20 p-4">
              <p className="text-orange-300 text-sm">
                ⚠️ MFA non vérifié - Certaines actions critiques nécessiteront une vérification
              </p>
            </Card>
          )}
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="finance" className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700 p-1">
            <TabsTrigger value="finance" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Finances
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="copilot" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Copilote IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="finance">
            <PDGFinance />
          </TabsContent>

          <TabsContent value="users">
            <PDGUsers />
          </TabsContent>

          <TabsContent value="security">
            <PDGSecurity />
          </TabsContent>

          <TabsContent value="config">
            <PDGConfig />
          </TabsContent>

          <TabsContent value="copilot">
            <PDGCopilot mfaVerified={mfaVerified} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
