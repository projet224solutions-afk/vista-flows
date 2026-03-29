/**
 * MODULE COACH SPORTIF
 * Gestion de programmes, clients et rendez-vous de coaching
 */

import { useState } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dumbbell, 
  Users, 
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Plus,
  User,
  Activity,
  CheckCircle,
  Star,
  MapPin
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface CoachModuleProps {
  serviceId: string;
  businessName?: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  goal: string;
  level: 'debutant' | 'intermediaire' | 'avance';
  program: string;
  sessionsCompleted: number;
  totalSessions: number;
  progress: number;
  nextSession?: string;
  joinedAt: string;
}

interface Program {
  id: string;
  name: string;
  description: string;
  duration: string;
  sessionsPerWeek: number;
  level: 'debutant' | 'intermediaire' | 'avance';
  price: number;
  clientsEnrolled: number;
  exercises: string[];
}

interface Session {
  id: string;
  clientId: string;
  clientName: string;
  programName: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  status: 'planifiÃ©e' | 'en_cours' | 'terminÃ©e' | 'annulÃ©e';
  notes?: string;
}

export function CoachModule({ serviceId, businessName }: CoachModuleProps) {
  const [activeTab, setActiveTab] = useState('clients');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showNewProgramDialog, setShowNewProgramDialog] = useState(false);

  // DonnÃ©es simulÃ©es
  const [clients] = useState<Client[]>([
    {
      id: '1',
      name: 'Mamadou Diallo',
      phone: '+224 620 00 00 00',
      email: 'mamadou@email.com',
      age: 28,
      goal: 'Prise de masse',
      level: 'intermediaire',
      program: 'Musculation intensive',
      sessionsCompleted: 12,
      totalSessions: 24,
      progress: 50,
      nextSession: new Date().toISOString(),
      joinedAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Fatou Bah',
      phone: '+224 621 00 00 00',
      email: 'fatou@email.com',
      age: 32,
      goal: 'Perte de poids',
      level: 'debutant',
      program: 'Cardio & Fitness',
      sessionsCompleted: 8,
      totalSessions: 16,
      progress: 50,
      nextSession: new Date().toISOString(),
      joinedAt: '2024-02-01'
    },
    {
      id: '3',
      name: 'Ibrahim Camara',
      phone: '+224 622 00 00 00',
      email: 'ibrahim@email.com',
      age: 25,
      goal: 'PrÃ©paration compÃ©tition',
      level: 'avance',
      program: 'Performance athlÃ©tique',
      sessionsCompleted: 20,
      totalSessions: 30,
      progress: 67,
      joinedAt: '2024-01-01'
    }
  ]);

  const [programs] = useState<Program[]>([
    {
      id: '1',
      name: 'Musculation intensive',
      description: 'Programme pour dÃ©velopper la masse musculaire',
      duration: '3 mois',
      sessionsPerWeek: 4,
      level: 'intermediaire',
      price: 500000,
      clientsEnrolled: 5,
      exercises: ['Squats', 'DÃ©veloppÃ© couchÃ©', 'SoulevÃ© de terre', 'Rowing']
    },
    {
      id: '2',
      name: 'Cardio & Fitness',
      description: 'Programme de remise en forme et perte de poids',
      duration: '2 mois',
      sessionsPerWeek: 3,
      level: 'debutant',
      price: 400000,
      clientsEnrolled: 8,
      exercises: ['Course', 'HIIT', 'Corde Ã  sauter', 'Burpees']
    },
    {
      id: '3',
      name: 'Performance athlÃ©tique',
      description: 'PrÃ©paration pour compÃ©titions sportives',
      duration: '4 mois',
      sessionsPerWeek: 5,
      level: 'avance',
      price: 800000,
      clientsEnrolled: 3,
      exercises: ['Sprints', 'PliomÃ©trie', 'Force explosive', 'Endurance']
    }
  ]);

  const [sessions] = useState<Session[]>([
    {
      id: '1',
      clientId: '1',
      clientName: 'Mamadou Diallo',
      programName: 'Musculation intensive',
      date: new Date().toISOString().split('T')[0],
      time: '08:00',
      duration: 90,
      location: 'Salle de sport Kaloum',
      status: 'planifiÃ©e'
    },
    {
      id: '2',
      clientId: '2',
      clientName: 'Fatou Bah',
      programName: 'Cardio & Fitness',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      duration: 60,
      location: 'Parc Sandervalia',
      status: 'planifiÃ©e'
    },
    {
      id: '3',
      clientId: '3',
      clientName: 'Ibrahim Camara',
      programName: 'Performance athlÃ©tique',
      date: new Date().toISOString().split('T')[0],
      time: '17:00',
      duration: 120,
      location: 'Stade 28 Septembre',
      status: 'planifiÃ©e'
    }
  ]);

  const formatPrice = useFormatCurrency();

  const getLevelBadge = (level: 'debutant' | 'intermediaire' | 'avance') => {
    const styles = {
      debutant: 'bg-primary-orange-100 text-primary-orange-800',
      intermediaire: 'bg-yellow-100 text-yellow-800',
      avance: 'bg-red-100 text-red-800'
    };
    return <Badge className={styles[level]}>{level}</Badge>;
  };

  const getSessionStatusBadge = (status: Session['status']) => {
    const styles = {
      planifiee: 'bg-blue-100 text-blue-800',
      en_cours: 'bg-yellow-100 text-yellow-800',
      terminee: 'bg-primary-orange-100 text-primary-orange-800',
      annulee: 'bg-red-100 text-red-800'
    };
    const labels = {
      planifiee: 'Planifi\u00e9e',
      en_cours: 'En cours',
      terminee: 'Termin\u00e9e',
      annulee: 'Annul\u00e9e'
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const handleAddClient = () => {
    toast.success('Client ajoutÃ© avec succÃ¨s');
    setShowNewClientDialog(false);
  };

  const handleAddSession = () => {
    toast.success('SÃ©ance planifiÃ©e avec succÃ¨s');
    setShowNewSessionDialog(false);
  };

  const handleAddProgram = () => {
    toast.success('Programme crÃ©Ã© avec succÃ¨s');
    setShowNewProgramDialog(false);
  };

  // Statistiques
  const totalClients = clients.length;
  const todaySessions = sessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length;
  const activePrograms = programs.length;
  const avgProgress = Math.round(clients.reduce((acc, c) => acc + c.progress, 0) / clients.length);

  return (
    <div className="space-y-6">
      {/* En-tÃªte */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Dumbbell className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Coach Sportif'}</h2>
            <p className="text-muted-foreground">Gestion du coaching</p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Clients actifs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalClients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-orange-500" />
              <span className="text-sm text-muted-foreground">SÃ©ances aujourd'hui</span>
            </div>
            <p className="text-2xl font-bold mt-1">{todaySessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Programmes actifs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activePrograms}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Progression moy.</span>
            </div>
            <p className="text-2xl font-bold mt-1">{avgProgress}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="seances">SÃ©ances</TabsTrigger>
          <TabsTrigger value="programmes">Programmes</TabsTrigger>
        </TabsList>

        {/* Onglet Clients */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Mes clients</h3>
            <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un client</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    <Input placeholder="Nom et prÃ©nom" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>TÃ©lÃ©phone</Label>
                      <Input placeholder="+224 6XX XX XX XX" />
                    </div>
                    <div className="space-y-2">
                      <Label>Ã‚ge</Label>
                      <Input type="number" placeholder="25" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="email@exemple.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Objectif</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="SÃ©lectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prise_masse">Prise de masse</SelectItem>
                          <SelectItem value="perte_poids">Perte de poids</SelectItem>
                          <SelectItem value="endurance">Endurance</SelectItem>
                          <SelectItem value="competition">PrÃ©paration compÃ©tition</SelectItem>
                          <SelectItem value="remise_forme">Remise en forme</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Niveau</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="SÃ©lectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debutant">DÃ©butant</SelectItem>
                          <SelectItem value="intermediaire">IntermÃ©diaire</SelectItem>
                          <SelectItem value="avance">AvancÃ©</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Programme</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Assigner un programme" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewClientDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddClient}>
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {clients.map((client) => (
              <Card key={client.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{client.name}</h4>
                          {getLevelBadge(client.level)}
                        </div>
                        <p className="text-sm text-muted-foreground">{client.goal}</p>
                        <p className="text-sm text-primary">{client.program}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{client.age} ans</p>
                      <p className="text-xs text-muted-foreground">{client.phone}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{client.sessionsCompleted}/{client.totalSessions} sÃ©ances</span>
                    </div>
                    <Progress value={client.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet SÃ©ances */}
        <TabsContent value="seances" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Planning des sÃ©ances</h3>
            <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle sÃ©ance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Planifier une sÃ©ance</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="SÃ©lectionner un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Heure</Label>
                      <Input type="time" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>DurÃ©e (minutes)</Label>
                      <Input type="number" placeholder="60" />
                    </div>
                    <div className="space-y-2">
                      <Label>Lieu</Label>
                      <Input placeholder="Lieu de la sÃ©ance" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea placeholder="Notes pour la sÃ©ance..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewSessionDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddSession}>
                    Planifier
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{session.clientName}</h4>
                          {getSessionStatusBadge(session.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{session.programName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{session.date}</p>
                      <p className="text-sm text-primary">{session.time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Programmes */}
        <TabsContent value="programmes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Mes programmes</h3>
            <Dialog open={showNewProgramDialog} onOpenChange={setShowNewProgramDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau programme
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>CrÃ©er un programme</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom du programme</Label>
                    <Input placeholder="Ex: Musculation intensive" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="DÃ©crivez le programme..." />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>DurÃ©e</Label>
                      <Input placeholder="Ex: 3 mois" />
                    </div>
                    <div className="space-y-2">
                      <Label>SÃ©ances/semaine</Label>
                      <Input type="number" placeholder="4" />
                    </div>
                    <div className="space-y-2">
                      <Label>Niveau</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Niveau" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debutant">DÃ©butant</SelectItem>
                          <SelectItem value="intermediaire">IntermÃ©diaire</SelectItem>
                          <SelectItem value="avance">AvancÃ©</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Prix (GNF)</Label>
                    <Input type="number" placeholder="500000" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewProgramDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddProgram}>
                    CrÃ©er
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <Card key={program.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{program.name}</CardTitle>
                    {getLevelBadge(program.level)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{program.description}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DurÃ©e</span>
                      <span className="font-medium">{program.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SÃ©ances/semaine</span>
                      <span className="font-medium">{program.sessionsPerWeek}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clients inscrits</span>
                      <span className="font-medium">{program.clientsEnrolled}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-lg font-bold text-primary">{formatPrice(program.price)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CoachModule;
