/**
 * PAGE D'ACCÈS BUREAU SYNDICAT - 224SOLUTIONS
 * Interface d'accès pour les bureaux syndicats avec code d'accès
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, ArrowLeft, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo224Solutions from "@/assets/224solutions-logo-final.png";

export default function BureauAccess() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAccessBureau = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      toast.error('Veuillez entrer un code d\'accès');
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Tentative d\'accès bureau avec le code:', accessCode);

      // Vérifier si le code d'accès existe dans bureaus
      const { data: bureau, error } = await supabase
        .from('bureaus')
        .select('*')
        .eq('access_token', accessCode)
        .eq('status', 'active')
        .single();

      if (error || !bureau) {
        console.error('❌ Code d\'accès invalide:', error);
        toast.error('Code d\'accès invalide ou bureau inactif');
        return;
      }

      console.log('✅ Bureau trouvé:', bureau);

      // Log de l'accès
      await supabase.from('audit_logs').insert({
        actor_id: bureau.id,
        action: 'BUREAU_ACCESS',
        target_type: 'bureau_dashboard',
        target_id: bureau.id,
        data_json: { 
          bureau_code: bureau.bureau_code,
          timestamp: new Date().toISOString() 
        }
      });

      toast.success(`Accès accordé - ${bureau.bureau_code}`);
      
      // Rediriger vers l'interface bureau avec le token
      navigate(`/bureau/${accessCode}`);

    } catch (error: any) {
      console.error('❌ Erreur lors de l\'accès bureau:', error);
      toast.error('Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
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

        <Card className="shadow-xl border-2 border-green-500/20">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full w-16 h-16 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Accès Bureau Syndicat
            </CardTitle>
            <CardDescription>
              Entrez votre code d'accès pour gérer votre bureau syndicat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccessBureau} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Code d'accès bureau
                </Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Ex: BUR001-XXXXX"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  required
                  className="text-center text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">Interface Bureau Syndicat</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Gestion des membres</li>
                      <li>Enregistrement des véhicules</li>
                      <li>Gestion des travailleurs</li>
                      <li>Suivi des cotisations</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
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
                className="text-green-600 hover:text-green-700"
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
              onClick={() => toast.info('Contactez le PDG pour obtenir votre code d\'accès')}
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
