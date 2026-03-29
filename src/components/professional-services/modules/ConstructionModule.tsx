/**
 * MODULE CONSTRUCTION & BTP PROFESSIONNEL
 * Plateforme complÃ¨te de gestion de chantiers, professionnels, devis et matÃ©riaux
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  HardHat, Building, Plus, Users, FileText, Package, 
  TrendingUp, Clock, CheckCircle2, AlertTriangle, MapPin,
  Loader2, Trash2, Eye, Star, Phone, Mail
} from 'lucide-react';
import { useBTPData } from '@/hooks/useBTPData';
import { NewProjectDialog } from './construction/NewProjectDialog';
import { AddProfessionalDialog } from './construction/AddProfessionalDialog';
import { QuoteRequestDialog } from './construction/QuoteRequestDialog';
import { AddMaterialDialog } from './construction/AddMaterialDialog';
import { ProjectDetailDialog } from './construction/ProjectDetailDialog';
import type { BTPProject, BTPQuote } from '@/hooks/useBTPData';

interface ConstructionModuleProps {
  serviceId: string;
  businessName?: string;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  maison: 'ðŸ  Maison', immeuble: 'ðŸ¢ Immeuble', renovation: 'ðŸ”§ RÃ©novation',
  route: 'ðŸ›£ï¸ Route', pont: 'ðŸŒ‰ Pont', bureau: 'ðŸ¬ Bureau',
  entrepot: 'ðŸ­ EntrepÃ´t', autre: 'ðŸ“ Autre',
};

const STATUS_COLORS: Record<string, string> = {
  planifie: 'bg-muted text-muted-foreground',
  en_cours: 'bg-blue-100 text-blue-800',
  en_pause: 'bg-amber-100 text-amber-800',
  termine: 'bg-primary-orange-100 text-primary-orange-800',
  annule: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  planifie: 'PlanifiÃ©', en_cours: 'En cours', en_pause: 'En pause',
  termine: 'TerminÃ©', annule: 'AnnulÃ©',
};

const SPECIALTY_LABELS: Record<string, string> = {
  macon: 'ðŸ§± MaÃ§on', electricien: 'âš¡ Ã‰lectricien', plombier: 'ðŸ”§ Plombier',
  architecte: 'ðŸ“ Architecte', ingenieur: 'ðŸ‘· IngÃ©nieur', menuisier: 'ðŸªš Menuisier',
  peintre: 'ðŸŽ¨ Peintre', carreleur: 'ðŸ”² Carreleur', soudeur: 'ðŸ”¥ Soudeur',
  chef_chantier: 'ðŸ—ï¸ Chef de chantier',
};

const QUOTE_STATUS: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente', color: 'bg-amber-100 text-amber-800' },
  repondu: { label: 'RÃ©pondu', color: 'bg-primary-orange-100 text-primary-orange-800' },
  accepte: { label: 'AcceptÃ©', color: 'bg-blue-100 text-blue-800' },
  refuse: { label: 'RefusÃ©', color: 'bg-red-100 text-red-800' },
};

export function ConstructionModule({ serviceId, businessName }: ConstructionModuleProps) {
  const { 
    projects, professionals, quotes, materials,
    stats, loading, saving,
    createProject, updateProject, deleteProject,
    addProfessional, createQuote, respondToQuote,
    addMaterial, addTask, fetchTasks,
    addDailyReport, fetchDailyReports,
    refresh,
  } = useBTPData(serviceId);

  const [activeTab, setActiveTab] = useState('projets');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showAddPro, setShowAddPro] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showMaterial, setShowMaterial] = useState(false);
  const [selectedProject, setSelectedProject] = useState<BTPProject | null>(null);
  const [respondingQuote, setRespondingQuote] = useState<BTPQuote | null>(null);
  const [quoteResponse, setQuoteResponse] = useState({ estimated_cost: '', estimated_duration: '', response_details: '' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <HardHat className="w-7 h-7 text-primary" />
            {businessName || 'Construction & BTP'}
          </h2>
          <p className="text-muted-foreground text-sm">Gestion de chantiers, professionnels et matÃ©riaux</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10"><Building className="h-4 w-4 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.totalProjects}</p>
                <p className="text-xs text-muted-foreground">Projets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100"><Clock className="h-4 w-4 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.activeProjects}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100"><Users className="h-4 w-4 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.totalProfessionals}</p>
                <p className="text-xs text-muted-foreground">Professionnels</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary-orange-100"><TrendingUp className="h-4 w-4 text-primary-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.totalBudget > 0 ? `${(stats.totalBudget / 1e6).toFixed(0)}M` : '0'}</p>
                <p className="text-xs text-muted-foreground">Budget GNF</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="projets"><Building className="h-4 w-4 mr-1 hidden sm:inline" /> Projets</TabsTrigger>
          <TabsTrigger value="equipe"><Users className="h-4 w-4 mr-1 hidden sm:inline" /> Ã‰quipe</TabsTrigger>
          <TabsTrigger value="devis"><FileText className="h-4 w-4 mr-1 hidden sm:inline" /> Devis</TabsTrigger>
          <TabsTrigger value="materiaux"><Package className="h-4 w-4 mr-1 hidden sm:inline" /> MatÃ©riaux</TabsTrigger>
        </TabsList>

        {/* ===== PROJETS ===== */}
        <TabsContent value="projets" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Mes projets ({projects.length})</h3>
            <Button onClick={() => setShowNewProject(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nouveau projet
            </Button>
          </div>

          {projects.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Building className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun projet. CrÃ©ez votre premier projet de construction !</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map(project => (
                <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedProject(project)}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate">{project.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {PROJECT_TYPE_LABELS[project.project_type] || project.project_type}
                          {project.city && <> â€¢ <MapPin className="h-3 w-3 inline" /> {project.city}</>}
                        </p>
                      </div>
                      <Badge className={STATUS_COLORS[project.status] || ''}>{STATUS_LABELS[project.status] || project.status}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Progression</span>
                        <span className="font-bold">{project.progress_percent}%</span>
                      </div>
                      <Progress value={project.progress_percent} className="h-2" />
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                      <span>ðŸ’° {Number(project.budget_estimated).toLocaleString()} GNF</span>
                      <span>ðŸ“… {project.estimated_duration_days}j</span>
                    </div>
                    <div className="flex justify-end gap-1 mt-2" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedProject(project)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteProject(project.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== Ã‰QUIPE ===== */}
        <TabsContent value="equipe" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Professionnels ({professionals.length})</h3>
            <Button onClick={() => setShowAddPro(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>

          {professionals.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun professionnel. Ajoutez votre Ã©quipe !</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {professionals.map(pro => (
                <Card key={pro.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-lg">{(SPECIALTY_LABELS[pro.specialty] || 'ðŸ‘·').split(' ')[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{pro.name}</h4>
                        <p className="text-xs text-muted-foreground">{SPECIALTY_LABELS[pro.specialty] || pro.specialty}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {pro.experience_years > 0 && <span className="text-xs text-muted-foreground">{pro.experience_years} ans</span>}
                          {pro.rating > 0 && <span className="text-xs flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-500 fill-amber-500" />{pro.rating}</span>}
                          <Badge variant={pro.is_available ? 'default' : 'secondary'} className="text-[10px]">{pro.is_available ? 'Dispo' : 'OccupÃ©'}</Badge>
                        </div>
                        {pro.city && <p className="text-xs text-muted-foreground mt-1"><MapPin className="h-3 w-3 inline" /> {pro.city}</p>}
                        <div className="flex gap-2 mt-2">
                          {pro.phone && <a href={`tel:${pro.phone}`} className="text-xs text-primary flex items-center gap-0.5"><Phone className="h-3 w-3" /></a>}
                          {pro.email && <a href={`mailto:${pro.email}`} className="text-xs text-primary flex items-center gap-0.5"><Mail className="h-3 w-3" /></a>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== DEVIS ===== */}
        <TabsContent value="devis" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Demandes de devis ({quotes.length})</h3>
            <Button onClick={() => setShowQuote(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nouveau devis
            </Button>
          </div>

          {quotes.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune demande de devis</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {quotes.map(quote => {
                const qs = QUOTE_STATUS[quote.status] || QUOTE_STATUS['en_attente'];
                return (
                  <Card key={quote.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm">{quote.client_name}</h4>
                          <p className="text-xs text-muted-foreground">{PROJECT_TYPE_LABELS[quote.project_type] || quote.project_type} â€¢ {quote.location || 'Non prÃ©cisÃ©'}</p>
                          <p className="text-sm mt-1">{quote.description}</p>
                          {quote.budget_range && <p className="text-xs text-muted-foreground mt-1">Budget: {quote.budget_range}</p>}
                        </div>
                        <Badge className={qs.color}>{qs.label}</Badge>
                      </div>

                      {quote.status === 'en_attente' && (
                        respondingQuote?.id === quote.id ? (
                          <div className="mt-3 space-y-2 border-t border-border pt-3">
                            <div className="grid grid-cols-2 gap-2">
                              <input className="border border-border rounded-md px-3 py-1.5 text-sm bg-background" type="number" placeholder="CoÃ»t estimÃ© (GNF)"
                                value={quoteResponse.estimated_cost} onChange={e => setQuoteResponse(p => ({ ...p, estimated_cost: e.target.value }))} />
                              <input className="border border-border rounded-md px-3 py-1.5 text-sm bg-background" placeholder="DurÃ©e (ex: 3 mois)"
                                value={quoteResponse.estimated_duration} onChange={e => setQuoteResponse(p => ({ ...p, estimated_duration: e.target.value }))} />
                            </div>
                            <textarea className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background" rows={2} placeholder="DÃ©tails du devis..."
                              value={quoteResponse.response_details} onChange={e => setQuoteResponse(p => ({ ...p, response_details: e.target.value }))} />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setRespondingQuote(null)}>Annuler</Button>
                              <Button size="sm" onClick={async () => {
                                await respondToQuote(quote.id, {
                                  estimated_cost: parseFloat(quoteResponse.estimated_cost) || 0,
                                  estimated_duration: quoteResponse.estimated_duration,
                                  response_details: quoteResponse.response_details,
                                });
                                setRespondingQuote(null);
                                setQuoteResponse({ estimated_cost: '', estimated_duration: '', response_details: '' });
                              }}>Envoyer le devis</Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => setRespondingQuote(quote)}>
                            RÃ©pondre au devis
                          </Button>
                        )
                      )}

                      {quote.status === 'repondu' && (
                        <div className="mt-2 bg-muted/50 rounded-lg p-3 text-sm">
                          <p>ðŸ’° {Number(quote.estimated_cost).toLocaleString()} GNF â€¢ â± {quote.estimated_duration}</p>
                          {quote.response_details && <p className="text-muted-foreground mt-1">{quote.response_details}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== MATÃ‰RIAUX ===== */}
        <TabsContent value="materiaux" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">MatÃ©riaux ({materials.length})</h3>
            <Button onClick={() => setShowMaterial(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>

          {materials.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun matÃ©riau ajoutÃ©</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {materials.map(mat => (
                <Card key={mat.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm">{mat.name}</h4>
                        <p className="text-xs text-muted-foreground">{mat.category}</p>
                      </div>
                      <Badge variant={mat.is_available ? 'default' : 'secondary'} className="text-xs">
                        {mat.is_available ? 'En stock' : 'Ã‰puisÃ©'}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      <p>ðŸ’° {Number(mat.unit_price).toLocaleString()} GNF / {mat.unit}</p>
                      <p className="text-muted-foreground">ðŸ“¦ {mat.quantity_available} {mat.unit}(s) disponibles</p>
                    </div>
                    {mat.supplier_name && (
                      <p className="text-xs text-muted-foreground mt-2">ðŸ­ {mat.supplier_name} {mat.supplier_phone && `â€¢ ${mat.supplier_phone}`}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewProjectDialog open={showNewProject} onClose={() => setShowNewProject(false)} onSubmit={createProject} saving={saving} />
      <AddProfessionalDialog open={showAddPro} onClose={() => setShowAddPro(false)} onSubmit={addProfessional} saving={saving} />
      <QuoteRequestDialog open={showQuote} onClose={() => setShowQuote(false)} onSubmit={createQuote} saving={saving} />
      <AddMaterialDialog open={showMaterial} onClose={() => setShowMaterial(false)} onSubmit={addMaterial} saving={saving} />
      
      {selectedProject && (
        <ProjectDetailDialog
          project={selectedProject}
          professionals={professionals}
          open={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdateProject={updateProject}
          onAddTask={addTask}
          onFetchTasks={fetchTasks}
          onAddReport={addDailyReport}
          onFetchReports={fetchDailyReports}
        />
      )}
    </div>
  );
}
