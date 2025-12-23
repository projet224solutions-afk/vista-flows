/**
 * MODULE DÉVELOPPEUR WEB
 * Gestion du portfolio, projets et devis
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
  Code, 
  FolderGit2,
  FileText,
  Users,
  Clock,
  Plus,
  ExternalLink,
  DollarSign,
  CheckCircle,
  AlertCircle,
  GitBranch
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface DeveloperModuleProps {
  serviceId: string;
  businessName?: string;
}

interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  type: 'site_web' | 'application' | 'e-commerce' | 'mobile' | 'api';
  technologies: string[];
  status: 'en_cours' | 'termine' | 'en_attente' | 'maintenance';
  progress: number;
  startDate: string;
  deadline?: string;
  budget: number;
  paid: number;
}

interface Quote {
  id: string;
  clientName: string;
  clientEmail: string;
  projectType: string;
  description: string;
  estimatedBudget: number;
  status: 'en_attente' | 'accepte' | 'refuse' | 'expire';
  createdAt: string;
  validUntil: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  technologies: string[];
  imageUrl?: string;
  liveUrl?: string;
  githubUrl?: string;
  featured: boolean;
}

export function DeveloperModule({ serviceId, businessName }: DeveloperModuleProps) {
  const [activeTab, setActiveTab] = useState('projets');
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);

  // Données simulées
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'Plateforme E-commerce Mode',
      client: 'Boutique Fatou',
      description: 'Site e-commerce complet avec paiement mobile',
      type: 'e-commerce',
      technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
      status: 'en_cours',
      progress: 75,
      startDate: '2024-01-15',
      deadline: '2024-03-30',
      budget: 15000000,
      paid: 10000000
    },
    {
      id: '2',
      name: 'Application Mobile Livraison',
      client: 'Express Delivery GN',
      description: 'Application mobile de suivi de livraisons',
      type: 'mobile',
      technologies: ['React Native', 'Firebase', 'Google Maps'],
      status: 'en_cours',
      progress: 45,
      startDate: '2024-02-01',
      deadline: '2024-05-15',
      budget: 25000000,
      paid: 12500000
    },
    {
      id: '3',
      name: 'API Paiement Mobile',
      client: 'FinTech Guinée',
      description: 'API RESTful pour intégration paiement Orange/MTN',
      type: 'api',
      technologies: ['Node.js', 'Express', 'MongoDB'],
      status: 'termine',
      progress: 100,
      startDate: '2023-11-01',
      budget: 8000000,
      paid: 8000000
    }
  ]);

  const [quotes] = useState<Quote[]>([
    {
      id: '1',
      clientName: 'Restaurant Le Jardin',
      clientEmail: 'contact@lejardin.gn',
      projectType: 'Site vitrine + Réservation',
      description: 'Site web avec système de réservation en ligne',
      estimatedBudget: 5000000,
      status: 'en_attente',
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      clientName: 'Cabinet Dr. Diallo',
      clientEmail: 'drdiallo@email.com',
      projectType: 'Application de gestion',
      description: 'Application de gestion de patients et rendez-vous',
      estimatedBudget: 12000000,
      status: 'accepte',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      validUntil: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);

  const [portfolio] = useState<PortfolioItem[]>([
    {
      id: '1',
      title: '224Pay - Paiement Mobile',
      description: 'Application de paiement mobile multi-opérateurs',
      category: 'FinTech',
      technologies: ['React Native', 'Node.js', 'MongoDB'],
      liveUrl: 'https://224pay.com',
      featured: true
    },
    {
      id: '2',
      title: 'GuinéeShop',
      description: 'Marketplace e-commerce pour artisans guinéens',
      category: 'E-commerce',
      technologies: ['Next.js', 'Stripe', 'PostgreSQL'],
      liveUrl: 'https://guineeshop.com',
      githubUrl: 'https://github.com/example',
      featured: true
    },
    {
      id: '3',
      title: 'Conakry Events',
      description: 'Plateforme de gestion d\'événements',
      category: 'Événementiel',
      technologies: ['Vue.js', 'Laravel', 'MySQL'],
      liveUrl: 'https://conakry-events.com',
      featured: false
    }
  ]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-GN', { style: 'decimal' }).format(price) + ' GNF';
  };

  const getProjectStatusBadge = (status: Project['status']) => {
    const styles = {
      en_cours: 'bg-blue-100 text-blue-800',
      termine: 'bg-green-100 text-green-800',
      en_attente: 'bg-yellow-100 text-yellow-800',
      maintenance: 'bg-purple-100 text-purple-800'
    };
    const labels = {
      en_cours: 'En cours',
      termine: 'Terminé',
      en_attente: 'En attente',
      maintenance: 'Maintenance'
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getQuoteStatusBadge = (status: Quote['status']) => {
    const styles = {
      en_attente: 'bg-yellow-100 text-yellow-800',
      accepte: 'bg-green-100 text-green-800',
      refuse: 'bg-red-100 text-red-800',
      expire: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      en_attente: 'En attente',
      accepte: 'Accepté',
      refuse: 'Refusé',
      expire: 'Expiré'
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const handleAddProject = () => {
    toast.success('Projet créé avec succès');
    setShowNewProjectDialog(false);
  };

  const handleAddQuote = () => {
    toast.success('Devis envoyé avec succès');
    setShowNewQuoteDialog(false);
  };

  // Statistiques
  const activeProjects = projects.filter(p => p.status === 'en_cours').length;
  const pendingQuotes = quotes.filter(q => q.status === 'en_attente').length;
  const totalRevenue = projects.reduce((acc, p) => acc + p.paid, 0);
  const pendingPayments = projects.reduce((acc, p) => acc + (p.budget - p.paid), 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Code className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Développeur Web'}</h2>
            <p className="text-muted-foreground">Gestion des projets</p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Projets actifs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activeProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Devis en attente</span>
            </div>
            <p className="text-2xl font-bold mt-1">{pendingQuotes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Revenus</span>
            </div>
            <p className="text-lg font-bold mt-1">{formatPrice(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">En attente</span>
            </div>
            <p className="text-lg font-bold mt-1">{formatPrice(pendingPayments)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projets">Projets</TabsTrigger>
          <TabsTrigger value="devis">Devis</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        </TabsList>

        {/* Onglet Projets */}
        <TabsContent value="projets" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Mes projets</h3>
            <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau projet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un projet</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom du projet</Label>
                    <Input placeholder="Ex: Site e-commerce" />
                  </div>
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Input placeholder="Nom du client" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type de projet</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="site_web">Site web</SelectItem>
                        <SelectItem value="application">Application web</SelectItem>
                        <SelectItem value="e-commerce">E-commerce</SelectItem>
                        <SelectItem value="mobile">Application mobile</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Budget (GNF)</Label>
                      <Input type="number" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Deadline</Label>
                      <Input type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Description du projet..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddProject}>
                    Créer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{project.name}</h4>
                        {getProjectStatusBadge(project.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{project.client}</p>
                      <p className="text-xs text-muted-foreground mt-1">{project.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatPrice(project.budget)}</p>
                      <p className="text-xs text-muted-foreground">
                        Payé: {formatPrice(project.paid)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.technologies.map((tech, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                  {project.deadline && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Deadline: {project.deadline}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Devis */}
        <TabsContent value="devis" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Demandes de devis</h3>
            <Dialog open={showNewQuoteDialog} onOpenChange={setShowNewQuoteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un devis
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un devis</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nom du client</Label>
                    <Input placeholder="Nom complet" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="email@exemple.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type de projet</Label>
                    <Input placeholder="Ex: Site vitrine, E-commerce..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Description détaillée..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget estimé (GNF)</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewQuoteDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddQuote}>
                    Envoyer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {quotes.map((quote) => (
              <Card key={quote.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{quote.clientName}</h4>
                        {getQuoteStatusBadge(quote.status)}
                      </div>
                      <p className="text-sm text-primary">{quote.projectType}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {quote.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        📧 {quote.clientEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">
                        {formatPrice(quote.estimatedBudget)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Valide jusqu'au: {quote.validUntil.split('T')[0]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Portfolio */}
        <TabsContent value="portfolio" className="space-y-4">
          <h3 className="font-semibold">Mon portfolio</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                  <Code className="h-12 w-12 text-primary/50" />
                  {item.featured && (
                    <Badge className="absolute top-2 right-2 bg-yellow-100 text-yellow-800">
                      Featured
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                  <Badge variant="outline" className="mb-3">{item.category}</Badge>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.technologies.map((tech, i) => (
                      <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.liveUrl && (
                      <Button variant="outline" size="sm" className="flex-1">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Voir
                      </Button>
                    )}
                    {item.githubUrl && (
                      <Button variant="outline" size="sm" className="flex-1">
                        <GitBranch className="h-3 w-3 mr-1" />
                        Code
                      </Button>
                    )}
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

export default DeveloperModule;
