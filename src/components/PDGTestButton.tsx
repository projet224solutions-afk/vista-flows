import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function PDGTestButton() {
  const navigate = useNavigate();

  const handleTestAccess = async () => {
    try {
      // Connexion avec un compte admin de test
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'pdg@224solutions.com',
        password: 'PDG2024Admin!'
      });

      if (error) {
        console.error('Erreur connexion:', error);
        toast.error('Connexion échouée - Utilisation du mode démo');
        // En mode démo, on redirige quand même
        navigate('/pdg');
        return;
      }

      toast.success('Connexion PDG réussie');
      navigate('/pdg');
    } catch (error) {
      console.error('Erreur:', error);
      toast.info('Mode démo activé');
      navigate('/pdg');
    }
  };

  return (
    <Button
      onClick={handleTestAccess}
      size="lg"
      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none shadow-2xl shadow-purple-500/50 transform hover:scale-105 transition-all"
    >
      <Shield className="w-5 h-5 mr-2" />
      Accès Interface PDG
    </Button>
  );
}
