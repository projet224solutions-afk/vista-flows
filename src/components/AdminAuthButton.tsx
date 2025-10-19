import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export function AdminAuthButton() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const handleClick = () => {
    if (loading) {
      toast.info("Chargement...");
      return;
    }

    if (!user) {
      toast.info("Veuillez vous connecter d'abord");
      navigate("/auth");
      return;
    }

    if (profile?.role !== 'admin') {
      toast.error("Accès refusé : vous devez être administrateur");
      return;
    }

    // L'utilisateur est connecté et est admin
    toast.success("✅ Accès autorisé");
    navigate("/pdg");
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant="outline"
      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none shadow-lg"
    >
      <Shield className="w-4 h-4 mr-2" />
      Accès Admin
    </Button>
  );
}
