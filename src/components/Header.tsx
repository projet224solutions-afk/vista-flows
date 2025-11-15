import { Button } from "@/components/ui/button";
import { Globe, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { QuickTransferButton } from "@/components/wallet/QuickTransferButton";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import logo224Solutions from "@/assets/224solutions-logo-final.png";

export function Header() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b bg-background/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={logo224Solutions} 
                alt="224Solutions Logo" 
                className="h-12 w-auto object-contain"
              />
              <div className="hidden sm:block">
                <p className="text-sm text-muted-foreground">
                  Plateforme Intégrée Multi-Services
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {profile && (
              <>
                <div className="hidden lg:block">
                  <WalletBalanceWidget className="min-w-[280px]" />
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Connecté en tant que</span>
                  <span className="font-medium text-foreground capitalize">{profile.role}</span>
                </div>
              </>
            )}

            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4 mr-2" />
              FR
            </Button>

            {profile ? (
              <>
                <QuickTransferButton variant="ghost" size="sm" showText={false} />
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