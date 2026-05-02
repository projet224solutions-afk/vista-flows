/**
 * MODULE ÉDUCATION / FORMATION PROFESSIONNEL
 * Inspiré de: Udemy, Coursera, Teachable
 * Gestion complète: cours, étudiants, planning, évaluations
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { _Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  GraduationCap, Users, BookOpen, Calendar, Clock,
  Plus, _CheckCircle, Star, Award, _TrendingUp,
  DollarSign, _FileText, _Video, ClipboardList
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface EducationModuleProps {
  serviceId: string;
  businessName?: string;
}

interface Course {
  id: string;
  title: string;
  category: string;
  level: 'débutant' | 'intermédiaire' | 'avancé';
  instructor: string;
  duration: string;
  enrolled: number;
  maxStudents: number;
  price: number;
  rating: number;
  status: 'actif' | 'brouillon' | 'complet' | 'archive';
  format: 'presentiel' | 'en_ligne' | 'hybride';
  startDate: string;
}

interface Student {
  id: string;
  name: string;
  phone: string;
  coursesEnrolled: number;
  completionRate: number;
  totalPaid: number;
  status: 'actif' | 'diplome' | 'inactif';
}

const CATEGORIES = [
  { id: 'languages', name: 'Langues', emoji: '🌍' },
  { id: 'tech', name: 'Informatique', emoji: '💻' },
  { id: 'business', name: 'Gestion & Business', emoji: '📊' },
  { id: 'skills', name: 'Compétences Pro', emoji: '🎯' },
  { id: 'arts', name: 'Arts & Création', emoji: '🎨' },
  { id: 'health', name: 'Santé & Social', emoji: '💊' },
];

const LEVEL_COLORS: Record<string, string> = {
  débutant: 'bg-green-100 text-green-800',
  intermédiaire: 'bg-yellow-100 text-yellow-800',
  avancé: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, { label: string; color: string }> = {
  actif: { label: 'Actif', color: 'bg-green-100 text-green-800' },
  brouillon: { label: 'Brouillon', color: 'bg-muted text-muted-foreground' },
  complet: { label: 'Complet', color: 'bg-blue-100 text-blue-800' },
  archive: { label: 'Archivé', color: 'bg-muted text-muted-foreground' },
};

export function EducationModule({ _serviceId, businessName }: EducationModuleProps) {
  const [activeTab, setActiveTab] = useState('courses');
  const [showNewCourse, setShowNewCourse] = useState(false);

  const [courses] = useState<Course[]>([
    { id: '1', title: 'Anglais des affaires - Niveau B2', category: 'languages', level: 'intermédiaire', instructor: 'M. Johnson', duration: '3 mois', enrolled: 18, maxStudents: 25, price: 500000, rating: 4.8, status: 'actif', format: 'hybride', startDate: '2026-03-01' },
    { id: '2', title: 'Excel & Comptabilité pour PME', category: 'business', level: 'débutant', instructor: 'Mme Diallo', duration: '6 semaines', enrolled: 22, maxStudents: 20, price: 350000, rating: 4.9, status: 'complet', format: 'presentiel', startDate: '2026-02-15' },
    { id: '3', title: 'Développement Web (React)', category: 'tech', level: 'intermédiaire', instructor: 'M. Camara', duration: '4 mois', enrolled: 12, maxStudents: 15, price: 800000, rating: 4.7, status: 'actif', format: 'en_ligne', startDate: '2026-03-10' },
    { id: '4', title: 'Marketing Digital & Réseaux Sociaux', category: 'business', level: 'débutant', instructor: 'Mme Sow', duration: '2 mois', enrolled: 0, maxStudents: 30, price: 250000, rating: 0, status: 'brouillon', format: 'en_ligne', startDate: '2026-04-01' },
  ]);

  const [students] = useState<Student[]>([
    { id: '1', name: 'Amadou Bah', phone: '+224 621 00 00 00', coursesEnrolled: 2, completionRate: 78, totalPaid: 850000, status: 'actif' },
    { id: '2', name: 'Fatoumata Keita', phone: '+224 622 00 00 00', coursesEnrolled: 1, completionRate: 100, totalPaid: 500000, status: 'diplome' },
    { id: '3', name: 'Ibrahim Sylla', phone: '+224 623 00 00 00', coursesEnrolled: 3, completionRate: 45, totalPaid: 1650000, status: 'actif' },
  ]);

  // Stats
  const activeCourses = courses.filter(c => c.status === 'actif').length;
  const _totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'actif').length;
  const totalRevenue = students.reduce((acc, s) => acc + s.totalPaid, 0);
  const avgRating = courses.filter(c => c.rating > 0).reduce((acc, c, _, arr) => acc + c.rating / arr.length, 0);
  const totalEnrolled = courses.reduce((acc, c) => acc + c.enrolled, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{businessName || 'Centre de Formation'}</h2>
            <p className="text-muted-foreground">Cours, formations & certifications</p>
          </div>
        </div>
        <Dialog open={showNewCourse} onOpenChange={setShowNewCourse}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouveau cours</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Créer un cours</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Titre du cours</Label><Input placeholder="Ex: Anglais des affaires" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Niveau</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="débutant">Débutant</SelectItem>
                      <SelectItem value="intermédiaire">Intermédiaire</SelectItem>
                      <SelectItem value="avancé">Avancé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Instructeur</Label><Input placeholder="Nom du formateur" /></div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presentiel">Présentiel</SelectItem>
                      <SelectItem value="en_ligne">En ligne</SelectItem>
                      <SelectItem value="hybride">Hybride</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Prix (GNF)</Label><Input type="number" placeholder="0" /></div>
                <div className="space-y-2"><Label>Places max</Label><Input type="number" placeholder="25" /></div>
                <div className="space-y-2"><Label>Durée</Label><Input placeholder="Ex: 3 mois" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewCourse(false)}>Annuler</Button>
              <Button onClick={() => { toast.success('Cours créé'); setShowNewCourse(false); }}>Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-4">
            <BookOpen className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{activeCourses}</p>
            <p className="text-xs opacity-80">Cours actifs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <Users className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{activeStudents}</p>
            <p className="text-xs opacity-80">Étudiants actifs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
          <CardContent className="p-4">
            <ClipboardList className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{totalEnrolled}</p>
            <p className="text-xs opacity-80">Inscriptions</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <Star className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{avgRating.toFixed(1)}</p>
            <p className="text-xs opacity-80">Note moyenne</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
          <CardContent className="p-4">
            <Award className="h-4 w-4 opacity-80" />
            <p className="text-2xl font-bold mt-1">{students.filter(s => s.status === 'diplome').length}</p>
            <p className="text-xs opacity-80">Diplômés</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white">
          <CardContent className="p-4">
            <DollarSign className="h-4 w-4 opacity-80" />
            <p className="text-lg font-bold mt-1">{(totalRevenue / 1e6).toFixed(1)}M</p>
            <p className="text-xs opacity-80">Revenus GNF</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="courses"><BookOpen className="h-4 w-4 mr-1 hidden sm:inline" /> Cours</TabsTrigger>
          <TabsTrigger value="students"><Users className="h-4 w-4 mr-1 hidden sm:inline" /> Étudiants</TabsTrigger>
          <TabsTrigger value="schedule"><Calendar className="h-4 w-4 mr-1 hidden sm:inline" /> Planning</TabsTrigger>
        </TabsList>

        {/* COURS */}
        <TabsContent value="courses" className="space-y-4">
          {/* Categories */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => {
              const count = courses.filter(c => c.category === cat.id).length;
              return (
                <Card key={cat.id} className="cursor-pointer hover:shadow-md transition-all group text-center">
                  <CardContent className="p-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform inline-block">{cat.emoji}</span>
                    <p className="text-xs font-medium mt-1">{cat.name}</p>
                    <p className="text-[10px] text-muted-foreground">{count} cours</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-3">
            {courses.map(course => {
              const cat = CATEGORIES.find(c => c.id === course.category);
              const st = STATUS_COLORS[course.status];
              const fillRate = course.maxStudents > 0 ? Math.round((course.enrolled / course.maxStudents) * 100) : 0;
              return (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{cat?.emoji}</span>
                          <h4 className="font-semibold text-sm">{course.title}</h4>
                          <Badge className={st.color}>{st.label}</Badge>
                          <Badge className={LEVEL_COLORS[course.level]}>{course.level}</Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>👨‍🏫 {course.instructor}</span>
                          <span><Clock className="w-3 h-3 inline" /> {course.duration}</span>
                          <span>{course.format === 'en_ligne' ? '🖥️ En ligne' : course.format === 'presentiel' ? '🏫 Présentiel' : '🔄 Hybride'}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-bold text-primary">{course.price.toLocaleString()} GNF</p>
                        {course.rating > 0 && (
                          <div className="flex items-center gap-1 justify-end">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-medium">{course.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{course.enrolled}/{course.maxStudents} inscrits</span>
                        <span className={`font-bold ${fillRate >= 90 ? 'text-red-500' : fillRate >= 70 ? 'text-yellow-600' : 'text-green-600'}`}>{fillRate}%</span>
                      </div>
                      <Progress value={fillRate} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ÉTUDIANTS */}
        <TabsContent value="students" className="space-y-4">
          <h3 className="font-semibold">Étudiants ({students.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {students.map(student => (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{student.name[0]}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm">{student.name}</h4>
                        <Badge className={student.status === 'actif' ? 'bg-green-100 text-green-800' : student.status === 'diplome' ? 'bg-blue-100 text-blue-800' : 'bg-muted text-muted-foreground'}>
                          {student.status === 'diplome' ? '🎓 Diplômé' : student.status === 'actif' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{student.coursesEnrolled} cours • {student.totalPaid.toLocaleString()} GNF</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span>Progression</span>
                          <span className="font-bold">{student.completionRate}%</span>
                        </div>
                        <Progress value={student.completionRate} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* PLANNING */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Planning des cours</CardTitle>
              <CardDescription>Calendrier de la semaine</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {courses.filter(c => c.status === 'actif').map(course => {
                  const cat = CATEGORIES.find(c2 => c2.id === course.category);
                  return (
                    <div key={course.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="w-16 text-center">
                        <span className="text-2xl">{cat?.emoji}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{course.title}</h4>
                        <p className="text-xs text-muted-foreground">{course.instructor} • {course.format === 'en_ligne' ? '🖥️' : '🏫'} {course.format}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">{course.enrolled}/{course.maxStudents}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
