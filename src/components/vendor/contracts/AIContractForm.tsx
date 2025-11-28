import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';

interface AIContractFormProps {
  onSuccess: (contractId: string) => void;
}

export default function AIContractForm({ onSuccess }: AIContractFormProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { toast } = useToast();

  const onSubmit = async (formData: any) => {
    try {
      setLoading(true);

      const { client_name, client_phone, client_address } = formData;

      toast({
        title: 'Génération en cours...',
        description: 'L\'IA est en train de générer votre contrat professionnel',
      });

      const { data, error } = await supabase.functions.invoke('generate-contract-with-ai', {
        body: {
          client_name,
          client_phone,
          client_address,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Échec de la génération');
      }

      toast({
        title: 'Contrat généré avec succès',
        description: 'Vous pouvez maintenant le modifier avant de le finaliser',
      });

      onSuccess(data.contract.id);
    } catch (error: any) {
      console.error('Error generating contract:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer le contrat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Génération automatique de contrat par IA
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Entrez uniquement 3 informations et laissez l'IA générer un contrat de vente complet et professionnel
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Information - Only 3 fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-medium text-muted-foreground">
                Informations du client (3 champs requis)
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name" className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                Nom du client *
              </Label>
              <Input
                id="client_name"
                {...register('client_name', { required: 'Le nom du client est requis' })}
                placeholder="Nom complet du client"
                className={errors.client_name ? 'border-destructive' : ''}
              />
              {errors.client_name && (
                <p className="text-sm text-destructive">{errors.client_name.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_phone" className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                Numéro de téléphone du client *
              </Label>
              <Input
                id="client_phone"
                {...register('client_phone', { required: 'Le téléphone du client est requis' })}
                placeholder="+224 XXX XX XX XX"
                className={errors.client_phone ? 'border-destructive' : ''}
              />
              {errors.client_phone && (
                <p className="text-sm text-destructive">{errors.client_phone.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_address" className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  3
                </span>
                Adresse du client *
              </Label>
              <Input
                id="client_address"
                {...register('client_address', { required: 'L\'adresse du client est requise' })}
                placeholder="Adresse complète"
                className={errors.client_address ? 'border-destructive' : ''}
              />
              {errors.client_address && (
                <p className="text-sm text-destructive">{errors.client_address.message as string}</p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">L'IA va générer automatiquement :</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>✓ Le numéro unique du contrat</li>
                  <li>✓ La date de création</li>
                  <li>✓ Le texte complet du contrat avec clauses légales</li>
                  <li>✓ Les informations de votre entreprise</li>
                  <li>✓ Les clauses standards (garantie, conformité, litige)</li>
                  <li>✓ Un résumé automatique</li>
                </ul>
                <p className="font-medium text-primary mt-3">
                  Vous pourrez modifier le contrat avant de le finaliser !
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full h-12 text-base"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Génération en cours par l'IA...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Générer le contrat avec l'IA
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
