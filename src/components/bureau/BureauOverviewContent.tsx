import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  Phone, 
  Building2, 
  Calendar,
  TrendingUp,
  Users,
  MapPin,
  Bike
} from 'lucide-react';
import { BureauStatsCards } from './BureauStatsCards';
import { BureauIdDisplay } from '@/components/syndicat/BureauIdDisplay';

interface BureauOverviewContentProps {
  bureau: {
    id: string;
    bureau_code: string;
    prefecture: string;
    commune: string;
    president_name?: string;
    president_email?: string;
    president_phone?: string;
    status?: string;
    created_at?: string;
  };
  stats: {
    workersCount: number;
    membersCount: number;
    motosCount: number;
    alertsCount: number;
  };
  walletBalance?: number;
}

export function BureauOverviewContent({ bureau, stats, walletBalance = 0 }: BureauOverviewContentProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non disponible';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const monthlyGoal = 100; // Objectif mensuel d'adhÃ©rents
  const monthlyProgress = Math.min((stats.membersCount / monthlyGoal) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <BureauStatsCards 
        workersCount={stats.workersCount}
        membersCount={stats.membersCount}
        motosCount={stats.motosCount}
        alertsCount={stats.alertsCount}
        walletBalance={walletBalance}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bureau Profile Card */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="bg-primary-blue-50 border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Building2 className="w-5 h-5 text-primary-blue-600" />
              Informations Bureau
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-blue-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-primary-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Localisation</p>
                    <p className="font-medium text-slate-800">{bureau.prefecture}</p>
                    <p className="text-sm text-slate-600">{bureau.commune}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                    <p className="font-medium text-slate-800">{bureau.president_email || 'Non renseignÃ©'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary-blue-50 rounded-lg">
                    <Phone className="w-4 h-4 text-primary-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">TÃ©lÃ©phone</p>
                    <p className="font-medium text-slate-800">{bureau.president_phone || 'Non renseignÃ©'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Code Bureau</p>
                  <BureauIdDisplay bureauCode={bureau.bureau_code} />
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Date de crÃ©ation</p>
                    <p className="font-medium text-slate-800">{formatDate(bureau.created_at)}</p>
                  </div>
                </div>

                {bureau.president_name && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">PrÃ©sident</p>
                    <Badge className="bg-primary-blue-600 text-white">
                      {bureau.president_name}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Monthly Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Objectif AdhÃ©rents</span>
                <span className="text-sm font-bold text-amber-600">
                  {stats.membersCount}/{monthlyGoal}
                </span>
              </div>
              <Progress value={monthlyProgress} className="h-2" />
              <p className="text-xs text-slate-500 mt-1">
                {monthlyProgress.toFixed(0)}% de l'objectif atteint
              </p>
            </div>

            <Separator />

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-blue-500" />
                  <span className="text-sm text-slate-600">Membres Bureau</span>
                </div>
                <span className="font-bold text-slate-800">{stats.workersCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-600">Total AdhÃ©rents</span>
                </div>
                <span className="font-bold text-slate-800">{stats.membersCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-slate-600">VÃ©hicules</span>
                </div>
                <span className="font-bold text-slate-800">{stats.motosCount}</span>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Statut</span>
              <Badge 
                className={bureau.status === 'active' 
                  ? "bg-primary-blue-100 text-primary-blue-700 hover:bg-primary-blue-100" 
                  : "bg-slate-100 text-slate-600"
                }
              >
                {bureau.status === 'active' ? 'â— Actif' : 'â—‹ Inactif'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
