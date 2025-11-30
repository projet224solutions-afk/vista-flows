/**
 * EMERGENCY SOS - GUIDE D'INTÉGRATION RAPIDE
 * 224Solutions - Intégration en 5 minutes
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';

// ============================================
// ÉTAPE 1 : IMPORTER LES COMPOSANTS
// ============================================

import { EmergencySOSButton } from '@/components/emergency/EmergencySOSButton';
import { EmergencyAlertsDashboard } from '@/components/emergency/EmergencyAlertsDashboard';
import { EmergencyStatsWidget } from '@/components/emergency/EmergencyStatsWidget';
import { initializeEmergencyNotifications } from '@/services/emergencyNotifications';

// ============================================
// ÉTAPE 2 : INITIALISER LES NOTIFICATIONS
// ============================================

// Dans votre App.tsx ou main.tsx :
function App() {
  React.useEffect(() => {
    // Demander les permissions de notification au chargement
    initializeEmergencyNotifications();
  }, []);

  return (
    <Routes>
      {/* Vos routes existantes */}
      
      {/* Route Emergency Dashboard */}
      <Route path="/emergency" element={<EmergencyDashboardPage />} />
      
      {/* Route Driver avec SOS Button */}
      <Route path="/driver" element={<DriverDashboardPage />} />
      
      {/* Route Bureau avec Emergency Widget */}
      <Route path="/bureau/:token" element={<BureauDashboardPage />} />
    </Routes>
  );
}

// ============================================
// ÉTAPE 3 : INTERFACE CONDUCTEUR (DRIVER)
// ============================================

function DriverDashboardPage() {
  // Récupérer les infos du conducteur depuis votre contexte/state
  const { user } = useAuth(); // Votre hook d'auth
  
  return (
    <div className="min-h-screen p-6">
      {/* Votre interface conducteur existante */}
      <div className="space-y-6">
        <h1>Tableau de Bord Conducteur</h1>
        
        {/* Vos composants existants */}
        
      </div>

      {/* ✅ BOUTON SOS FLOTTANT (toujours visible) */}
      <EmergencySOSButton
        driverId={user?.id}
        driverName={user?.full_name}
        driverPhone={user?.phone}
        driverCode={user?.driver_code}
        bureauSyndicatId={user?.bureau_id} // ID du bureau responsable
        variant="floating" // Bouton flottant en bas à droite
        silentMode={false} // Mode normal avec son
      />
    </div>
  );
}

// ============================================
// ÉTAPE 4 : INTERFACE BUREAU SYNDICAT
// ============================================

function BureauDashboardPage() {
  const { bureau, user } = useAuth(); // Votre hook d'auth

  return (
    <div className="min-h-screen p-6">
      <div className="space-y-6">
        <h1>Bureau Syndicat - {bureau?.nom}</h1>

        {/* ✅ WIDGET STATS EMERGENCY (aperçu rapide) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <EmergencyStatsWidget
            bureauId={bureau?.id}
            compact={false}
            showDetails={true}
          />
          
          {/* Vos autres widgets */}
        </div>

        {/* Vos composants existants */}
      </div>
    </div>
  );
}

// ============================================
// ÉTAPE 5 : PAGE DÉDIÉE EMERGENCY DASHBOARD
// ============================================

function EmergencyDashboardPage() {
  const { user, bureau } = useAuth();

  // Déterminer le rôle de l'utilisateur
  const userRole = user?.role as 'admin' | 'syndicat' | 'pdg';
  const bureauId = userRole === 'syndicat' ? bureau?.id : undefined;

  return (
    <div className="min-h-screen p-6">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">
          🚨 Système d'Urgence SOS - Taxi-Moto
        </h1>

        {/* ✅ DASHBOARD COMPLET EMERGENCY */}
        <EmergencyAlertsDashboard
          bureauId={bureauId} // undefined = toutes les alertes (admin)
          userRole={userRole}
          userId={user?.id || ''}
          userName={user?.full_name}
        />
      </div>
    </div>
  );
}

// ============================================
// ÉTAPE 6 : ALTERNATIVE - BOUTON INLINE
// ============================================

