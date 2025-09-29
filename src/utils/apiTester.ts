/**
 * 🧪 Testeur d'APIs pour 224Solutions
 * Script complet pour vérifier toutes les fonctionnalités API
 */

import { supabase } from '@/integrations/supabase/client';
import { googleAI, googleMaps } from '@/services/googleCloud';

// Types pour les résultats de tests
interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

interface APITestSuite {
  supabase: TestResult[];
  googleCloud: TestResult[];
  overall: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * 🔐 Tests Supabase
 */
export class SupabaseAPITester {
  
  static async testConnection(): Promise<TestResult> {
    const start = Date.now();
    try {
      // Test de connexion basique avec une requête simple
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(0);
      
      if (error) throw error;
      
      return {
        name: 'Connexion Supabase',
        status: 'success',
        message: 'Connexion établie avec succès',
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        name: 'Connexion Supabase',
        status: 'error',
        message: `Erreur de connexion: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  static async testAuthentication(): Promise<TestResult> {
    const start = Date.now();
    try {
      // Test de session auth
      const { data: session, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      // Test des méthodes auth disponibles
      const { data: providers } = await supabase.auth.getOAuthSignInUrl({
        provider: 'github'
      });

      return {
        name: 'Authentification',
        status: 'success',
        message: session.session ? 'Utilisateur connecté' : 'Auth configurée, pas de session active',
        details: {
          hasSession: !!session.session,
          userId: session.session?.user?.id,
          oauthAvailable: !!providers
        },
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        name: 'Authentification',
        status: 'error',
        message: `Erreur auth: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  static async testDatabase(): Promise<TestResult> {
    const start = Date.now();
    try {
      // Test CRUD sur les profiles
      const { data: profiles, error: selectError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .limit(5);

      if (selectError) throw selectError;

      // Test des autres tables importantes
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status')
        .limit(1);

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .limit(1);

      return {
        name: 'Base de données',
        status: 'success',
        message: 'Accès base de données opérationnel',
        details: {
          profiles: profiles?.length || 0,
          ordersAccessible: !ordersError,
          productsAccessible: !productsError,
          tablesCount: 3
        },
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        name: 'Base de données',
        status: 'error',
        message: `Erreur database: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  static async testRealtime(): Promise<TestResult> {
    const start = Date.now();
    try {
      // Test du canal temps réel
      const channel = supabase
        .channel('test-channel-' + Date.now())
        .on('presence', { event: 'sync' }, (payload) => {
          console.log('Realtime test received:', payload);
        })
        .subscribe();

      // Attendre un court moment pour la connexion
      await new Promise(resolve => setTimeout(resolve, 1000));

      const status = channel.state;
      channel.unsubscribe();

      if (status === 'joined') {
        return {
          name: 'Temps réel',
          status: 'success',
          message: 'Canal temps réel opérationnel',
          details: { channelState: status },
          duration: Date.now() - start
        };
      } else {
        return {
          name: 'Temps réel',
          status: 'warning',
          message: 'Canal en cours de connexion',
          details: { channelState: status },
          duration: Date.now() - start
        };
      }
    } catch (error) {
      return {
        name: 'Temps réel',
        status: 'error',
        message: `Erreur realtime: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  static async testStorage(): Promise<TestResult> {
    const start = Date.now();
    try {
      // Test d'accès au storage
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) throw error;

      // Test de upload (fichier test)
      const testFile = new Blob(['test-content'], { type: 'text/plain' });
      const fileName = `test-${Date.now()}.txt`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, testFile);

      // Nettoyer le fichier test
      if (uploadData) {
        await supabase.storage
          .from('uploads')
          .remove([fileName]);
      }

      return {
        name: 'Stockage',
        status: uploadError ? 'warning' : 'success',
        message: uploadError ? 'Accès lecture OK, upload limité' : 'Stockage pleinement opérationnel',
        details: {
          bucketsCount: buckets?.length || 0,
          uploadWorking: !uploadError,
          buckets: buckets?.map(b => b.name)
        },
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        name: 'Stockage',
        status: 'error',
        message: `Erreur storage: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  static async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Démarrage des tests Supabase...');
    
    const tests = [
      this.testConnection(),
      this.testAuthentication(),
      this.testDatabase(),
      this.testRealtime(),
      this.testStorage()
    ];

    return Promise.all(tests);
  }
}

/**
 * 🌩️ Tests Google Cloud
 */
export class GoogleCloudAPITester {
  
  static async testAIService(): Promise<TestResult> {
    const start = Date.now();
    try {
      const testQuery = "test de connexion AI";
      const response = await googleAI.generateCopilotResponse(testQuery, {
        test: true,
        timestamp: new Date().toISOString()
      });

      const isWorking = response && response.length > 10;

      return {
        name: 'Google AI',
        status: isWorking ? 'success' : 'warning',
        message: isWorking ? 'Service AI opérationnel' : 'AI en mode simulation',
        details: {
          responseLength: response?.length || 0,
          mode: process.env.NODE_ENV === 'development' ? 'simulation' : 'production'
        },
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        name: 'Google AI',
        status: 'error',
        message: `Erreur Google AI: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  static async testMapsService(): Promise<TestResult> {
    const start = Date.now();
    try {
      // Test de calcul de distance (méthode locale)
      const distance = googleMaps.calculateDistance(
        { lat: 14.7167, lng: -17.4677 }, // Dakar
        { lat: 5.3364, lng: -4.0267 }     // Abidjan
      );

      // Test de géocodage (si API key disponible)
      let geocodingWorking = false;
      try {
        const coords = await googleMaps.geocodeAddress("Dakar, Sénégal");
        geocodingWorking = !!coords;
      } catch {
        // Géocodage non disponible (pas de clé API)
      }

      return {
        name: 'Google Maps',
        status: 'success',
        message: 'Service Maps opérationnel',
        details: {
          distanceCalculation: distance + ' km',
          geocodingAvailable: geocodingWorking,
          mapsApiKey: !!process.env.VITE_GOOGLE_MAPS_API_KEY
        },
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        name: 'Google Maps',
        status: 'error',
        message: `Erreur Google Maps: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  static async testCloudConfig(): Promise<TestResult> {
    const start = Date.now();
    try {
      const config = {
        projectId: process.env.GCP_PROJECT_ID,
        serviceAccount: process.env.GCP_CLIENT_EMAIL,
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
      };

      const configComplete = Object.values(config).every(value => !!value);

      return {
        name: 'Configuration Google Cloud',
        status: configComplete ? 'success' : 'warning',
        message: configComplete ? 'Configuration complète' : 'Configuration partielle',
        details: config,
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        name: 'Configuration Google Cloud',
        status: 'error',
        message: `Erreur config: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  static async runAllTests(): Promise<TestResult[]> {
    console.log('🌩️ Démarrage des tests Google Cloud...');
    
    const tests = [
      this.testCloudConfig(),
      this.testAIService(),
      this.testMapsService()
    ];

    return Promise.all(tests);
  }
}

/**
 * 🎯 Test Suite Principal
 */
export class APITestRunner {
  
  static async runFullTestSuite(): Promise<APITestSuite> {
    console.log('🚀 Démarrage de la suite de tests complète 224Solutions...');
    
    const [supabaseResults, googleCloudResults] = await Promise.all([
      SupabaseAPITester.runAllTests(),
      GoogleCloudAPITester.runAllTests()
    ]);

    const allResults = [...supabaseResults, ...googleCloudResults];
    
    const overall = {
      total: allResults.length,
      passed: allResults.filter(r => r.status === 'success').length,
      failed: allResults.filter(r => r.status === 'error').length,
      warnings: allResults.filter(r => r.status === 'warning').length
    };

    const results: APITestSuite = {
      supabase: supabaseResults,
      googleCloud: googleCloudResults,
      overall
    };

    // Log des résultats
    console.log('📊 Résultats des tests:');
    console.log(`✅ Réussis: ${overall.passed}/${overall.total}`);
    console.log(`⚠️ Avertissements: ${overall.warnings}`);
    console.log(`❌ Échecs: ${overall.failed}`);

    // Détail par service
    allResults.forEach(result => {
      const emoji = result.status === 'success' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${emoji} ${result.name}: ${result.message} (${result.duration}ms)`);
    });

    return results;
  }

  static getTestResultsHTML(results: APITestSuite): string {
    const { overall, supabase, googleCloud } = results;
    
    const statusIcon = (status: string) => 
      status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';

    const generateTestRows = (tests: TestResult[]) => 
      tests.map(test => `
        <tr class="${test.status === 'success' ? 'bg-green-50' : test.status === 'warning' ? 'bg-yellow-50' : 'bg-red-50'}">
          <td class="px-4 py-2">${statusIcon(test.status)} ${test.name}</td>
          <td class="px-4 py-2">${test.message}</td>
          <td class="px-4 py-2">${test.duration || 0}ms</td>
        </tr>
      `).join('');

    return `
      <div class="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
        <h2 class="text-2xl font-bold mb-4">📊 Rapport de Tests API - 224Solutions</h2>
        
        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-blue-50 p-4 rounded text-center">
            <div class="text-2xl font-bold text-blue-600">${overall.total}</div>
            <div class="text-sm text-blue-600">Total</div>
          </div>
          <div class="bg-green-50 p-4 rounded text-center">
            <div class="text-2xl font-bold text-green-600">${overall.passed}</div>
            <div class="text-sm text-green-600">Réussis</div>
          </div>
          <div class="bg-yellow-50 p-4 rounded text-center">
            <div class="text-2xl font-bold text-yellow-600">${overall.warnings}</div>
            <div class="text-sm text-yellow-600">Avertissements</div>
          </div>
          <div class="bg-red-50 p-4 rounded text-center">
            <div class="text-2xl font-bold text-red-600">${overall.failed}</div>
            <div class="text-sm text-red-600">Échecs</div>
          </div>
        </div>

        <h3 class="text-xl font-semibold mb-3">🔐 Tests Supabase</h3>
        <table class="w-full mb-6 border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-4 py-2 text-left">Test</th>
              <th class="border border-gray-300 px-4 py-2 text-left">Résultat</th>
              <th class="border border-gray-300 px-4 py-2 text-left">Durée</th>
            </tr>
          </thead>
          <tbody>
            ${generateTestRows(supabase)}
          </tbody>
        </table>

        <h3 class="text-xl font-semibold mb-3">🌩️ Tests Google Cloud</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-4 py-2 text-left">Test</th>
              <th class="border border-gray-300 px-4 py-2 text-left">Résultat</th>
              <th class="border border-gray-300 px-4 py-2 text-left">Durée</th>
            </tr>
          </thead>
          <tbody>
            ${generateTestRows(googleCloud)}
          </tbody>
        </table>

        <div class="mt-6 p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">
            Tests exécutés le ${new Date().toLocaleString('fr-FR')} | 
            Score: ${Math.round((overall.passed / overall.total) * 100)}%
          </p>
        </div>
      </div>
    `;
  }
}

// Export des fonctions utilitaires
export const testAllAPIs = APITestRunner.runFullTestSuite;
export const generateTestReport = APITestRunner.getTestResultsHTML;

// Export pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).testAPIs = testAllAPIs;
  (window as any).APITester = {
    supabase: SupabaseAPITester,
    googleCloud: GoogleCloudAPITester,
    runAll: APITestRunner.runFullTestSuite
  };
}
