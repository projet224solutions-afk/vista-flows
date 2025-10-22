import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Key, Shield } from "lucide-react";

export default function GoogleCloudVerification() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testGoogleCloudCredentials = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🔍 Testing Google Cloud credentials...');
      
      const { data, error } = await supabase.functions.invoke('google-cloud-test', {
        body: {}
      });

      console.log('📊 Test result:', { data, error });

      if (error) {
        console.error('❌ Error:', error);
        setResult({
          success: false,
          error: error.message || 'Erreur lors du test',
          details: error
        });
        toast({
          title: "❌ Test échoué",
          description: error.message || "Impossible de tester les credentials",
          variant: "destructive"
        });
        return;
      }

      setResult({
        success: true,
        ...data
      });

      if (data.status === 'success') {
        toast({
          title: "✅ Credentials valides !",
          description: `Project ID: ${data.projectId}`
        });
      } else {
        toast({
          title: "⚠️ Configuration incomplète",
          description: data.error || "Vérifiez vos secrets Supabase",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setResult({
        success: false,
        error: errorMessage
      });
      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5 text-blue-500" />
          Vérification Google Cloud
        </CardTitle>
        <CardDescription>
          Testez si vos clés JSON Google Cloud sont valides et opérationnelles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testGoogleCloudCredentials}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Shield className="w-4 h-4 mr-2" />
          Tester les credentials Google Cloud
        </Button>

        {result && (
          <div className={`rounded-lg p-4 ${
            result.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <h3 className={`font-semibold ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.success ? '✅ Credentials valides' : '❌ Credentials invalides'}
                </h3>
                
                {result.success && result.status === 'success' && (
                  <div className="space-y-1 text-sm">
                    <p className="text-green-700">
                      <strong>Message:</strong> {result.message}
                    </p>
                    <p className="text-green-700">
                      <strong>Project ID:</strong> <code className="bg-green-100 px-2 py-0.5 rounded">{result.projectId}</code>
                    </p>
                    <p className="text-green-700">
                      <strong>Service Account:</strong> <code className="bg-green-100 px-2 py-0.5 rounded text-xs">{result.serviceAccountEmail}</code>
                    </p>
                    <p className="text-green-600 text-xs">
                      Testé le: {new Date(result.timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                )}

                {!result.success && (
                  <div className="space-y-1 text-sm text-red-700">
                    <p><strong>Erreur:</strong> {result.error}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs underline">
                          Voir les détails techniques
                        </summary>
                        <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {result.hasProjectId === false && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    ⚠️ <strong>GOOGLE_CLOUD_PROJECT_ID</strong> manquant dans les secrets Supabase
                  </div>
                )}

                {result.hasServiceAccount === false && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    ⚠️ <strong>GOOGLE_CLOUD_SERVICE_ACCOUNT</strong> manquant dans les secrets Supabase
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground border-t pt-4">
          <p className="font-semibold mb-2">ℹ️ Ce test vérifie :</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Présence des secrets dans Supabase</li>
            <li>Format JSON valide du service account</li>
            <li>Email du service account</li>
            <li>Project ID configuré</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
