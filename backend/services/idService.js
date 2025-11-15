/**
 * 🔧 SERVICE DE GÉNÉRATION D'ID UNIQUE - 224SOLUTIONS
 * Gère la génération et la réservation d'IDs uniques
 * Compatible Firestore + Supabase
 */

const { generateId } = require('../utils/idGenerator');
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Génère un ID unique et le réserve dans Supabase
 * @param {string} scope - Contexte de l'ID (users, products, orders, etc.)
 * @param {string} userId - ID de l'utilisateur créateur (optionnel)
 * @returns {Promise<string>} ID unique généré
 */
async function generateUniqueId(scope, userId = null) {
  let attempt = 0;
  const maxAttempts = 10;

  console.log(`🔄 Génération d'ID pour scope: ${scope}`);

  while (attempt < maxAttempts) {
    const newId = generateId();
    attempt++;

    try {
      // Vérifier si l'ID existe déjà dans Supabase
      const { data: existing, error: checkError } = await supabase
        .from('ids_reserved')
        .select('public_id')
        .eq('public_id', newId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification ID:', checkError);
        continue;
      }

      if (existing) {
        console.log(`⚠️  ID ${newId} déjà réservé, tentative ${attempt}/${maxAttempts}`);
        continue;
      }

      // Réserver l'ID dans Supabase
      const { data, error } = await supabase
        .from('ids_reserved')
        .insert([{
          public_id: newId,
          scope: scope,
          created_by: userId
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Violation d'unicité
          console.log(`⚠️  Collision ID ${newId}, tentative ${attempt}/${maxAttempts}`);
          continue;
        }
        throw error;
      }

      console.log(`✅ ID généré avec succès: ${newId} (scope: ${scope})`);
      return newId;

    } catch (error) {
      console.error(`❌ Erreur tentative ${attempt}:`, error.message);
      if (attempt === maxAttempts) {
        throw new Error(`Impossible de générer un ID unique après ${maxAttempts} tentatives`);
      }
    }
  }

  throw new Error(`Impossible de générer un ID unique après ${maxAttempts} tentatives`);
}

/**
 * Vérifie si un ID existe déjà
 * @param {string} publicId - ID à vérifier
 * @returns {Promise<boolean>} true si l'ID existe
 */
async function checkIdExists(publicId) {
  try {
    const { data, error } = await supabase
      .from('ids_reserved')
      .select('public_id')
      .eq('public_id', publicId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Erreur vérification existence ID:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('❌ Erreur checkIdExists:', error);
    return false;
  }
}

/**
 * Récupère les statistiques de génération d'IDs
 * @param {string} scope - Scope à analyser (optionnel)
 * @returns {Promise<Object>} Statistiques
 */
async function getIdStats(scope = null) {
  try {
    let query = supabase
      .from('id_generation_logs')
      .select('*', { count: 'exact', head: true });

    if (scope) {
      query = query.eq('scope', scope);
    }

    const { count, error } = await query;

    if (error) throw error;

    return {
      total_generated: count || 0,
      scope: scope || 'all'
    };
  } catch (error) {
    console.error('❌ Erreur getIdStats:', error);
    return { total_generated: 0, scope: scope || 'all' };
  }
}

module.exports = {
  generateUniqueId,
  checkIdExists,
  getIdStats
};
