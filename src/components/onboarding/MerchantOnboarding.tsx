import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Store, Utensils, ShoppingBag, Scissors, Car, Home, Wrench, Camera, GraduationCap, Stethoscope, Plane, Package, Truck, Sparkles, HardHat, Tractor, Laptop } from "lucide-react";

// Types de services avec correspondance service_types.code dans la BDD
const SERVICE_TYPES = [
  { value: "ecommerce", code: "ecommerce", label: "Boutique / E-commerce", icon: ShoppingBag },
  { value: "restaurant", code: "restaurant", label: "Restaurant / Alimentation", icon: Utensils },
  { value: "beaute", code: "beaute", label: "Beauté & Bien-être", icon: Scissors },
  { value: "reparation", code: "reparation", label: "Réparation / Mécanique", icon: Car },
  { value: "location", code: "location", label: "Location Immobilière", icon: Home },
  { value: "menage", code: "menage", label: "Ménage & Entretien", icon: Sparkles },
  { value: "livraison", code: "livraison", label: "Livraison / Coursier", icon: Truck },
  { value: "media", code: "media", label: "Photographe / Vidéaste", icon: Camera },
  { value: "education", code: "education", label: "Éducation / Formation", icon: GraduationCap },
  { value: "sante", code: "sante", label: "Santé & Bien-être", icon: Stethoscope },
  { value: "voyage", code: "voyage", label: "Voyage / Tourisme", icon: Plane },
  { value: "freelance", code: "freelance", label: "Services Professionnels", icon: Wrench },
  { value: "construction", code: "construction", label: "Construction / BTP", icon: HardHat },
  { value: "agriculture", code: "agriculture", label: "Agriculture", icon: Tractor },
  { value: "informatique", code: "informatique", label: "Informatique / Tech", icon: Laptop },
  { value: "autre", code: "ecommerce", label: "Autre service", icon: Package },
] as const;

const merchantSetupSchema = z.object({
  service_type: z.string().min(1, "Veuillez sélectionner un type de service"),
  business_name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  phone: z
    .string()
    .trim()
    .min(6, "Numéro de téléphone trop court")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().min(2, "La ville est requise"),
  address: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
});

type MerchantSetupFormData = z.infer<typeof merchantSetupSchema>;

