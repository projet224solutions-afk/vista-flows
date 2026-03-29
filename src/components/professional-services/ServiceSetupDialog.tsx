import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ServiceType } from '@/hooks/useProfessionalServices';

const serviceSetupSchema = z.object({
  business_name: z.string().min(3, 'Le nom doit contenir au moins 3 caractÃ¨res'),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().optional(),
});

type ServiceSetupFormData = z.infer<typeof serviceSetupSchema>;

export interface ServiceSetupSubmitData extends ServiceSetupFormData {
  latitude?: number;
  longitude?: number;
}

interface ServiceSetupDialogProps {
  open: boolean;
  onClose: () => void;
  selectedService: ServiceType | null;
  onSubmit: (data: ServiceSetupSubmitData) => Promise<void>;
}

export const ServiceSetupDialog = ({
  open,
  onClose,
  selectedService,
  onSubmit,
}: ServiceSetupDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const form = useForm<ServiceSetupFormData>({
    resolver: zodResolver(serviceSetupSchema),
    defaultValues: {
      business_name: '',
      description: '',
      phone: '',
      email: '',
      address: '',
    },
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La gÃ©olocalisation n\'est pas supportÃ©e par votre navigateur');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoLoading(false);
        toast.success('Position rÃ©cupÃ©rÃ©e avec succÃ¨s !');
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('AccÃ¨s Ã  la localisation refusÃ©. Veuillez autoriser l\'accÃ¨s dans les paramÃ¨tres.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Position non disponible.');
            break;
          case error.TIMEOUT:
            toast.error('DÃ©lai d\'attente dÃ©passÃ©.');
            break;
          default:
            toast.error('Erreur de gÃ©olocalisation.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (data: ServiceSetupFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      form.reset();
      setCoords(null);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <span className="text-3xl">{selectedService?.icon}</span>
            <span>CrÃ©er votre {selectedService?.name}</span>
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations de base pour crÃ©er votre service professionnel.
            Vous pourrez le complÃ©ter plus tard.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du service *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Restaurant Chez Marie"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Le nom qui sera visible par vos clients
                  </FormDescription>
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
                    <Textarea
                      placeholder="DÃ©crivez votre service..."
                      rows={3}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Une brÃ¨ve prÃ©sentation de votre activitÃ©
                  </FormDescription>
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
                    <FormLabel>TÃ©lÃ©phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+224 xxx xxx xxx"
                        {...field}
                        disabled={isSubmitting}
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@exemple.com"
                        {...field}
                        disabled={isSubmitting}
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
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Quartier, Commune, Conakry"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Votre adresse physique ou zone de service
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bouton de gÃ©olocalisation */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">ðŸ“ Position du service</p>
                  <p className="text-xs text-muted-foreground">
                    Permet Ã  vos clients de vous trouver sur la carte de proximitÃ©
                  </p>
                </div>
                <Button
                  type="button"
                  variant={coords ? 'outline' : 'default'}
                  size="sm"
                  onClick={handleGetLocation}
                  disabled={geoLoading || isSubmitting}
                  className="shrink-0"
                >
                  {geoLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Localisation...
                    </>
                  ) : coords ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-primary-orange-500" />
                      Repositionner
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Ma position
                    </>
                  )}
                </Button>
              </div>
              {coords && (
                <div className="flex items-center gap-2 text-xs text-primary-orange-600 dark:text-primary-orange-400 bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 dark:bg-primary-orange-950/30 rounded-md px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Position enregistrÃ©e ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})</span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                CrÃ©er le service
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
