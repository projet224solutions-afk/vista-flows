/**
 * 🎨 HEADER PDG ULTRA PROFESSIONNEL
 * Header avec stats en temps réel et actions rapides
 */

import { Shield, Lock, Brain, LogOut, Bell, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface PDGHeaderProps {
  mfaVerified: boolean;
  aiActive: boolean;
  onVerifyMfa: () => void;
  verifyingMfa: boolean;
  onSignOut: () => void;
  quickStats?: {
    activeUsers: number;
    revenue: string;
    pendingTasks: number;
  };
}

export function PDGHeader({
  mfaVerified,
  aiActive,
  onVerifyMfa,
  verifyingMfa,
  onSignOut,
  quickStats
}: PDGHeaderProps) {
  return (
    <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Title + Trigger */}
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2" />
            
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60 blur-xl opacity-50" />
                <div className="relative bg-gradient-to-br from-primary to-primary/80 p-2.5 rounded-xl shadow-xl">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Interface PDG 224SOLUTIONS
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Lock className="w-3 h-3 text-green-500" />
                  Contrôle total et sécurisé
                </p>
              </div>
            </div>
          </div>

          {/* Right: Stats + Actions */}
          <div className="flex items-center gap-3">
            {/* Quick Stats */}
            {quickStats && (
              <div className="hidden lg:flex items-center gap-2">
                <Card className="bg-card/50 border-border/40">
                  <CardContent className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                      <div className="text-xs">
                        <span className="text-muted-foreground">Utilisateurs: </span>
                        <span className="font-bold text-foreground">{quickStats.activeUsers}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/40">
                  <CardContent className="px-3 py-1.5">
                    <div className="text-xs">
                      <span className="text-muted-foreground">CA: </span>
                      <span className="font-bold text-green-600">{quickStats.revenue}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* MFA Status */}
            {!mfaVerified && (
              <Button
                variant="outline"
                size="sm"
                onClick={onVerifyMfa}
                disabled={verifyingMfa}
                className="border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
              >
                {verifyingMfa ? 'Vérification…' : 'Vérifier MFA'}
              </Button>
            )}

            {/* System Status */}
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20 gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Système Actif
            </Badge>

            {/* AI Status */}
            {aiActive && (
              <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20 gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                IA Active
              </Badge>
            )}

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            {/* Logout */}
            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Déconnexion</span>
            </Button>
          </div>
        </div>

        {/* MFA Warning */}
        {!mfaVerified && (
          <div className="mt-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 backdrop-blur-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xs text-orange-600">
                MFA non vérifié - Certaines actions critiques nécessiteront une vérification supplémentaire
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
