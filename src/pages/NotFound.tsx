import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Search, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { user, profile } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Déterminer la page d'accueil selon le rôle
  const getHomePath = () => {
    if (!user || !profile?.role) return "/";
    
    switch (profile.role) {
      case "vendeur":
        return "/vendeur/dashboard";
      case "admin":
        return "/pdg-224solutions";
      case "client":
        return "/client/dashboard";
      case "syndicat":
        return "/bureau/dashboard";
      case "livreur":
        return "/livreur/dashboard";
      case "transitaire":
        return "/transitaire/dashboard";
      case "taxi":
        return "/taxi-moto/driver";
      default:
        return "/";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              404
            </CardTitle>
            <CardDescription className="text-xl font-medium">
              Page introuvable
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">
              La page que vous recherchez n'existe pas ou a été déplacée.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-mono text-muted-foreground break-all">
                Chemin: <span className="text-foreground font-semibold">{location.pathname}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              asChild 
              className="flex-1 h-12 text-base shadow-lg"
              size="lg"
            >
              <Link to={getHomePath()}>
                <Home className="w-5 h-5 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              className="flex-1 h-12 text-base"
              size="lg"
            >
              <Link to={-1 as any}>
                <ArrowLeft className="w-5 h-5 mr-2" />
                Page précédente
              </Link>
            </Button>
          </div>

          {user && (
            <div className="pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                Connecté en tant que{" "}
                <span className="font-semibold text-foreground">
                  {profile?.first_name} {profile?.last_name}
                </span>
                {profile?.role && (
                  <span className="ml-2 text-primary">
                    ({profile.role})
                  </span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
