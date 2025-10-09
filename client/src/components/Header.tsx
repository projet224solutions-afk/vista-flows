import { Button } from "@/components/ui/button";
import { Crown, Globe, Settings, User, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b bg-background/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  224Solutions
                </h1>
                <p className="text-sm text-muted-foreground">
                  Plateforme Intégrée Multi-Services
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {profile && (
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Connecté en tant que</span>
                <span className="font-medium text-foreground capitalize">{profile.role}</span>
              </div>
            )}

            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4 mr-2" />
              FR
            </Button>

            {profile ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/profil')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <User className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Déconnexion
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/auth')}
              >
                Connexion
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}