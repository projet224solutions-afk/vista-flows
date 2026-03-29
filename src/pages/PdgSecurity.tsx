import { useState } from 'react';
import { Shield, AlertTriangle, Lock, Activity, Eye, Ban, FileText, Key, Bug, Brain, Database, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import { ResponsiveGrid } from '@/components/responsive/ResponsiveContainer';
import { SecurityCertifications } from '@/components/security/SecurityCertifications';
import { BugBountyProgram } from '@/components/security/BugBountyProgram';
import { AdvancedMFA } from '@/components/security/AdvancedMFA';
import { MLFraudDetection } from '@/components/security/MLFraudDetection';
import { SIEMDashboard } from '@/components/security/SIEMDashboard';
import CommunicationWidget from '@/components/communication/CommunicationWidget';

export default function PdgSecurity() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
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
                DÃ©fense & Riposte - SÃ©curitÃ©
              </h1>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Lock className="w-3 h-3 text-red-500" />
              Centre de sÃ©curitÃ© et de surveillance de la plateforme
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
        <Alert className="border-primary-orange-500/50 bg-gradient-to-br from-primary-blue-500 to-primary-orange-500/10">
          <Activity className="h-4 w-4 text-primary-orange-600" />
          <AlertDescription className="text-primary-orange-600">
            Tous les systÃ¨mes de sÃ©curitÃ© sont opÃ©rationnels
          </AlertDescription>
        </Alert>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4 lg:grid-cols-9'} gap-1`}>
            <TabsTrigger value="overview" className="gap-1 text-xs md:text-sm">
              <Shield className="w-3 h-3 md:w-4 md:h-4" />
              {!isMobile && 'Vue'}
            </TabsTrigger>
            <TabsTrigger value="certifications" className="gap-1 text-xs md:text-sm">
              <Award className="w-3 h-3 md:w-4 md:h-4" />
              {!isMobile && 'Certif'}
            </TabsTrigger>
            <TabsTrigger value="bugbounty" className="gap-1 text-xs md:text-sm">
              <Bug className="w-3 h-3 md:w-4 md:h-4" />
              {!isMobile && 'Bounty'}
            </TabsTrigger>
            <TabsTrigger value="mfa" className="gap-1 text-xs md:text-sm">
              <Key className="w-3 h-3 md:w-4 md:h-4" />
              {!isMobile && 'MFA'}
            </TabsTrigger>
            <TabsTrigger value="fraud" className="gap-1 text-xs md:text-sm">
              <Brain className="w-3 h-3 md:w-4 md:h-4" />
              {!isMobile && 'Fraude ML'}
            </TabsTrigger>
            <TabsTrigger value="siem" className="gap-1 text-xs md:text-sm">
              <Database className="w-3 h-3 md:w-4 md:h-4" />
              {!isMobile && 'SIEM'}
            </TabsTrigger>
            <TabsTrigger value="threats" className="gap-1 text-xs md:text-sm">
              <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />
              {!isMobile && 'Menaces'}
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-1 text-xs md:text-sm">
              <Eye className="w-3 h-3 md:w-4 md:h-4" />
              {!isMobile && 'Surveil'}
            </TabsTrigger>
            <TabsTrigger value="blocked" className="gap-1 text-xs md:text-sm">
              <Ban className="w-3 h-3 md:w-4 md:h-4" />
              {!isMobile && 'BloquÃ©s'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <ResponsiveGrid mobileCols={2} tabletCols={4} desktopCols={4} gap="md">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Menaces DÃ©tectÃ©es
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">0</span>
                    <Badge variant="outline" className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500/10 text-primary-orange-600 border-primary-orange-500/20">
                      SÃ©curisÃ©
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    IPs BloquÃ©es
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
            </ResponsiveGrid>

            <Card>
              <CardHeader>
                <CardTitle>SystÃ¨mes de Protection</CardTitle>
                <CardDescription>
                  Ã‰tat des diffÃ©rents systÃ¨mes de sÃ©curitÃ©
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary-orange-600" />
                    <div>
                      <p className="font-medium">DÃ©tection d'anomalies IA</p>
                      <p className="text-sm text-muted-foreground">Surveillance en temps rÃ©el</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500/10 text-primary-orange-600 border-primary-orange-500/20">
                    Actif
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-primary-orange-600" />
                    <div>
                      <p className="font-medium">RLS (Row Level Security)</p>
                      <p className="text-sm text-muted-foreground">Protection des donnÃ©es</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500/10 text-primary-orange-600 border-primary-orange-500/20">
                    Actif
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <Ban className="w-5 h-5 text-primary-orange-600" />
                    <div>
                      <p className="font-medium">Blocage automatique</p>
                      <p className="text-sm text-muted-foreground">IPs malveillantes</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500/10 text-primary-orange-600 border-primary-orange-500/20">
                    Actif
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary-orange-600" />
                    <div>
                      <p className="font-medium">Analyse forensique</p>
                      <p className="text-sm text-muted-foreground">Investigation automatique</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500/10 text-primary-orange-600 border-primary-orange-500/20">
                    Actif
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certifications Tab */}
          <TabsContent value="certifications" className="space-y-4">
            <SecurityCertifications />
          </TabsContent>

          {/* Bug Bounty Tab */}
          <TabsContent value="bugbounty" className="space-y-4">
            <BugBountyProgram />
          </TabsContent>

          {/* Advanced MFA Tab */}
          <TabsContent value="mfa" className="space-y-4">
            <AdvancedMFA />
          </TabsContent>

          {/* ML Fraud Detection Tab */}
          <TabsContent value="fraud" className="space-y-4">
            <MLFraudDetection />
          </TabsContent>

          {/* SIEM Tab */}
          <TabsContent value="siem" className="space-y-4">
            <SIEMDashboard />
          </TabsContent>

          {/* Threats Tab */}
          <TabsContent value="threats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Menaces DÃ©tectÃ©es</CardTitle>
                <CardDescription>
                  Aucune menace active dÃ©tectÃ©e
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-primary-orange-500 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Tous les systÃ¨mes sont sÃ©curisÃ©s
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Surveillance en Temps RÃ©el</CardTitle>
                <CardDescription>
                  ActivitÃ© du systÃ¨me de surveillance
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
                <CardTitle>EntitÃ©s BloquÃ©es</CardTitle>
                <CardDescription>
                  IPs et utilisateurs bloquÃ©s
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Ban className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Aucune entitÃ© bloquÃ©e actuellement
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Widget de communication flottant */}
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </div>
  );
}
