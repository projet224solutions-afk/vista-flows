/**
 * Test complet du système - Vérifie toutes les connexions API
 * Supabase Auth/DB, Edge Functions, GCS Upload Flow
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useGCSUpload } from '@/hooks/useGCSUpload';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  Cloud, 
  Upload, 
  Download,
  Shield,
  Server,
  FileCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface TestResult {
  name: string;
  category: 'supabase' | 'edge-function' | 'gcs' | 'oracle';
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
  details?: any;
}

interface SystemReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  results: TestResult[];
}

export function FullSystemTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [report, setReport] = useState<SystemReport | null>(null);
  const { uploadFile } = useGCSUpload();

  const updateResult = (result: TestResult) => {
    setResults(prev => {
      const existing = prev.findIndex(r => r.name === result.name);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      return [...prev, result];
    });
  };

  const testSupabaseAuth = async (): Promise<TestResult> => {
    const startTime = Date.now();
    const testName = 'Supabase Auth Service';
    
    updateResult({ name: testName, category: 'supabase', status: 'running', message: 'Vérification du service Auth...' });
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      const duration = Date.now() - startTime;
      return {
        name: testName,
        category: 'supabase',
        status: 'success',
        message: session ? `Utilisateur connecté: ${session.user.email}` : 'Service Auth opérationnel (non connecté)',
        duration,
        details: { hasSession: !!session }
      };
    } catch (error: any) {
      return {
        name: testName,
        category: 'supabase',
        status: 'error',
        message: `Erreur Auth: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  };

  const testSupabaseDatabase = async (): Promise<TestResult> => {
    const startTime = Date.now();
    const testName = 'Supabase Database';
    
    updateResult({ name: testName, category: 'supabase', status: 'running', message: 'Test de connexion DB...' });
    
    try {
      // Test simple query to check DB connectivity
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      
      if (error) throw error;
      
      const duration = Date.now() - startTime;
      return {
        name: testName,
        category: 'supabase',
        status: 'success',
        message: `Base de données accessible (${count ?? 0} profils)`,
        duration,
        details: { profileCount: count }
      };
    } catch (error: any) {
      return {
        name: testName,
        category: 'supabase',
        status: 'error',
        message: `Erreur DB: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  };

  const testSupabaseRealtime = async (): Promise<TestResult> => {
    const startTime = Date.now();
    const testName = 'Supabase Realtime';
    
    updateResult({ name: testName, category: 'supabase', status: 'running', message: 'Test du service Realtime...' });
    
    try {
      const channel = supabase.channel('test-channel');
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          channel.unsubscribe();
          reject(new Error('Timeout - Realtime non disponible'));
        }, 5000);
        
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            channel.unsubscribe();
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            channel.unsubscribe();
            reject(new Error('Erreur de connexion au channel'));
          }
        });
      });
      
      const duration = Date.now() - startTime;
      return {
        name: testName,
        category: 'supabase',
        status: 'success',
        message: 'Service Realtime opérationnel',
        duration
      };
    } catch (error: any) {
      return {
        name: testName,
        category: 'supabase',
        status: 'warning',
        message: `Realtime: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  };

  const testGetGoogleSecret = async (): Promise<TestResult> => {
    const startTime = Date.now();
    const testName = 'Edge Function: get-google-secret';
    
    updateResult({ name: testName, category: 'edge-function', status: 'running', message: 'Test de récupération des secrets...' });
    
    try {
      const { data, error } = await supabase.functions.invoke('get-google-secret', {
        body: { secretName: 'GCS_SERVICE_ACCOUNT', version: 'latest' }
      });
      
      if (error) throw error;
      
      const duration = Date.now() - startTime;
      
      if (data?.success) {
        return {
          name: testName,
          category: 'edge-function',
          status: 'success',
          message: 'Secret Manager accessible et configuré',
          duration,
          details: { secretExists: data.exists }
        };
      } else {
        return {
          name: testName,
          category: 'edge-function',
          status: 'warning',
          message: data?.error || 'Secret non trouvé ou non configuré',
          duration
        };
      }
    } catch (error: any) {
      return {
        name: testName,
        category: 'edge-function',
        status: 'error',
        message: `Erreur: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  };

  const testGcsSignedUrl = async (): Promise<TestResult> => {
    const startTime = Date.now();
    const testName = 'Edge Function: gcs-signed-url';
    
    updateResult({ name: testName, category: 'edge-function', status: 'running', message: 'Test génération signed URL...' });
    
    try {
      const { data, error } = await supabase.functions.invoke('gcs-signed-url', {
        body: {
          action: 'upload',
          fileName: 'test-file.txt',
          contentType: 'text/plain',
          folder: 'tests',
          expiresInMinutes: 5
        }
      });
      
      if (error) throw error;
      
      const duration = Date.now() - startTime;
      
      if (data?.signedUrl) {
        return {
          name: testName,
          category: 'edge-function',
          status: 'success',
          message: 'Signed URL générée avec succès',
          duration,
          details: { 
            bucket: data.bucket,
            objectPath: data.objectPath,
            expiresAt: data.expiresAt
          }
        };
      } else {
        throw new Error(data?.error || 'Pas de signed URL retournée');
      }
    } catch (error: any) {
      return {
        name: testName,
        category: 'edge-function',
        status: 'error',
        message: `Erreur: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  };

  const testGcsUploadComplete = async (): Promise<TestResult> => {
    const startTime = Date.now();
    const testName = 'Edge Function: gcs-upload-complete';
    
    updateResult({ name: testName, category: 'edge-function', status: 'running', message: 'Test callback upload...' });
    
    try {
      const { data, error } = await supabase.functions.invoke('gcs-upload-complete', {
        body: {
          objectPath: 'tests/test-callback-file.txt',
          fileType: 'document',
          metadata: {
            originalName: 'test-callback.txt',
            size: 100,
            mimeType: 'text/plain',
            entityId: 'test-entity',
            entityType: 'test'
          }
        }
      });
      
      if (error) throw error;
      
      const duration = Date.now() - startTime;
      
      if (data?.success) {
        return {
          name: testName,
          category: 'edge-function',
          status: 'success',
          message: 'Callback upload fonctionnel',
          duration,
          details: { publicUrl: data.publicUrl }
        };
      } else {
        throw new Error(data?.error || 'Callback échoué');
      }
    } catch (error: any) {
      // L'erreur d'authentification est attendue si pas connecté
      if (error.message.includes('Auth')) {
        return {
          name: testName,
          category: 'edge-function',
          status: 'warning',
          message: 'Callback nécessite authentification (normal)',
          duration: Date.now() - startTime
        };
      }
      return {
        name: testName,
        category: 'edge-function',
        status: 'error',
        message: `Erreur: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  };

  const testFullUploadFlow = async (): Promise<TestResult> => {
    const startTime = Date.now();
    const testName = 'Flux Upload Complet GCS';
    
    updateResult({ name: testName, category: 'gcs', status: 'running', message: 'Test upload fichier réel...' });
    
    try {
      // Créer un fichier test
      const testContent = `Test upload - ${new Date().toISOString()}`;
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      const testFile = new File([testBlob], `test-upload-${Date.now()}.txt`, { type: 'text/plain' });
      
      // Upload via le hook
      const result = await uploadFile(testFile, {
        folder: 'tests/integration',
        fileType: 'document'
      });
      
      const duration = Date.now() - startTime;
      
      if (result.success && result.publicUrl) {
        return {
          name: testName,
          category: 'gcs',
          status: 'success',
          message: 'Upload complet réussi!',
          duration,
          details: {
            publicUrl: result.publicUrl,
            objectPath: result.objectPath
          }
        };
      } else {
        throw new Error(result.error || 'Upload échoué');
      }
    } catch (error: any) {
      return {
        name: testName,
        category: 'gcs',
        status: 'error',
        message: `Erreur upload: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  };

  const testFileDownload = async (uploadResult: TestResult): Promise<TestResult> => {
    const startTime = Date.now();
    const testName = 'Téléchargement Fichier GCS';
    
    updateResult({ name: testName, category: 'gcs', status: 'running', message: 'Test téléchargement...' });
    
    try {
      const publicUrl = uploadResult.details?.publicUrl;
      
      if (!publicUrl) {
        return {
          name: testName,
          category: 'gcs',
          status: 'warning',
          message: 'Pas d\'URL de téléchargement disponible',
          duration: Date.now() - startTime
        };
      }
      
      const response = await fetch(publicUrl, { method: 'HEAD' });
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        return {
          name: testName,
          category: 'gcs',
          status: 'success',
          message: 'Fichier accessible via URL publique',
          duration,
          details: {
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          }
        };
      } else {
        return {
          name: testName,
          category: 'gcs',
          status: 'warning',
          message: `Fichier non accessible (status: ${response.status})`,
          duration
        };
      }
    } catch (error: any) {
      return {
        name: testName,
        category: 'gcs',
        status: 'error',
        message: `Erreur téléchargement: ${error.message}`,
        duration: Date.now() - startTime
      };
    }
  };

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setReport(null);
    
    const allResults: TestResult[] = [];
    const totalTests = 8;
    let currentTest = 0;
    
    const runTest = async (testFn: () => Promise<TestResult>) => {
      const result = await testFn();
      allResults.push(result);
      updateResult(result);
      currentTest++;
      setProgress((currentTest / totalTests) * 100);
      return result;
    };
    
    // Tests Supabase
    await runTest(testSupabaseAuth);
    await runTest(testSupabaseDatabase);
    await runTest(testSupabaseRealtime);
    
    // Tests Edge Functions
    await runTest(testGetGoogleSecret);
    await runTest(testGcsSignedUrl);
    await runTest(testGcsUploadComplete);
    
    // Tests GCS Upload Flow
    const uploadResult = await runTest(testFullUploadFlow);
    await runTest(() => testFileDownload(uploadResult));
    
    // Générer le rapport
    const passed = allResults.filter(r => r.status === 'success').length;
    const failed = allResults.filter(r => r.status === 'error').length;
    const warnings = allResults.filter(r => r.status === 'warning').length;
    
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (failed > 0) overallStatus = 'critical';
    else if (warnings > 0) overallStatus = 'degraded';
    
    setReport({
      timestamp: new Date().toISOString(),
      totalTests: totalTests,
      passed,
      failed,
      warnings,
      overallStatus,
      results: allResults
    });
    
    setIsRunning(false);
  }, [uploadFile]);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (category: TestResult['category']) => {
    switch (category) {
      case 'supabase': return <Database className="h-4 w-4" />;
      case 'edge-function': return <Server className="h-4 w-4" />;
      case 'gcs': return <Cloud className="h-4 w-4" />;
      case 'oracle': return <Shield className="h-4 w-4" />;
    }
  };

  const getOverallStatusBadge = (status: SystemReport['overallStatus']) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500 text-white">Système Opérationnel</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500 text-white">Système Dégradé</Badge>;
      case 'critical':
        return <Badge className="bg-red-500 text-white">Système Critique</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Test Complet du Système
            </CardTitle>
            <CardDescription>
              Vérifie toutes les connexions API et le flux d'upload GCS
            </CardDescription>
          </div>
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Tests en cours...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Lancer les Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression des tests</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}
        
        {/* Rapport Final */}
        {report && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Rapport de Test</CardTitle>
                {getOverallStatusBadge(report.overallStatus)}
              </div>
              <CardDescription>
                {new Date(report.timestamp).toLocaleString('fr-FR')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-500">{report.passed}</div>
                  <div className="text-sm text-muted-foreground">Réussis</div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-500">{report.warnings}</div>
                  <div className="text-sm text-muted-foreground">Avertissements</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-2xl font-bold text-red-500">{report.failed}</div>
                  <div className="text-sm text-muted-foreground">Échecs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Résultats détaillés */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Database className="h-4 w-4" />
              Résultats Détaillés
            </h3>
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-[200px]">
                      {getCategoryIcon(result.category)}
                      {getStatusIcon(result.status)}
                      <span className="font-medium text-sm">{result.name}</span>
                    </div>
                    <Separator orientation="vertical" className="h-auto self-stretch" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground break-words">
                        {result.message}
                      </p>
                      {result.duration && (
                        <span className="text-xs text-muted-foreground">
                          {result.duration}ms
                        </span>
                      )}
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Voir les détails
                          </summary>
                          <pre className="mt-1 p-2 rounded bg-background text-xs overflow-auto max-w-full">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {/* Instructions */}
        {!isRunning && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Cliquez sur "Lancer les Tests" pour vérifier toutes les connexions</p>
            <ul className="mt-4 text-sm text-left max-w-md mx-auto space-y-1">
              <li>✓ Supabase Auth & Database</li>
              <li>✓ Edge Functions (secrets, signed URLs, callbacks)</li>
              <li>✓ Google Cloud Storage (upload, download)</li>
              <li>✓ Flux complet d'upload de fichier</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
