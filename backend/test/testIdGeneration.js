/**
 * 🧪 SCRIPT DE TEST: GÉNÉRATION D'ID UNIQUE
 * Test du système de génération d'IDs LLLDDDD
 */

const { generateUniqueId, checkIdExists, getIdStats } = require('../services/idService');
const { validatePublicId, formatPublicId } = require('../utils/idGenerator');

console.log('🧪 DÉMARRAGE DES TESTS DE GÉNÉRATION D\'ID\n');

async function runTests() {
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('TEST 1: Génération d\'un seul ID');
    console.log('═══════════════════════════════════════════════════');
    
    const id1 = await generateUniqueId('test_users', null);
    console.log(`✅ ID généré: ${id1}`);
    console.log(`   Validation: ${validatePublicId(id1) ? '✓ Valide' : '✗ Invalide'}`);
    console.log(`   Formaté: ${formatPublicId(id1)}\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('TEST 2: Génération de 10 IDs pour vérifier l\'unicité');
    console.log('═══════════════════════════════════════════════════');
    
    const generatedIds = [];
    for (let i = 0; i < 10; i++) {
      const id = await generateUniqueId('test_batch', null);
      generatedIds.push(id);
      console.log(`   ${i + 1}. ${id}`);
    }

    // Vérifier l'unicité
    const uniqueIds = new Set(generatedIds);
    if (uniqueIds.size === generatedIds.length) {
      console.log(`✅ Tous les IDs sont uniques (${uniqueIds.size}/${generatedIds.length})\n`);
    } else {
      console.log(`❌ Doublons détectés ! (${uniqueIds.size}/${generatedIds.length})\n`);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('TEST 3: Vérification d\'existence d\'ID');
    console.log('═══════════════════════════════════════════════════');
    
    const existsCheck = await checkIdExists(id1);
    console.log(`   ID ${id1}: ${existsCheck ? 'Existe ✓' : 'N\'existe pas ✗'}`);
    
    const nonExistentCheck = await checkIdExists('XXX9999');
    console.log(`   ID XXX9999: ${nonExistentCheck ? 'Existe ✗' : 'N\'existe pas ✓'}\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('TEST 4: Validation du format');
    console.log('═══════════════════════════════════════════════════');
    
    const testCases = [
      { id: 'ABC1234', expected: true },
      { id: 'XYZ9876', expected: true },
      { id: 'abc1234', expected: false }, // Minuscules
      { id: 'AB1234', expected: false },  // Seulement 2 lettres
      { id: 'ABCD1234', expected: false }, // 4 lettres
      { id: 'ABC12345', expected: false }, // 5 chiffres
      { id: 'ABC123', expected: false },   // 3 chiffres
      { id: 'A1B2C3D4', expected: false }, // Format mixte
      { id: '1234ABC', expected: false },  // Inversé
      { id: 'ILO1234', expected: false },  // Lettres interdites
    ];

    testCases.forEach(({ id, expected }) => {
      const result = validatePublicId(id);
      const status = result === expected ? '✓' : '✗';
      console.log(`   ${status} ${id}: ${result ? 'Valide' : 'Invalide'} (attendu: ${expected ? 'Valide' : 'Invalide'})`);
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('TEST 5: Statistiques de génération');
    console.log('═══════════════════════════════════════════════════');
    
    const stats = await getIdStats();
    console.log(`   Total IDs générés: ${stats.total_generated}`);
    console.log(`   Scope analysé: ${stats.scope}\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TOUS LES TESTS TERMINÉS AVEC SUCCÈS');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERREUR LORS DES TESTS:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Lancer les tests
runTests();
