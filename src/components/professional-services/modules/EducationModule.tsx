/**
 * MODULE ÉDUCATION - Services de formation et cours
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { GraduationCap, Plus, Edit, Trash2, Users, TrendingUp, DollarSign, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface EducationModuleProps {
  serviceId: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  instructor: string;
  duration_hours: number;
  price: number;
  max_students: number;
  is_active: boolean;
  created_at: string;
}

interface Enrollment {
  id: string;
  course_id: string;
  student_name: string;
  student_phone: string;
  enrollment_date: string;
  status: 'active' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid';
  created_at: string;
}

export function EducationModule({ serviceId }: EducationModuleProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    duration_hours: '',
    price: '',
    max_students: ''
  });
  const [enrollFormData, setEnrollFormData] = useState({
    student_name: '',
    student_phone: ''
  });

  useEffect(() => {
    loadData();
  }, [serviceId]);

  const loadData = async () => {
    try {
      // Charger les cours
      const { data: coursesData, error: coursesError } = await supabase
        .from('education_courses')
        .select('*')
        .eq('service_id', serviceId)
        .order('title');

      if (coursesError && coursesError.code !== 'PGRST116') throw coursesError;

      // Charger les inscriptions
      const { data: enrollData, error: enrollError } = await supabase
        .from('education_enrollments')
        .select('*')
        .eq('service_id', serviceId)
        .order('enrollment_date', { ascending: false });

      if (enrollError && enrollError.code !== 'PGRST116') throw enrollError;

      setCourses(coursesData || []);
      setEnrollments(enrollData || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('education_courses')
        .insert({
          service_id: serviceId,
          title: courseFormData.title,
          description: courseFormData.description || null,
          instructor: courseFormData.instructor,
          duration_hours: parseInt(courseFormData.duration_hours),
          price: parseFloat(courseFormData.price),
          max_students: parseInt(courseFormData.max_students),
          is_active: true
        });

      if (error) throw error;

      toast.success('Cours créé');
      setShowCourseDialog(false);
      setCourseFormData({
        title: '',
        description: '',
        instructor: '',
        duration_hours: '',
        price: '',
        max_students: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la création');
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('education_enrollments')
        .insert({
          service_id: serviceId,
          course_id: selectedCourse,
          student_name: enrollFormData.student_name,
          student_phone: enrollFormData.student_phone,
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'active',
          payment_status: 'pending'
        });

      if (error) throw error;

      toast.success('Étudiant inscrit');
      setShowEnrollDialog(false);
      setEnrollFormData({ student_name: '', student_phone: '' });
      loadData();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'inscription');
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Supprimer ce cours ?')) return;

    try {
      const { error } = await supabase
        .from('education_courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast.success('Cours supprimé');
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  // Calculer les statistiques
  const stats = {
    totalCourses: courses.length,
    activeCourses: courses.filter(c => c.is_active).length,
    totalEnrollments: enrollments.length,
    activeEnrollments: enrollments.filter(e => e.status === 'active').length,
    totalRevenue: enrollments
      .filter(e => e.payment_status === 'paid')
      .reduce((sum, e) => {
        const course = courses.find(c => c.id === e.course_id);
        return sum + (course?.price || 0);
      }, 0)
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Module Éducation & Formation</h2>
      </div>

      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="courses">Cours</TabsTrigger>
          <TabsTrigger value="enrollments">Inscriptions</TabsTrigger>
          <TabsTrigger value="analytics">Statistiques</TabsTrigger>
        </TabsList>

        {/* ONGLET COURS */}
        <TabsContent value="courses">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCourseDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau cours
              </Button>
            </div>

            {courses.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun cours disponible</p>
                  <Button onClick={() => setShowCourseDialog(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Créer le premier cours
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => {
                  const courseEnrollments = enrollments.filter(e => e.course_id === course.id && e.status === 'active');
                  return (
                    <Card key={course.id}>
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{course.title}</h3>
                            <p className="text-sm text-muted-foreground">{course.instructor}</p>
                          </div>
                          {course.is_active ? (
                            <Badge>Actif</Badge>
                          ) : (
                            <Badge variant="secondary">Inactif</Badge>
                          )}
                        </div>

                        {course.description && (
                          <p className="text-sm text-muted-foreground">{course.description}</p>
                        )}

                        <div className="space-y-1 text-sm">
                          <div>⏱️ {course.duration_hours}h de formation</div>
                          <div>👥 {courseEnrollments.length}/{course.max_students} étudiants</div>
                          <div className="text-lg font-bold text-primary">
                            {course.price.toLocaleString()} FCFA
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedCourse(course.id);
                              setShowEnrollDialog(true);
                            }}
                          >
                            <Users className="w-4 h-4 mr-1" />
                            Inscrire
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCourse(course.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ONGLET INSCRIPTIONS */}
        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <CardTitle>Liste des inscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune inscription
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enrollment) => {
                    const course = courses.find(c => c.id === enrollment.course_id);
                    return (
                      <Card key={enrollment.id}>
                        <CardContent className="pt-4 flex items-center justify-between">
                          <div>
                            <div className="font-medium">{enrollment.student_name}</div>
                            <div className="text-sm text-muted-foreground">{enrollment.student_phone}</div>
                            <div className="text-sm font-medium text-primary">{course?.title || 'Cours inconnu'}</div>
                            <div className="text-xs text-muted-foreground">
                              Inscrit le {new Date(enrollment.enrollment_date).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={enrollment.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {enrollment.status === 'active' ? 'Actif' : enrollment.status === 'completed' ? 'Terminé' : 'Annulé'}
                            </Badge>
                            <div className="mt-2">
                              <Badge variant={enrollment.payment_status === 'paid' ? 'default' : 'secondary'}>
                                {enrollment.payment_status === 'paid' ? '✓ Payé' : 'En attente'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET STATISTIQUES */}
        <TabsContent value="analytics">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cours actifs</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeCourses}</div>
                  <p className="text-xs text-muted-foreground">Sur {stats.totalCourses} total</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Étudiants actifs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeEnrollments}</div>
                  <p className="text-xs text-muted-foreground">Sur {stats.totalEnrollments} total</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} FCFA</div>
                  <p className="text-xs text-muted-foreground">Paiements reçus</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taux de remplissage</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {courses.length > 0
                      ? Math.round((stats.activeEnrollments / courses.reduce((sum, c) => sum + c.max_students, 0)) * 100)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Places occupées</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog création cours */}
      <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau cours</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <Label htmlFor="title">Titre du cours</Label>
              <Input
                id="title"
                value={courseFormData.title}
                onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={courseFormData.description}
                onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="instructor">Formateur</Label>
              <Input
                id="instructor"
                value={courseFormData.instructor}
                onChange={(e) => setCourseFormData({ ...courseFormData, instructor: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration_hours">Durée (h)</Label>
                <Input
                  id="duration_hours"
                  type="number"
                  value={courseFormData.duration_hours}
                  onChange={(e) => setCourseFormData({ ...courseFormData, duration_hours: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Prix (FCFA)</Label>
                <Input
                  id="price"
                  type="number"
                  value={courseFormData.price}
                  onChange={(e) => setCourseFormData({ ...courseFormData, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="max_students">Places</Label>
                <Input
                  id="max_students"
                  type="number"
                  value={courseFormData.max_students}
                  onChange={(e) => setCourseFormData({ ...courseFormData, max_students: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Créer</Button>
              <Button type="button" variant="outline" onClick={() => setShowCourseDialog(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog inscription étudiant */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscrire un étudiant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEnroll} className="space-y-4">
            <div>
              <Label htmlFor="student_name">Nom de l'étudiant</Label>
              <Input
                id="student_name"
                value={enrollFormData.student_name}
                onChange={(e) => setEnrollFormData({ ...enrollFormData, student_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="student_phone">Téléphone</Label>
              <Input
                id="student_phone"
                value={enrollFormData.student_phone}
                onChange={(e) => setEnrollFormData({ ...enrollFormData, student_phone: e.target.value })}
                placeholder="+224 XXX XX XX XX"
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Inscrire</Button>
              <Button type="button" variant="outline" onClick={() => setShowEnrollDialog(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
