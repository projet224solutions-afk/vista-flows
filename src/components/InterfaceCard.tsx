import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface InterfaceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  roleType: "vendeur" | "livreur" | "taxi" | "syndicat" | "transitaire" | "admin" | "client";
  features: string[];
  onClick: () => void;
}

export function InterfaceCard({ 
  title, 
  description, 
  icon: Icon, 
  roleType, 
  features, 
  onClick 
}: InterfaceCardProps) {
  const gradientClass = `bg-${roleType}-gradient`;
  const primaryColor = `${roleType}-primary`;
  const accentColor = `${roleType}-accent`;

  return (
    <Card className="group relative overflow-hidden border-0 shadow-elegant hover:shadow-glow hover:scale-105 transition-all duration-500 cursor-pointer animate-fade-in">
      <div 
        className={`absolute inset-0 ${gradientClass} opacity-10 group-hover:opacity-20 transition-opacity duration-500`}
      />
      
      <div className="relative p-8 h-full flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-4 rounded-2xl bg-${roleType}-accent group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`h-8 w-8 text-${roleType}-primary`} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-1">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 mb-6">
          {features.slice(0, 4).map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full bg-${roleType}-primary`} />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </div>
          ))}
          {features.length > 4 && (
            <div className="text-xs text-muted-foreground mt-2">
              +{features.length - 4} autres fonctionnalités
            </div>
          )}
        </div>

        <Button 
          onClick={onClick}
          className={`w-full bg-${roleType}-primary hover:bg-${roleType}-primary/90 text-white border-0 h-12 text-base font-semibold group-hover:shadow-lg transition-all duration-300`}
        >
          Accéder à l'interface
        </Button>
      </div>
    </Card>
  );
}