/**
 * PAGE D'ACCÈS AGENT - 224SOLUTIONS
 * Interface d'accès pour les agents PDG avec code d'accès
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo224Solutions from "@/assets/224solutions-logo-final.png";

export default function AgentAccess() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAccessAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      toast.error('Veuillez entrer un code d\'accès');
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Tentative d\'accès agent avec le code:', accessCode);

      // Vérifier si le code d'accès existe dans agents_management
      const { data: agent, error } = await supabase
        .from('agents_management')
        .select('*')
        .eq('access_token', accessCode)
        .eq('is_active', true)
        .single();

      if (error || !agent) {
        console.error('❌ Code d\'accès invalide:', error);
        toast.error('Code d\'accès invalide ou agent inactif');
        return;
      }

      console.log('✅ Agent trouvé:', agent);

      // Log de l'accès
      await supabase.from('audit_logs').insert({
        actor_id: agent.id,
        action: 'AGENT_ACCESS',
        target_type: 'agent_dashboard',
        target_id: agent.id,
        data_json: { 
          agent_code: agent.agent_code,
          timestamp: new Date().toISOString() 
        }
      });

      toast.success(`Accès accordé - ${agent.name}`);
      
      // Rediriger vers l'interface agent publique avec le token
      navigate(`/agent-public/${accessCode}`);

    } catch (error: any) {
      console.error('❌ Erreur lors de l\'accès agent:', error);
      toast.error('Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={logo224Solutions} 
            alt="224Solutions Logo" 
            className="h-20 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">224Solutions</h1>
          <p className="text-muted-foreground">Plateforme Intégrée Multi-Services</p>
        </div>

        <Card className="shadow-xl border-2 border-primary/20">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Accès Agent PDG
            </CardTitle>
            <CardDescription>
              Entrez votre code d'accès pour gérer vos agents et utilisateurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccessAgent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Code d'accès agent
                </Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Ex: AGT001-XXXXX"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  required
                  className="text-center text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Interface Agent PDG</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Gestion des sous-agents</li>
                      <li>Création d'utilisateurs</li>
                      <li>Configuration des permissions</li>
                      <li>Suivi des commissions</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Vérification...' : 'Accéder à l\'interface'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Vous êtes un PDG ?
              </p>
              <Button
                variant="link"
                onClick={() => navigate('/pdg')}
                className="text-purple-600 hover:text-purple-700"
              >
                Accéder à l'interface PDG
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Besoin d'aide ?{' '}
            <button
              onClick={() => toast.info('Contactez votre PDG pour obtenir votre code d\'accès')}
              className="text-primary hover:underline"
            >
              Obtenir un code d'accès
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
