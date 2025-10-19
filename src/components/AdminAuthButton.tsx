import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export function AdminAuthButton() {
  const navigate = useNavigate();

  const handleClick = () => {
    console.log('🔘 Redirection directe vers /pdg');
    navigate("/pdg");
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-none shadow-lg"
    >
      <Shield className="w-4 h-4 mr-2" />
      Accès Admin
    </Button>
  );
}