function DriverProfilePage() {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h2>Mon Profil</h2>
      
      <div className="space-y-4">
        {/* Informations du conducteur */}
        
        {/* ✅ BOUTON SOS INTÉGRÉ (pas flottant) */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <h3 className="font-bold mb-3 text-red-800">
            Système d'Urgence
          </h3>
          <p className="text-sm text-red-700 mb-4">
            En cas de danger (agression, vol, menace), appuyez sur ce bouton 
            pour alerter immédiatement le Bureau Syndicat.
          </p>
          
          <EmergencySOSButton
            variant="inline" // Bouton intégré (pas flottant)
            silentMode={false}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// ÉTAPE 7 : AJOUTER AU MENU DE NAVIGATION
// ============================================

function NavigationMenu() {
  const { user } = useAuth();
  const { activeAlerts } = useEmergencyStats(); // Hook custom (optionnel)

  return (
    <nav>
      {/* Vos liens existants */}
      
      {/* ✅ LIEN VERS EMERGENCY DASHBOARD (pour admin/syndicat) */}
      {(user?.role === 'admin' || user?.role === 'syndicat') && (
        <a href="/emergency" className="relative">
          🚨 Urgences
          
          {/* Badge nombre d'alertes actives */}
          {activeAlerts > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {activeAlerts}
            </span>
          )}
        </a>
      )}
    </nav>
  );
}

// ============================================
// HOOK CUSTOM : STATS EN TEMPS RÉEL (OPTIONNEL)
// ============================================

import { useState, useEffect } from 'react';
import { emergencyService } from '@/services/emergencyService';

function useEmergencyStats(bureauId?: string) {
  const [stats, setStats] = useState({ activeAlerts: 0, totalAlerts: 0 });

  useEffect(() => {
    const loadStats = async () => {
      const data = await emergencyService.getStats(bureauId);
      if (data) {
        setStats({
          activeAlerts: data.active_alerts,
          totalAlerts: data.total_alerts
        });
      }
    };

    loadStats();

    // S'abonner aux nouvelles alertes
    const unsubscribe = emergencyService.subscribeToActiveAlerts(() => {
      loadStats(); // Recharger les stats
    });

    return () => unsubscribe();
  }, [bureauId]);

  return stats;
}

// ============================================
// ÉTAPE 8 : AJOUTER LES SONS (PUBLIC FOLDER)
// ============================================

/*
Ajouter ces fichiers dans /public/sounds/ :

1. emergency-alert.mp3
   - Son d'urgence fort et distinctif
   - Durée : 2-3 secondes
   - Tonalité sérieuse

2. confirmation.mp3
   - Son de confirmation doux
   - Durée : 1 seconde
   - Tonalité positive

Vous pouvez les télécharger depuis :
- https://freesound.org/
- https://pixabay.com/sound-effects/
- Ou créer les vôtres
*/

// ============================================
// ÉTAPE 9 : CONFIGURATION .ENV (SI BESOIN)
// ============================================

/*
Ajouter dans votre .env.local (optionnel) :

VITE_EMERGENCY_TRACKING_INTERVAL=2000  # Intervalle GPS (ms)
VITE_EMERGENCY_COOLDOWN=5              # Cooldown bouton SOS (secondes)
VITE_ENABLE_EMERGENCY_SOUND=true       # Activer sons d'urgence
VITE_EMERGENCY_MAP_PROVIDER=google     # 'google' ou 'mapbox'
*/

// ============================================
// ÉTAPE 10 : EXÉCUTER LA MIGRATION SQL
// ============================================

/*
Dans Supabase Dashboard > SQL Editor :

1. Aller sur : https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copier-coller le contenu de : supabase/migrations/20251130_emergency_sos_system.sql
3. Cliquer sur "Run"
4. Vérifier que les 3 tables sont créées :
   - emergency_alerts
   - emergency_gps_tracking
   - emergency_actions
*/

// ============================================
// ✅ INTÉGRATION TERMINÉE !
// ============================================

/*
Checklist finale :

✅ Migration SQL exécutée
✅ EmergencySOSButton ajouté dans interface conducteur
✅ EmergencyAlertsDashboard ajouté pour syndicat/admin
✅ EmergencyStatsWidget ajouté dans dashboard bureau
✅ Notifications initialisées (initializeEmergencyNotifications)
✅ Sons ajoutés dans /public/sounds/
✅ Routes configurées
✅ Tests effectués

Le système est maintenant opérationnel ! 🚨
*/

// ============================================
// TESTS RAPIDES
// ============================================

/*
Test 1 : Bouton SOS
1. Aller sur la page conducteur
2. Cliquer sur le bouton SOS rouge
3. Autoriser la géolocalisation
4. Vérifier le toast "ALERTE D'URGENCE ENVOYÉE!"
5. Vérifier que le bouton passe en mode "ALERTE ACTIVE"

Test 2 : Dashboard Syndicat
1. Aller sur /emergency (en tant que syndicat/admin)
2. Vérifier que l'alerte apparaît dans la liste
3. Cliquer sur l'alerte
4. Vérifier la carte GPS
5. Tester les actions (appeler, message, etc.)

Test 3 : Notifications
1. Déclencher une alerte depuis un autre navigateur/onglet
2. Vérifier la notification push
3. Vérifier le son d'urgence
4. Vérifier le toast notification

Test 4 : Tracking GPS
1. Créer une alerte
2. Ouvrir la console (F12)
3. Vérifier les logs "📍 Nouveau point GPS"
4. Attendre 10 secondes
5. Vérifier qu'il y a ~5 points GPS dans l'historique
*/

export default App;
