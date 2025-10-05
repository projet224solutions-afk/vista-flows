import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, AlertTriangle, CheckCircle, Activity, QrCode, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useNavigate } from "react-router-dom";
import SimpleCommunicationInterface from "@/components/communication/SimpleCommunicationInterface";

export default function SyndicatDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  useRoleRedirect(); // S'assurer que seuls les syndicats/admins accèdent à cette page
  useRoleRedirect(); // S'assurer que seuls les syndicats/admins accèdent à cette page

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const stats = [
    { label: "Mototaxis actifs", value: "156", icon: Users, color: "text-blue-500" },
    { label: "Missions en cours", value: "89", icon: Activity, color: "text-green-500" },
    { label: "Alertes sécurité", value: "3", icon: AlertTriangle, color: "text-red-500" },
    { label: "Badges valides", value: "142", icon: CheckCircle, color: "text-purple-500" }
  ];

  const activeBadges = [
    {
      driver: 'Mamadou Diallo',
      badgeNumber: 'SYN-2024-001',
      vestNumber: 'V-156',
      status: 'Actif',
      expires: '31 Déc 2024',
      zone: 'Plateau'
    },
    {
      driver: 'Fatou Sall',
      badgeNumber: 'SYN-2024-002',
      vestNumber: 'V-157',
      status: 'Actif',
      expires: '31 Déc 2024',
      zone: 'Médina'
    }
  ];

  const securityAlerts = [
    {
      id: 'ALT-001',
      driver: 'Abdou Ba',
      type: 'Badge expiré',
      zone: 'Almadies',
      time: '14:30',
      priority: 'Haute'
    },
    {
      id: 'ALT-002',
      driver: 'Omar Ndiaye',
      type: 'SOS activé',
      zone: 'Yoff',
      time: '13:15',
      priority: 'Urgente'
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Syndicat</h1>
              <p className="text-muted-foreground">
                Supervision des mototaxis - {profile?.first_name || user?.email}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          <section className="px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                        <Icon className={`w-8 h-8 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

      {/* Active Badges */}
      <section className="px-4 py-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Badges actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeBadges.map((badge, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{badge.driver}</h4>
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        {badge.status}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">Zone: {badge.zone}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Badge N°</p>
                      <p className="font-medium">{badge.badgeNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gilet N°</p>
                      <p className="font-medium">{badge.vestNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expire le</p>
                      <p className="font-medium">{badge.expires}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Security Alerts */}
      <section className="px-4 py-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertes sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityAlerts.map((alert) => (
                <div key={alert.id} className="border rounded-lg p-4 border-l-4 border-l-red-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{alert.driver}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        alert.priority === 'Urgente' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {alert.priority}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Traiter</Button>
                      <Button size="sm" className="bg-red-500 hover:bg-red-600">Urgence</Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type d'alerte</p>
                      <p className="font-medium">{alert.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Zone</p>
                      <p className="font-medium">{alert.zone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Heure</p>
                      <p className="font-medium">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* System Overview */}
      <section className="px-4 py-2 mb-6">
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-0">
          <CardContent className="p-6">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-purple-500" />
              <h3 className="text-xl font-bold mb-2">Système de Supervision Avancé</h3>
              <p className="text-muted-foreground mb-4">
                Gestion complète et sécurisée des mototaxis
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Gestion des badges</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Suivi GPS temps réel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Alertes SOS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Contrôle qualité</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Statistiques détaillées</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Formation continue</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <div className="px-4 py-6">
            <SimpleCommunicationInterface />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}