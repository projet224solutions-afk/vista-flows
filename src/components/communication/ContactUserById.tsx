import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ContactUserById() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContact = async () => {
    if (!userId.trim()) {
      toast.error("Veuillez entrer un ID utilisateur");
      return;
    }

    try {
      setLoading(true);

      // Vérifier que l'utilisateur existe
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', userId.trim())
        .single();

      if (error || !profile) {
        toast.error("Utilisateur introuvable");
        return;
      }

      // Obtenir l'utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Vous devez être connecté");
        return;
      }

      // Vérifier qu'on ne contacte pas soi-même
      if (profile.id === session.user.id) {
        toast.error("Vous ne pouvez pas vous contacter vous-même");
        return;
      }

      // Rediriger vers la conversation directe
      navigate(`/communication/direct_${profile.id}`);
      
      toast.success(`Conversation avec ${profile.first_name} ${profile.last_name}`);
    } catch (error) {
      console.error('Erreur contact utilisateur:', error);
      toast.error("Erreur lors de la tentative de contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Contacter un utilisateur
          </CardTitle>
          <CardDescription>
            Entrez l'ID de l'utilisateur que vous souhaitez contacter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">ID Utilisateur</label>
            <Input
              placeholder="Entrez l'ID utilisateur (UUID)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="font-mono"
            />
          </div>
          
          <Button 
            onClick={handleContact} 
            disabled={loading || !userId.trim()}
            className="w-full"
          >
            <Search className="w-4 h-4 mr-2" />
            {loading ? "Recherche..." : "Contacter"}
          </Button>

          <div className="text-xs text-muted-foreground">
            <p>💡 Astuce : L'ID utilisateur est un identifiant unique de 36 caractères au format UUID.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
