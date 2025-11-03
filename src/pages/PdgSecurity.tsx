import { useState } from 'react';
import { Shield, AlertTriangle, Lock, Activity, Eye, Ban, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

export default function PdgSecurity() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                Défense & Riposte - Sécurité
              </h1>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Lock className="w-3 h-3 text-red-500" />
              Centre de sécurité et de surveillance de la plateforme
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/pdg')}
            className="gap-2"
          >
            Retour au PDG
          </Button>
        </div>

        {/* Security Status Alert */}
        <Alert className="border-green-500/50 bg-green-500/10">
          <Activity className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Tous les systèmes de sécurité sont opérationnels
          </AlertDescription>
        </Alert>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2">
            <TabsTrigger value="overview" className="gap-2">
              <Shield className="w-4 h-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="threats" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Menaces
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-2">
              <Eye className="w-4 h-4" />
              Surveillance
            </TabsTrigger>
            <TabsTrigger value="blocked" className="gap-2">
              <Ban className="w-4 h-4" />
              Bloqués
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Menaces Détectées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">0</span>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Sécurisé
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    IPs Bloquées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">0</span>
                    <Ban className="w-5 h-5 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Alertes Actives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">0</span>
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Rapports Forensiques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">0</span>
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Systèmes de Protection</CardTitle>
                <CardDescription>
                  État des différents systèmes de sécurité
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Détection d'anomalies IA</p>
                      <p className="text-sm text-muted-foreground">Surveillance en temps réel</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    Actif
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">RLS (Row Level Security)</p>
                      <p className="text-sm text-muted-foreground">Protection des données</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    Actif
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Ban className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Blocage automatique</p>
                      <p className="text-sm text-muted-foreground">IPs malveillantes</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    Actif
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium">Analyse forensique</p>
                      <p className="text-sm text-muted-foreground">Investigation automatique</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    Actif
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Threats Tab */}
          <TabsContent value="threats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Menaces Détectées</CardTitle>
                <CardDescription>
                  Aucune menace active détectée
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Tous les systèmes sont sécurisés
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Surveillance en Temps Réel</CardTitle>
                <CardDescription>
                  Activité du système de surveillance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Eye className="w-16 h-16 text-blue-500 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Surveillance active - Aucune anomalie
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blocked Tab */}
          <TabsContent value="blocked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Entités Bloquées</CardTitle>
                <CardDescription>
                  IPs et utilisateurs bloqués
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Ban className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Aucune entité bloquée actuellement
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
