/**
 * Composant d'affichage des permissions actives d'un agent
 * Affiche les permissions groupées par catégories
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, DollarSign, Users, Briefcase, Settings, Brain } from 'lucide-react';
import { 
  PERMISSION_CATEGORIES, 
  getActivePermissionsByCategory, 
  getPermissionLabel,
  countActivePermissions
} from '@/constants/agentPermissionCategories';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  finance: DollarSign,
  gestion: Users,
  operations: Briefcase,
  systeme: Settings,
  intelligence: Brain,
  special: Shield,
};

interface AgentPermissionsDisplayProps {
  permissions: Record<string, boolean>;
  loading?: boolean;
  compact?: boolean;
  className?: string;
}

export function AgentPermissionsDisplay({ 
  permissions, 
  loading = false, 
  compact = false,
  className 
}: AgentPermissionsDisplayProps) {
  if (loading) {
    return (
      <Card className={cn("border-0 shadow-lg", className)}>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Chargement des permissions…</p>
        </CardContent>
      </Card>
    );
  }

  const activeByCategory = getActivePermissionsByCategory(permissions);
  const totalActive = countActivePermissions(permissions);

  if (totalActive === 0) {
    return (
      <Card className={cn("border-0 shadow-lg", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Permissions Actives
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune permission active.</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        {activeByCategory.map(({ category, activePermissions }) => {
          const Icon = CATEGORY_ICONS[category.key] || Shield;
          return (
            <div key={category.key} className="space-y-2">
              <div className={cn("flex items-center gap-2 text-sm font-semibold", category.colorClass)}>
                <Icon className="w-4 h-4" />
                {category.label} ({activePermissions.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activePermissions.map((perm) => (
                  <Badge 
                    key={perm} 
                    variant="outline" 
                    className={cn("text-xs", category.bgClass, category.colorClass.replace('text-', 'border-').replace('-600', '-200'))}
                  >
                    {getPermissionLabel(perm)}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card className={cn("border-0 shadow-lg", className)}>
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Shield className="w-5 h-5 text-primary" />
          Permissions Actives ({totalActive})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeByCategory.map(({ category, activePermissions }) => {
            const Icon = CATEGORY_ICONS[category.key] || Shield;
            return (
              <div key={category.key} className="space-y-2">
                <div className={cn("flex items-center gap-2 text-sm font-semibold", category.colorClass)}>
                  <Icon className="w-4 h-4" />
                  {category.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activePermissions.map((perm) => (
                    <Badge 
                      key={perm} 
                      variant="outline" 
                      className={cn("text-xs", category.bgClass, category.colorClass.replace('text-', 'border-').replace('-600', '-200'))}
                    >
                      {getPermissionLabel(perm)}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
