/**
 * 📊 RAPPORTS & ANALYTICS - 224SOLUTIONS
 * Interface de rapports et analytics pour PDG
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Download, 
  FileText, 
  Users, 
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  Share,
  Mail,
  Printer
} from 'lucide-react';

interface ReportData {
  id: string;
  title: string;
  type: 'financial' | 'users' | 'activity' | 'executive';
  period: string;
  created_at: string;
  status: 'completed' | 'generating' | 'failed';
  size: string;
  format: 'pdf' | 'excel' | 'csv';
}

interface AnalyticsData {
  total_users: number;
  total_revenue: number;
  total_transactions: number;
  growth_rate: number;
  top_categories: Array<{ name: string; value: number; percentage: number }>;
  user_distribution: Array<{ role: string; count: number; percentage: number }>;
  revenue_trend: Array<{ month: string; revenue: number }>;
}

export default function PDGReportsAnalytics() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedType, setSelectedType] = useState('all');
  const { toast } = useToast();

  // Charger les rapports
  const loadReports = async () => {
    try {
      const response = await fetch('/api/admin/reports/all');
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else {
        // Données de démonstration
        setReports([
          {
            id: '1',
            title: 'Rapport Financier Mensuel',
            type: 'financial',
            period: 'Septembre 2024',
            created_at: '2024-10-01',
            status: 'completed',
            size: '2.3 MB',
            format: 'pdf'
          },
          {
            id: '2',
            title: 'Liste Utilisateurs Complète',
            type: 'users',
            period: 'Octobre 2024',
            created_at: '2024-10-05',
            status: 'completed',
            size: '1.8 MB',
            format: 'excel'
          },
          {
            id: '3',
            title: 'Analytics d\'Activité',
            type: 'activity',
            period: '30 derniers jours',
            created_at: '2024-10-05',
            status: 'generating',
            size: '0 MB',
            format: 'csv'
          }
        ]);
      }
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
    }
  };

  // Charger les analytics
  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        // Données de démonstration
        setAnalytics({
          total_users: 15847,
          total_revenue: 125600000,
          total_transactions: 8934,
          growth_rate: 18.5,
          top_categories: [
            { name: 'Électronique', value: 45000000, percentage: 35.8 },
            { name: 'Mode & Beauté', value: 32000000, percentage: 25.5 },
            { name: 'Maison & Jardin', value: 28000000, percentage: 22.3 },
            { name: 'Sport & Loisirs', value: 20600000, percentage: 16.4 }
          ],
          user_distribution: [
            { role: 'Client', count: 12000, percentage: 75.7 },
            { role: 'Vendeur', count: 2500, percentage: 15.8 },
            { role: 'Livreur', count: 800, percentage: 5.0 },
            { role: 'Admin', count: 47, percentage: 0.3 },
            { role: 'Autres', count: 500, percentage: 3.2 }
          ],
          revenue_trend: [
            { month: 'Jan', revenue: 85000000 },
            { month: 'Fév', revenue: 92000000 },
            { month: 'Mar', revenue: 98000000 },
            { month: 'Avr', revenue: 105000000 },
            { month: 'Mai', revenue: 112000000 },
            { month: 'Juin', revenue: 118000000 },
            { month: 'Juil', revenue: 122000000 },
            { month: 'Août', revenue: 125600000 }
          ]
        });
      }
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    }
  };

  // Générer un rapport
  const generateReport = async (type: string) => {
    try {
      const response = await fetch('/api/admin/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, period: selectedPeriod })
      });

      if (response.ok) {
        toast({
          title: "📊 Rapport en cours",
          description: "Le rapport est en cours de génération...",
        });
        
        // Ajouter le rapport en cours
        const newReport: ReportData = {
          id: Date.now().toString(),
          title: `Rapport ${type} - ${selectedPeriod}`,
          type: type as any,
          period: selectedPeriod,
          created_at: new Date().toLocaleString('fr-FR'),
          status: 'generating',
          size: '0 MB',
          format: 'pdf'
        };
        setReports(prev => [newReport, ...prev]);
      }
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de générer le rapport",
        variant: "destructive"
      });
    }
  };

  // Télécharger un rapport
  const downloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport-${reportId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "📥 Téléchargement",
          description: "Le rapport a été téléchargé",
        });
      }
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de télécharger le rapport",
        variant: "destructive"
      });
    }
  };

  // Partager un rapport
  const shareReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/share`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        navigator.clipboard.writeText(data.share_url);
        toast({
          title: "🔗 Lien copié",
          description: "Le lien de partage a été copié dans le presse-papiers",
        });
      }
    } catch (error) {
      console.error('Erreur partage:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de partager le rapport",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadReports();
    loadAnalytics();
    setLoading(false);
  }, [selectedPeriod]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'generating': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'generating': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return <DollarSign className="w-4 h-4" />;
      case 'users': return <Users className="w-4 h-4" />;
      case 'activity': return <BarChart3 className="w-4 h-4" />;
      case 'executive': return <TrendingUp className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics en temps réel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analytics en Temps Réel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Utilisateurs</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.total_users.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">+{analytics.growth_rate}% ce mois</div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Revenus</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {analytics.total_revenue.toLocaleString()} FCFA
                </div>
                <div className="text-sm text-gray-600">+{analytics.growth_rate}% croissance</div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Transactions</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.total_transactions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">+15% ce mois</div>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Croissance</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {analytics.growth_rate}%
                </div>
                <div className="text-sm text-gray-600">Taux de croissance</div>
              </div>
            </div>
          )}

          {/* Filtres */}
          <div className="flex items-center gap-4 mb-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">90 derniers jours</SelectItem>
                <SelectItem value="1y">1 an</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => loadAnalytics()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Génération de rapports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Génération de Rapports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={() => generateReport('financial')}
              className="h-20 flex flex-col items-center gap-2"
            >
              <DollarSign className="w-6 h-6" />
              <span>Rapport Financier</span>
            </Button>

            <Button 
              onClick={() => generateReport('users')}
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
            >
              <Users className="w-6 h-6" />
              <span>Liste Utilisateurs</span>
            </Button>

            <Button 
              onClick={() => generateReport('activity')}
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
            >
              <BarChart3 className="w-6 h-6" />
              <span>Analytics d'Activité</span>
            </Button>

            <Button 
              onClick={() => generateReport('executive')}
              variant="outline"
              className="h-20 flex flex-col items-center gap-2"
            >
              <TrendingUp className="w-6 h-6" />
              <span>Rapport Exécutif</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des rapports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Rapports Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg">
                    {getTypeIcon(report.type)}
                  </div>
                  <div>
                    <h4 className="font-medium">{report.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{report.period}</span>
                      <span>{report.created_at}</span>
                      <span>{report.size}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(report.status)}>
                    {getStatusIcon(report.status)}
                    <span className="ml-1 capitalize">{report.status}</span>
                  </Badge>

                  {report.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => downloadReport(report.id)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => shareReport(report.id)}>
                        <Share className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
