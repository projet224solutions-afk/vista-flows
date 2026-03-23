/**
 * MODULE FREELANCE & ADMINISTRATIF PROFESSIONNEL
 * Inspiré de: Upwork, Fiverr, Notion, Freshbooks
 * Gestion complète des missions, contrats, facturation et suivi horaire
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Briefcase, FileText, Calculator, Users, DollarSign, Clock,
  Plus, CheckCircle, AlertCircle, TrendingUp, Star,
  Phone, Mail, Calendar, Timer, Receipt, FolderOpen
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface FreelanceModuleProps {
  serviceId: string;
  businessName?: string;
}

interface Mission {
  id: string;
  title: string;
  client: string;
  clientPhone: string;
  type: 'secretariat' | 'comptabilite' | 'rh' | 'traduction' | 'conseil' | 'juridique';
  status: 'en_cours' | 'termine' | 'en_attente' | 'facture';
  startDate: string;
  deadline: string;
  hoursEstimated: number;
  hoursWorked: number;
  budget: number;
  paid: number;
  priority: 'haute' | 'moyenne' | 'basse';
}

interface Client {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  totalMissions: number;
  totalPaid: number;
  rating: number;
}

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  secretariat: { label: 'Secrétariat', icon: '📋', color: 'bg-blue-100 text-blue-800' },
  comptabilite: { label: 'Comptabilité', icon: '🧮', color: 'bg-green-100 text-green-800' },
  rh: { label: 'Ressources Humaines', icon: '👥', color: 'bg-purple-100 text-purple-800' },
  traduction: { label: 'Traduction', icon: '🌍', color: 'bg-amber-100 text-amber-800' },
  conseil: { label: 'Conseil', icon: '💡', color: 'bg-cyan-100 text-cyan-800' },
  juridique: { label: 'Juridique', icon: '⚖️', color: 'bg-red-100 text-red-800' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  en_cours: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  termine: { label: 'Terminé', color: 'bg-green-100 text-green-800' },
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  facture: { label: 'Facturé', color: 'bg-purple-100 text-purple-800' },
};

const PRIORITY_COLORS: Record<string, string> = {
  haute: 'bg-red-500',
  moyenne: 'bg-yellow-500',
  basse: 'bg-green-500',
};

export function FreelanceModule({ serviceId, businessName }: FreelanceModuleProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewMission, setShowNewMission] = useState(false);

  const [missions] = useState<Mission[]>([
    {
      id: '1', title: 'Rédaction contrats fournisseurs', client: 'Groupe Alpha', clientPhone: '+224 621 00 00 00',
      type: 'juridique', status: 'en_cours', startDate: '2026-03-01', deadline: '2026-03-25',
      hoursEstimated: 40, hoursWorked: 28, budget: 2500000, paid: 1250000, priority: 'haute',
    },
    {
      id: '2', title: 'Comptabilité mensuelle Q1', client: 'PME Solutions', clientPhone: '+224 622 00 00 00',
      type: 'comptabilite', status: 'en_cours', startDate: '2026-03-05', deadline: '2026-03-30',
      hoursEstimated: 60, hoursWorked: 35, budget: 3000000, paid: 1500000, priority: 'moyenne',
    },
    {
      id: '3', title: 'Traduction documents techniques', client: 'ONG Santé+', clientPhone: '+224 623 00 00 00',
      type: 'traduction', status: 'termine', startDate: '2026-02-15', deadline: '2026-03-10',
      hoursEstimated: 20, hoursWorked: 18, budget: 800000, paid: 800000, priority: 'basse',
    },
    {
      id: '4', title: 'Recrutement développeurs', client: 'Tech Guinée', clientPhone: '+224 624 00 00 00',
      type: 'rh', status: 'en_attente', startDate: '2026-03-20', deadline: '2026-04-15',
      hoursEstimated: 30, hoursWorked: 0, budget: 1500000, paid: 0, priority: 'moyenne',
    },
  ]);

  const [clients] = useState<Client[]>([
    { id: '1', name: 'Mamadou Barry', company: 'Groupe Alpha', phone: '+224 621 00 00 00', email: 'mamadou@alpha.gn', totalMissions: 8, totalPaid: 12500000, rating: 5 },
    { id: '2', name: 'Fatou Diallo', company: 'PME Solutions', phone: '+224 622 00 00 00', email: 'fatou@pme.gn', totalMissions: 5, totalPaid: 7800000, rating: 4.8 },
    { id: '3', name: 'Dr. Camara', company: 'ONG Santé+', phone: '+224 623 00 00 00', email: 'camara@santeplus.org', totalMissions: 3, totalPaid: 2400000, rating: 4.9 },
  ]);

  // Stats
  const activeMissions = missions.filter(m => m.status === 'en_cours').length;
  const pendingMissions = missions.filter(m => m.status === 'en_attente').length;
  const totalRevenue = missions.reduce((acc, m) => acc + m.paid, 0);
  const pendingPayments = missions.reduce((acc, m) => acc + (m.budget - m.paid), 0);
  const totalHours = missions.reduce((acc, m) => acc + m.hoursWorked, 0);
  const avgHourlyRate = totalHours > 0 ? Math.round(totalRevenue / totalHours) : 0;
  const fc = useFormatCurrency();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Cabinet Administratif'}</h2>
            <p className="text-muted-foreground">Freelance & Services Professionnels</p>
          </div>
        </div>
        <Dialog open={showNewMission} onOpenChange={setShowNewMission}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle mission</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Créer une mission</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Titre</Label><Input placeholder="Ex: Audit comptable" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Client</Label><Input placeholder="Nom du client" /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Budget (GNF)</Label><Input type="number" placeholder="0" /></div>
                <div className="space-y-2"><Label>Heures estimées</Label><Input type="number" placeholder="0" /></div>
                <div className="space-y-2"><Label>Deadline</Label><Input type="date" /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Détails de la mission..." /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewMission(false)}>Annuler</Button>
              <Button onClick={() => { toast.success('Mission créée'); setShowNewMission(false); }}>Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <Briefcase className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{activeMissions}</p>
            <p className="text-xs opacity-80">Missions actives</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500 to-amber-500 text-white">
          <CardContent className="p-4">
            <Clock className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{pendingMissions}</p>
            <p className="text-xs opacity-80">En attente</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <DollarSign className="h-4 w-4 opacity-80" />
            <p className="text-lg font-bold mt-1">{(totalRevenue / 1e6).toFixed(1)}M</p>
            <p className="text-xs opacity-80">Revenus GNF</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <CardContent className="p-4">
            <AlertCircle className="h-4 w-4 opacity-80" />
            <p className="text-lg font-bold mt-1">{(pendingPayments / 1e6).toFixed(1)}M</p>
            <p className="text-xs opacity-80">Impayés GNF</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <CardContent className="p-4">
            <Timer className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{totalHours}h</p>
            <p className="text-xs opacity-80">Heures facturées</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
          <CardContent className="p-4">
            <TrendingUp className="h-4 w-4 opacity-80" />
            <p className="text-lg font-bold mt-1">{avgHourlyRate.toLocaleString()}</p>
            <p className="text-xs opacity-80">GNF/heure moy.</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard"><FolderOpen className="h-4 w-4 mr-1 hidden sm:inline" /> Missions</TabsTrigger>
          <TabsTrigger value="clients"><Users className="h-4 w-4 mr-1 hidden sm:inline" /> Clients</TabsTrigger>
          <TabsTrigger value="time"><Timer className="h-4 w-4 mr-1 hidden sm:inline" /> Temps</TabsTrigger>
          <TabsTrigger value="services"><Briefcase className="h-4 w-4 mr-1 hidden sm:inline" /> Services</TabsTrigger>
        </TabsList>

        {/* MISSIONS */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Mes missions ({missions.length})</h3>
          </div>
          <div className="space-y-3">
            {missions.map(mission => {
              const typeInfo = TYPE_LABELS[mission.type];
              const statusInfo = STATUS_LABELS[mission.status];
              const progress = mission.hoursEstimated > 0 ? Math.round((mission.hoursWorked / mission.hoursEstimated) * 100) : 0;
              return (
                <Card key={mission.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[mission.priority]}`} />
                          <h4 className="font-semibold truncate">{mission.title}</h4>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          <Badge className={typeInfo.color}>{typeInfo.icon} {typeInfo.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{mission.client}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-bold text-primary">{fc(mission.budget, 'GNF')}</p>
                        <p className="text-xs text-muted-foreground">Payé: {fc(mission.paid, 'GNF')}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>{mission.hoursWorked}h / {mission.hoursEstimated}h estimées</span>
                        <span className="font-bold">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>📅 Début: {mission.startDate}</span>
                      <span>⏰ Deadline: {mission.deadline}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* CLIENTS */}
        <TabsContent value="clients" className="space-y-4">
          <h3 className="font-semibold">Carnet de clients ({clients.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map(client => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-primary">{client.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{client.name}</h4>
                      <p className="text-xs text-muted-foreground">{client.company}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-medium">{client.rating}</span>
                        <span className="text-xs text-muted-foreground ml-2">{client.totalMissions} missions</span>
                      </div>
                      <p className="text-sm font-semibold text-primary mt-1">{fc(client.totalPaid, 'GNF')}</p>
                      <div className="flex gap-3 mt-2">
                        <a href={`tel:${client.phone}`} className="text-xs text-primary flex items-center gap-0.5"><Phone className="h-3 w-3" /></a>
                        <a href={`mailto:${client.email}`} className="text-xs text-primary flex items-center gap-0.5"><Mail className="h-3 w-3" /></a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TIME TRACKING */}
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Timer className="w-5 h-5" /> Suivi du temps</CardTitle>
              <CardDescription>Heures travaillées par mission</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {missions.filter(m => m.status === 'en_cours').map(mission => {
                  const progress = mission.hoursEstimated > 0 ? Math.round((mission.hoursWorked / mission.hoursEstimated) * 100) : 0;
                  return (
                    <div key={mission.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{mission.title}</p>
                        <p className="text-xs text-muted-foreground">{mission.client}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold">{mission.hoursWorked}h / {mission.hoursEstimated}h</p>
                        <Progress value={progress} className="h-1.5 w-24 mt-1" />
                      </div>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Timer className="h-3 w-3" /> Timer
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{totalHours}h</p>
                    <p className="text-xs text-muted-foreground">Total ce mois</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Math.round(totalHours / 20)}h</p>
                    <p className="text-xs text-muted-foreground">Moyenne/jour</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{avgHourlyRate.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">GNF/heure</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SERVICES */}
        <TabsContent value="services" className="space-y-4">
          <h3 className="font-semibold">Services proposés</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(TYPE_LABELS).map(([key, val]) => (
              <Card key={key} className="hover:border-primary transition-colors cursor-pointer group">
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{val.icon}</div>
                  <h3 className="font-bold">{val.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {missions.filter(m => m.type === key).length} mission(s)
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
