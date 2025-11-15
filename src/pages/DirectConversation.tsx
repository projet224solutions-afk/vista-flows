import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import UniversalCommunicationHub from "@/components/communication/UniversalCommunicationHub";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DirectConversation() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");

  useEffect(() => {
    const loadConversation = async () => {
      if (!userId) {
        toast.error("ID utilisateur manquant");
        navigate("/");
        return;
      }

      try {
        // Vérifier que l'utilisateur existe
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', userId)
          .single();

        if (error || !profile) {
          toast.error("Utilisateur introuvable");
          navigate("/");
          return;
        }

        setRecipientName(`${profile.first_name} ${profile.last_name}`);
        setConversationId(`direct_${userId}`);
      } catch (error) {
        console.error('Erreur chargement conversation:', error);
        toast.error("Erreur lors du chargement");
        navigate("/");
      }
    };

    loadConversation();
  }, [userId, navigate]);

  if (!conversationId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">{recipientName}</h1>
        </div>
      </div>
      
      <UniversalCommunicationHub 
        selectedConversationId={conversationId}
      />
    </div>
  );
}