export default function MerchantOnboarding() {
  const { user, profile, loading, profileLoading } = useAuth();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);

  const checkedForUserRef = useRef<string | null>(null);

  const defaultEmail = useMemo(() => profile?.email || user?.email || "", [profile?.email, user?.email]);

  const form = useForm<MerchantSetupFormData>({
    resolver: zodResolver(merchantSetupSchema),
    defaultValues: {
      service_type: "",
      business_name: "",
      phone: profile?.phone || "",
      city: profile?.city || "",
      address: "",
      description: "",
      email: defaultEmail,
    },
  });

  // Sync email default (OAuth peut remplir l'email tard)
  useEffect(() => {
    form.setValue("email", defaultEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultEmail]);

  useEffect(() => {
    const run = async () => {
      if (loading || profileLoading) return;
      if (!user || !profile) {
        setOpen(false);
        return;
      }

      // Onboarding uniquement pour les marchands
      if (profile.role !== "vendeur") {
        setOpen(false);
        return;
      }

      if (checkedForUserRef.current === user.id) return;
      checkedForUserRef.current = user.id;

      const { data, error } = await supabase
        .from("vendors")
        .select("id,business_name,phone,email,address,description,city,service_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        // Ne pas bloquer l'interface si RLS / autre — mais informer.
        console.error("Erreur chargement vendor:", error);
        toast.error("Impossible de charger votre profil marchand.");
        return;
      }

      if (!data) {
        // Nouveau marchand : ouvrir automatiquement
        setVendorId(null);
        form.reset({
          service_type: "",
          business_name: "",
          phone: profile.phone || "",
          city: profile.city || "",
          address: "",
          description: "",
          email: defaultEmail,
        });
        setOpen(true);
        return;
      }

      setVendorId(data.id);
      form.reset({
        service_type: (data as any).service_type || "",
        business_name: data.business_name || "",
        phone: data.phone || profile.phone || "",
        city: data.city || profile.city || "",
        address: data.address || "",
        description: data.description || "",
        email: data.email || defaultEmail,
      });

      // Critères "profil complet" : service_type + business_name + city + phone
      const isComplete = Boolean(
        (data as any).service_type && 
        data.business_name && 
        (data.city || profile.city) && 
        (data.phone || profile.phone)
      );
      setOpen(!isComplete);
    };

    run();
  }, [user, profile, loading, profileLoading, form, defaultEmail]);

  const onSubmit = async (values: MerchantSetupFormData) => {
    if (!user) return;

    setSubmitting(true);
    try {
      let currentVendorId = vendorId;
      
      if (vendorId) {
        const { error } = await supabase
          .from("vendors")
          .update({
            service_type: values.service_type,
            business_name: values.business_name,
            phone: values.phone || null,
            email: values.email || null,
            address: values.address || null,
            description: values.description || null,
            city: values.city || null,
          })
          .eq("id", vendorId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("vendors")
          .insert({
            user_id: user.id,
            service_type: values.service_type,
            business_name: values.business_name,
            phone: values.phone || null,
            email: values.email || null,
            address: values.address || null,
            description: values.description || null,
            city: values.city || null,
            is_active: true,
          })
          .select("id")
          .single();

        if (error) throw error;
        currentVendorId = data.id;
        setVendorId(data.id);
      }

      // Trouver le service_type_id correspondant au code sélectionné
      const selectedServiceType = SERVICE_TYPES.find(s => s.value === values.service_type);
      const serviceCode = selectedServiceType?.code || values.service_type;
      
      const { data: serviceTypeData } = await supabase
        .from("service_types")
        .select("id, name, code")
        .eq("code", serviceCode)
        .eq("is_active", true)
        .maybeSingle();

      if (serviceTypeData && currentVendorId) {
        // Vérifier si un professional_service existe déjà
        const { data: existingService } = await supabase
          .from("professional_services")
          .select("id")
          .eq("user_id", user.id)
          .eq("service_type_id", serviceTypeData.id)
          .maybeSingle();

        if (!existingService) {
          // Créer le professional_service pour activer le module métier
          await supabase.from("professional_services").insert({
            user_id: user.id,
            service_type_id: serviceTypeData.id,
            business_name: values.business_name,
            description: values.description || null,
            address: values.address || null,
            phone: values.phone || null,
            email: values.email || null,
            city: values.city || null,
            status: "active",
          });
          
          console.log(`✅ Module métier "${serviceTypeData.name}" créé pour le marchand`);
        }
      }

      toast.success("Profil marchand enregistré avec succès !");
      setOpen(false);
      
      // Rediriger vers le dashboard vendeur pour voir le module
      window.location.reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'enregistrement";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Store className="h-5 w-5 text-primary" />
            </div>
            Finalisez votre compte marchand
          </DialogTitle>
          <DialogDescription>
            Complétez ces informations pour activer votre boutique et commencer à vendre.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Type de service - Champ principal */}
            <FormField
              control={form.control}
              name="service_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Type de service *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={submitting}>
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Sélectionnez votre type de service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => {
                        const IconComponent = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-muted-foreground" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la boutique / entreprise *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Boutique Diallo, Restaurant Chez Mamou..." 
                      {...field} 
                      disabled={submitting}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+224 6xx xxx xxx" 
                        {...field} 
                        disabled={submitting}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Conakry, Kindia, Labé..." 
                        {...field} 
                        disabled={submitting}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse complète</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Quartier, Commune, Repères..." 
                      {...field} 
                      disabled={submitting}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description de votre activité</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3} 
                      placeholder="Décrivez vos produits ou services..." 
                      {...field} 
                      disabled={submitting} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email professionnel</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="contact@votreboutique.com" 
                      {...field} 
                      disabled={submitting}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)} 
                disabled={submitting}
              >
                Plus tard
              </Button>
              <Button type="submit" disabled={submitting} className="min-w-[140px]">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Activer ma boutique
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
