/**
 * Composant de test automatique pour l'intégration Google Cloud Storage
 * Vérifie le flux complet: upload → signed URL → existence fichier → callback
 */

import { useState, useCallback } from 'react';
import { useGCSUpload } from '@/hooks/useGCSUpload';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2, Play, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
}

export function GCSIntegrationTest() {
  const { uploadFile, getDownloadUrl, isUploading, progress } = useGCSUpload();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<TestSummary | null>(null);

  const updateTest = useCallback((index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((t, i) => i === index ? { ...t, ...update } : t));
  }, []);

  const runTests = useCallback(async () => {
    setIsRunning(true);
    setSummary(null);
    
    const startTime = Date.now();
    const testResults: TestResult[] = [
      { name: '1. Génération URL signée (upload)', status: 'pending' },
      { name: '2. Upload fichier test vers GCS', status: 'pending' },
      { name: '3. Vérification existence fichier', status: 'pending' },
      { name: '4. Callback gcs-upload-complete', status: 'pending' },
      { name: '5. Génération URL signée (download)', status: 'pending' },
      { name: '6. Téléchargement et vérification contenu', status: 'pending' },
    ];
    
    setTests(testResults);

    let passedCount = 0;
    let uploadedObjectPath = '';
    let publicUrl = '';

    // Créer un fichier test
    const testContent = `Test file created at ${new Date().toISOString()}\nRandom: ${Math.random()}`;
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const testFile = new File([testBlob], 'gcs-test-file.txt', { type: 'text/plain' });

    try {
      // Test 1: Génération URL signée pour upload
      updateTest(0, { status: 'running' });
      const test1Start = Date.now();
      
      const { data: signedUrlData, error: signedUrlError } = await supabase.functions.invoke(
        'gcs-signed-url',
        {
          body: {
            action: 'upload',
            fileName: testFile.name,
            contentType: testFile.type,
            folder: 'tests',
            expiresInMinutes: 15,
          },
        }
      );

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error(signedUrlError?.message || 'Pas de signed URL retournée');
      }

      uploadedObjectPath = signedUrlData.objectPath;
      publicUrl = signedUrlData.publicUrl;

      updateTest(0, { 
        status: 'success', 
        message: `URL générée pour: ${uploadedObjectPath}`,
        duration: Date.now() - test1Start
      });
      passedCount++;

      // Test 2: Upload fichier vers GCS
      updateTest(1, { status: 'running' });
      const test2Start = Date.now();

      const uploadResponse = await fetch(signedUrlData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': testFile.type },
        body: testFile,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload échoué: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      updateTest(1, { 
        status: 'success', 
        message: `Fichier uploadé (${testFile.size} bytes)`,
        duration: Date.now() - test2Start
      });
      passedCount++;

      // Test 3: Vérification existence fichier
      updateTest(2, { status: 'running' });
      const test3Start = Date.now();

      // Attendre un peu pour la propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Vérifier via HEAD request sur l'URL publique
      const headResponse = await fetch(publicUrl, { method: 'HEAD' });
      
      if (!headResponse.ok) {
        throw new Error(`Fichier non trouvé: ${headResponse.status}`);
      }

      const contentLength = headResponse.headers.get('content-length');
      updateTest(2, { 
        status: 'success', 
        message: `Fichier existe (${contentLength} bytes)`,
        duration: Date.now() - test3Start
      });
      passedCount++;

      // Test 4: Callback gcs-upload-complete
      updateTest(3, { status: 'running' });
      const test4Start = Date.now();

      const { data: completeData, error: completeError } = await supabase.functions.invoke(
        'gcs-upload-complete',
        {
          body: {
            objectPath: uploadedObjectPath,
            fileType: 'document',
            metadata: {
              originalName: testFile.name,
              size: testFile.size,
              mimeType: testFile.type,
            },
          },
        }
      );

      if (completeError) {
        throw new Error(completeError.message);
      }

      updateTest(3, { 
        status: 'success', 
        message: `Callback réussi: ${completeData?.success ? 'OK' : 'Erreur'}`,
        duration: Date.now() - test4Start
      });
      passedCount++;

      // Test 5: Génération URL signée pour download
      updateTest(4, { status: 'running' });
      const test5Start = Date.now();

      const { data: downloadUrlData, error: downloadUrlError } = await supabase.functions.invoke(
        'gcs-signed-url',
        {
          body: {
            action: 'download',
            fileName: uploadedObjectPath,
            expiresInMinutes: 5,
          },
        }
      );

      if (downloadUrlError || !downloadUrlData?.signedUrl) {
        throw new Error(downloadUrlError?.message || 'Pas de download URL');
      }

      updateTest(4, { 
        status: 'success', 
        message: 'URL de téléchargement générée',
        duration: Date.now() - test5Start
      });
      passedCount++;

      // Test 6: Téléchargement et vérification contenu
      updateTest(5, { status: 'running' });
      const test6Start = Date.now();

      const downloadResponse = await fetch(downloadUrlData.signedUrl);
      if (!downloadResponse.ok) {
        throw new Error(`Téléchargement échoué: ${downloadResponse.status}`);
      }

      const downloadedContent = await downloadResponse.text();
      if (downloadedContent !== testContent) {
        throw new Error('Contenu téléchargé différent de l\'original');
      }

      updateTest(5, { 
        status: 'success', 
        message: 'Contenu vérifié et identique',
        duration: Date.now() - test6Start
      });
      passedCount++;

    } catch (error: any) {
      const failedIndex = tests.findIndex(t => t.status === 'running');
      if (failedIndex >= 0) {
        updateTest(failedIndex, { 
          status: 'error', 
          message: error.message 
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    setSummary({
      total: testResults.length,
      passed: passedCount,
      failed: testResults.length - passedCount,
      duration: totalDuration,
    });

    setIsRunning(false);
  }, [updateTest]);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running': return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <Badge variant="default" className="bg-green-500">Réussi</Badge>;
      case 'error': return <Badge variant="destructive">Échoué</Badge>;
      case 'running': return <Badge variant="secondary">En cours...</Badge>;
      default: return <Badge variant="outline">En attente</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Test Intégration GCS
        </CardTitle>
        <CardDescription>
          Vérifie le flux complet: signed URL → upload → existence → callback → download
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'Tests en cours...' : 'Lancer les tests'}
          </Button>
          
          {tests.length > 0 && !isRunning && (
            <Button 
              variant="outline" 
              onClick={() => { setTests([]); setSummary(null); }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Upload en cours...</div>
            <Progress value={progress} />
          </div>
        )}

        {tests.length > 0 && (
          <div className="space-y-3 mt-4">
            {tests.map((test, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                {getStatusIcon(test.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{test.name}</span>
                    {getStatusBadge(test.status)}
                  </div>
                  {test.message && (
                    <p className={`text-xs mt-1 ${test.status === 'error' ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {test.message}
                    </p>
                  )}
                  {test.duration && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Durée: {test.duration}ms
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {summary && (
          <div className={`p-4 rounded-lg border-2 ${summary.failed === 0 ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">
                  {summary.failed === 0 ? '✅ Tous les tests réussis!' : `❌ ${summary.failed} test(s) échoué(s)`}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {summary.passed}/{summary.total} tests passés en {summary.duration}ms
                </p>
              </div>
              <div className="text-2xl font-bold">
                {Math.round((summary.passed / summary.total) * 100)}%
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
          <strong>Note:</strong> Pour les tests de charge, utilisez des outils comme:
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li><code>k6</code> - Tests de performance modernes</li>
            <li><code>Artillery</code> - Tests de charge Node.js</li>
            <li><code>Locust</code> - Tests de charge Python</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
