import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentVendor } from "@/hooks/useCurrentVendor";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AffiliateManagement({ shopId }: { shopId?: string }) {
  const { user } = useAuth();
  const { userId: vendorUserId, loading: vendorLoading } = useCurrentVendor();
  const [percentage, setPercentage] = useState<number>(5);
  const [link, setLink] = useState<string>("");
  const [vendorCustomId, setVendorCustomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vendorLoading) return;
    fetchVendorCustomId();
  }, [user, vendorUserId, vendorLoading]);

  const fetchVendorCustomId = async () => {
    const ownerUserId = vendorUserId || user?.id;
    if (!ownerUserId) {
      setLoading(false);
      return;
    }

    try {
      const { data: userIdData, error } = await supabase
        .from('user_ids')
        .select('custom_id')
        .eq('user_id', ownerUserId)
        .maybeSingle();

      if (error) throw error;

      if (userIdData?.custom_id) {
        setVendorCustomId(userIdData.custom_id);
      }
    } catch (error) {
      console.error('Erreur récupération custom_id vendeur:', error);
    } finally {
      setLoading(false);
    }
  };

  const effectiveShopId = shopId || vendorCustomId;

  const generateLink = () => {
    if (!effectiveShopId) {
      console.warn('shopId non disponible pour générer le lien d\'affiliation');
      return;
    }
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const newLink = `${base}/ref/${effectiveShopId}?aff=${percentage}`;
    setLink(newLink);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Programme d'affiliation</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Programme d'affiliation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!effectiveShopId && (
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-4">
            <p className="text-sm text-orange-600">
              ⚠️ Identifiant vendeur non disponible. Assurez-vous d'avoir complété votre profil vendeur.
            </p>
          </div>
        )}
        
        <div>
          <label className="text-sm font-medium mb-2 block">
            Pourcentage de commission (%)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              placeholder="Ex: 5"
              className="max-w-[200px]"
            />
            <Button onClick={generateLink} disabled={!effectiveShopId}>
              Générer le lien d'affiliation
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Commission que vous offrez aux affiliés sur chaque vente
          </p>
        </div>

        {link && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm font-medium text-green-700 mb-2">
              ✅ Lien d'affiliation généré avec succès !
            </p>
            <div className="flex items-center gap-2">
              <Input 
                value={link} 
                readOnly 
                className="font-mono text-xs"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button 
                size="sm" 
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    toast.success("Lien copié avec succès !", {
                      description: "Le lien d'affiliation a été copié dans le presse-papiers"
                    });
                  } catch (error) {
                    console.error('Erreur copie:', error);
                    toast.error("Erreur lors de la copie", {
                      description: "Impossible de copier le lien. Veuillez réessayer."
                    });
                  }
                }}
              >
                Copier
              </Button>
            </div>
            <a 
              href={link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-2 inline-block"
            >
              Tester le lien →
            </a>
          </div>
        )}

        {effectiveShopId && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <h3 className="text-sm font-semibold mb-2">💡 Comment ça marche ?</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Définissez le pourcentage de commission pour vos affiliés</li>
              <li>Générez et partagez votre lien d'affiliation unique</li>
              <li>Suivez les ventes générées par vos affiliés</li>
              <li>Gérez automatiquement les commissions via le système</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


