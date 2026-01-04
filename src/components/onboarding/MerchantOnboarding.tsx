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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Store } from "lucide-react";

const merchantSetupSchema = z.object({
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
        .select("id,business_name,phone,email,address,description,city")
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
        business_name: data.business_name || "",
        phone: data.phone || profile.phone || "",
        city: data.city || profile.city || "",
        address: data.address || "",
        description: data.description || "",
        email: data.email || defaultEmail,
      });

      // Critères “profil complet” (simple et efficace)
      const isComplete = Boolean(data.business_name && (data.city || profile.city) && (data.phone || profile.phone));
      setOpen(!isComplete);
    };

    run();
  }, [user, profile, loading, profileLoading, form, defaultEmail]);

  const onSubmit = async (values: MerchantSetupFormData) => {
    if (!user) return;

    setSubmitting(true);
    try {
      if (vendorId) {
        const { error } = await supabase
          .from("vendors")
          .update({
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
        setVendorId(data.id);
      }

      toast.success("Profil marchand enregistré.");
      setOpen(false);
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
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Finalisez votre compte marchand
          </DialogTitle>
          <DialogDescription>
            Quelques informations professionnelles pour activer votre boutique (vous pourrez les modifier plus tard).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la boutique *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Boutique Diallo" {...field} disabled={submitting} />
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
                      <Input placeholder="+224 6xx xxx xxx" {...field} disabled={submitting} />
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
                      <Input placeholder="Conakry" {...field} disabled={submitting} />
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
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="Quartier, Commune" {...field} disabled={submitting} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Décrivez votre activité..." {...field} disabled={submitting} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@exemple.com" {...field} disabled={submitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Plus tard
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
