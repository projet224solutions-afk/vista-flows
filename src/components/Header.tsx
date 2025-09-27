import { Button } from "@/components/ui/button";
import { Building2, Globe, Settings, User } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-background/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-vendeur-accent">
                <Building2 className="h-8 w-8 text-vendeur-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  AfriCommerce Pro
                </h1>
                <p className="text-sm text-muted-foreground">
                  Plateforme E-commerce & Logistique Intégrée
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4 mr-2" />
              FR
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}