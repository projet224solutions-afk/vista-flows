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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      </div>

      <div className="relative z-10">
        {/* Premium Header */}
        <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl">
          <div className="max-w-[1600px] mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60 blur-xl opacity-50" />
                  <div className="relative bg-gradient-to-br from-primary to-primary/80 p-3 rounded-2xl shadow-2xl">
                    <Shield className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Interface PDG 224SOLUTIONS
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    <Lock className="w-3 h-3 text-green-500" />
                    Contrôle total et sécurisé de la plateforme
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-green-500 font-medium">Système Actif</span>
                </div>
              </div>
            </div>
            
            {!mfaVerified && (
              <div className="mt-4 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-sm text-orange-500 flex-1">
                    MFA non vérifié - Certaines actions critiques nécessiteront une vérification supplémentaire
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <Tabs defaultValue="finance" className="space-y-8">
            <TabsList className="inline-flex h-auto p-1.5 bg-muted/50 backdrop-blur-xl border border-border/40 rounded-2xl shadow-lg">
              <TabsTrigger 
                value="finance" 
                className="gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-border/40 transition-all"
              >
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">Finances</span>
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-border/40 transition-all"
              >
                <Users className="w-4 h-4" />
                <span className="font-medium">Utilisateurs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-border/40 transition-all"
              >
                <Shield className="w-4 h-4" />
                <span className="font-medium">Sécurité</span>
              </TabsTrigger>
              <TabsTrigger 
                value="config" 
                className="gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-border/40 transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">Configuration</span>
              </TabsTrigger>
              <TabsTrigger 
                value="copilot" 
                className="gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-border/40 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">Copilote IA</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="finance" className="animate-fade-in">
              <PDGFinance />
            </TabsContent>

            <TabsContent value="users" className="animate-fade-in">
              <PDGUsers />
            </TabsContent>

            <TabsContent value="security" className="animate-fade-in">
              <PDGSecurity />
            </TabsContent>

            <TabsContent value="config" className="animate-fade-in">
              <PDGConfig />
            </TabsContent>

            <TabsContent value="copilot" className="animate-fade-in">
              <PDGCopilot mfaVerified={mfaVerified} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
