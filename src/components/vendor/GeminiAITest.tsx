import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, CheckCircle } from "lucide-react";

export default function GeminiAITest() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('Explique-moi comment optimiser la gestion des stocks dans un commerce');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [gcConfigured, setGcConfigured] = useState<boolean | null>(null);

  const testGoogleCloud = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-cloud-test');
      
      if (error) throw error;
      
      setGcConfigured(true);
      toast({
        title: "✅ Google Cloud configuré",
        description: `Project: ${data.projectId}`
      });
    } catch (error) {
      console.error('Google Cloud test error:', error);
      setGcConfigured(false);
      toast({
        title: "❌ Erreur Google Cloud",
        description: error instanceof Error ? error.message : "Erreur de configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testGemini = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un prompt",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResponse('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: { 
          productName: 'Test',
          category: 'Test',
          features: [prompt]
        }
      });

      if (error) throw error;

      setResponse(data.description || 'Aucune réponse');
      toast({
        title: "✅ Test Gemini réussi",
        description: "Réponse générée avec succès"
      });
    } catch (error) {
      console.error('Gemini test error:', error);
      toast({
        title: "❌ Erreur Gemini IA",
        description: error instanceof Error ? error.message : "Erreur lors de l'appel",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Test d'intégrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Cloud Test */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Google Cloud Configuration</h3>
              {gcConfigured !== null && (
                gcConfigured ? 
                  <CheckCircle className="w-5 h-5 text-green-500" /> :
                  <span className="text-red-500 text-sm">Non configuré</span>
              )}
            </div>
            <Button 
              onClick={testGoogleCloud} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tester Google Cloud
            </Button>
          </div>

          {/* Gemini IA Test */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Gemini IA (via Lovable AI)</h3>
            <Textarea
              placeholder="Entrez votre prompt..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full"
            />
            <Button 
              onClick={testGemini} 
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tester Gemini IA
            </Button>
          </div>

          {/* Response Display */}
          {response && (
            <div className="border rounded-lg p-4 bg-muted">
              <h3 className="font-semibold mb-2">Réponse IA:</h3>
              <p className="text-sm whitespace-pre-wrap">{response}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
