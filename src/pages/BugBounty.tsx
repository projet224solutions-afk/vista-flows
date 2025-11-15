import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Trophy, Award } from "lucide-react";

const bugReportSchema = z.object({
  reporter_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  reporter_email: z.string().email("Email invalide").max(255),
  reporter_github: z.string().max(100).optional(),
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères").max(200),
  description: z.string().min(20, "La description doit contenir au moins 20 caractères").max(5000),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  category: z.enum(["authentication", "authorization", "injection", "xss", "csrf", "data_exposure", "crypto", "business_logic", "other"]),
  steps_to_reproduce: z.string().min(20, "Veuillez fournir des étapes détaillées").max(5000),
  impact: z.string().min(20, "Veuillez décrire l'impact").max(5000),
  proof_of_concept: z.string().max(10000).optional(),
  suggested_fix: z.string().max(5000).optional(),
});

type BugReportFormData = z.infer<typeof bugReportSchema>;

const BugBounty = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BugReportFormData>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: {
      severity: "medium",
      category: "other",
    },
  });

  const onSubmit = async (data: BugReportFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("bug_reports").insert([data]);

      if (error) throw error;

      toast.success("Rapport envoyé avec succès!", {
        description: "Notre équipe de sécurité examinera votre rapport. Merci pour votre contribution!",
      });
      form.reset();
    } catch (error: any) {
      console.error("Error submitting bug report:", error);
      toast.error("Erreur lors de l'envoi", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">Programme Bug Bounty 224Solutions</h1>
          <p className="text-xl text-muted-foreground">
            Aidez-nous à sécuriser notre plateforme et gagnez des récompenses
          </p>
        </div>

        {/* Rewards Info */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
            <CardHeader className="pb-3">
              <Trophy className="w-8 h-8 text-red-500 mb-2" />
              <CardTitle className="text-lg">Critique</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">500-2000€</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
            <CardHeader className="pb-3">
              <Award className="w-8 h-8 text-orange-500 mb-2" />
              <CardTitle className="text-lg">Haute</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">200-500€</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
            <CardHeader className="pb-3">
              <Award className="w-8 h-8 text-yellow-600 mb-2" />
              <CardTitle className="text-lg">Moyenne</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">50-200€</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
            <CardHeader className="pb-3">
              <Award className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">Basse</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">10-50€</p>
            </CardContent>
          </Card>
        </div>

        {/* Submission Form */}
        <Card>
          <CardHeader>
            <CardTitle>Soumettre une vulnérabilité</CardTitle>
            <CardDescription>
              Remplissez ce formulaire pour signaler une vulnérabilité de sécurité
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reporter_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reporter_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reporter_github"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profil GitHub (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="@username" {...field} />
                      </FormControl>
                      <FormDescription>
                        Pour apparaître dans le Hall of Fame
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre de la vulnérabilité *</FormLabel>
                      <FormControl>
                        <Input placeholder="SQL Injection dans la page de connexion" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sévérité *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez la sévérité" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="critical">Critique</SelectItem>
                            <SelectItem value="high">Haute</SelectItem>
                            <SelectItem value="medium">Moyenne</SelectItem>
                            <SelectItem value="low">Basse</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catégorie *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez la catégorie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="authentication">Authentification</SelectItem>
                            <SelectItem value="authorization">Autorisation</SelectItem>
                            <SelectItem value="injection">Injection SQL/NoSQL</SelectItem>
                            <SelectItem value="xss">XSS (Cross-Site Scripting)</SelectItem>
                            <SelectItem value="csrf">CSRF</SelectItem>
                            <SelectItem value="data_exposure">Exposition de données</SelectItem>
                            <SelectItem value="crypto">Cryptographie</SelectItem>
                            <SelectItem value="business_logic">Logique métier</SelectItem>
                            <SelectItem value="other">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description détaillée *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez la vulnérabilité en détail..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="steps_to_reproduce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Étapes pour reproduire *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="1. Allez sur la page X&#10;2. Cliquez sur Y&#10;3. Entrez Z..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="impact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impact *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez l'impact potentiel de cette vulnérabilité..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proof_of_concept"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preuve de concept (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Code, captures d'écran, vidéo, etc..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Ajoutez du code, des liens vers des captures d'écran, etc.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="suggested_fix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suggestion de correction (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Comment pourrait-on corriger cette vulnérabilité..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Envoi en cours..." : "Soumettre le rapport"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Règles du programme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">✅ Scope autorisé</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>224solutions.com et tous ses sous-domaines</li>
                <li>Applications mobiles officielles</li>
                <li>APIs publiques documentées</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">❌ Hors scope</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Attaques par déni de service (DoS/DDoS)</li>
                <li>Spam ou phishing</li>
                <li>Tests sur des comptes qui ne vous appartiennent pas</li>
                <li>Social engineering</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📋 Conditions</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Divulgation responsable uniquement</li>
                <li>Ne pas exploiter la vulnérabilité au-delà du nécessaire</li>
                <li>Ne pas accéder aux données d'autres utilisateurs</li>
                <li>Rapport clair et détaillé</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BugBounty;