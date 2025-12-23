/**
 * MODULE GYM/FITNESS
 * Inspiré de ClassPass, Mindbody, Gympass
 * Gestion abonnements, cours, planning, suivi membres
 */

import { useState } from 'react';
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
  Plus,
  CreditCard,
  TrendingUp,
  User,
  Activity,
  Target,
  Flame,
  Award,
  CheckCircle,
  Timer,
  Heart
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface FitnessModuleProps {
  serviceId: string;
  businessName?: string;
}

interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  photo?: string;
  membership: string;
  membershipStatus: 'actif' | 'expire' | 'suspendu';
  startDate: string;
  endDate: string;
  checkIns: number;
  lastVisit?: string;
  goals: string[];
}

interface FitnessClass {
  id: string;
  name: string;
  instructor: string;
  category: 'cardio' | 'musculation' | 'yoga' | 'crossfit' | 'danse' | 'boxe';
  date: string;
  time: string;
  duration: number;
  maxParticipants: number;
  enrolled: number;
  room: string;
  level: 'débutant' | 'intermédiaire' | 'avancé';
  calories: number;
}

interface Subscription {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: 'mensuel' | 'trimestriel' | 'annuel';
  features: string[];
  activeMembers: number;
  color: string;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  status: 'disponible' | 'en_utilisation' | 'maintenance';
  lastMaintenance: string;
}

