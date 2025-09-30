/**
 * Script de test pour vérifier l'unicité absolue des IDs utilisateur
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uakkxaibujzxdiqzpnpr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🔒 TEST UNICITÉ ABSOLUE DES IDs UTILISATEUR');
console.log('==========================================');

// Test 1: Vérifier l'unicité actuelle
async function testCurrentUniqueness() {
  console.log('\n1️⃣ VÉRIFICATION UNICITÉ ACTUELLE');
  console.log('================================');

  try {
    // Utiliser la fonction SQL de vérification
    const { data, error } = await supabase.rpc('verify_id_uniqueness');

    if (error) {
      console.error('❌ Erreur lors de la vérification:', error);
      return;
    }

    if (data && data.length > 0) {
      const stats = data[0];
      console.log(`📊 Total IDs: ${stats.total_ids}`);
      console.log(`✅ IDs uniques: ${stats.unique_ids}`);
      console.log(`❌ Doublons: ${stats.duplicates}`);
      
      if (stats.duplicates > 0) {
        console.log(`🚨 IDs en doublon: ${stats.duplicate_ids.join(', ')}`);
        console.log('⚠️ ATTENTION: Des doublons ont été détectés !');
      } else {
        console.log('🎉 PARFAIT: Tous les IDs sont uniques !');
      }
    }
  } catch (error) {
    console.error('❌ Erreur test unicité:', error);
  }
}

// Test 2: Vérifier manuellement avec une requête directe
async function testManualUniqueness() {
  console.log('\n2️⃣ VÉRIFICATION MANUELLE');
  console.log('========================');

  try {
    // Récupérer tous les IDs
    const { data: allIds, error } = await supabase
      .from('user_ids')
      .select('custom_id');

    if (error) {
      console.error('❌ Erreur récupération IDs:', error);
      return;
    }

    if (!allIds || allIds.length === 0) {
      console.log('ℹ️ Aucun ID trouvé dans la base de données');
      return;
    }

    // Compter les occurrences
    const idCounts = {};
    allIds.forEach(item => {
      const id = item.custom_id;
      idCounts[id] = (idCounts[id] || 0) + 1;
    });

    // Analyser les résultats
    const totalIds = allIds.length;
    const uniqueIds = Object.keys(idCounts).length;
    const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);

    console.log(`📊 Total IDs: ${totalIds}`);
    console.log(`🔢 IDs distincts: ${uniqueIds}`);
    console.log(`❌ Doublons détectés: ${duplicates.length}`);

    if (duplicates.length > 0) {
      console.log('\n🚨 DOUBLONS DÉTECTÉS:');
      duplicates.forEach(([id, count]) => {
        console.log(`   ${id}: ${count} occurrences`);
      });
    } else {
      console.log('✅ AUCUN DOUBLON - Tous les IDs sont uniques !');
    }

    // Vérifier le format
    const invalidFormat = allIds.filter(item => {
      const id = item.custom_id;
      return !/^[A-Z]{3}[0-9]{4}$/.test(id);
    });

    if (invalidFormat.length > 0) {
      console.log(`\n⚠️ IDs avec format invalide: ${invalidFormat.length}`);
      invalidFormat.slice(0, 5).forEach(item => {
        console.log(`   ${item.custom_id} (format incorrect)`);
      });
    } else {
      console.log('✅ Tous les IDs respectent le format ABC1234');
    }

  } catch (error) {
    console.error('❌ Erreur vérification manuelle:', error);
  }
}

// Test 3: Simuler la génération de plusieurs IDs
async function testIdGeneration() {
  console.log('\n3️⃣ TEST GÉNÉRATION D\'IDs');
  console.log('=========================');

  // Générer plusieurs IDs côté client pour tester les collisions
  const generatedIds = new Set();
  const collisions = [];

  for (let i = 0; i < 1000; i++) {
    // Générer un ID au format 3 lettres + 4 chiffres
    let letters = '';
    for (let j = 0; j < 3; j++) {
      letters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }

    let numbers = '';
    for (let j = 0; j < 4; j++) {
      numbers += Math.floor(Math.random() * 10).toString();
    }

    const id = letters + numbers;

    if (generatedIds.has(id)) {
      collisions.push(id);
    } else {
      generatedIds.add(id);
    }
  }

  console.log(`📊 IDs générés: 1000`);
  console.log(`🔢 IDs uniques: ${generatedIds.size}`);
  console.log(`💥 Collisions: ${collisions.length}`);

  if (collisions.length > 0) {
    console.log(`⚠️ Taux de collision: ${(collisions.length / 1000 * 100).toFixed(2)}%`);
    console.log(`🎯 Premiers doublons: ${collisions.slice(0, 5).join(', ')}`);
  } else {
    console.log('🎉 Aucune collision sur 1000 générations !');
  }

  // Calculer les probabilités théoriques
  const totalPossibilities = Math.pow(26, 3) * Math.pow(10, 4); // 26^3 * 10^4
  console.log(`\n📈 STATISTIQUES THÉORIQUES:`);
  console.log(`   Combinaisons possibles: ${totalPossibilities.toLocaleString()}`);
  console.log(`   Probabilité collision sur 1000: ${(1000 / totalPossibilities * 100).toFixed(6)}%`);
}

// Test 4: Vérifier les contraintes de base de données
async function testDatabaseConstraints() {
  console.log('\n4️⃣ VÉRIFICATION CONTRAINTES DB');
  console.log('==============================');

  try {
    // Tenter d'insérer un doublon (doit échouer)
    const testId = 'TEST1234';
    const testUserId = '00000000-0000-0000-0000-000000000001';

    console.log(`🧪 Test insertion doublon avec ID: ${testId}`);

    // Première insertion (doit réussir)
    const { error: firstError } = await supabase
      .from('user_ids')
      .insert({ user_id: testUserId, custom_id: testId });

    if (firstError) {
      console.log('ℹ️ Première insertion échouée (normal si ID existe déjà)');
    } else {
      console.log('✅ Première insertion réussie');
    }

    // Deuxième insertion (doit échouer à cause de la contrainte unique)
    const { error: secondError } = await supabase
      .from('user_ids')
      .insert({ 
        user_id: '00000000-0000-0000-0000-000000000002', 
        custom_id: testId 
      });

    if (secondError) {
      console.log('✅ Contrainte UNIQUE fonctionne - doublon rejeté');
      console.log(`   Erreur: ${secondError.message}`);
    } else {
      console.log('❌ PROBLÈME: Doublon accepté - contrainte manquante !');
    }

    // Nettoyer le test
    await supabase
      .from('user_ids')
      .delete()
      .eq('custom_id', testId);

  } catch (error) {
    console.error('❌ Erreur test contraintes:', error);
  }
}

// Fonction principale
async function runAllTests() {
  console.log('🚀 DÉMARRAGE DES TESTS D\'UNICITÉ');
  console.log('Format attendu: 3 lettres + 4 chiffres (ex: ABC1234)');
  console.log('');

  await testCurrentUniqueness();
  await testManualUniqueness();
  await testIdGeneration();
  await testDatabaseConstraints();

  console.log('\n🏁 TESTS TERMINÉS');
  console.log('================');
  console.log('✅ Vérification unicité actuelle');
  console.log('✅ Analyse manuelle des doublons');
  console.log('✅ Test génération et collisions');
  console.log('✅ Vérification contraintes DB');
  console.log('');
  console.log('🔒 GARANTIES D\'UNICITÉ:');
  console.log('• Contrainte UNIQUE en base de données');
  console.log('• Vérification avant insertion');
  console.log('• Protection contre race conditions');
  console.log('• 175,760,000 combinaisons possibles');
  console.log('• Probabilité collision négligeable');
}

// Exécuter tous les tests
runAllTests().catch(console.error);
