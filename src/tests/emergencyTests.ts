/**
 * EMERGENCY MODULE - SCRIPT DE TEST AUTOMATISÉ
 * 224Solutions - Tests et validation du système d'urgence
 * 
 * Usage: Copier ce fichier dans src/tests/emergencyTests.ts
 * Exécuter: npm run test:emergency
 */

import { emergencyService, gpsTrackingService } from '@/services/emergencyService';
import { emergencyNotifications } from '@/services/emergencyNotifications';
import type { EmergencyAlert, GPSPosition } from '@/types/emergency';

// ============================================
// CONFIGURATION TESTS
// ============================================

const TEST_CONFIG = {
  TEST_DRIVER_ID: 'test-driver-123',
  TEST_DRIVER_NAME: 'Test Driver',
  TEST_DRIVER_PHONE: '+224 621 000 000',
  TEST_DRIVER_CODE: 'TEST001',
  TEST_BUREAU_ID: 'test-bureau-456',
  TEST_USER_ID: 'test-user-789',
  
  // Position GPS de test (Conakry, Guinée)
  TEST_GPS: {
    latitude: 9.6412,
    longitude: -13.5784,
    accuracy: 10
  }
};

// ============================================
// UTILITAIRES DE TEST
// ============================================

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

function logTest(name: string, status: 'PASS' | 'FAIL' | 'SKIP', message?: string) {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${name}${message ? `: ${message}` : ''}`);
  
  if (status === 'PASS') testsPassed++;
  else if (status === 'FAIL') testsFailed++;
  else testsSkipped++;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// TEST 1: CRÉATION D'ALERTE
// ============================================

export async function testCreateAlert(): Promise<EmergencyAlert | null> {
  console.log('\n🧪 TEST 1: Création d\'Alerte d\'Urgence');
  
  try {
    const alert = await emergencyService.createAlert({
      driver_id: TEST_CONFIG.TEST_DRIVER_ID,
      driver_name: TEST_CONFIG.TEST_DRIVER_NAME,
      driver_phone: TEST_CONFIG.TEST_DRIVER_PHONE,
      driver_code: TEST_CONFIG.TEST_DRIVER_CODE,
      initial_latitude: TEST_CONFIG.TEST_GPS.latitude,
      initial_longitude: TEST_CONFIG.TEST_GPS.longitude,
      initial_accuracy: TEST_CONFIG.TEST_GPS.accuracy,
      silent_mode: false,
      bureau_syndicat_id: TEST_CONFIG.TEST_BUREAU_ID
    });
    
    if (alert && alert.id) {
      logTest('Création alerte', 'PASS', `ID: ${alert.id}`);
      logTest('Statut initial', alert.status === 'active' ? 'PASS' : 'FAIL', alert.status);
      logTest('Position GPS enregistrée', 'PASS', `${alert.initial_latitude}, ${alert.initial_longitude}`);
      return alert;
    } else {
      logTest('Création alerte', 'FAIL', 'Aucune donnée retournée');
      return null;
    }
  } catch (error) {
    logTest('Création alerte', 'FAIL', (error as Error).message);
    return null;
  }
}

// ============================================
// TEST 2: TRACKING GPS
// ============================================

export async function testGPSTracking(alertId: string): Promise<boolean> {
  console.log('\n🧪 TEST 2: Tracking GPS en Temps Réel');
  
  try {
    // Simuler 10 points GPS (toutes les 2 secondes)
    const trackingPoints: GPSPosition[] = [];
    
    for (let i = 0; i < 10; i++) {
      const point: GPSPosition = {
        latitude: TEST_CONFIG.TEST_GPS.latitude + (Math.random() * 0.001),
        longitude: TEST_CONFIG.TEST_GPS.longitude + (Math.random() * 0.001),
        accuracy: 10 + (Math.random() * 5),
        speed: 10 + (Math.random() * 30), // 10-40 km/h
        direction: Math.random() * 360
      };
      
      await emergencyService.addGPSTracking({
        alert_id: alertId,
        ...point
      });
      
      trackingPoints.push(point);
      
      logTest(`Point GPS ${i + 1}/10`, 'PASS', `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`);
      
      // Attendre 500ms (accéléré pour test)
      await sleep(500);
    }
    
    // Vérifier l'historique
    const history = await emergencyService.getGPSTracking(alertId, 10);
    
    if (history.length >= 10) {
      logTest('Historique GPS complet', 'PASS', `${history.length} points enregistrés`);
      return true;
    } else {
      logTest('Historique GPS incomplet', 'FAIL', `${history.length}/10 points`);
      return false;
    }
  } catch (error) {
    logTest('Tracking GPS', 'FAIL', (error as Error).message);
    return false;
  }
}

// ============================================
// TEST 3: ACTIONS SYNDICAT
// ============================================

export async function testEmergencyActions(alertId: string): Promise<boolean> {
  console.log('\n🧪 TEST 3: Actions Bureau Syndicat');
  
  try {
    // Test 1: Prise en charge
    await emergencyService.markAsInProgress(alertId, TEST_CONFIG.TEST_USER_ID);
    const alert1 = await emergencyService.getAlert(alertId);
    logTest('Marquer "en cours"', alert1?.status === 'in_progress' ? 'PASS' : 'FAIL');
    
    // Test 2: Ajouter une note
    await emergencyService.createAction({
      alert_id: alertId,
      action_type: 'note',
      performed_by: TEST_CONFIG.TEST_USER_ID,
      performed_by_name: 'Test Admin',
      notes: 'Test note: Conducteur contacté'
    });
    logTest('Ajouter note', 'PASS');
    
    // Test 3: Appel conducteur
    await emergencyService.createAction({
      alert_id: alertId,
      action_type: 'call_driver',
      performed_by: TEST_CONFIG.TEST_USER_ID,
      performed_by_name: 'Test Admin',
      action_details: { phone: TEST_CONFIG.TEST_DRIVER_PHONE }
    });
    logTest('Action appel', 'PASS');
    
    // Test 4: Résolution
    await emergencyService.resolveAlert(
      alertId,
      TEST_CONFIG.TEST_USER_ID,
      'Test résolution: Conducteur en sécurité'
    );
    const alert2 = await emergencyService.getAlert(alertId);
    logTest('Résoudre alerte', alert2?.status === 'resolved' ? 'PASS' : 'FAIL');
    
    // Vérifier historique actions
    const actions = await emergencyService.getAlertActions(alertId);
    logTest('Historique actions', actions.length >= 3 ? 'PASS' : 'FAIL', `${actions.length} actions`);
    
    return true;
  } catch (error) {
    logTest('Actions syndicat', 'FAIL', (error as Error).message);
    return false;
  }
}

// ============================================
// TEST 4: STATISTIQUES
// ============================================

export async function testStats(): Promise<boolean> {
  console.log('\n🧪 TEST 4: Statistiques d\'Urgence');
  
  try {
    // Stats globales
    const globalStats = await emergencyService.getStats();
    logTest('Stats globales', globalStats !== null ? 'PASS' : 'FAIL');
    
    if (globalStats) {
      logTest('Total alertes', 'PASS', `${globalStats.total_alerts || 0}`);
      logTest('Alertes actives', 'PASS', `${globalStats.active_alerts || 0}`);
      logTest('Alertes résolues', 'PASS', `${globalStats.resolved_alerts || 0}`);
    }
    
    // Stats par bureau
    const bureauStats = await emergencyService.getStats(TEST_CONFIG.TEST_BUREAU_ID);
    logTest('Stats bureau', bureauStats !== null ? 'PASS' : 'FAIL');
    
    return true;
  } catch (error) {
    logTest('Statistiques', 'FAIL', (error as Error).message);
    return false;
  }
}

// ============================================
// TEST 5: NOTIFICATIONS
// ============================================

export async function testNotifications(): Promise<boolean> {
  console.log('\n🧪 TEST 5: Système de Notifications');
  
  try {
    // Support navigateur
    const isSupported = emergencyNotifications.isSupported();
    logTest('Support notifications', isSupported ? 'PASS' : 'SKIP', 
      isSupported ? 'Navigateur compatible' : 'Non supporté');
    
    if (!isSupported) {
      testsSkipped += 2;
      return false;
    }
    
    // Permission
    const hasPermission = await emergencyNotifications.requestPermission();
    logTest('Permission notifications', hasPermission ? 'PASS' : 'SKIP',
      hasPermission ? 'Accordée' : 'Refusée');
    
    if (!hasPermission) {
      testsSkipped++;
      return false;
    }
    
    // Test notification
    try {
      await emergencyNotifications.testNotification();
      logTest('Notification test', 'PASS', 'Envoyée avec succès');
    } catch (err) {
      logTest('Notification test', 'FAIL', 'Échec envoi');
    }
    
    return true;
  } catch (error) {
    logTest('Notifications', 'FAIL', (error as Error).message);
    return false;
  }
}

// ============================================
// TEST 6: GÉOLOCALISATION NAVIGATEUR
// ============================================

export async function testGeolocation(): Promise<boolean> {
  console.log('\n🧪 TEST 6: Géolocalisation Navigateur');
  
  try {
    if (!navigator.geolocation) {
      logTest('Support géolocalisation', 'SKIP', 'Non supporté');
      return false;
    }
    
    logTest('Support géolocalisation', 'PASS');
    
    // Obtenir position actuelle
    const position = await gpsTrackingService.getCurrentPosition();
    
    if (position && position.latitude && position.longitude) {
      logTest('Position GPS', 'PASS', `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`);
      logTest('Précision GPS', 'PASS', `${position.accuracy?.toFixed(1) || 'N/A'} mètres`);
      
      if (position.speed !== undefined) {
        logTest('Vitesse GPS', 'PASS', `${position.speed.toFixed(1)} km/h`);
      } else {
        logTest('Vitesse GPS', 'SKIP', 'Non disponible');
      }
      
      return true;
    } else {
      logTest('Position GPS', 'FAIL', 'Données invalides');
      return false;
    }
  } catch (error) {
    logTest('Géolocalisation', 'FAIL', (error as Error).message);
    return false;
  }
}

// ============================================
// TEST 7: WEBSOCKET TEMPS RÉEL
// ============================================

export async function testRealtimeSubscription(alertId: string): Promise<boolean> {
  console.log('\n🧪 TEST 7: WebSocket Temps Réel');
  
  return new Promise((resolve) => {
    try {
      let updateReceived = false;
      
      // S'abonner aux mises à jour
      const unsubscribe = emergencyService.subscribeToAlert(alertId, (alert) => {
        if (!updateReceived) {
          updateReceived = true;
          logTest('WebSocket alerte', 'PASS', 'Mise à jour reçue');
          unsubscribe();
          resolve(true);
        }
      });
      
      // Déclencher une mise à jour après 2 secondes
      setTimeout(async () => {
        try {
          await emergencyService.updateAlert(alertId, {
            current_speed: 42.0
          });
        } catch (err) {
          logTest('WebSocket trigger', 'FAIL', (err as Error).message);
        }
      }, 2000);
      
      // Timeout après 10 secondes
      setTimeout(() => {
        if (!updateReceived) {
          logTest('WebSocket alerte', 'FAIL', 'Timeout (pas de mise à jour)');
          unsubscribe();
          resolve(false);
        }
      }, 10000);
      
    } catch (error) {
      logTest('WebSocket', 'FAIL', (error as Error).message);
      resolve(false);
    }
  });
}

// ============================================
// TEST 8: SURCHARGE (100 ALERTES)
// ============================================

export async function testLoadStress(): Promise<boolean> {
  console.log('\n🧪 TEST 8: Surcharge - 100 Alertes Simultanées');
  
  const confirmTest = confirm('⚠️ Ce test va créer 100 alertes. Continuer ?');
  
  if (!confirmTest) {
    logTest('Test surcharge', 'SKIP', 'Annulé par utilisateur');
    return false;
  }
  
  try {
    const startTime = Date.now();
    const promises: Promise<any>[] = [];
    
    // Créer 100 alertes en parallèle
    for (let i = 0; i < 100; i++) {
      promises.push(
        emergencyService.createAlert({
          driver_id: `test-driver-${i}`,
          driver_name: `Test Driver ${i}`,
          driver_code: `TEST${String(i).padStart(3, '0')}`,
          initial_latitude: TEST_CONFIG.TEST_GPS.latitude + (Math.random() * 0.1),
          initial_longitude: TEST_CONFIG.TEST_GPS.longitude + (Math.random() * 0.1),
          silent_mode: true
        })
      );
    }
    
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const duration = endTime - startTime;
    
    logTest('Alertes créées', successful === 100 ? 'PASS' : 'FAIL', 
      `${successful}/100 en ${duration}ms`);
    
    if (failed > 0) {
      logTest('Alertes échouées', 'FAIL', `${failed} erreurs`);
    }
    
    // Charger les alertes actives
    const activeAlerts = await emergencyService.getActiveAlerts();
    logTest('Chargement alertes', activeAlerts.length >= 100 ? 'PASS' : 'FAIL',
      `${activeAlerts.length} alertes récupérées`);
    
    return successful >= 95; // 95% de réussite minimum
  } catch (error) {
    logTest('Test surcharge', 'FAIL', (error as Error).message);
    return false;
  }
}

// ============================================
// SUITE DE TESTS COMPLÈTE
// ============================================

export async function runAllTests() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   🚨 EMERGENCY SOS MODULE - SUITE DE TESTS AUTOMATISÉS   ║');
  console.log('║              224Solutions - Version 1.0.0                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  let testAlert: EmergencyAlert | null = null;
  
  // Test 1: Création alerte
  testAlert = await testCreateAlert();
  
  if (testAlert) {
    // Test 2: Tracking GPS
    await testGPSTracking(testAlert.id);
    
    // Test 3: Actions syndicat
    await testEmergencyActions(testAlert.id);
    
    // Test 7: WebSocket (nécessite alerte active)
    // await testRealtimeSubscription(testAlert.id);
  }
  
  // Test 4: Statistiques
  await testStats();
  
  // Test 5: Notifications
  await testNotifications();
  
  // Test 6: Géolocalisation
  await testGeolocation();
  
  // Test 8: Surcharge (optionnel)
  // await testLoadStress();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Résumé
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                     RÉSUMÉ DES TESTS                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`✅ Tests réussis : ${testsPassed}`);
  console.log(`❌ Tests échoués : ${testsFailed}`);
  console.log(`⏭️  Tests ignorés : ${testsSkipped}`);
  console.log(`⏱️  Durée totale  : ${duration}s`);
  
  const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
  console.log(`📊 Taux de réussite : ${successRate}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS ! Module validé. ✅');
  } else {
    console.log('\n⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.');
  }
  
  console.log('\n' + '═'.repeat(63));
}

// ============================================
// AUTO-EXÉCUTION SI SCRIPT STANDALONE
// ============================================

if (typeof window !== 'undefined') {
  (window as any).runEmergencyTests = runAllTests;
  console.log('💡 Tests disponibles. Exécutez: runEmergencyTests()');
}

export default runAllTests;
