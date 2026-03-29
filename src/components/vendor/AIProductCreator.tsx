/**
 * ðŸ¤– COMPOSANT: CRÃ‰ATEUR DE PRODUIT AVEC IA
 * 
 * Interface utilisateur pour crÃ©er des produits avec assistance IA complÃ¨te
 * Upload vers Google Cloud Storage
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Zap, 
  Wand2, 
  Image as ImageIcon, 
  Check, 
  Loader2,
  Tag,
  FileText,
  Package
} from "lucide-react";
import ProductAIService, { ProductAnalysis } from "@/services/ai/productAIService";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useStorageUpload } from "@/hooks/useStorageUpload";

export function AIProductCreator() {
  const { user } = useAuth();
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [price, setPrice] = useState("");
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Hook pour upload vers GCS
  const { uploadFile: uploadToGCS } = useStorageUpload();

  /**
   * ðŸ¤– ANALYSER AVEC IA
   */
  const handleAnalyze = async () => {
    if (!productName.trim() || !user?.id) {
      toast.error("Veuillez remplir le nom du produit");
      return;
    }

    try {
      setAnalyzing(true);
      
      toast.info("ðŸ¤– Analyse IA en cours...", {
        description: "L'IA analyse votre produit"
      });

      const result = await ProductAIService.analyzeProduct({
        name: productName,
        description: productDescription,
        price: price ? parseFloat(price) : undefined,
        userId: user.id
      });

      setAnalysis(result);

      toast.success("âœ… Analyse terminÃ©e !", {
        description: `Produit classÃ© en ${result.category}`
      });

    } catch (error: any) {
      console.error("âŒ Erreur analyse IA:", error);
      toast.error("Erreur d'analyse", {
        description: error.message
      });
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * ðŸ’¾ SAUVEGARDER LE PRODUIT
   */
  const handleSave = async () => {
    if (!analysis || !user?.id) return;

    try {
      setSaving(true);

      // RÃ©cupÃ©rer vendor_id
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!vendor) {
        throw new Error("Profil vendeur non trouvÃ©");
      }

      // CrÃ©er le produit
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          vendor_id: vendor.id,
          name: productName,
          description: analysis.enrichedDescription.commercial,
          price: price ? parseFloat(price) : 0,
          is_active: true,
          stock_quantity: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Upload image si gÃ©nÃ©rÃ©e
      if (analysis.generatedImageUrl) {
        // TÃ©lÃ©charger l'image depuis URL
        const imageResponse = await fetch(analysis.generatedImageUrl);
        const imageBlob = await imageResponse.blob();
        
        const fileName = `${product.id}_ai_generated.png`;
        const imageFile = new File([imageBlob], fileName, { type: 'image/png' });
        
        console.log('[AIProductCreator] Uploading AI-generated image to GCS...');
        
        const uploadResult = await uploadToGCS(imageFile, {
          folder: 'products',
          subfolder: vendor.id,
        });

        if (uploadResult.success && uploadResult.publicUrl) {
          console.log(`[AIProductCreator] âœ… Image uploaded via ${uploadResult.provider}: ${uploadResult.publicUrl}`);
          
          // Mettre Ã  jour le produit avec l'image
          await supabase
            .from('products')
            .update({ images: [uploadResult.publicUrl] })
            .eq('id', product.id);
        }
      }

      toast.success("âœ… Produit crÃ©Ã© avec succÃ¨s !", {
        description: "Votre produit est maintenant en ligne"
      });

      // RÃ©initialiser
      setProductName("");
      setProductDescription("");
      setPrice("");
      setAnalysis(null);

    } catch (error: any) {
      console.error("âŒ Erreur sauvegarde:", error);
      toast.error("Erreur lors de la crÃ©ation", {
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* FORMULAIRE INITIAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            CrÃ©er un produit avec l'IA
          </CardTitle>
          <CardDescription>
            DÃ©crivez simplement votre produit, l'IA s'occupe du reste
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nom du produit */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Nom du produit *
            </label>
            <Input
              placeholder="Ex: iPhone 12 Pro, Marmite Ã©lectrique 5L, Samsung A34..."
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={analyzing}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Description (mÃªme courte, l'IA enrichira)
            </label>
            <Textarea
              placeholder="Ex: propre, batterie 85%, inox, 850W, noir..."
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={3}
              disabled={analyzing}
            />
          </div>

          {/* Prix */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Prix (GNF)
            </label>
            <Input
              type="number"
              placeholder="Ex: 5000000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={analyzing}
            />
          </div>

          {/* Bouton analyser */}
          <Button
            onClick={handleAnalyze}
            disabled={analyzing || !productName.trim()}
            className="w-full"
            size="lg"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse IA en cours...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Analyser avec l'IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* RÃ‰SULTATS IA */}
      {analysis && (
        <div className="space-y-4">
          {/* CatÃ©gorie dÃ©tectÃ©e */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Check className="w-5 h-5 text-primary-orange-500" />
                CatÃ©gorie dÃ©tectÃ©e
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {analysis.category}
                </Badge>
                <Badge variant="outline">
                  {analysis.detectedType}
                </Badge>
                <Badge variant="outline">
                  Confiance: {(analysis.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* CaractÃ©ristiques */}
          {Object.keys(analysis.characteristics).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  CaractÃ©ristiques extraites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(analysis.characteristics).map(([key, value]) => (
                    <div key={key} className="border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground uppercase">{key}</div>
                      <div className="font-medium">{value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description enrichie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Description professionnelle gÃ©nÃ©rÃ©e
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description commerciale */}
              <div>
                <h4 className="font-semibold mb-2">ðŸ“ Description commerciale</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {analysis.enrichedDescription.commercial}
                </p>
              </div>

              <Separator />

              {/* Points forts */}
              <div>
                <h4 className="font-semibold mb-2">â­ Points forts</h4>
                <ul className="space-y-1">
                  {analysis.enrichedDescription.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary-orange-500 mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {/* CaractÃ©ristiques techniques */}
              <div>
                <h4 className="font-semibold mb-2">âš™ï¸ CaractÃ©ristiques techniques</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(analysis.enrichedDescription.technicalSpecs).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-medium">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contenu du paquet */}
              {analysis.enrichedDescription.packageContent && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">ðŸ“¦ Contenu du paquet</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.enrichedDescription.packageContent.map((item, idx) => (
                        <li key={idx}>â€¢ {item}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Garantie */}
              {analysis.enrichedDescription.warranty && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">ðŸ›¡ï¸ Garantie</h4>
                    <p className="text-sm">{analysis.enrichedDescription.warranty}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags automatiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysis.autoTags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Image gÃ©nÃ©rÃ©e */}
          {analysis.generatedImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Image gÃ©nÃ©rÃ©e par l'IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={analysis.generatedImageUrl}
                  alt={productName}
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
              </CardContent>
            </Card>
          )}

          {/* Bouton sauvegarder */}
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                CrÃ©ation en cours...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                CrÃ©er le produit
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default AIProductCreator;