export function FitnessModule({ serviceId, businessName }: FitnessModuleProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewMemberDialog, setShowNewMemberDialog] = useState(false);
  const [showNewClassDialog, setShowNewClassDialog] = useState(false);
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Données simulées
  const [members] = useState<Member[]>([
    {
      id: '1',
      name: 'Mamadou Diallo',
      phone: '+224 620 00 00 00',
      email: 'mamadou@email.com',
      membership: 'Premium',
      membershipStatus: 'actif',
      startDate: '2024-01-15',
      endDate: '2025-01-15',
      checkIns: 45,
      lastVisit: new Date().toISOString(),
      goals: ['Perte de poids', 'Musculation']
    },
    {
      id: '2',
      name: 'Fatou Bah',
      phone: '+224 621 00 00 00',
      email: 'fatou@email.com',
      membership: 'Standard',
      membershipStatus: 'actif',
      startDate: '2024-02-01',
      endDate: '2024-05-01',
      checkIns: 28,
      lastVisit: new Date(Date.now() - 86400000).toISOString(),
      goals: ['Cardio', 'Flexibilité']
    },
    {
      id: '3',
      name: 'Ibrahim Camara',
      phone: '+224 622 00 00 00',
      email: 'ibrahim@email.com',
      membership: 'VIP',
      membershipStatus: 'actif',
      startDate: '2023-06-01',
      endDate: '2024-06-01',
      checkIns: 156,
      lastVisit: new Date().toISOString(),
      goals: ['Compétition', 'Force']
    }
  ]);

  const [classes] = useState<FitnessClass[]>([
    {
      id: '1',
      name: 'Power Yoga',
      instructor: 'Aïcha Sow',
      category: 'yoga',
      date: selectedDate,
      time: '07:00',
      duration: 60,
      maxParticipants: 20,
      enrolled: 15,
      room: 'Studio A',
      level: 'intermédiaire',
      calories: 300
    },
    {
      id: '2',
      name: 'HIIT Extreme',
      instructor: 'Moussa Barry',
      category: 'cardio',
      date: selectedDate,
      time: '09:00',
      duration: 45,
      maxParticipants: 25,
      enrolled: 22,
      room: 'Salle principale',
      level: 'avancé',
      calories: 500
    },
    {
      id: '3',
      name: 'CrossFit Foundations',
      instructor: 'Alpha Diallo',
      category: 'crossfit',
      date: selectedDate,
      time: '11:00',
      duration: 60,
      maxParticipants: 15,
      enrolled: 12,
      room: 'Box CrossFit',
      level: 'débutant',
      calories: 450
    },
    {
      id: '4',
      name: 'Boxe Fitness',
      instructor: 'Ibrahima Keita',
      category: 'boxe',
      date: selectedDate,
      time: '17:00',
      duration: 60,
      maxParticipants: 20,
      enrolled: 18,
      room: 'Ring',
      level: 'intermédiaire',
      calories: 600
    },
    {
      id: '5',
      name: 'Zumba Party',
      instructor: 'Mariama Sylla',
      category: 'danse',
      date: selectedDate,
      time: '18:30',
      duration: 60,
      maxParticipants: 30,
      enrolled: 28,
      room: 'Studio B',
      level: 'débutant',
      calories: 400
    }
  ]);

  const [subscriptions] = useState<Subscription[]>([
    {
      id: '1',
      name: 'Basic',
      description: 'Accès salle de musculation',
      price: 150000,
      duration: 'mensuel',
      features: ['Accès équipements', 'Vestiaires', 'WiFi'],
      activeMembers: 45,
      color: 'bg-gray-500'
    },
    {
      id: '2',
      name: 'Standard',
      description: 'Accès complet + cours collectifs',
      price: 250000,
      duration: 'mensuel',
      features: ['Tout Basic', 'Cours collectifs illimités', 'Sauna'],
      activeMembers: 78,
      color: 'bg-blue-500'
    },
    {
      id: '3',
      name: 'Premium',
      description: 'Accès VIP avec coach personnel',
      price: 400000,
      duration: 'mensuel',
      features: ['Tout Standard', '4 séances coaching/mois', 'Nutrition', 'Serviettes'],
      activeMembers: 32,
      color: 'bg-purple-500'
    },
    {
      id: '4',
      name: 'VIP Annuel',
      description: 'Accès illimité premium toute l\'année',
      price: 4000000,
      duration: 'annuel',
      features: ['Tout Premium', 'Coaching illimité', 'Invités gratuits', 'Parking'],
      activeMembers: 15,
      color: 'bg-yellow-500'
    }
  ]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-GN', { style: 'decimal' }).format(price) + ' GNF';
  };

  const getMembershipBadge = (status: Member['membershipStatus']) => {
    const styles = {
      actif: 'bg-green-100 text-green-800',
      expire: 'bg-red-100 text-red-800',
      suspendu: 'bg-yellow-100 text-yellow-800'
    };
    const labels = {
      actif: 'Actif',
      expire: 'Expiré',
      suspendu: 'Suspendu'
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getCategoryBadge = (category: FitnessClass['category']) => {
    const styles = {
      cardio: 'bg-red-100 text-red-800',
      musculation: 'bg-blue-100 text-blue-800',
      yoga: 'bg-green-100 text-green-800',
      crossfit: 'bg-orange-100 text-orange-800',
      danse: 'bg-pink-100 text-pink-800',
      boxe: 'bg-purple-100 text-purple-800'
    };
    return <Badge className={styles[category]}>{category}</Badge>;
  };

  const getLevelBadge = (level: FitnessClass['level']) => {
    const styles = {
      débutant: 'bg-green-100 text-green-800',
      intermédiaire: 'bg-yellow-100 text-yellow-800',
      avancé: 'bg-red-100 text-red-800'
    };
    return <Badge variant="outline" className={styles[level]}>{level}</Badge>;
  };

  const handleAddMember = () => {
    toast.success('Membre inscrit avec succès');
    setShowNewMemberDialog(false);
  };

  const handleAddClass = () => {
    toast.success('Cours ajouté au planning');
    setShowNewClassDialog(false);
  };

  // Statistiques
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.membershipStatus === 'actif').length;
  const todayCheckIns = 23; // Simulé
  const todayClasses = classes.length;
  const monthlyRevenue = subscriptions.reduce((acc, s) => {
    const multiplier = s.duration === 'annuel' ? 1/12 : s.duration === 'trimestriel' ? 1/3 : 1;
    return acc + (s.price * s.activeMembers * multiplier);
  }, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Gym & Fitness'}</h2>
            <p className="text-muted-foreground">Gestion du centre fitness</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success('Check-in rapide activé')}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Check-in
          </Button>
        </div>
      </div>

      {/* Statistiques temps réel */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 opacity-90">
              <Users className="h-4 w-4" />
              <span className="text-sm">Membres actifs</span>
            </div>
            <p className="text-3xl font-bold mt-1">{activeMembers}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 opacity-90">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Check-ins aujourd'hui</span>
            </div>
            <p className="text-3xl font-bold mt-1">{todayCheckIns}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 opacity-90">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Cours aujourd'hui</span>
            </div>
            <p className="text-3xl font-bold mt-1">{todayClasses}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 opacity-90">
              <Activity className="h-4 w-4" />
              <span className="text-sm">En salle maintenant</span>
            </div>
            <p className="text-3xl font-bold mt-1">12</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 opacity-90">
              <Flame className="h-4 w-4" />
              <span className="text-sm">Calories brûlées</span>
            </div>
            <p className="text-3xl font-bold mt-1">45K</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 opacity-90">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Revenus/mois</span>
            </div>
            <p className="text-lg font-bold mt-1">{formatPrice(monthlyRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Planning</TabsTrigger>
          <TabsTrigger value="membres">Membres</TabsTrigger>
          <TabsTrigger value="cours">Cours</TabsTrigger>
          <TabsTrigger value="abonnements">Abonnements</TabsTrigger>
        </TabsList>

        {/* Dashboard / Planning */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Planning du jour - {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            <Dialog open={showNewClassDialog} onOpenChange={setShowNewClassDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un cours
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un cours</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom du cours</Label>
                    <Input placeholder="Ex: Power Yoga" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Catégorie</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cardio">Cardio</SelectItem>
                          <SelectItem value="musculation">Musculation</SelectItem>
                          <SelectItem value="yoga">Yoga</SelectItem>
                          <SelectItem value="crossfit">CrossFit</SelectItem>
                          <SelectItem value="danse">Danse</SelectItem>
                          <SelectItem value="boxe">Boxe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Niveau</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="débutant">Débutant</SelectItem>
                          <SelectItem value="intermédiaire">Intermédiaire</SelectItem>
                          <SelectItem value="avancé">Avancé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Instructeur</Label>
                    <Input placeholder="Nom de l'instructeur" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Heure</Label>
                      <Input type="time" />
                    </div>
                    <div className="space-y-2">
                      <Label>Durée (min)</Label>
                      <Input type="number" placeholder="60" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Salle</Label>
                      <Input placeholder="Studio A" />
                    </div>
                    <div className="space-y-2">
                      <Label>Places max</Label>
                      <Input type="number" placeholder="20" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewClassDialog(false)}>Annuler</Button>
                  <Button onClick={handleAddClass}>Ajouter</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {classes.map((fitnessClass) => (
              <Card key={fitnessClass.id} className="overflow-hidden">
                <div className="flex">
                  <div className="w-24 bg-gradient-to-br from-primary/20 to-primary/5 flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-2xl font-bold">{fitnessClass.time}</p>
                    <p className="text-sm text-muted-foreground">{fitnessClass.duration} min</p>
                  </div>
                  <CardContent className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-lg">{fitnessClass.name}</h4>
                          {getCategoryBadge(fitnessClass.category)}
                          {getLevelBadge(fitnessClass.level)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          👤 {fitnessClass.instructor} • 📍 {fitnessClass.room}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-sm">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span>{fitnessClass.calories} cal</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Timer className="h-4 w-4 text-blue-500" />
                            <span>{fitnessClass.duration} min</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {fitnessClass.enrolled}/{fitnessClass.maxParticipants}
                          </span>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Progress 
                          value={(fitnessClass.enrolled / fitnessClass.maxParticipants) * 100} 
                          className="h-2 w-24 mt-2"
                        />
                        <Button size="sm" className="mt-2">
                          Inscrire
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Membres */}
        <TabsContent value="membres" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Input placeholder="Rechercher un membre..." className="pl-10" />
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Dialog open={showNewMemberDialog} onOpenChange={setShowNewMemberDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau membre
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Inscrire un nouveau membre</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    <Input placeholder="Nom et prénom" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input placeholder="+224 6XX XX XX XX" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@exemple.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Abonnement</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                      <SelectContent>
                        {subscriptions.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} - {formatPrice(s.price)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Objectifs fitness</Label>
                    <Textarea placeholder="Perte de poids, musculation, cardio..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewMemberDialog(false)}>Annuler</Button>
                  <Button onClick={handleAddMember}>Inscrire</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {members.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{member.name}</h4>
                          <Badge className={subscriptions.find(s => s.name === member.membership)?.color + ' text-white'}>
                            {member.membership}
                          </Badge>
                          {getMembershipBadge(member.membershipStatus)}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.phone} • {member.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {member.checkIns} check-ins
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-blue-500" />
                            Expire: {member.endDate}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1">
                        {member.goals.map((goal, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{goal}</Badge>
                        ))}
                      </div>
                      <Button size="sm" variant="outline">
                        Voir profil
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cours */}
        <TabsContent value="cours" className="space-y-4">
          <h3 className="font-semibold">Catalogue des cours</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {['Cardio', 'Musculation', 'Yoga', 'CrossFit', 'Danse', 'Boxe'].map((category) => (
              <Card key={category} className="overflow-hidden">
                <div className={`h-20 bg-gradient-to-br ${
                  category === 'Cardio' ? 'from-red-500 to-red-600' :
                  category === 'Musculation' ? 'from-blue-500 to-blue-600' :
                  category === 'Yoga' ? 'from-green-500 to-green-600' :
                  category === 'CrossFit' ? 'from-orange-500 to-orange-600' :
                  category === 'Danse' ? 'from-pink-500 to-pink-600' :
                  'from-purple-500 to-purple-600'
                } flex items-center justify-center`}>
                  <span className="text-white text-2xl font-bold">{category}</span>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {classes.filter(c => c.category === category.toLowerCase()).length} cours/semaine
                    </span>
                    <Badge variant="outline">Tous niveaux</Badge>
                  </div>
                  <Button className="w-full" size="sm">Voir planning</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Abonnements */}
        <TabsContent value="abonnements" className="space-y-4">
          <h3 className="font-semibold">Plans d'abonnement</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {subscriptions.map((sub) => (
              <Card key={sub.id} className="relative overflow-hidden">
                <div className={`h-2 ${sub.color}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{sub.name}</CardTitle>
                    <Badge variant="outline">{sub.duration}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{sub.description}</p>
                  <p className="text-2xl font-bold text-primary mb-4">{formatPrice(sub.price)}</p>
                  <ul className="space-y-2 mb-4">
                    {sub.features.map((feature, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      {sub.activeMembers} membres actifs
                    </p>
                    <Button className="w-full">Souscrire</Button>
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

export default FitnessModule;
